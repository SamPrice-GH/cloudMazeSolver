import { useState, useEffect } from 'react';
import './SolvePage.css';
import SolveMenu from '../components/SolveMenu';
import SolvePreview from '../components/SolvePreview';
import SolveGenerator from '../components/SolveGenerator';
import { useAuth } from '../AuthContext';

const BASE_API_URL = process.env.REACT_APP_BASE_API_URL || `http://localhost:8080`;

const SolvePage = ({ selectedMazeId }) => {
    const {user, _} = useAuth();
    const [error, setError] = useState();
    const [isLoading, setIsLoading] = useState(false);
    const [mazeInfo, setMazeInfo] = useState(null);
    const [maze, setMaze] = useState(null);
    const [solves, setSolves] = useState([]);
    const [algoKey, setAlgoKey] = useState([]);
    const [selectedSolve, setSelectedSolve] = useState(null);

    useEffect(() => {
        
        const fetchMazeInfo = async () => {
            setIsLoading(true);
            
            try {

                // request info and solves
                const res = user ? await fetch(`${BASE_API_URL}/maze/${selectedMazeId}`, {headers:{"Authorization":`Bearer ${user.token}`}})
                            : await fetch(`${BASE_API_URL}/maze/${selectedMazeId}`);
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
                const presignedRes = user ? await fetch(`${BASE_API_URL}/maze/${selectedMazeId}/file`, {headers:{"Authorization":`Bearer ${user.token}`}})
                                : await fetch(`${BASE_API_URL}/maze/${selectedMazeId}/file`);
                const presignedResJSON = await presignedRes.json();
                if (presignedRes.status !== 200) { throw new Error(presignedResJSON); }
                
                // then, fetch maze content using that url
                const fileRes = await fetch(presignedResJSON.presignedURL);
                const fileText = await fileRes.text();
                const mazeArr = fileText.split('\n').map(row => row.split(',').map(cell => parseInt(cell.trim())));
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

        
        if (selectedMazeId) {   
            fetchMazeInfo();
            setIsLoading(false);
        }
    }, [selectedMazeId, user]);
    
    return (<div>
        
            {(selectedMazeId === null || maze === null || mazeInfo === null)  ? <p style={{height:`100vh`}}></p> : 
            error ? <div style={{display:`flex`, justifyContent:`center`, alignItems:`center`, color:`#fff`, height:`100vh`}}><p>Error fetching maze info! ({error})</p></div> :
            isLoading ? 
                <div>Loading</div>
            : 
                <div className='solve-page'>
                    <div className='left-container'>
                        <SolveMenu mazeInfo={mazeInfo} 
                            solveArr={solves} 
                            algoKey={algoKey} 
                            selectedSolve={selectedSolve}
                            setSelectedSolve={setSelectedSolve}/>
                        <SolveGenerator mazeID={selectedMazeId} 
                            algoKey={algoKey} 
                            selectedSolve={selectedSolve}
                            setSelectedSolve={setSelectedSolve}/>
                    </div>
                    <div className='right-container'>
                        <SolvePreview mazeData={maze} 
                        selectedSolve={selectedSolve} 
                        setSelectedSolve={setSelectedSolve}
                        solvesArr={solves}
                        setSolvesArr={setSolves} />
                    </div>
                </div>
            }
    </div>);
}

export default SolvePage;