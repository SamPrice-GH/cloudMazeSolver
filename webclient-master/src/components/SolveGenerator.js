import React, { useEffect, useState } from "react";
import './SolveGenerator.css';
import { useAuth } from "../AuthContext";

const BASE_API_URL = process.env.REACT_APP_BASE_API_URL || `http://localhost:8080`;
const BASE_SOLVER_URL = process.env.REACT_APP_BASE_SOLVER_URL || `http://localhost:5000`;

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

const SolveGenerator = ( {mazeID, algoKey, selectedSolve, setSelectedSolve} ) => {
    const { user, _ } = useAuth();
    const [selectedAlgo, setSelectedAlgo] = useState('bfs');
    const [newSolve, setNewSolve] = useState();
    const [error, setError] = useState(null);

    useEffect(() => {
        if (newSolve) {
            if (newSolve.solve !== selectedSolve) {
                setNewSolve(null);
            }
        }
    }, [selectedSolve])

    const handleSolveGen = async (e) => {
        e.preventDefault();

        const solveJobRes = user ? await fetch(`${BASE_API_URL}/solve/maze/${mazeID}?algo=${selectedAlgo}`, {headers:{"Authorization":`Bearer ${user.token}`}})
                        : await fetch(`${BASE_API_URL}/solve/maze/${mazeID}?algo=${selectedAlgo}`);
        if (solveJobRes.status !== 201) {
            setError(await solveJobRes.text());
        }
        else {
            setError(null);
            const solveJobJSON = await solveJobRes.json();
            console.log(solveJobJSON);
            const jobId = solveJobJSON.jobID;
    
            // Poll the maze solver for job status
            console.log("got job id, polling solver...");
            pollSolveStatus(jobId);
        }
    }

    // helper function for polling job status
    const pollSolveStatus = (jobId) => {
        const intervalId = setInterval(async () => {
            try {
                // !!!!!!!!!!!!!!!!!!!!!!!! HARDCODED URL !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                const statusRes = await fetch(`${BASE_SOLVER_URL}/status/${jobId}`);
                if (statusRes.status === 200) {
                    const statusJSON = await statusRes.json();
                    
                    if (statusJSON.status === 'completed') {
                        // stop and assign on completion
                        clearInterval(intervalId);  
                        setNewSolve(statusJSON.result);  
                        setSelectedSolve(statusJSON.result.solve);
                    }
                } else {
                    setError('Error retrieving job status');
                    clearInterval(intervalId);  
                }
            } catch (error) {
                console.error("Error polling job status:", error);
                setError("Unable to fetch job status");
                clearInterval(intervalId);
            }
        }, 500);  // poll every 500ms
    }

    const getAlgoFullName = (algoShort) => {
        for (let i=0; i < algoKey.length; i++) {
            if (algoKey[i].algo_reference === algoShort) {return algoKey[i].algo_name;}
        }

        return "Unknown";
    };

    return (
        <div className="solve-generator-container">
            <h1 style={{marginTop: `0px`, textAlign:`left`}}>Generate A New Solve</h1>
            <div className="solve-generator-form-container">
                <form onSubmit={handleSolveGen}>
                    <label for="algo_select">Solve this maze with a </label>
                        <select id="algo_select" name="algo_select" onChange={(e) => setSelectedAlgo(e.target.value)}>
                            {algoKey.map((algo, index) => (
                                <option key={index} value={algo.algo_reference}>{algo.algo_name}</option>
                            ))}
                        </select>
                        <input style={{marginLeft: `10px`}} type='submit' />
                </form>
            </div>
            {error ?  
            <div style={{textAlign:`center`}}><p><strong>{error}</strong></p></div>
            : 
            newSolve ?
                <div style={{marginTop:`10px`}}>
                    <p><strong>{newSolve.message}</strong></p>
                    <p>In {smartMsToString(newSolve.solve.solve_time_ms)} ({newSolve.solve.iterations_taken} iterations), {getAlgoFullName(newSolve.solve.algorithm_used)} found a {newSolve.solve.solution_length} move solution. </p>
                {/* <table style={{textAlign:`center`, tableLayout:`fixed`}}>
                    <thead>
                        <tr>
                            <th colSpan={4}>{newSolve.message}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>{selectedAlgo}</td>
                            <td>{newSolve.solve.solution_length} moves</td>
                            <td>{smartMsToString(newSolve.solve.solve_time_ms)}</td>
                            <td>{newSolve.solve.iterations_taken} iterations taken</td>
                        </tr>
                    </tbody>
                </table>  */}
                </div>
                : 
                ''}
        </div>
    );
};

export default SolveGenerator;