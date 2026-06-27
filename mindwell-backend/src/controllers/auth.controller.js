// src/controllers/auth.controller.js
const Patient = require('../models/Patient');
const Psychiatrist = require('../models/Psychiatrist');
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// ─── Helper: Hash password ────────────────────────────────────
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// ─── Register Patient ────────────────────────────────────────
exports.registerPatient = async (req, res) => {
  try {
    const { name, email, password, phone_no } = req.body;

    const existing = await Patient.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists',
      });
    }

    const hashedPassword = await hashPassword(password);

    const patient = new Patient({
      name,
      email,
      password: hashedPassword,
      phone_no,
    });
    await patient.save();

    const token = jwt.sign(
      { id: patient._id, role: 'patient' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: patient._id,
        name: patient.name,
        email: patient.email,
        role: 'patient',
      },
    });
  } catch (error) {
    console.error('Register patient error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── Login Patient ────────────────────────────────────────────
exports.loginPatient = async (req, res) => {
  try {
    const { email, password } = req.body;

    const patient = await Patient.findOne({ email });
    if (!patient) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isMatch = await patient.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const token = jwt.sign(
      { id: patient._id, role: 'patient' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: patient._id,
        name: patient.name,
        email: patient.email,
        role: 'patient',
      },
    });
  } catch (error) {
    console.error('Login patient error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── Register Psychiatrist ────────────────────────────────────
exports.registerPsychiatrist = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone_no,
      specialization,
      license_number,
      certifications,
    } = req.body;

    const existing = await Psychiatrist.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists',
      });
    }

    const hashedPassword = await hashPassword(password);

    const psychiatrist = new Psychiatrist({
      name,
      email,
      password: hashedPassword,
      phone_no: phone_no || '',
      specialization: specialization || '',
      license_number: license_number || '',
      certifications: certifications || '',
      status: 'pending',
    });
    await psychiatrist.save();

    res.status(201).json({
      success: true,
      message: 'Psychiatrist registered successfully. Waiting for admin approval.',
      psychiatrist: {
        id: psychiatrist._id,
        name: psychiatrist.name,
        email: psychiatrist.email,
        status: psychiatrist.status,
      },
    });
  } catch (error) {
    console.error('Register psychiatrist error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── Login Psychiatrist ───────────────────────────────────────
exports.loginPsychiatrist = async (req, res) => {
  try {
    const { email, password } = req.body;

    const psychiatrist = await Psychiatrist.findOne({ email });
    if (!psychiatrist) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    if (psychiatrist.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Account ${psychiatrist.status}. Please wait for admin approval.`,
      });
    }

    const isMatch = await psychiatrist.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const token = jwt.sign(
      { id: psychiatrist._id, role: 'psychiatrist' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: psychiatrist._id,
        name: psychiatrist.name,
        email: psychiatrist.email,
        role: 'psychiatrist',
        status: psychiatrist.status,
      },
    });
  } catch (error) {
    console.error('Login psychiatrist error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── Register Admin ──────────────────────────────────────────
exports.registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists',
      });
    }

    const hashedPassword = await hashPassword(password);

    const admin = new Admin({ name, email, password: hashedPassword });
    await admin.save();

    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error('Register admin error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── Login Admin ──────────────────────────────────────────────
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const token = jwt.sign(
      { id: admin._id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: 'admin',
      },
    });
  } catch (error) {
    console.error('Login admin error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};