// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// ─── OTP Routes ──────────────────────────────────────────────
router.post('/send-otp', authController.sendOTP);
router.post('/verify-otp', authController.verifyOTP);

// ─── Patient Routes ──────────────────────────────────────────
router.post('/patient/register', authController.registerPatient);
router.post('/patient/login', authController.loginPatient);

// ─── Psychiatrist Routes ─────────────────────────────────────
router.post('/psychiatrist/register', authController.registerPsychiatrist);
router.post('/psychiatrist/login', authController.loginPsychiatrist);
 
// ─── Test MX Route ────────────────────────────────────────────
router.get('/test-mx', async (req, res) => {
    const dns = require('dns');
    const { promisify } = require('util');
    const resolveMx = promisify(dns.resolveMx);
    
    const { email } = req.query;
    if (!email) {
        return res.json({ error: 'No email provided' });
    }
    
    const domain = email.split('@')[1];
    try {
        const mx = await resolveMx(domain);
        res.json({ domain, mx: mx || [] });
    } catch (error) {
        res.json({ domain, error: error.message });
    }
});

// ─── Admin Routes ────────────────────────────────────────────
router.post('/admin/register', authController.registerAdmin);
router.post('/admin/login', authController.loginAdmin);

module.exports = router;