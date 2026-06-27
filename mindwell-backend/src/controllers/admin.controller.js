// src/controllers/admin.controller.js
const Admin = require('../models/Admin');
const Patient = require('../models/Patient');
const Psychiatrist = require('../models/Psychiatrist');
const Session = require('../models/Session');
const Payment = require('../models/Payment');
const MoodEntry = require('../models/MoodEntry');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// ─── Helper: Generate Token ────────────────────────────────────
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// ─── Helper: Hash Password ────────────────────────────────────
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// ─── ADMIN REGISTER ────────────────────────────────────────────
exports.registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all fields'
      });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin already exists'
      });
    }

    const hashedPassword = await hashPassword(password);

    const admin = new Admin({
      name,
      email,
      password: hashedPassword
    });
    await admin.save();

    const token = generateToken(admin._id, 'admin');

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

// ─── ADMIN LOGIN ───────────────────────────────────────────────
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = generateToken(admin._id, 'admin');

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

// ─── GET DASHBOARD STATS ──────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
  try {
    const totalPatients = await Patient.countDocuments();
    const totalPsychiatrists = await Psychiatrist.countDocuments();
    const totalSessions = await Session.countDocuments();
    const totalPayments = await Payment.countDocuments({ status: 'succeeded' });
    const totalMoodEntries = await MoodEntry.countDocuments();

    // ✅ FIX: Use 'status' field, not 'accountStatus'
    const pendingPsychiatrists = await Psychiatrist.countDocuments({ status: 'pending' });

    const completedSessions = await Session.countDocuments({ status: 'completed' });
    const pendingSessions = await Session.countDocuments({ status: 'pending' });

    const revenueData = await Payment.aggregate([
      { $match: { status: 'succeeded' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRevenue = revenueData[0]?.total || 0;

    res.status(200).json({
      success: true,
      data: {
        totalPatients,
        totalPsychiatrists,
        pendingPsychiatrists,
        totalSessions,
        completedSessions,
        pendingSessions,
        totalPayments,
        totalRevenue,
        totalMoodEntries
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
    const patients = await Patient.find()
      .select('-password')
      .sort({ createdAt: -1 });

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
    const psychiatrists = await Psychiatrist.find()
      .select('-password')
      .sort({ createdAt: -1 });

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

// ─── GET PENDING PSYCHIATRISTS ────────────────────────────────
exports.getPendingPsychiatrists = async (req, res) => {
  try {
    // ✅ FIX: Use 'status' field, not 'accountStatus'
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

// ─── VERIFY PSYCHIATRIST (Approve/Reject) ────────────────────
exports.verifyPsychiatrist = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // ✅ FIX: Accept 'active' or 'rejected'
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

// ─── SUSPEND PATIENT ──────────────────────────────────────────
exports.suspendPatient = async (req, res) => {
  try {
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