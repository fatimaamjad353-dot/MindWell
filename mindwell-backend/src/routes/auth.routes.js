// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const Patient = require('../models/Patient');

// ─── OTP Routes ───────────────────────────────────────────────
router.post('/send-otp', authController.sendOTP);
router.post('/verify-otp', authController.verifyOTP);

// ─── Patient Routes ───────────────────────────────────────────
router.post('/patient/register', authController.registerPatient);
router.post('/patient/login', authController.loginPatient);

// ─── Psychiatrist Routes ──────────────────────────────────────
router.post('/psychiatrist/register', authController.registerPsychiatrist);
router.post('/psychiatrist/login', authController.loginPsychiatrist);

// ─── Admin Routes ─────────────────────────────────────────────
router.post('/admin/register', authController.registerAdmin);
router.post('/admin/login', authController.loginAdmin);

// ─── ✅ Consent Routes ────────────────────────────────────────

// Get consent status
router.get('/patient/consent',
  protect,
  authorize('patient'),
  async (req, res) => {
    try {
      const patient = await Patient.findById(req.user._id)
        .select('dataShareConsent consentUpdatedAt name');

      res.status(200).json({
        success: true,
        data: {
          dataShareConsent: patient.dataShareConsent || false,
          consentUpdatedAt: patient.consentUpdatedAt || null,
          patientName: patient.name
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Update consent
router.patch('/patient/consent',
  protect,
  authorize('patient'),
  async (req, res) => {
    try {
      const { consent } = req.body;

      if (typeof consent !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'Consent must be true or false'
        });
      }

      const patient = await Patient.findByIdAndUpdate(
        req.user._id,
        {
          dataShareConsent: consent,
          consentUpdatedAt: new Date()
        },
        { new: true }
      ).select('dataShareConsent consentUpdatedAt name');

      res.status(200).json({
        success: true,
        message: consent
          ? 'Data sharing enabled successfully'
          : 'Data sharing disabled successfully',
        data: {
          dataShareConsent: patient.dataShareConsent,
          consentUpdatedAt: patient.consentUpdatedAt
        }
      });

    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

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

module.exports = router;