// src/controllers/admin.controller.js
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');

// ─── ADMIN LOGIN ───────────────────────────────────────────────
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Admin login attempt:', email);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find admin
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    console.log('👤 Admin found:', admin ? 'Yes' : 'No');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Compare password
    const isMatch = await admin.comparePassword(password);
    console.log('🔑 Password match:', isMatch ? 'Yes' : 'No');

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: admin._id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Admin login successful',
      token,
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: 'admin'
      }
    });

  } catch (error) {
    console.error('Login admin error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ─── REGISTER ADMIN ────────────────────────────────────────────
exports.registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const bcrypt = require('bcryptjs');

    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Admin already exists'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = new Admin({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'admin',
      isActive: true
    });

    await admin.save();

    const token = jwt.sign(
      { id: admin._id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      token,
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Register admin error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ─── GET PENDING PSYCHIATRISTS ────────────────────────────────
exports.getPendingPsychiatrists = async (req, res) => {
  try {
    const Psychiatrist = require('../models/Psychiatrist');
    const psychiatrists = await Psychiatrist.find({ status: 'pending' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: psychiatrists.length,
      data: psychiatrists
    });
  } catch (error) {
    console.error('Get pending psychiatrists error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ─── VERIFY PSYCHIATRIST ──────────────────────────────────────
exports.verifyPsychiatrist = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const Psychiatrist = require('../models/Psychiatrist');

    if (!['active', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be "active" or "rejected"'
      });
    }

    const psychiatrist = await Psychiatrist.findByIdAndUpdate(
      id,
      { 
        status: status,
        isVerified: status === 'active' ? true : false
      },
      { new: true }
    ).select('-password');

    if (!psychiatrist) {
      return res.status(404).json({
        success: false,
        message: 'Psychiatrist not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `Psychiatrist ${status === 'active' ? 'approved' : 'rejected'} successfully`,
      data: psychiatrist
    });
  } catch (error) {
    console.error('Verify psychiatrist error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ─── GET DASHBOARD STATS ──────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
  try {
    const Psychiatrist = require('../models/Psychiatrist');
    const Patient = require('../models/Patient');
    const Session = require('../models/Session');
    const Payment = require('../models/Payment');

    const totalPatients = await Patient.countDocuments();
    const totalPsychiatrists = await Psychiatrist.countDocuments();
    const pendingPsychiatrists = await Psychiatrist.countDocuments({ status: 'pending' });
    const totalSessions = await Session.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        totalPatients: totalPatients || 0,
        totalPsychiatrists: totalPsychiatrists || 0,
        pendingPsychiatrists: pendingPsychiatrists || 0,
        totalSessions: totalSessions || 0
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ─── GET ALL PATIENTS ─────────────────────────────────────────
exports.getAllPatients = async (req, res) => {
  try {
    const Patient = require('../models/Patient');
    const patients = await Patient.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: patients.length,
      data: patients
    });
  } catch (error) {
    console.error('Get all patients error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ─── GET ALL PSYCHIATRISTS ────────────────────────────────────
exports.getAllPsychiatrists = async (req, res) => {
  try {
    const Psychiatrist = require('../models/Psychiatrist');
    const psychiatrists = await Psychiatrist.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: psychiatrists.length,
      data: psychiatrists
    });
  } catch (error) {
    console.error('Get all psychiatrists error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ─── SUSPEND PATIENT ──────────────────────────────────────────
exports.suspendPatient = async (req, res) => {
  try {
    const Patient = require('../models/Patient');
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { isActive: false, status: 'suspended' },
      { new: true }
    ).select('-password');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Patient account suspended',
      data: patient
    });
  } catch (error) {
    console.error('Suspend patient error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ─── SUSPEND PSYCHIATRIST ─────────────────────────────────────
exports.suspendPsychiatrist = async (req, res) => {
  try {
    const Psychiatrist = require('../models/Psychiatrist');
    const psychiatrist = await Psychiatrist.findByIdAndUpdate(
      req.params.id,
      { status: 'suspended', isActive: false },
      { new: true }
    ).select('-password');

    if (!psychiatrist) {
      return res.status(404).json({
        success: false,
        message: 'Psychiatrist not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Psychiatrist account suspended',
      data: psychiatrist
    });
  } catch (error) {
    console.error('Suspend psychiatrist error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ─── GET ALL SESSIONS ─────────────────────────────────────────
exports.getAllSessions = async (req, res) => {
  try {
    const Session = require('../models/Session');
    const sessions = await Session.find()
      .populate('patient', 'name email')
      .populate('psychologist', 'name specialization')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessions
    });
  } catch (error) {
    console.error('Get all sessions error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ─── GET ALL PAYMENTS ─────────────────────────────────────────
exports.getAllPayments = async (req, res) => {
  try {
    const Payment = require('../models/Payment');
    const payments = await Payment.find()
      .populate('user', 'name email')
      .populate('session', 'date time')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};