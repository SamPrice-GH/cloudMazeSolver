import React, { useState } from 'react';
import './LoginPage.css';
import { useAuth, signUp, signIn } from '../AuthContext';
import { CognitoIdentityProviderClient, InitiateAuthCommand, SignUpCommand, ConfirmSignUpCommand, InvalidPasswordException, NotAuthorizedException } from "@aws-sdk/client-cognito-identity-provider";
import { useNavigate } from 'react-router-dom';
import { useCookies } from "react-cookie";

const LoginPage = () => {
    const [cookies, setCookie, removeCookie] = useCookies(['userSession']);
    const { _, setUser } = useAuth();
    const [isRegister, setisRegister] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [confirmationMessage, setConfirmationMessage] = useState(null);
    const [error, setError] = useState(null);

    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();

        console.log(username, password);
        try {
            const {loggedInUser, isAdmin, bearerToken} = await signIn(username, password);
            setError(null);
            setConfirmationMessage(`Successfully logged in as '${loggedInUser}'! Redirecting...`);
            setCookie("userSession", bearerToken, {path: '/', maxAge: 3600});
            setUser({username:loggedInUser, isAdmin, token:bearerToken});
            setTimeout(() => navigate("/maze"), 3000);

        } catch (err) {
            setConfirmationMessage(null);
            if (err instanceof NotAuthorizedException) {
                setError({error: err, message: "Incorrect username or password."});
            }
            else if (err.message === "Invalid or expired token.") {
                setError({error: err, message: "Successful login but couldn't verify token returned from Cognito."});
                console.log(err);
            }
            else {
                setError({err: err, message: "Unhandled login error. Check console for more info."});
                console.error(err);
            }
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();

        try {
            await signUp(username, password, email);
            setError(null);
            setConfirmationMessage(`Successfully registered user '${username}'! Manually confirm in AWS Console before continuing.`);
            setUsername('');
            setPassword('');
            setEmail('');
        }
        catch (err) {
            setConfirmationMessage(null);
            if (err instanceof InvalidPasswordException) {
                setError({error: err, message: "Invalid password. Password must be at least 8 characters long and contain at least 1 number, uppercase letter, lowercase letter and symbol."});
            }
            else {throw err;}
        }
    }

    return (
        <div className="login-page">
            {isRegister ? 
                <div className="login-box">
                    <h2 style={{marginTop:`0px`}}>Register</h2>
                    <form onSubmit={handleRegister}>
                        <table style={{tableLayout:`fixed`}}>
                            <tbody>
                                <tr>
                                    <td>Email: </td>
                                    <td>
                                        <input
                                            type="text"
                                            id="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td>Username:</td>
                                    <td>
                                        <input
                                            type="text"
                                            id="username"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            required
                                        />
                                </td>
                                </tr>
                                <tr>
                                    <td>Password: </td>
                                    <td>
                                        <input
                                            type="password"
                                            id="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td colSpan={2}> <button style={{marginTop:`20px`}} type="submit">Sign Up</button> </td>
                                </tr>
                                <tr>
                                    <td colSpan={2}> <p>Already have an account? <span className="sign-in-up-text" onClick={() => { setisRegister(false); setError(null); setConfirmationMessage(null); }}>Sign In</span> </p> </td>
                                </tr>
                            </tbody>
                        </table>
                    </form>
                    {confirmationMessage &&
                        <div className='login-message confirmation'>
                            {confirmationMessage}
                        </div>
                    }
                    {error && 
                        <div className='login-message error'>
                            {error.message}
                        </div>
                    }
                </div>
            : 
                <div className="login-box">
                    <h2 style={{marginTop:`0px`}}>Login</h2>
                    <form onSubmit={handleLogin}>
                        <table style={{tableLayout:`fixed`}}>
                            <tbody>
                                <tr>
                                    <td>Username:</td>
                                    <td>
                                        <input
                                            type="text"
                                            id="username"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            required
                                        />
                                </td>
                                </tr>
                                <tr>
                                    <td>Password: </td>
                                    <td>
                                        <input
                                            type="password"
                                            id="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td colSpan={2}> <button style={{marginTop:`20px`}} type="submit">Login</button> </td>
                                </tr>
                                <tr>
                                    <td colSpan={2}> <p>Don't have an account? <span className="sign-in-up-text" onClick={() => { setisRegister(true); setError(null); setConfirmationMessage(null); }}>Sign Up</span> </p> </td>
                                </tr>
                            </tbody>
                        </table>
                    </form>
                    {confirmationMessage &&
                        <div className='login-message confirmation'>
                            {confirmationMessage}
                        </div>
                    }
                    {error && 
                        <div className='login-message error'>
                            {error.message}
                        </div>
                    }
                </div>
            }
        </div>
    );
};

export default LoginPage;