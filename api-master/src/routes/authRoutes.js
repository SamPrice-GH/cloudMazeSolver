const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// this endpoint only exists because i don't want to configure webpack 5
// to polyfill in my webclient
router.post('/verify-token', authController.verify_token);

module.exports = router;
