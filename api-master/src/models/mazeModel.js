const DynamoDB = require("@aws-sdk/client-dynamodb");
const DynamoDBLib = require("@aws-sdk/lib-dynamodb");
const S3 = require("@aws-sdk/client-s3");
const S3_BUCKET_NAME = process.env.S3_MAZE_BUCKET;

const OWNER_EMAIL = process.env.OWNER_EMAIL;
const DDB_MAZE_TABLE = process.env.DDB_MAZE_TABLE;
const DDB_PARTITION_KEY = process.env.DDB_PARTITION_KEY;

// custom class to implement mongoose like features like .save and .findById so I don't have to change the rest of my code
class Maze {
    static client = new DynamoDB.DynamoDBClient({ region: "ap-southeast-2" });
    static docClient = DynamoDBLib.DynamoDBDocumentClient.from(Maze.client);
    static s3Client = new S3.S3Client({ region: 'ap-southeast-2' });

    constructor({maze_name, owner_username, file_path}) {
        this.maze_name = maze_name;
        this.owner_username = owner_username;
        this.file_path = file_path;
        this.maze_id = -1;
    }

    async getNewMazeId() {
        // pretty shocking ID system if I do say so myself but implementing a count table
        // or auto-increment sounds like a pain
        const randomInt = Math.floor(Math.random() * 10000) + 1;

        if (await Maze.findById(randomInt) == null) {
            return randomInt;
        }
        else {
            return this.getNewMazeId();
        }
    }

    static async findById(maze_id) {
        // construct get command
        const command = new DynamoDBLib.GetCommand({
            TableName: DDB_MAZE_TABLE,
            Key: {
                [DDB_PARTITION_KEY]: OWNER_EMAIL,
                "maze_id": parseInt(maze_id)
            },
            ProjectionExpression: "maze_id, maze_name, owner_username, file_path"
        });
    
        // attempt get
        try {
            const response = await Maze.docClient.send(command);
            return response.Item || null; 
        } catch (err) {
            console.log(`Database error finding maze with ID '${maze_id}': `, err);
            return null;
        }
    }    

    async save(mazeFile) {
        let savedMazeObj = {};

        // construct maze obj
        if (this.maze_id == -1) { this.maze_id = await this.getNewMazeId(); };

        const newMaze = {
            [DDB_PARTITION_KEY]: OWNER_EMAIL,
            "maze_id": this.maze_id,
            maze_name: this.maze_name,
            file_path: this.file_path
        }

        if (this.owner_username) { newMaze.owner_username = this.owner_username; }

        // create put maze obj (metadata) in dynamo command
        const command = new DynamoDBLib.PutCommand({
            TableName: DDB_MAZE_TABLE,
            Item: newMaze,
            ConditionExpression: "attribute_not_exists(maze_id)"
        });

        // send put command to dynamo
        try {
            // success
            const response = await Maze.docClient.send(command);
            console.log("Successfully uploaded maze obj (metadata) to Dynamo");
            savedMazeObj = {
                "maze_id": this.maze_id,
                maze_name: this.maze_name,
                owner_username: this.owner_username,
                file_path: this.file_path
            };
        } catch (err) {
            // maze id already exists (this should never really happen)
            if (err instanceof DynamoDB.ConditionalCheckFailedException) {
                console.log(`Tried to add '${this.maze_name}' with ID '${this.maze_id}' but maze already exists with that ID.`);
            }

            //unhandled
            else {
                console.log(`Dynamo error creating maze '${this.maze_name}': `, err);
                return err;
            }
        }

        // now save maze file (from upload path) to s3 bucket

        // send command to s3
        try {
            const response = await Maze.s3Client.send(
                new S3.PutObjectCommand({
                    Bucket: S3_BUCKET_NAME,
                    Key: this.file_path,
                    Body: mazeFile.data,
                    ContentType: "text/csv"
                })
            );
            // success
            console.log(`Successfully uploaded maze file '${this.file_path}' to S3.`);
            console.log("Maze creation successful.");
            return savedMazeObj;
        } catch (err) {
            // uh oh
            console.log(err);
            throw err;
        }
    }

    static async find(attributeConditions = "", attributeValues = {}) {
        // preconstruct command params
        let customQueryParams = {
            ExpressionAttributeValues: {
                ":username": OWNER_EMAIL
            }
        }

        // create filter expression for any other attribute conditions (if needed)
        if (attributeConditions) { customQueryParams.FilterExpression = attributeConditions; }

        // add corressponding attribute values (if needed)
        if (attributeValues) { customQueryParams.ExpressionAttributeValues = {...customQueryParams.ExpressionAttributeValues, ...attributeValues}; }

        const command = new DynamoDBLib.QueryCommand({
            TableName: DDB_MAZE_TABLE,
            KeyConditionExpression: "#partitionKey = :username",
            ...customQueryParams,
            ExpressionAttributeNames: {
                "#partitionKey": DDB_PARTITION_KEY,
            },
            ProjectionExpression: "maze_id, maze_name, owner_username, file_path"
        });
    
        try {
            const response = await Maze.docClient.send(command);
            return response.Items || null; 
        } catch (err) {
            console.log(`Error querying mazes with conditions '${JSON.stringify({attributeConditions, attributeValues})}': `, err);
            return err; 
        }
    }

    static async delete(maze_id) {
        maze_id = parseInt(maze_id);
        let responses = {};

        // get associated metadata (for s3 deletion later)
        const mazeInfo = await Maze.findById(maze_id);

        // delete metadata from DynamoDB
        const dynamoCommand = new DynamoDBLib.DeleteCommand({
            TableName: DDB_MAZE_TABLE,
            Key: {
                [DDB_PARTITION_KEY]: OWNER_EMAIL,
                "maze_id": maze_id
            }
        });
    
        try {
            const response = await Maze.docClient.send(dynamoCommand);
            responses.dynamoResposne = response;
        } catch (err) {
            console.log(`Dynamo error deleting maze with ID '${maze_id}': `, err);
            return err;
        }

        // delete file from S3
        const s3Command = new S3.DeleteObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: mazeInfo.file_path
        });

        try {
            const response = await Maze.s3Client.send(s3Command);
            responses.s3Response = response;
        } catch (err) {
            console.log(`S3 error deleting maze with ID '${maze_id}': `, err);
            return err;
        }
        
        return responses;
    }
}

module.exports = Maze;

