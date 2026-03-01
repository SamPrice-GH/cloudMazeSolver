import React, {  useState } from "react";
import './MazeCreator.css';
import { useAuth } from "../AuthContext";

const BASE_API_URL = process.env.REACT_APP_BASE_API_URL || `http://localhost:8080`;

const MazeCreator = ({ setSelectedMazeId, setRefreshMazeTable }) => {
    const {user, _} = useAuth();
    const [formInputs, setFormInputs] = useState({});
    const [formFile, setFormFile] = useState(null);

    const handleMazeCreate = async (e) => {
        e.preventDefault();
        
        const formData = new FormData();

        formData.append("maze_name", formInputs.maze_name);
        if (formInputs.hasOwnProperty("private")) { formData.append("private", formInputs.private); }
        formData.append("maze_file", formFile);

        // console.log("Sent: ");
        // for(var pair of formData.entries()) {
        //     console.log(pair[0] + ": " + pair[1]);
        // }
        const createRes = await fetch(`${BASE_API_URL}/maze/create`, {
            method: "POST",
            body: formData,
            headers: user ? { "Authorization":`Bearer ${user.token}` } : {}
        })
        if (createRes.status !== 201) {
            alert(`Something went wrong creating the maze! (${(await createRes.text())})`);
        }
        else {
            const createResJSON = await createRes.json();
            setSelectedMazeId(createResJSON.maze_id);
        }
    };

    const handleFormChange = (e) => {
        
        let intermediateFormInputs = {...formInputs};
        
        const name = e.target.name;
        const value = e.target.value;
        if (name==="private") {
            ;
            if (intermediateFormInputs.hasOwnProperty("private")) { intermediateFormInputs.private = !intermediateFormInputs.private; }
            else { intermediateFormInputs.private = true; }  
        }
        else { intermediateFormInputs = {...intermediateFormInputs, [name]: value}; }
        
        setFormInputs(intermediateFormInputs);

    }

    return (
        <div className="maze-creator-container">
            <h3 style={{marginTop:`0px`}}>Upload your own maze!</h3>
            <form onSubmit={handleMazeCreate}>
                <table className="maze-creator-table">
                    <tbody>
                        <tr>
                            <td><strong>Maze Name</strong></td>
                            <td><input type="text" name="maze_name" maxLength={25} onChange={handleFormChange} required/></td>
                            <td rowSpan={3}>
                                Note: Maze files should be uploaded as a CSV with '1's representing path
                                cells and '0's representing wall cells. The start of the maze must be
                                the top left cell and the goal the bottom right cell.
                            </td>
                        </tr>
                        <tr>
                            <td><strong>Make Private?</strong></td>
                            <td>{user ? <input type="checkbox" name="private" onChange={handleFormChange}/> :
                                        <p style={{fontSize:`0.75rem`}}> (login required) </p>}</td>
                        </tr>
                        <tr>
                            <td><strong>Maze (.csv)</strong></td>
                            <td><input style={{marginLeft:`15%`}} type="file" name="maze_file" accept=".csv" onChange={(e) => {setFormFile(e.target.files[0]); console.log(formFile)}} required/></td>
                        </tr>
                        <tr>
                            <td colSpan={3}><input type="submit"/></td>
                        </tr>
                    </tbody>
                </table>
            </form>
        </div>
    );
};

export default MazeCreator;