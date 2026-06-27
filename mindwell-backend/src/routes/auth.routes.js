// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// ─── Patient Routes ──────────────────────────────────────────
router.post('/patient/register', authController.registerPatient);
router.post('/patient/login', authController.loginPatient);

// ─── Psychiatrist Routes ─────────────────────────────────────
router.post('/psychiatrist/register', authController.registerPsychiatrist);
router.post('/psychiatrist/login', authController.loginPsychiatrist);

// ─── Admin Routes ────────────────────────────────────────────
router.post('/admin/register', authController.registerAdmin);
router.post('/admin/login', authController.loginAdmin);

module.exports = router;