// src/models/Psychiatrist.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PsychiatristSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    phone_no: {
      type: String,
      default: '',
    },
    specialization: {
      type: String,
      default: '',
    },
    specializations: {
      type: [String],
      default: [],
    },
    experience_years: {
      type: Number,
      default: 0,
    },
    license_number: {
      type: String,
      default: '',
    },
    certifications: {
      type: String,
      default: '',
    },
    hospital: {
      type: String,
      default: '',
    },
    session_rate: {
      type: Number,
      default: 0,
    },
    languages: {
      type: [String],
      default: ['English'],
    },
    session_types: {
      type: [String],
      enum: ['video', 'audio', 'text'],
      default: ['video'],
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    accepts_emergency: {
      type: Boolean,
      default: false,
    },
    avg_rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    total_patients: {
      type: Number,
      default: 0,
    },
    contact: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended', 'rejected'],
      default: 'pending',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    profileImage: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// ─── Compare password method ────────────────────────────────
PsychiatristSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// ─── ToJSON to remove password ──────────────────────────────
PsychiatristSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('Psychiatrist', PsychiatristSchema);