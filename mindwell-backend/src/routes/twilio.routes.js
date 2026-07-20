// src/routes/twilio.routes.js
const express = require('express');
const router = express.Router();
const { generateVideoToken } = require('../controllers/twilio.controller');
const { protect } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(protect);

// Generate Twilio Video token
router.post('/video-token', generateVideoToken);

module.exports = router;