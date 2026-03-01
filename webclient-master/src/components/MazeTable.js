import React from 'react';
import './Table.css';

import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';

const BASE_API_URL = process.env.REACT_APP_BASE_API_URL || `http://localhost:8080`;

const MazeTable = ( {onMazeSelect, selectedMazeId} ) => {
    const { user, _ } = useAuth();
    const [error, setError] = useState();
    const [isLoading, setIsLoading] = useState(false);
    const [mazes, setMazes] = useState([]);

    useEffect(() => {
        const fetchMazes = async () => {
            setIsLoading(true);
            
            try {
                const res = user ? await fetch(`${BASE_API_URL}/maze`, {headers:{"Authorization":`Bearer ${user.token}`}}) 
                            : await fetch(`${BASE_API_URL}/maze`);
                
                if (res.status !== 200) {
                    console.log("err");
                    throw new Error(await res.text());
                }
                const mazeJSON = await res.json();
                setMazes(mazeJSON);
            } catch (err) {
                setError(err.message);
            }
            
        };

        fetchMazes();
        setIsLoading(false);
    }, [selectedMazeId, user]);
  
    return (
            <div className='maze-table-container'>
                <table className="menu-table">
                    <thead className='menu-table-head'>
                        <tr>
                            <th>Maze Name</th>
                            <th>Owner</th>
                            <th>Filename</th>
                        </tr>
                    </thead>
                    <tbody>
                        {error ? <tr><td colSpan='3'>Error fetching mazes! ({error})</td></tr> : 
                        isLoading ? <tr><td colSpan='3'>Loading...</td></tr> : mazes.map((maze) => (
                            <tr key={maze.maze_id} 
                                className={selectedMazeId === maze.maze_id ? 'menu-row highlighted' : 'menu-row'}
                                onClick={() => onMazeSelect(maze.maze_id)}>
                                
                                <td>{maze.maze_name}</td>
                                <td>{maze.owner_username ? maze.owner_username : "All"}</td>
                                <td>{maze.file_path}</td>

                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
    );
}

export default MazeTable;
