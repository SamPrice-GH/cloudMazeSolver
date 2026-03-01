const fs = require('fs');
const Cell = require('./Cell');
const S3 = require('@aws-sdk/client-s3');
const readline = require('readline');

const S3_BUCKET_NAME = process.env.S3_MAZE_BUCKET;

class MazeSolver {
    static s3Client = new S3.S3Client({ region: 'ap-southeast-2' });

    constructor(filePath) {
        this.maze = filePath;
    }

    async init() {
        this.maze = await this.loadMaze(this.maze);
        this.numRows = this.maze.length;
        this.numCols = this.maze[0].length;
        this.start = this.maze[0][0]; // always start top left
        this.goal = this.maze[this.numRows - 1][this.numCols - 1]; // goal is always bottom right
    }

    // -------------------------- ALGOS --------------------------

    // util function to run appropriate algo
    solve(algorithm_name) {
        algorithm_name = algorithm_name.trim().toLowerCase();

        switch (algorithm_name) {
            case 'dfs':
                return this.dfsSolve();
            case 'bfs':
                return this.bfsSolve();
            case 'bidirectional':
                return this.bidirectionalSolve();
            default:
                throw new Error(`Unknown algorithm: ${algorithm_name}`);
        }
    }

    // bfs algo
    bfsSolve() {
        process.stdout.write("running bfs... ");

        const queue = [this.start];
        const visited = new Set();
        visited.add(`${this.start.row},${this.start.col}`);

        let iterationsTaken = 0;
        while (queue.length > 0) {
            iterationsTaken++;

            const current = queue.shift();

            if (current.row === this.goal.row && current.col === this.goal.col) {
                const path = this.reconstructPath(current);
                console.log("done. successful solve!");
                return {
                    path,
                    iterationsTaken
                };
            }

            const neighbours = this.getNeighbours(current);
            for (const neighbour of neighbours) {
                if (!visited.has(`${neighbour.row},${neighbour.col}`) && neighbour.isWalkable) {
                    neighbour.setParent(current);
                    visited.add(`${neighbour.row},${neighbour.col}`);
                    queue.push(neighbour);
                }
            }
        }

        console.log("done. bfs couldn't solve!");
        return {
            path: [],
            iterationsTaken
        };
    }

    // dfs algo
    dfsSolve() {
        process.stdout.write("running dfs... ");

        const stack = [this.start];
        const visited = new Set();
        visited.add(`${this.start.row},${this.start.col}`);

        let iterationsTaken = 0;
        while (stack.length > 0) {
            iterationsTaken++;

            const current = stack.pop();

            if (current.row === this.goal.row && current.col === this.goal.col) {
                const path = this.reconstructPath(current);
                console.log("done. successful solve!");
                return {
                    path,
                    iterationsTaken
                };
            }

            const neighbours = this.getNeighbours(current);
            for (const neighbour of neighbours) {
                if (!visited.has(`${neighbour.row},${neighbour.col}`) && neighbour.isWalkable) {
                    neighbour.setParent(current);
                    visited.add(`${neighbour.row},${neighbour.col}`);
                    stack.push(neighbour);
                }
            }
        }

        console.log("done. dfs couldn't solve!");
        return {
            path: [],
            iterationsTaken
        };
    }

    // bidirectional search algo
    bidirectionalSolve() {
        process.stdout.write("running bidirectional search... ");
        
        // define some bidirectional search specific helper funcs (arrow funcs to preserve .this reference)

        // helper to expand neighbours during bidirectional search
        const expandNeighbours = (current, queue, visited, otherVisited) => {
            const neighbours = this.getNeighbours(current);
            for (const neighbour of neighbours) {
                if (!visited.has(`${neighbour.row},${neighbour.col}`) && neighbour.isWalkable) {
                    if (otherVisited.has(`${neighbour.row},${neighbour.col}`)) {
                        // return the meeting point if found
                        return neighbour;
                    }
                    neighbour.setParent(current);
                    visited.set(`${neighbour.row},${neighbour.col}`, neighbour);

                    queue.push(neighbour);
                }
            }
            return null;
        };

        // helper to reconstruct the path from the meeting point in bidirectional search
        const reconstructBidirectionalPath = (arrivalNode, meetingNode) => {
            // this func is a bit weird but is a work around for how i've structured cells
            let tempPath = [];
            let startPath = [];
            let goalPath = [];
            let current = meetingNode;

            // reconstruct path from meeting node to origin
            while (current) {
                tempPath.push([current.row, current.col]);
                current = current.parent;   
            }

            // if the last cell in constructed path is on row 0 (top), 
            // this must be meeting point -> start (as final cell is start).
            if (tempPath[tempPath.length-1][0] === 0) {
                // reverse copy the path so startPath starts at 0, 0
                for (let i=tempPath.length; i > 0; i--) {
                    startPath.push(tempPath[i-1]);
                };
            }
            else {
                for (let i=0; i < tempPath.length; i++) {
                    goalPath.push(tempPath[i]);
                }
            }

            // Reconstruct path from arrival node to origin
            tempPath = [];
            current = arrivalNode;
            while (current) {
                tempPath.push([current.row, current.col]);
                current = current.parent;
            }

            if (startPath.length > 0) {
                for (let i=0; i < tempPath.length; i++) {
                    goalPath.push(tempPath[i]);
                }
            }
            else {
                for (let i=tempPath.length; i > 0; i--) {
                    startPath.push(tempPath[i-1]);
                };
            }

            const finalPath = [...startPath, ...goalPath];
            
            console.log("done. successful solve!");
            return {
                path: finalPath,
                iterationsTaken
            };
        };

        // continue with actual algorithm...

        const startQueue = [this.start];
        const goalQueue = [this.goal];

        const startVisited = new Map();
        const goalVisited = new Map();

        startVisited.set(`${this.start.row},${this.start.col}`, this.start);
        goalVisited.set(`${this.goal.row},${this.goal.col}`, this.goal);
        
        let iterationsTaken = 0;
        while (startQueue.length > 0 && goalQueue.length > 0) {
            iterationsTaken++;

            // Expand from the start side
            const startCurrent = startQueue.shift();
            const meetingNode = expandNeighbours(startCurrent, startQueue, startVisited, goalVisited);
            if (meetingNode) {
                return reconstructBidirectionalPath(startCurrent, meetingNode);
            }

            // Expand from the goal side
            const goalCurrent = goalQueue.shift();
            const goalMeetingNode = expandNeighbours(goalCurrent, goalQueue, goalVisited, startVisited);
            if (goalMeetingNode) {
                return reconstructBidirectionalPath(goalCurrent, goalMeetingNode);
            }
        }
        
        console.log("done. bidirectional search couldn't solve!");
        return {
            path: [],
            iterationsTaken
        };
    }
    

    // -------------------------- END ALGOS --------------------------

    // -------------------------- UTILS --------------------------

    // util function to load maze FROM file path purely to verify it is structured correctly
    // MUST BE CALLED BEFORE INIT
    fileIsMaze(fileDataBuffer) {
        if (this.hasOwnProperty("start")) { throw new Error("Attempted to check if file was maze on already initialised MazeSolver."); }

        let data = fileDataBuffer.toString("utf-8");
        console.log(`Checking ${this.maze} is a valid maze file...`);

        let loadedMaze = [];
        let allRows = data.split('\n');
        
        for (let i = 0; i < allRows.length; i++) {
            let cols = allRows[i].split(',');
            loadedMaze.push([]);

            for (let j = 0; j < cols.length; j++) {
                let cell = cols[j].trim();
                if (cell != "1" && cell != "0") {
                    console.log(`Invalid maze cell ('${cell.trim()}' @ ${i},${j}).`);
                    console.log(`${this.maze} could not be loaded. File is not valid maze file.`);
                    return false;
                }
                else {
                    let newCell = new Cell(i, j, cell == '1');
                    loadedMaze[i].push(newCell);
                };
            }
        
        }

        console.log(`${this.maze} loaded successfully. File is valid maze file.`);
        return true;
    }
    
    // util function to load the maze (directly from S3) incrementally and convert it to a 2d array of Cell objects
    async loadMaze() {
        try {
            // get readable stream from S3
            const response = await MazeSolver.s3Client.send(
                new S3.GetObjectCommand({
                    Bucket: S3_BUCKET_NAME,
                    Key: this.maze,
                })
            );

            // use readline module when in node
            const rl = readline.createInterface({
                input: response.Body, 
                crlfDelay: Infinity
            });

            // parse contents row by row
            let loadedMaze = [];
            let rowIndex = 0;

            for await (const line of rl) {
                const row = line.split(',').map(cell => cell.trim());
                loadedMaze.push([]);

                for (let colIndex = 0; colIndex < row.length; colIndex++) {
                    const cell = row[colIndex];
                    if (cell !== '1' && cell !== '0') {
                        throw new Error(`Invalid maze cell ('${cell}' @ ${rowIndex},${colIndex}).`);
                    }
                    const newCell = new Cell(rowIndex, colIndex, cell === '1');
                    loadedMaze[rowIndex].push(newCell);
                }

                rowIndex++;
            }

            return loadedMaze;

        } catch (err) {
            console.log(err);
            throw err;
        }
    }

    // util function to get neighbours of a cell
    getNeighbours(cell) {
        const directions = [
            [1, 0], [-1, 0], [0, 1], [0, -1] // [down, up, right, left]
        ];

        const neighbours = [];
        for (let [dr, dc] of directions) {
            const newRow = cell.row + dr;
            const newCol = cell.col + dc;

            if (
                // inbounds check
                newRow >= 0 && newRow < this.numRows &&
                newCol >= 0 && newCol < this.numCols
            ) {
                neighbours.push(this.maze[newRow][newCol]);
            }
        }

        return neighbours;
    }

    // util function to reconstruct a path of cells (from start to goal)
    reconstructPath(cell) {
        const path = [];
        while (cell) {
            path.push([cell.row, cell.col]);
            cell = cell.parent;
        }
        return path.reverse(); // reversed to get from start to goal
    }

    // -------------------------- END UTILS --------------------------
}

module.exports = MazeSolver;
