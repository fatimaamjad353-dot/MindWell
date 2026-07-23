// src/routes/payment.routes.js
const express = require('express');
const router = express.Router();
const {
  createPaymentIntent,
  confirmPayment,
  getMyPayments,
  getPaymentDetails,
  getPsychiatristEarnings,
  refundPayment,
  stripeWebhook
} = require('../controllers/payment.controller');

const { protect } = require('../middleware/auth.middleware');

// ✅ Webhook MUST be absolutely first
router.post('/webhook', stripeWebhook);

// Patient Routes
router.post('/create-intent',  protect, createPaymentIntent);
router.post('/confirm',        protect, confirmPayment);
router.get('/my-payments',     protect, getMyPayments);
router.post('/refund/:id',     protect, refundPayment);

// Psychiatrist Routes
router.get('/psych/earnings',  protect, getPsychiatristEarnings);

// ✅ Generic ID route MUST be last
router.get('/:id',             protect, getPaymentDetails);

module.exports = router;