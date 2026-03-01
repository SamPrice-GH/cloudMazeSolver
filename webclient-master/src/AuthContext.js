import { createContext, useContext, useState, useEffect } from "react";
import { CognitoIdentityProviderClient, InitiateAuthCommand, SignUpCommand, AuthFlowType } from "@aws-sdk/client-cognito-identity-provider";
//import { CognitoJwtVerifier } from "aws-jwt-verify";
import './AuthContext.css';
import { useLocation, useNavigate } from "react-router-dom";
import { useCookies } from 'react-cookie';

const AuthContext = createContext(null);

const COGNITO_USERPOOL_ID = process.env.REACT_APP_COGNITO_USER_POOL_ID;
const COGNITO_CLIENT_ID = process.env.REACT_APP_COGNITO_CLIENT_ID;
const cognitoClient = new CognitoIdentityProviderClient({ region: 'ap-southeast-2' });

const BASE_API_URL = process.env.REACT_APP_BASE_API_URL || `http://localhost:8080`;

// CognitoJwtVerifier utilises crypto module which returns undefined in non-https environments
// localhost is considered secure but when hosting on ec2 this will fail. there is no work around.

// const accessVerifier = CognitoJwtVerifier.create({
//     userPoolId: COGNITO_USERPOOL_ID,
//     tokenUse: "access",
//     clientId: COGNITO_CLIENT_ID,
// });
  
// const idVerifier = CognitoJwtVerifier.create({
//     userPoolId: COGNITO_USERPOOL_ID,
//     tokenUse: "id",
//     clientId: COGNITO_CLIENT_ID,
// });

export const signUp = async (username, password, email) => {
    try {
        const command = new SignUpCommand({
            ClientId: COGNITO_CLIENT_ID,
            Username: username,
            Password: password,
            UserAttributes: [{ Name: "email", Value: email }],
        });

        const response = await cognitoClient.send(command);
        console.log("Sign up success: ", response);
    } catch (err) {
        console.log("Error during sign up: ", err);
        throw err;
    }
}

export const signIn = async (username, password) => {
    try {
        const command = new InitiateAuthCommand({
            AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
            AuthParameters: {
              USERNAME: username,
              PASSWORD: password,
            },
            ClientId: COGNITO_CLIENT_ID,
          });
        
        const authResponse = await cognitoClient.send(command);
        const IdToken = authResponse.AuthenticationResult.IdToken;
        
        const { loggedInUser, isAdmin, bearerToken } = await getUserAndVerifyToken(IdToken);

        return { loggedInUser, isAdmin, bearerToken }
    } catch (err) {
        console.log("Error logging in: ", err);
        throw err;
    }
}

const getUserAndVerifyToken = async (token) => {
    // can't use CognitoJWTVerifier so use endpoint on api to avoid
    // configuring annoying webpack 5 stuff
    const verifyTokenRes = await fetch(`${BASE_API_URL}/auth/verify-token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ "token":token })
    });

    if (verifyTokenRes.status !== 200) {
        if (verifyTokenRes.status === 401) { throw new Error("Invalid or expired token."); }
        else { throw new Error("API returned unhandled error when trying to verify token."); }
    }

    const verifiedToken = await verifyTokenRes.json();
    
    // set custom QoL props used throughout webclient
    let isAdmin = false;
    if (verifiedToken.hasOwnProperty("cognito:groups") &&
        verifiedToken["cognito:groups"].includes("admin")) {
        isAdmin = true;
    }

    return {loggedInUser:verifiedToken["cognito:username"], isAdmin, bearerToken:token}
}

export const AuthProvider = ({children}) => {
    const [user, setUser] = useState(null);
    const [cookies, setCookie, removeCookie] = useCookies(['userSession']);

    const navigate = useNavigate();
    const location = useLocation();

    const logoutUser = () => {
        setUser(null);
        removeCookie("userSession");
    }

    useEffect(() => {
        const setUserFromCookie = async () => {
            const { loggedInUser, isAdmin, bearerToken } = await getUserAndVerifyToken(cookies.userSession);
            setUser({username:loggedInUser, isAdmin, token:bearerToken});
        }

        if (!user && cookies.userSession) {
           setUserFromCookie();
        }
    }, [cookies]);

    return (
        <AuthContext.Provider value={{user, setUser}}>
            <div className="nav-buttons"> 
                { (location.pathname !== "/maze") ? <div className="back-box" onClick={() => navigate(-1)}><strong>Back</strong></div> : <></> }
                { (location.pathname !== "/login") ? user ?
                    <div className="auth-box" onClick={logoutUser}>Logout (currently <strong>{user.username}</strong>{user.isAdmin ? <i> - admin</i> : ''})</div>
                :
                    <div className="auth-box" onClick={() => navigate("/login")}>Login</div>
                :
                    <></>
                }
            </div>
            
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
}