const mongoose = require('mongoose');

// ✅ Proper nested schema for resources
const resourceSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  type: { type: String, default: '' },
  description: { type: String, default: '' },
  link: { type: String, default: '' }
}, { _id: false });

const triageSummarySchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    unique: true
  },

  // ─── Risk Assessment ──────────────────────────────────────
  riskLevel: { type: Number, default: 0 },
  riskCategory: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Low'
  },
  urgentConfirm: { type: Boolean, default: false },
  urgentHelp: { type: Boolean, default: false },
  triggerEscalation: { type: Boolean, default: false },
  showNotification: { type: Boolean, default: false },

  // ─── AI Notes ─────────────────────────────────────────────
  aiNotes: { type: String, default: '' },

  // ─── Mood Analysis ────────────────────────────────────────
  averageMoodScore: { type: Number, default: 5 },
  dominantMood: { type: String, default: 'Neutral' },
  moodEntryCount: { type: Number, default: 0 },

  // ─── Diagnosis ────────────────────────────────────────────
  diagnosis: { type: String, default: null },
  severity: {
    type: String,
    enum: ['Mild', 'Moderate', 'Severe', 'Unknown', null],
    default: null
  },
  diagnosisConfidence: { type: Number, default: null },

  // ─── Recommendations ──────────────────────────────────────
  recommendedSpecializations: [{ type: String }],

  // ✅ Fixed — proper nested schema
  recommendedResources: [resourceSchema],

  recommendedTherapists: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Psychiatrist'
  }],

  lastUpdated: { type: Date, default: Date.now }

}, { timestamps: true });

module.exports = mongoose.model('TriageSummary', triageSummarySchema);