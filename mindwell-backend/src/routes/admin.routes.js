// src/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// ─── Auth Routes (No Protection) ─────────────────────────────
router.post('/register', adminController.registerAdmin || ((req, res) => {
  res.status(501).json({ success: false, message: 'Admin registration not implemented' });
}));
router.post('/login', adminController.loginAdmin || ((req, res) => {
  res.status(501).json({ success: false, message: 'Admin login not implemented' });
}));

// ─── All routes below require authentication and admin role ──
router.use(protect);
router.use(authorize('admin'));

// ─── Dashboard ────────────────────────────────────────────────
router.get('/dashboard', adminController.getDashboardStats || ((req, res) => {
  res.status(501).json({ success: false, message: 'Dashboard not implemented' });
}));

// ─── Patient Management ──────────────────────────────────────
router.get('/patients', adminController.getAllPatients || ((req, res) => {
  res.status(501).json({ success: false, message: 'Get patients not implemented' });
}));
router.put('/patients/suspend/:id', adminController.suspendPatient || ((req, res) => {
  res.status(501).json({ success: false, message: 'Suspend patient not implemented' });
}));

// ─── Psychiatrist Management ─────────────────────────────────
router.get('/psychiatrists', adminController.getAllPsychiatrists || ((req, res) => {
  res.status(501).json({ success: false, message: 'Get psychiatrists not implemented' });
}));
router.get('/psychiatrists/pending', adminController.getPendingPsychiatrists || ((req, res) => {
  res.status(501).json({ success: false, message: 'Get pending psychiatrists not implemented' });
}));
router.put('/psychiatrists/verify/:id', adminController.verifyPsychiatrist || ((req, res) => {
  res.status(501).json({ success: false, message: 'Verify psychiatrist not implemented' });
}));
router.put('/psychiatrists/suspend/:id', adminController.suspendPsychiatrist || ((req, res) => {
  res.status(501).json({ success: false, message: 'Suspend psychiatrist not implemented' });
}));

// ─── Session & Payment Management ────────────────────────────
router.get('/sessions', adminController.getAllSessions || ((req, res) => {
  res.status(501).json({ success: false, message: 'Get sessions not implemented' });
}));
router.get('/payments', adminController.getAllPayments || ((req, res) => {
  res.status(501).json({ success: false, message: 'Get payments not implemented' });
}));

module.exports = router;