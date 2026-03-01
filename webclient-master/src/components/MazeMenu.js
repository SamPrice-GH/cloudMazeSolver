import React from 'react';
import './MazeMenu.css';
import MazeTable from './MazeTable.js';

const MazeMenu = ( {onMazeSelect, selectedMazeId} ) => {

    return (
        <div className="maze-menu-container"><div className='maze-menu-content'>
            <div style={{flex:`1`}}>
                <h1 className="maze-menu-title">Sam's Super Stupendous Maze Solver</h1>
                <h3 className="maze-menu-subtitle">Pick a maze, any maze!</h3>
            </div>
            <MazeTable onMazeSelect={onMazeSelect} selectedMazeId={selectedMazeId}/>  
        </div></div>
    );
}

export default MazeMenu;
