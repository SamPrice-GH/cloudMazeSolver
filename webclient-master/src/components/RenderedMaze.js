import React, { useEffect, useRef } from 'react';
import './RenderedMaze.css';

const RenderedMaze = ({ mazeData, solve }) => {
    const canvasRef = useRef(null);

    const START_COLOR = "#00ff00";
    const GOAL_COLOR = "#ff0000";
    const PATH_COLOR = "#ffffff";
    const WALL_COLOR = "#000000";
    const SOLUTION_COLOR = "#0000ff";

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const MAX_MAZE_SIZE = 700;
        const squareSize = Math.min(Math.floor(MAX_MAZE_SIZE / Math.max(mazeData.length, mazeData[0].length)), 30);
        
        // found out canvases are so much quicker
        canvas.width = mazeData[0].length * squareSize;
        canvas.height = mazeData.length * squareSize;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        //console.log("Maze Data in Render: ", mazeData);

        // render maze
        mazeData.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                const x = colIndex * squareSize;
                const y = rowIndex * squareSize;

                // draw walls and paths
                ctx.fillStyle = cell === 1 ? PATH_COLOR : WALL_COLOR;
                ctx.fillRect(x, y, squareSize, squareSize);

                // draw start and goal cells
                if (rowIndex === 0 && colIndex === 0) {
                    ctx.fillStyle = START_COLOR;
                } else if (rowIndex === mazeData.length - 1 && colIndex === mazeData[0].length - 1) {
                    ctx.fillStyle = GOAL_COLOR;
                }

                ctx.fillRect(x, y, squareSize, squareSize);
                
                // draw solution path if available
                if (solve && solve.solution) {
                    solve.solution.forEach(([sRow, sCol]) => {
                        if (sRow === rowIndex && sCol === colIndex) {
                            ctx.fillStyle = SOLUTION_COLOR;
                            ctx.fillRect(x, y, squareSize, squareSize);
                        }
                    });
                }
            });
        });
    }, [mazeData, solve]);

    return (
        <div className='rendered-maze-container'>
            <canvas ref={canvasRef} />
        </div>
    );
};

export default RenderedMaze;
