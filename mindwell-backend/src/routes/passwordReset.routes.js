// src/routes/passwordReset.routes.js
const express = require('express');
const router = express.Router();
const passwordResetController = require('../controllers/passwordReset.controller');

// ─── Password Reset Routes ─────────────────────────────────────

// Request password reset (send email with link)
router.post('/request', passwordResetController.requestPasswordReset);

// Verify reset token
router.get('/verify', passwordResetController.verifyResetToken);

// Reset password
router.post('/reset', passwordResetController.resetPassword);

module.exports = router;