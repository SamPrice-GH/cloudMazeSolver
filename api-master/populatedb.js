const DynamoDB = require("@aws-sdk/client-dynamodb");
const DynamoDBLib = require("@aws-sdk/lib-dynamodb");
const S3 = require("@aws-sdk/client-s3");
const path = require('path');
const fs = require("fs");

require('dotenv').config();
const OWNER_EMAIL = process.env.OWNER_EMAIL;
const S3_BUCKET_NAME = process.env.S3_MAZE_BUCKET;
const S3_BUCKET_PURPOSE = process.env.S3_BUCKET_PURPOSE;
const DDB_MAZE_TABLE = process.env.DDB_MAZE_TABLE;
const DDB_SOLVE_TABLE = process.env.DDB_SOLVE_TABLE;
const DDB_PARTITION_KEY = process.env.DDB_PARTITION_KEY;

// dummy mazes
const mazes = [
    {
        maze_id: 1,
        maze_name: 'Admin Only Maze',
        owner_username: 'sam', // example admin only maze (sam is admin user)
        file_path: 'maze_45_0.csv'
    },
    {
        maze_id: 2,
        maze_name: "testuser's baby maze",
        owner_username: 'randomuser', // example user-owned maze
        file_path: 'maze_5_0.csv'
    },
    {
        maze_id: 3,
        maze_name: 'A Real Maze',
        file_path: 'maze_45_1.csv'
    },
    {
        maze_id: 4,
        maze_name: '15x15 Maze',
        file_path: 'maze_15_0.csv'
    },
    {
        maze_id: 5,
        maze_name: '25x25 Maze',
        file_path: 'maze_25_0.csv'
    },
    {
        maze_id: 6,
        maze_name: '35x35 Maze',
        file_path: 'maze_35_0.csv'
    },
    {
        maze_id: 7,
        maze_name: '101x101 Maze',
        file_path: '101by101.csv'
    },
    {
        maze_id: 8,
        maze_name: 'The Mammoth',
        file_path: 'maze_201.csv'
    }
];

async function main() {
    // DYNAMO DB
    console.log("DYNAMO DB setup starting...");

    const client = new DynamoDB.DynamoDBClient({ region: "ap-southeast-2" });
    const docClient = DynamoDBLib.DynamoDBDocumentClient.from(client);

    await mazeTableSetup(client, docClient);
    await solveTableSetup(client, docClient);

    console.log("DYNAMO DB setup successfully completed.");

    // S3

    console.log("S3 setup starting...");

    const s3Client = new S3.S3Client({ region: 'ap-southeast-2' });
    await createBucket(s3Client);
    await tagBucket(s3Client);
    await setupCORSForBucket(s3Client);
    
    for (const newMaze of mazes) {
        if (await isKeyInBucket(s3Client, newMaze.file_path)) {
            console.log(`Skipped '${newMaze.file_path}' as object with that key already exists in bucket!`);
        }
        else { await writeFileToBucket(s3Client, newMaze.file_path); }
    }

    console.log("S3 setup successfully completed.");

    console.log(`
        
        
        Database (DynamoDB and S3) setup successfully completed.
        Ensure Cognito and Route53 have been configured successfully.

        
        `);
}

async function mazeTableSetup(client, docClient) {
    // table creation command
    command = new DynamoDB.CreateTableCommand({
        TableName: DDB_MAZE_TABLE,
        AttributeDefinitions: [
            {
                AttributeName: DDB_PARTITION_KEY,
                AttributeType: "S",
            },
            {
                AttributeName: "maze_id",
                AttributeType: "N",
            },
        ],
        KeySchema: [
            {
                AttributeName: DDB_PARTITION_KEY,
                KeyType: "HASH",
            },
            {
                AttributeName: "maze_id",
                KeyType: "RANGE",
            },
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
        },
    });
    
    // attempt to send command
    try {
        // fresh table, wait then attempt populate
        const response = await client.send(command);
        console.log(`Maze table creation completed successfully.`);

        await waitForTableCreation(client, DDB_MAZE_TABLE);
        await populateMazeTable(client, docClient);
    } catch (err) {
        // table already exists, attempt populate
        if (err instanceof DynamoDB.ResourceInUseException) {
            console.log("Maze table already exists, new table was not created.");
            await populateMazeTable(client, docClient);
        }

        // something unhandled went wrong
        else {
            console.log("Unknown error creating maze table: ", err);
        }
    }
}

async function populateMazeTable(client, docClient) {
    console.log("Attempting to populate maze table...");

    // add each maze to table
    for (const newMaze of mazes) {
        // construct put command
        command = new DynamoDBLib.PutCommand({
            TableName: DDB_MAZE_TABLE,
            Item: {
                [DDB_PARTITION_KEY]: OWNER_EMAIL,
                ...newMaze,
            },
            ConditionExpression: "attribute_not_exists(maze_id)" // in case ItemCount has not updated
        });
        
        // attempt put
        try {
            // success
            const response = await docClient.send(command);
            //console.log(response);
            console.log(`Maze '${newMaze.maze_name}' created successfully.`);
        } catch (err) {
            // maze id already exists
            if (err instanceof DynamoDB.ConditionalCheckFailedException) {
                console.log(`Tried to add '${newMaze.maze_name}' with ID '${newMaze.maze_id}' but maze already exists with that ID.`);
            }

            //unhandled
            else {
                console.log(`Unknown error creating maze '${newMaze.maze_name}': `, err);
                return;
            }
        }
    }

}

async function getTableInfo(client, tableName) {
    command = new DynamoDB.DescribeTableCommand({
        TableName: tableName,
    });

    try {
        const response = await client.send(command);
        console.log(`TABLE '${tableName}': Status = ${response.Table.TableStatus}, ItemCount (only updates every 6hrs) = ${response.Table.ItemCount}`);
        return response.Table;
    } catch (err) {
        console.log(`Unknown error getting table '${tableName}' info: `, err);
        return err;
    }
}

async function waitForTableCreation(client, tableName) {
    
    // see https://dev.to/officialanurag/javascript-secrets-how-to-implement-retry-logic-like-a-pro-g57

    let attemptCounter = 0;
    const NUM_RETRIES = 10;
    const RETRY_DELAY = 5000; //ms

    async function continiousTableGetter(retriesRemaining) {
        try {
            // get table info and see if we're active yet
            attemptCounter++;

            const intermediateTableInfo = await getTableInfo(client, tableName);
            if (intermediateTableInfo.TableStatus != "ACTIVE") {
                throw new Error("Got table info but table is not yet active.");
            }
            console.log("Success! Table has finished creating.");
            return intermediateTableInfo;
        }
        catch (err) {
            console.log(`Attempt ${attemptCounter}/${NUM_RETRIES} failed with error: ${err.message}`);
            console.log(`Waiting ${RETRY_DELAY}ms before retrying...`);
            
            // retry if possible
            if (retriesRemaining > 0) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                return continiousTableGetter(retriesRemaining-1);
            }
            else {
                throw new Error("All retries failed.");
            }
        }
    }

    const tableInfo = await continiousTableGetter(NUM_RETRIES);
    return tableInfo;
}

async function solveTableSetup(client, docClient) {
    // table creation command
    command = new DynamoDB.CreateTableCommand({
        TableName: DDB_SOLVE_TABLE,
        AttributeDefinitions: [
            {
                AttributeName: DDB_PARTITION_KEY,
                AttributeType: "S",
            },
            {
                AttributeName: "solve_id",
                AttributeType: "N",
            },
        ],
        KeySchema: [
            {
                AttributeName: DDB_PARTITION_KEY,
                KeyType: "HASH",
            },
            {
                AttributeName: "solve_id",
                KeyType: "RANGE",
            },
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
        },
    });

    // attempt to send command
    try {
        // fresh table, wait for status to be active
        const response = await client.send(command);
        console.log(`Solve table creation completed successfully.`);

        await waitForTableCreation(client, DDB_SOLVE_TABLE);
    } catch (err) {
        // table already exists, no more needs to be done
        if (err instanceof DynamoDB.ResourceInUseException) {
            console.log("Solve table already exists, new table was not created.");
            return;
        }

        // something unhandled went wrong
        else {
            console.log("Unknown error creating solve table: ", err);
        }
    }
}

async function createBucket(s3Client) {
    // Command for creating a bucket
    command = new S3.CreateBucketCommand({
        Bucket: S3_BUCKET_NAME
    });

    // Send the command to create the bucket
    try {
        const response = await s3Client.send(command);
        console.log("New bucket created at: ", response.Location)
    } catch (err) {
        if (err instanceof S3.BucketAlreadyOwnedByYou) {
            console.log(`Bucket creation failed as bucket '${S3_BUCKET_NAME}' already exists!`);
        }
        else {
            console.log(err);
            throw err;
        }
    }
}

async function tagBucket(s3Client) {
    // have some sort of description for this thing so I can find it in my mess of an AWS account
    command = new S3.PutBucketTaggingCommand({
        Bucket: S3_BUCKET_NAME,
        Tagging: {
            TagSet: [
                {
                    Key: DDB_PARTITION_KEY,
                    Value: OWNER_EMAIL,
                },
                {
                    Key: 'purpose',
                    Value: S3_BUCKET_PURPOSE
                }
            ]
        }
    });
    // Send the command to tag the bucket
    try {
        const response = await s3Client.send(command);
        console.log("Tagged bucket with status: ", response.$metadata.httpStatusCode);
    } catch (err) {
        console.log(err);
        throw err;
    } 
}

async function isKeyInBucket(s3Client, key) {
    try {
        const response = await s3Client.send(
            new S3.HeadObjectCommand({
                Bucket: S3_BUCKET_NAME,
                Key: key
            })
        )
        return true;
    } catch(err) {
        return false;
    }
}

async function writeFileToBucket(s3Client, filename) {
    // append actual file path
    const filePath = path.join("src/mazes", filename);
    const fileContent = fs.readFileSync(filePath);

    // Create and send a command to write an object
    try {
        const response = await s3Client.send(
            new S3.PutObjectCommand({
                Bucket: S3_BUCKET_NAME,
                Key: filename,
                Body: fileContent,
                ContentType: "text/csv",
                ContentDisposition: `attachment`
            })
        );

        console.log(`Uploaded maze file '${filename}' with response status ${response.$metadata.httpStatusCode}!`);
    } catch (err) {
        console.log(err);
        throw err
    }
}

async function setupCORSForBucket(s3Client) {
    const apiOrigin = "http://localhost:3000"; // for now

    const corsConfiguration = {
        CORSRules: [
            {
                AllowedHeaders: ["*"],
                AllowedMethods: ["GET", "POST", "PUT", "DELETE"],  
                AllowedOrigins: [apiOrigin], 
                MaxAgeSeconds: 3000,
                ExposeHeaders: [],
            },
        ],
    };

    const command = new S3.PutBucketCorsCommand({
        Bucket: S3_BUCKET_NAME,
        CORSConfiguration: corsConfiguration,
    });

    try {
        const response = await s3Client.send(command);
        console.log(`CORS configuration successfully applied to ${S3_BUCKET_NAME}`);
    } catch (err) {
        console.error(`Error applying CORS configuration to ${S3_BUCKET_NAME}:`, err);
        throw err;
    }
}

main();