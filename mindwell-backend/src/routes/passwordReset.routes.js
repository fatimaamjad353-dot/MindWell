// src/routes/passwordReset.routes.js
const express = require('express');
const router = express.Router();
const {
    requestPasswordReset,
    verifyResetOTP,
    resetPassword
} = require('../controllers/passwordReset.controller');

// Request password reset — sends OTP to email
router.post('/request', requestPasswordReset);

// Verify OTP
router.post('/verify-otp', verifyResetOTP);

// Reset password with OTP
router.post('/reset', resetPassword);

module.exports = router;