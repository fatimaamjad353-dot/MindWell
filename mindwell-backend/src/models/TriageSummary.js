const mongoose = require('mongoose');

const triageSummarySchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  riskLevel: {
    type: Number,
    default: 0
  },
  urgentConfirm: {
    type: Boolean,
    default: false
  },
  aiNotes: {
    type: String,
    default: ''
  },
  triggerEscalation: {
    type: Boolean,
    default: false
  },
  showNotification: {
    type: Boolean,
    default: false
  },
  recommendedSpecializations: [{
    type: String
  }],
  recommendedResources: [{
    title: String,
    type: String,
    description: String,
    link: String
  }],
  recommendedTherapists: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Psychiatrist'
  }]
}, { timestamps: true });

module.exports = mongoose.model(
  'TriageSummary',
  triageSummarySchema
);