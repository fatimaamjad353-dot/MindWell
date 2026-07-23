const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
    getTherapistRecommendations,
    getResourceRecommendations,
    getPatientSummary,
    getPsychologistPatientSummary
} = require('../controllers/recommender.controller');

// ✅ Patient only routes
router.post('/recommend', protect, authorize('patient'), getTherapistRecommendations);
router.get('/triage', protect, authorize('patient'), getPatientSummary);
router.get('/resources/:diagnosis', protect, getResourceRecommendations);

// ✅ Psychiatrist route — NO authorize restriction, just protect
router.get('/psychologist-summary/:patientId', protect, getPsychologistPatientSummary);

// Test route
router.get('/test', protect, (req, res) => {
    res.json({ success: true, message: 'Recommender working!', user: req.user });
});

module.exports = router;