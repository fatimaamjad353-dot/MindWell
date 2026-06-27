// src/models/MoodEntry.js
const mongoose = require('mongoose');

const MoodEntrySchema = new mongoose.Schema(
  {
    // ── Use "patientId" to match controller ──────────────────
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    // ── Use "moodScore" to match controller ─────────────────
    moodScore: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    moodType: {
      type: String,
      enum: [
        'Amazing', 'Good', 'Okay', 'Low', 'Terrible',
        'Happy', 'Sad', 'Anxious', 'Angry', 'Neutral',
        'Tired', 'Hopeless', 'Depressed', 'Stressed', 'Calm',
        'انسان', 'بشر', 'سعيد', 'حزين', 'قلق', 'غاضب',
        'متعبة', 'يائس', 'مكتئب', 'متوتر', 'هادئ'
      ],
      required: true,
    },
    notes: {
      type: String,
      default: '',
    },
    activities: {
      type: [String],
      default: [],
    },
    // ── AI Analysis ──────────────────────────────────────────
    aiAnalysis: {
      sentiment: {
        type: String,
        enum: ['Positive', 'Negative', 'Neutral', 'Very Positive', 'Very Negative'],
        default: 'Neutral',
      },
      riskLevel: {
        type: String,
        enum: ['Low', 'Medium', 'High'],
        default: 'Low',
      },
      suggestion: {
        type: String,
        default: '',
      },
    },
    // ── Use "timestamp" to match controller ──────────────────
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('MoodEntry', MoodEntrySchema);