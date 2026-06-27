const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
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
  summaryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TriageSummary',
    default: null
  },
  dateTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: [
      'Pending',
      'Confirmed',
      'Completed',
      'Cancelled',
      'Rejected'
    ],
    default: 'Pending'
  },
  sessionType: {
    type: String,
    enum: ['Audio', 'Video', 'Text'],
    required: true
  },
  bookingSource: {
    type: String,
    enum: ['Manual', 'AI_Recommended'],
    default: 'Manual'
  },
  agreedRate: {
    type: Number,
    required: true
  },
  duration: {
    type: Number,
    default: 60
  },
  meetingLink: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  patientRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  patientFeedback: {
    type: String,
    default: ''
  },
  isPaid: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);