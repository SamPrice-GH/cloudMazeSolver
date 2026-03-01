const asyncHandler = require("express-async-handler");
const { v4: uuidv4 } = require('uuid');

const SQS = require("@aws-sdk/client-sqs");
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;
const client = new SQS.SQSClient({
    region: "ap-southeast-2",
});

const Maze = require('../models/mazeModel');
const Solve = require('../models/solveModel');
const MazeSolver = require('../pathfinding_utils/MazeSolver');
const { randomInt } = require("crypto");

// returns a list of all supported algorithms
exports.supported_algos = asyncHandler(async (req, res) => {
    const algorithms = [
        {
            algo_name: "Breadth-First Search",
            algo_reference: "bfs"
        },
        {
            algo_name: "Depth-First Search",
            algo_reference: "dfs"
        },
        {
            algo_name: "Bidirectional Search",
            algo_reference: "bidirectional"
        }
    ];

    res.status(200).json(algorithms);
});

// get all solves
exports.solve_list = asyncHandler(async (req, res) => {
    const solves = await Solve.find();
    res.status(200).json(solves);
});

// get solve by ID
exports.get_solve_by_id = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const solve = await Solve.findById(id);
    if (!solve) {
        res.status(404).send('Solve not found');
        return;
    }
    res.status(200).json(solve);
});

// solve a maze 
exports.solve_maze = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { algo = 'dfs' } = req.query; // default to dfs

    try {
        // get maze and check auth
        const maze = await Maze.findById(id);
        if (!maze) {
            return res.status(404).send('Maze not found');
        }
        if (maze.owner_username && !req.user.isAdmin && (!req.user || (maze.owner_username != req.user.username))) {
            return res.status(401).json({ message: `Unauthorised attempt to solve maze owned by user '${maze.owner_username}'.`});
        }

        try {
            const presignRes = await fetch(`http://localhost:8080/api/maze/${id}/file`, {
                headers: { Authorization: req.headers.authorization }
            })

            const presignJSON = await presignRes.json();
            console.log("Got presigned: ", presignJSON.presignedURL);

            //const jobID = uuidv4().replace("-","").substring(0, 8);

            const message = {
                maze_id: id,
                algo: algo,
                presignedUrl: presignJSON.presignedURL
            }
            console.log("Prepped message: ", message);

            const command = new SQS.SendMessageCommand({
                QueueUrl: SQS_QUEUE_URL,
                DelaySeconds: 0,
                MessageBody: JSON.stringify(message),
             });

            const sqsRes = await client.send(command);
            console.log("Sending a message", sqsRes);

            res.status(201).json({jobID: sqsRes.MessageId});

        //     // time solve
        //     const startTime = Date.now();
        //     const { path, iterationsTaken } = solver.solve(algo);
        //     const solveTime = Date.now() - startTime;
    
        //     if (req.method == "GET") {
        //         let message = path.length > 0 ? 
        //             `Algorithm '${algo}' solved maze successfully.` :
        //             `Algorithm '${algo}' could not solve maze.`;

        //         res.status(200).json({
        //             message,
        //             solve: {
        //                 maze_id: maze.maze_id,
        //                 algorithm_used: algo,
        //                 solution: path,
        //                 solve_time_ms: solveTime,
        //                 solution_length: path.length,
        //                 iterations_taken: iterationsTaken
        //             }
        //         });
        //     }
        //     else {
        //         res.status(405).send(`Request method (${req.method}) not supported at this endpoint. How'd you sneak this through here?`);
        //     }
        }
        catch (err) {
            return res.status(400).json({ message: err.message });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// save solve
exports.save_solve = asyncHandler(async (req, res) => {
    const {
        maze_id,
        algorithm_used,
        solution,
        solve_time_ms,
        solution_length,
        iterations_taken
    } = req.body;

    // make sure maze actually exists
    const maze = await Maze.findById(maze_id);
    if (!maze) { return res.status(404).send('No maze associated with provided ID. Cannot save solve of unknown maze!'); } 

    // save the solution to the database
    const newSolve = new Solve({
        maze_id,
        algorithm_used,
        solution,
        solve_time_ms,
        solution_length,
        iterations_taken
    });

    await newSolve.save();

    res.status(201).json(newSolve);
});

// delete solve (by ID)
exports.delete_solve = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    try {
        const solve = await Solve.findById(id);
        if (!solve) {
            return res.status(404).send('Solve not found');
        }


        // delete record from database
        Solve.delete(id)
            .then( function(result) {
                res.status(200).send(`Solve with ID ${id} has been deleted.`);
            })
            .catch(function (err) {
                console.error('Error deleting maze from DB:', err);
                return res.status(500).send('Error deleting maze');
            }); 
                           
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).send('Server error');
    }
});
