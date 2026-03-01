const asyncHandler = require('express-async-handler');
const { manuallyVerifyToken } = require("../middleware/authMiddleware.js");

// verify cognito issued idToken
// see comments in authMiddleware and authRoutes about this if confused
exports.verify_token = asyncHandler(async (req, res) => {
    const { token } = req.body;

    try {
        const verifiedToken = await manuallyVerifyToken(token);  
        res.status(200).json(verifiedToken); 
    } catch (err) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
});