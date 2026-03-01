import React, { useEffect } from 'react';
import './SolvePreview.css';
import RenderedMaze from './RenderedMaze';
import { useAuth } from '../AuthContext';

const BASE_API_URL = process.env.REACT_APP_BASE_API_URL || `http://localhost:8080`;

const SolvePreview = ({ mazeData, selectedSolve, setSelectedSolve, solvesArr, setSolvesArr }) => {
    const {user, _} = useAuth();

    useEffect(() => {
        console.log("SolvePreview solve changed:");
        console.log(selectedSolve);;
    }, [selectedSolve])

    const handleSolveSave = async () => {
        const saveRes = await fetch(`${BASE_API_URL}/solve/save`, {
            method: "POST",
            body: JSON.stringify({
                maze_id: selectedSolve.maze_id,
                algorithm_used: selectedSolve.algorithm_used,
                solution: selectedSolve.solution,
                solve_time_ms: selectedSolve.solve_time_ms,
                solution_length: selectedSolve.solution_length,
                iterations_taken: selectedSolve.iterations_taken
            }),
            headers: {
                "Content-Type":"application/json",
            }
        })
        
        if (saveRes.status !== 201) {
            alert(`Something went wrong trying to save this solve! (${(await saveRes.text())})`);
        }
        else {
            const saveResJSON = await saveRes.json();
            if (solvesArr[0].solve_id === 'No solves yet!') { setSolvesArr([saveResJSON]); }
            else { 
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

                setSolvesArr(values => [...values, saveResJSON].toSorted(comapreSolves)); 
            }
            
            setSelectedSolve(saveResJSON);
        }
    }

    const handleSolveDelete = async () => {
        if (!user || !user.isAdmin) {
            alert("Only admin users can delete records!");
        }
        else {
            const deleteRes = await fetch(`${BASE_API_URL}/solve/${selectedSolve.solve_id}`, {
                method: "DELETE",
                headers: {
                    "Authorization":`Bearer ${user.token}`
                }
            })
            if (deleteRes.status !== 200) {
                alert(`Something went wrong trying to delete this solve! (${(await deleteRes.text())})`);
            }
            else {
                
                const solveIdx = solvesArr.indexOf(selectedSolve);
                console.log(solvesArr);
                if (solveIdx > -1) { solvesArr.splice(solveIdx, 1); }
                console.log(solvesArr);
                setSelectedSolve(null);
                
            }
        }
    }

    return (
        <div className='solve-preview-container'>
            <h3 style={{textAlign:`center`, color:`#fff`}}>{selectedSolve ? `${selectedSolve.solution_length} Move Solve` : 'Select A Solve'} </h3>
            <RenderedMaze mazeData={mazeData} solve={selectedSolve} />
            <table className='button-container'>
                <tbody><tr>
                    <td><button {... (selectedSolve ? (selectedSolve.hasOwnProperty('solve_id') ? {className:'solve-preview-button', onClick:handleSolveDelete}  : {className:'disabled-button'}) : {className:'disabled-button'})}>Delete</button></td>
                    <td><button {... (selectedSolve ? (selectedSolve.hasOwnProperty('solve_id') ? {className:'disabled-button'}  : {className:'solve-preview-button', onClick:handleSolveSave}) : {className:'disabled-button'})}>Save</button></td>
                </tr></tbody>
            </table>
        </div>
    );
};

export default SolvePreview;