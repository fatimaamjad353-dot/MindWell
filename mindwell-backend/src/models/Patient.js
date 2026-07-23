// src/models/Patient.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PatientSchema = new mongoose.Schema(
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
    age: {
      type: Number,
      default: null,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
      default: 'Prefer not to say',
    },
    profileImage: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    resetPasswordToken: {
      type: String,
      default: null
    },
    resetPasswordExpires: {
      type: Date,
      default: null
    },

    // ✅ Data sharing consent
    dataShareConsent: {
      type: Boolean,
      default: false
    },
    consentUpdatedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
  }
);

// ─── Compare password method ──────────────────────────────────
PatientSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// ─── ToJSON to remove password ────────────────────────────────
PatientSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('Patient', PatientSchema);