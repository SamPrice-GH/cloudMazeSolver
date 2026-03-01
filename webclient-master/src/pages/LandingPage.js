import React, { useState } from 'react';
import './LandingPage.css';
import MazeMenu from '../components/MazeMenu';
import MazePreview from '../components/MazePreview';
import MazeCreator from '../components/MazeCreator';

const LandingPage = ({ selectedMazeId, setSelectedMazeId }) => { 
    return (
        <div className="landing-page">
            <div className="left-container">
                <MazeMenu onMazeSelect={setSelectedMazeId} selectedMazeId={selectedMazeId}/>
                <MazeCreator setSelectedMazeId={setSelectedMazeId}/>
            </div>
            <div className="right-container">
                <MazePreview selectedMaze={selectedMazeId} setSelectedMaze={setSelectedMazeId} />
            </div>
        </div>
    );
}

export default LandingPage;