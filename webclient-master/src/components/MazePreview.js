import React, { useEffect, useState } from 'react';
import './MazePreview.css';
import RenderedMaze from './RenderedMaze';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const BASE_API_URL = process.env.REACT_APP_BASE_API_URL || `http://localhost:8080`;

function smartMsToString(elaspedMs) {
    let elapsedTime = new Date(elaspedMs);

    if (elapsedTime.getMinutes() !== 0) {
        return `${elapsedTime.getMinutes()}m ${elapsedTime.getSeconds()}s ${elapsedTime.getMilliseconds()}ms`;
    }
    else if (elapsedTime.getSeconds() !== 0) {
        return `${elapsedTime.getSeconds()}s ${elapsedTime.getMilliseconds()}ms`;
    }
    else {
        return `${elapsedTime.getMilliseconds()}ms`;
    }
}

const MazePreview = ({ selectedMaze, setSelectedMaze }) => {
    const {user, _} = useAuth();
    const [error, setError] = useState();
    const [isLoading, setIsLoading] = useState(false);
    const [mazeInfo, setMazeInfo] = useState(null);
    const [maze, setMaze] = useState(null);
    const [solves, setSolves] = useState([]);
    const [algoKey, setAlgoKey] = useState([]);

    let navigate = useNavigate();

    useEffect(() => {
        const fetchMazeInfo = async () => {
            setIsLoading(true);

            console.log("debug: fetching from ", BASE_API_URL);
            console.log(document.location)
            
            try {
                // request info and solves
                const res = user ? await fetch(`${BASE_API_URL}/maze/${selectedMaze}`, {headers:{"Authorization":`Bearer ${user.token}`}})
                            : await fetch(`${BASE_API_URL}/maze/${selectedMaze}`);
                if (res.status !== 200) { throw new Error(await res.text()) }
                const resJSON = await res.json();
                
                setMazeInfo(resJSON.maze);

                // sort solves
                if (resJSON.solves.length !== 0) {
                    const comapreSolves = (a, b) => {
                        if (a.solution_length === b.solution_length) {
                            if (a.solve_time_ms === b.solve_time_ms) {
                                if (a.iterations_taken === b.iterations_taken) { return 0; }
                                else { return a.iterations_taken < b.iterations_taken ? -1 : 1; }
                            }
                            else { return a.solve_time_ms < b.solve_time_ms ? -1 : 1; }
                        }
                        else { return a.solution_length < b.solution_length ? -1 : 1; }
                    }

                    setSolves(resJSON.solves.toSorted(comapreSolves));
                }
                else {
                    const noSolvesPlaceholder = [
                        {
                            solve_id: "No solves yet!",
                            maze_id: "N/A",
                            algorithm_used: "N/A",
                            solution: [],
                            solve_time_ms: 0,
                            solution_length: 0,
                            iterations_taken: 0
                        }
                    ]
                    
                    setSolves(noSolvesPlaceholder);
                }
                

                // request file content
                // first, get S3 presigned url
                const presignedRes = user ? await fetch(`${BASE_API_URL}/maze/${selectedMaze}/file`, {headers:{"Authorization":`Bearer ${user.token}`}})
                                : await fetch(`${BASE_API_URL}/maze/${selectedMaze}/file`);
                const presignedResJSON = await presignedRes.json();
                if (presignedRes.status !== 200) { throw new Error(presignedResJSON); }
                
                // then, fetch maze content using that url
                const fileRes = await fetch(presignedResJSON.presignedURL);
                const fileText = await fileRes.text();
                //console.log("Raw: ", fileText);
                const mazeArr = fileText.split('\n').map(row => row.split(',').map(cell => parseInt(cell.trim())));
                //console.log("Parsed: ", mazeArr);
                setMaze(mazeArr);

                // request algorithms
                const algoRes = await fetch(`${BASE_API_URL}/solve/algos`);
                const algoResJSON = await algoRes.json();
                if (algoRes.status !== 200) { throw new Error(await algoRes.text()) }
                setAlgoKey(algoResJSON);

                
                setError(null)
            } catch (err) {
                setError(`${err.message.toLowerCase()}`);
            }
            
        };

        
        if (selectedMaze) {
            fetchMazeInfo();
            setIsLoading(false);
        }
    }, [selectedMaze, user]);

    const getAlgoFullName = (algoShort) => {
        for (let i=0; i < algoKey.length; i++) {
            if (algoKey[i].algo_reference === algoShort) {return algoKey[i].algo_name;}
        }

        return "Unknown";
    };

    const handleDeleteMaze = async () => {
        if (!user || !user.isAdmin) {
                alert("Only admin users can delete records!");
            }
        else {
            const deleteRes = await fetch(`${BASE_API_URL}/maze/delete/${selectedMaze}`, {
                method: "DELETE",
                headers: {
                    "Authorization":`Bearer ${user.token}`
                }
            })
            if (deleteRes.status !== 200) {
                alert(`Something went wrong trying to delete this maze! (${(await deleteRes.text())})`);
            }
            else {
                setSelectedMaze(null);  
            }
        }
    }
    
    return (
        <div className="maze-preview-container">
            {error ? <div style={{display:`flex`, justifyContent:`center`, alignItems:`center`, height:`100%`}}>Error fetching maze info! ({error})</div> :
            (selectedMaze === null || maze === null || (mazeInfo !== null && mazeInfo.maze_id !== selectedMaze))  ? <p></p> :
             isLoading ? <div>Loading...</div> : (
                <div>
                    <h2 className="maze-preview-title">Maze Preview: {mazeInfo.maze_name}</h2>
                    <RenderedMaze mazeData={maze} />
                    <div>
                        <table className='maze-preview-details'>
                            <thead>
                                <tr>
                                    <th colSpan={2}>Maze Details</th>
                                    <th colSpan={2}>Best Solve (Shortest)</th>
                                </tr>
                            </thead>
                                <tbody>
                                <tr>
                                    <td colSpan={2}><strong>Maze ID:</strong> {mazeInfo.maze_id}</td>
                                    <td colSpan={2}><strong>Solve ID:</strong> {solves[0].solve_id}</td>
                                </tr>
                                <tr>
                                    <td colSpan={2}><strong>Dimensions:</strong> {maze[0].length} by {maze.length}</td>
                                    <td colSpan={2}><strong>Algorithm:</strong> {getAlgoFullName(solves[0].algorithm_used)}</td>
                                </tr>
                                <tr>
                                    <td colSpan={2}><strong>Owner:</strong> {mazeInfo.owner_username ? mazeInfo.owner_username : "All"}</td>
                                    <td colSpan={2}><strong>Length:</strong> {solves[0].solution_length} moves</td>
                                </tr>
                                <tr>
                                    <td colSpan={2}><strong>Filename:</strong> {mazeInfo.file_path}</td>
                                    <td colSpan={2}><strong>Computation Time:</strong> {smartMsToString(solves[0].solve_time_ms)}</td>
                                </tr>
                                <tr>
                                    <td colSpan={2}><strong>Num. Solves:</strong> {solves.length === 1 ? solves[0].iterations_taken === 0 ? 0 : 1 : solves.length}</td>
                                    <td colSpan={2}><strong>Iterations Taken:</strong> {solves[0].iterations_taken}</td>
                                </tr>
                                
                                <tr className='button-row' style={{textAlign: `center`}}>
                                    <td colSpan={2}><button className='delete-button' onClick={handleDeleteMaze}>Delete</button></td>
                                    <td colSpan={2}><button onClick={() => navigate("/solve")}>Solve</button></td>
                                </tr>
                            </tbody>
                        </table>
                        
                        
                        <p></p>
                        
                        <p></p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MazePreview;