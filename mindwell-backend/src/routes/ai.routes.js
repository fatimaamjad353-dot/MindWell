// src/routes/ai.routes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
    sendMessage,
    getChatHistory,
    getSingleChat,
    getRiskScore,
    endUser
} = require('../controllers/ai.controller');

// All routes are protected
router.use(protect);

// ─── Chat Routes ──────────────────────────────────
router.post('/chat', sendMessage);
router.get('/history', getChatHistory);           // GET all history
router.get('/history/:id', getSingleChat);       // ← GET single chat by ID
router.get('/risk', getRiskScore);
router.delete('/end/:userId', endUser);

module.exports = router;