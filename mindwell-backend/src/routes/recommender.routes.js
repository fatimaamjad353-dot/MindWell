// src/routes/recommender.routes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');

// Import the correct functions from your controller
const {
    getTherapistRecommendations,
    getResourceRecommendations,
    getPatientSummary,
    getPsychologistPatientSummary
} = require('../controllers/recommender.controller');

// All routes are protected (require authentication)
router.use(protect);

// ─── Recommender Routes ─────────────────────────────

// Get therapist recommendations
router.post('/recommend', getTherapistRecommendations);

// Get resource recommendations for a diagnosis
router.get('/resources/:diagnosis', getResourceRecommendations);

// Get patient summary (triage)
router.get('/triage', getPatientSummary);

// Get psychologist's view of patient summary
router.get('/psychologist-summary/:patientId', getPsychologistPatientSummary);

// Test route
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Recommender route is working!',
        user: req.user
    });
});

module.exports = router;