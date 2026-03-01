const MazeSolver = require("./pathfinding_utils/MazeSolver");
const SQS = require("@aws-sdk/client-sqs");
require('dotenv').config()
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;
const client = new SQS.SQSClient({
    region: "ap-southeast-2",
});

const jobStore = new Map();

async function processMessages() {
    console.log(`Polling SQS ${SQS_QUEUE_URL}...`);

    const receiveCommand = new SQS.ReceiveMessageCommand({
        MaxNumberOfMessages: 1,
        QueueUrl: SQS_QUEUE_URL,
        WaitTimeSeconds: 20, 
    });

    try {
        const receiveResponse = await client.send(receiveCommand);
        console.log("Finished polling!");

        if (receiveResponse.Messages) {
            const message = receiveResponse.Messages[0];
            const jobId = message.MessageId;
            const jsonBody = JSON.parse(message.Body);
            console.log(`Got message '${jobId}' with ${Object.keys(jsonBody)}`);
            
            jobStore.set(jobId, { status: 'processing', result: null });

            await solveMazeJob(jsonBody, jobId);

            const deleteCommand = new SQS.DeleteMessageCommand({
                QueueUrl: SQS_QUEUE_URL,
                ReceiptHandle: message.ReceiptHandle,
            });

            const deleteResponse = await client.send(deleteCommand);
            console.log(`Finished processing successfully, deleting message '${jobId}'.`);

            processMessages();
        } else {
            console.log("No new messages, retrying in 1s...");
            setTimeout(processMessages, 1000);
        }
    } catch (error) {
        console.error("Error processing SQS message:", error);
        setTimeout(processMessages, 1000); 
    }
}

async function solveMazeJob(body, jobId) {
    console.log(`Solving maze for job ${jobId}...`);

    let mazeSolver = new MazeSolver(body.presignedUrl);
    await mazeSolver.init();

    const startTime = Date.now();
    const { path, iterationsTaken } = mazeSolver.solve(body.algo);
    const solveTime = Date.now() - startTime;

    console.log(`Maze solved for job ${jobId}`);

    let successMessage = path.length > 0 ? 
                    `Algorithm '${body.algo}' solved maze successfully.` :
                    `Algorithm '${body.algo}' could not solve maze.`;

    jobStore.set(jobId, { status: 'completed', result: {
            message: successMessage,
            solve: {
                maze_id: parseInt(body.maze_id),
                algorithm_used: body.algo,
                solution: path,
                solve_time_ms: solveTime,
                solution_length: path.length,
                iterations_taken: iterationsTaken
            }
    }});

    console.log(jobStore.get(jobId));
}

module.exports = { processMessages, jobStore };