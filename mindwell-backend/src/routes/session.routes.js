// src/routes/session.routes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const sessionController = require('../controllers/session.controller');

// ─── ⚠️ CRITICAL: SEARCH MUST BE THE FIRST ROUTE! ───

// 1. ✅ SEARCH - MUST BE FIRST!
router.get('/search', protect, sessionController.searchTherapists);

// 2. My sessions
router.get('/my', protect, sessionController.getMySessions);

// 3. Psychiatrist availability
router.get('/psychiatrist/availability/:id', protect, sessionController.getAvailability);

// 4. Psychiatrist profile
router.get('/psychiatrist/:id', protect, sessionController.getPsychiatristProfile);

// 5. Book session
router.post('/book', protect, authorize('patient'), sessionController.bookSession);

// 6. Rate session
router.post('/rate/:id', protect, authorize('patient'), sessionController.rateSession);

// 7. Cancel session
router.delete('/cancel/:id', protect, sessionController.cancelSession);

// 8. ⚠️ GET /:id MUST BE ABSOLUTELY LAST!
router.get('/:id', protect, sessionController.getSession);

module.exports = router;