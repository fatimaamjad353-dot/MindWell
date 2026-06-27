const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  psychiatristId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Psychiatrist',
    required: true
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'usd'
  },
  status: {
    type: String,
    enum: [
      'Pending',
      'Completed',
      'Failed',
      'Refunded'
    ],
    default: 'Pending'
  },
  method: {
    type: String,
    enum: ['Card', 'Wallet'],
    default: 'Card'
  },
  stripePaymentIntentId: {
    type: String,
    default: ''
  },
  stripeClientSecret: {
    type: String,
    default: ''
  },
  transactionId: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);