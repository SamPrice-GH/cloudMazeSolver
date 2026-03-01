const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const asyncHandler = require('express-async-handler');

const COGNITO_USERPOOL_ID = process.env.REACT_APP_COGNITO_USER_POOL_ID;
const COGNITO_CLIENT_ID = process.env.REACT_APP_COGNITO_CLIENT_ID;
const COGNITO_REGION = "ap-southeast-2";
const JWK_URL = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USERPOOL_ID}/.well-known/jwks.json`;

// CognitoJwtVerifier utilises crypto module which returns undefined in non-https environments
// localhost is considered secure but when hosting on ec2 this will fail. there is no work around.

// const tokenVerifier = jwt.CognitoJwtVerifier.create({
//     userPoolId: COGNITO_USERPOOL_ID,
//     tokenUse: "id",
//     clientId: COGNITO_CLIENT_ID,
// });

// so this is to manually verify (in place of CognitoJWTVerifier)
exports.manuallyVerifyToken = async (token) => {
    try {
        // decode token & get key id
        const decodedToken = jwt.decode(token, { complete: true });
        const { kid } = decodedToken.header;

        // get matching JWK from cognito and convert to pem
        const jwks = await (await fetch(JWK_URL)).json();
        const jwk = jwks.keys.find(key => key.kid === kid);
        
        if (!jwk) { throw new Error("Token Key ID '${kid}' not in returned cognito JWKs."); }
        const pem = jwkToPem(jwk);

        // verify token
        const verifiedToken = jwt.verify(token, pem, {algorithms:["RS256"]});

        //console.log("Token verification successful: ", verifiedToken);
        return verifiedToken;
    }
    catch (err) {
        console.log("Error manually verifying token!");
        console.err(err);
        throw err;
    }
}

// forced authentification (request fails otherwise)
exports.forceAuth = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = await this.manuallyVerifyToken(token);

            // Attach user information to the request object
            req.user = decoded;

            // Amend .username  and .isAdmin property so we don't have to change rest of code
            req.user.username = req.user["cognito:username"];
            req.user.isAdmin = false;
            if (req.user.hasOwnProperty("cognito:groups") &&
                req.user["cognito:groups"].includes("admin")) 
                { req.user.isAdmin = true; }

            //console.log(`(currently authenticated as '${req.user.username}')`);
            next();
        } catch (error) {
            console.log('Token verification failed:', error.message);
            res.status(401).json({ message: 'Not authorised, token failed', error });
        }
    } else {
        res.status(401).json({ message: 'Not authorised, no token' });
    }
});

// routes will respond differently depending on auth
exports.optionalAuth = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = await this.manuallyVerifyToken(token);
            //console.log(decoded);

            // Attach user information to the request object
            req.user = decoded;
            //console.log(req.user["cognito:username"]);

            // Amend .username property so we don't have to change rest of code
            req.user.username = req.user["cognito:username"];
            req.user.isAdmin = false;
            if (req.user.hasOwnProperty("cognito:groups") &&
                req.user["cognito:groups"].includes("admin")) 
                { req.user.isAdmin = true; }
            //console.log(req.user.username);

            //console.log(`(currently authenticated as '${req.user.username}')`);
        } catch (error) {
            if (error.name === "TokenExpiredError") {
                res.append('auth-warning', 'Bearer token has expired, login again to get a new one.')
            }
            else {
                console.log('Token verification failed:', error.message);
            }
        }
    }

    next();
});

// must be admin
exports.adminAuth = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = await this.manuallyVerifyToken(token);

            // Attach user information to the request object
            req.user = decoded;

            // Amend .username property so we don't have to change rest of code
            req.user.username = req.user["cognito:username"];
            req.user.isAdmin = false;
            if (req.user.hasOwnProperty("cognito:groups") &&
                req.user["cognito:groups"].includes("admin")) 
                { req.user.isAdmin = true; }

            if (!req.user.isAdmin) {
                res.status(401).json({ message: 'Not authorised, admin only.' });
            }
            else {
                //console.log(`(currently authenticated as '${req.user.username}')`);
                next();
            }
        } catch (error) {
            console.error('Token verification failed:', error);
            res.status(401).json({ message: 'Not authorised, token failed' });
        }
    } else {
        res.status(401).json({ message: 'Not authorised, no token' });
    }
});