// src/routes/psychiatrist.routes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const psychiatristController = require('../controllers/psychiatrist.controller');

// All routes require psychiatrist auth
router.use(protect);
router.use(authorize('psychiatrist'));

// Dashboard
router.get('/dashboard', psychiatristController.getPsychiatristDashboard);

// Sessions
router.get('/sessions', psychiatristController.getPsychiatristSessions);
router.get('/sessions/pending', psychiatristController.getPendingRequests);
router.patch('/sessions/:id/confirm', psychiatristController.confirmSession);
router.patch('/sessions/:id/reject', psychiatristController.rejectSession);
router.patch('/sessions/:id/complete', psychiatristController.completeSession);

// Patients
router.get('/patients', psychiatristController.getMyPatients);

// Earnings
router.get('/earnings', psychiatristController.getEarnings);

// Feedback
router.get('/feedback', psychiatristController.getPatientFeedback);

module.exports = router;