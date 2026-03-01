const path = require('path');
const fs = require('fs');

const Maze = require("../models/mazeModel");
const Solve = require("../models/solveModel");

const S3 = require("@aws-sdk/client-s3");
const s3Client = new S3.S3Client({ region: 'ap-southeast-2' });
const S3Presigner = require("@aws-sdk/s3-request-presigner");
const S3_BUCKET_NAME = process.env.S3_MAZE_BUCKET;

const asyncHandler = require("express-async-handler");
const MazeSolver = require("../pathfinding_utils/MazeSolver");

// new maze
exports.maze_create = asyncHandler(async (req, res) => {
    const { maze_name, private=false } = req.body;

    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    let mazeFile = req.files.maze_file;

    // verify uploaded file can be loaded as a maze
    const verificationSolver = new MazeSolver(mazeFile.name); // specified filepath here doesn't really matter, we just want .fileIsMaze()
    if (!verificationSolver.fileIsMaze(mazeFile.data)) { return res.status(400).send('Uploaded maze file was malformed. (check for accidental empty lines at end of csv)'); }
    
    // create maze object (metadata) to be saved
    console.log("Uploaded private? ", private);
    const owner_username = (req.user && private) ? req.user.username : null;

    const maze = new Maze({
        maze_name,
        owner_username,
        file_path: mazeFile.name // filename is actually what we want here as it is the key in s3 bucket
    });


    maze.save(mazeFile)
        .then(() => res.status(201).send(maze))
        .catch(err => {
            console.error(err);
            res.status(500).send('Server error');
        });
});

// get all mazes
exports.maze_list = asyncHandler(async (req, res, next) => {
    let allMazes = null;
    
    // check auth
    if (req.user) {
        if (req.user.isAdmin) {
            // get all mazes if admin
            allMazes = await Maze.find();
        }
        else {
            // get user-specific and general mazes if user
            allMazes = await Maze.find(`
                attribute_not_exists(owner_username) OR
                owner_username = :user
            `,
            {
                ":user": req.user.username
            });
        }
    }
    else {
        // get general mazes if no auth
        allMazes = await Maze.find(` attribute_not_exists(owner_username) `);
    }
   
    res.status(200).json(allMazes);
});

// get maze by ID
exports.get_maze_by_id = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    try {
        // get maze
        const maze = await Maze.findById(id);

        // check auth
        if (!maze) { return res.status(404).send('Maze not found'); }
        if (maze.owner_username) {
            if (!req.user || (!req.user.isAdmin && (maze.owner_username != req.user.username))) { 
                return res.status(401).json({ message: `Unauthorised attempt to get maze owned by user '${maze.owner_username}'.`}); 
            }
        }
            
        // get associated solves
        const solves = await Solve.find(" maze_id = :id ", { ":id": parseInt(id) });

        res.status(200).json({maze, solves});
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// get maze file
exports.get_maze_file = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // first get associated maze record
    const maze = await Maze.findById(id);
    if (!maze) { return res.status(404).send('Maze not found.'); }

    // check auth
    if (maze.owner_username) {
        if (!req.user || (!req.user.isAdmin && req.user.username != maze.owner_username)) {
            return res.status(401).json({ message: `Unauthorised attempt to get maze file owned by user '${maze.owner_username}'.`}); 
        }
    }

    // generate presigned s3 url
    try {

        const command = new S3.GetObjectCommand({
                Bucket: S3_BUCKET_NAME,
                Key: maze.file_path,
            });

        const presignedURL = await S3Presigner.getSignedUrl(s3Client, command, {expiresIn: 3600} );
    
        res.status(200).json({ maze_id: maze.maze_id, presignedURL });

    } catch (err) {
        console.log(err);
    }

});

// delete maze (by ID)
exports.delete_maze = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    try {
        const maze = await Maze.findById(id);
        if (!maze) {
            return res.status(404).send('Maze not found');
        }

        // delete record from database (dynamo + s3)
        Maze.delete(id)
            .then( function(result) {
                res.status(200).send(`Maze with ID ${id} (${maze.maze_name}) has been deleted.`);
            })
            .catch(function (err) {
                console.error('Error deleting maze from DB:', err);
                return res.status(500).send('Error deleting maze from DB.');
            }); 
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).send('Server error');
    }
});