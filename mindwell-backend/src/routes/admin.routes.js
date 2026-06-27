// src/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// ─── Auth Routes (No Protection) ─────────────────────────────
router.post('/register', adminController.registerAdmin);
router.post('/login', adminController.loginAdmin);

// ─── All routes below require authentication and admin role ──
router.use(protect);
router.use(authorize('admin'));

// ─── Dashboard ────────────────────────────────────────────────
router.get('/dashboard', adminController.getDashboardStats);

// ─── Patient Management ──────────────────────────────────────
router.get('/patients', adminController.getAllPatients);
router.put('/patients/suspend/:id', adminController.suspendPatient);

// ─── Psychiatrist Management ─────────────────────────────────
router.get('/psychiatrists', adminController.getAllPsychiatrists);
router.get('/psychiatrists/pending', adminController.getPendingPsychiatrists);
router.put('/psychiatrists/verify/:id', adminController.verifyPsychiatrist);
router.put('/psychiatrists/suspend/:id', adminController.suspendPsychiatrist);

// ─── Session & Payment Management ────────────────────────────
router.get('/sessions', adminController.getAllSessions);
router.get('/payments', adminController.getAllPayments);

module.exports = router;