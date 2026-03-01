const DynamoDB = require("@aws-sdk/client-dynamodb");
const DynamoDBLib = require("@aws-sdk/lib-dynamodb");

const OWNER_EMAIL = process.env.OWNER_EMAIL;
const DDB_SOLVE_TABLE = process.env.DDB_SOLVE_TABLE;
const DDB_PARTITION_KEY = process.env.DDB_PARTITION_KEY;

// custom class to implement mongoose like features like .save and .findById so I don't have to change the rest of my code
class Solve {
    static client = new DynamoDB.DynamoDBClient({ region: process.env.AWS_REGION || "ap-southeast-2" });
    static docClient = DynamoDBLib.DynamoDBDocumentClient.from(Solve.client);

    constructor({ maze_id, algorithm_used, solution, solve_time_ms, solution_length, iterations_taken }) {
        this.maze_id = maze_id;
        this.algorithm_used = algorithm_used;
        this.solution = solution;
        this.solve_time_ms = solve_time_ms;
        this.solution_length = solution_length;
        this.iterations_taken = iterations_taken;
        this.solve_id = -1;  // assign this upon save
    }

    async getNewSolveId() {
        // this is painful to look at i know
        const randomInt = Math.floor(Math.random() * 10000) + 1;

        if (await Solve.findById(randomInt) == null) {
            return randomInt;
        } else {
            return this.getNewSolveId(); 
        }
    }

    static async findById(solve_id) {
        // recreate old mongoDB findByID function

        const command = new DynamoDBLib.GetCommand({
            TableName: DDB_SOLVE_TABLE,
            Key: {
                [DDB_PARTITION_KEY]: OWNER_EMAIL,
                "solve_id": parseInt(solve_id)
            },
            ProjectionExpression: "solve_id, maze_id, algorithm_used, solution, solve_time_ms, solution_length, iterations_taken"
        });

        try {
            const response = await Solve.docClient.send(command);
            return response.Item || null;
        } catch (err) {
            console.log(`Database error finding solve with ID '${solve_id}': `, err);
            return err;
        }
    }

    async save() {
        // generate solve ID
        if (this.solve_id == -1) { this.solve_id = await this.getNewSolveId(); }

        // recreate old mongoDB save function
        const command = new DynamoDBLib.PutCommand({
            TableName: DDB_SOLVE_TABLE,
            Item: {
                [DDB_PARTITION_KEY]: OWNER_EMAIL,
                "solve_id": this.solve_id,
                maze_id: this.maze_id,
                algorithm_used: this.algorithm_used,
                solution: this.solution,
                solve_time_ms: this.solve_time_ms,
                solution_length: this.solution_length,
                iterations_taken: this.iterations_taken
            },
            ConditionExpression: "attribute_not_exists(solve_id)"
        });

        try {
            const response = await Solve.docClient.send(command);
            return {
                solve_id: this.solve_id,
                maze_id: this.maze_id,
                algorithm_used: this.algorithm_used,
                solution: this.solution,
                solve_time_ms: this.solve_time_ms,
                solution_length: this.solution_length,
                iterations_taken: this.iterations_taken
            } || null;
        } catch (err) {
            if (err instanceof DynamoDB.ConditionalCheckFailedException) {
                console.log(`Tried to add solve with ID '${this.solve_id}' but it already exists.`);
                return err;
            } else {
                console.log(`Database error creating solve: `, err);
                return err;
            }
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
            TableName: DDB_SOLVE_TABLE,
            KeyConditionExpression: "#partitionKey = :username",
            ...customQueryParams,
            ExpressionAttributeNames: {
                "#partitionKey": DDB_PARTITION_KEY,
            },
            ProjectionExpression: "solve_id, maze_id, algorithm_used, solution, solve_time_ms, solution_length, iterations_taken"
        });
    
        try {
            const response = await Solve.docClient.send(command);
            return response.Items || null; 
        } catch (err) {
            console.log(`Error querying mazes with conditions '${JSON.stringify({attributeConditions, attributeValues})}': `, err);
            return err; 
        }
    }

    static async delete(solve_id) {
        // recreate mongoDB deleteOne
        const command = new DynamoDBLib.DeleteCommand({
            TableName: DDB_SOLVE_TABLE,
            Key: {
                [DDB_PARTITION_KEY]: OWNER_EMAIL,
                "solve_id": parseInt(solve_id)
            }
        });

        try {
            const response = await Solve.docClient.send(command);
            return response;
        } catch (err) {
            console.log(`Database error deleting solve with ID '${solve_id}': `, err);
            return err;
        }
    }
}

module.exports = Solve;
