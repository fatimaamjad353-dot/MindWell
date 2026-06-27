// src/routes/mood.routes.js
const express = require('express');
const router = express.Router();
const {
  logMood,
  getAllMoods,
  getTodayMood,
  getWeeklySummary,
  getMonthlySummary,
  deleteMoodEntry
} = require('../controllers/mood.controller');

const { protect } = require('../middleware/auth.middleware');

// ─── All routes require authentication ──────────────────────
router.post('/log', protect, logMood);
router.get('/all', protect, getAllMoods);
router.get('/today', protect, getTodayMood);
router.get('/weekly', protect, getWeeklySummary);
router.get('/monthly', protect, getMonthlySummary);
router.delete('/:id', protect, deleteMoodEntry);

module.exports = router;