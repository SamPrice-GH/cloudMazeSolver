import React, { useEffect } from 'react';
import './SolveMenu.css';
import './Table.css';

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


const SolveMenu = ( {mazeInfo, solveArr, algoKey, selectedSolve, setSelectedSolve} ) => {
    
    useEffect(() => {
        console.log(`Solve Menu Solve Changed!`);
        console.log(selectedSolve);


        console.log("Solve Arr:");
        console.log(solveArr);
    }, [selectedSolve, solveArr])

    const getAlgoFullName = (algoShort) => {
        for (let i=0; i < algoKey.length; i++) {
            if (algoKey[i].algo_reference === algoShort) {return algoKey[i].algo_name;}
        }

        return "Unknown";
    };

    return (
        <div className="solve-menu-container"><div className='solve-menu-content'>
        
            <h1 style={{flex: `1`, marginBottom:`10px`}} className="solve-menu-title">Solves for '{mazeInfo.maze_name}'</h1>
            <div className='solve-table-container'>
                <table className="menu-table">
                    <thead className='menu-table-head'>
                        <tr>
                            <th>Rank</th>
                            <th>Algorithm</th>
                            <th>Length</th>
                            <th>Solve Time</th>
                            <th>Iterations</th>
                        </tr>
                    </thead>
                    <tbody>
                        {solveArr.length > 0 ? solveArr[0].iterations_taken !== 0 ?
                        solveArr.map((solve, index) => (
                            <tr key={solve.solve_id} 
                                className={solve === selectedSolve ? 'menu-row highlighted' : 'menu-row'}
                                onClick={() => setSelectedSolve(solve)}>
                                
                                <td>#{index+1}</td>
                                <td>{getAlgoFullName(solve.algorithm_used)}</td>
                                <td>{solve.solution_length} moves</td>
                                <td>{smartMsToString(solve.solve_time_ms)}</td>
                                <td>{solve.iterations_taken}</td>

                            </tr>
                        ))
                        :
                            <tr className='menu-row disabled' style={{textAlign:`center`}}>
                                <td colSpan={5}>No solves yet...</td>
                            </tr>
                        :
                            <tr className='menu-row disabled' style={{textAlign:`center`}}>
                                <td colSpan={5}>No solves yet...</td>
                            </tr>
                        }
                    </tbody>
                </table>
            </div>
        </div></div>
    );
}

export default SolveMenu;
