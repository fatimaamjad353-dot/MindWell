// src/models/Admin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AdminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      default: 'admin',
    },
  },
  {
    timestamps: true,
  }
);

// ─── Compare password method ────────────────────────────────
AdminSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// ─── ToJSON to remove password ──────────────────────────────
AdminSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('Admin', AdminSchema);