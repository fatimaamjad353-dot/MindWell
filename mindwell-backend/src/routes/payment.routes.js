const express = require('express');
const router = express.Router();
const {
  createPaymentIntent,
  confirmPayment,
  getMyPayments,
  getPaymentDetails,
  getPsychiatristEarnings,
  refundPayment
} = require('../controllers/payment.controller');

const { protect } = require('../middleware/auth.middleware');

// Patient Routes
router.post('/create-intent',   protect, createPaymentIntent);
router.post('/confirm',         protect, confirmPayment);
router.get('/my-payments',      protect, getMyPayments);
router.get('/:id',              protect, getPaymentDetails);
router.post('/refund/:id',      protect, refundPayment);

// Psychiatrist Routes
router.get('/psych/earnings',   protect, getPsychiatristEarnings);

module.exports = router;