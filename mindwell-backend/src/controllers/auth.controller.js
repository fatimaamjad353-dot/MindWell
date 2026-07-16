// src/controllers/auth.controller.js
const Patient = require('../models/Patient');
const Psychiatrist = require('../models/Psychiatrist');
const Admin = require('../models/Admin');
const OTP = require('../models/OTP');
const emailService = require('../services/email.service');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const EmailValidator = require('../utils/emailValidator');
const dns = require('dns');
const { promisify } = require('util');
const resolveMx = promisify(dns.resolveMx);



// ─── Helper: Generate OTP ────────────────────────────────────
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// ─── Helper: Hash Password ──────────────────────────────────
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

// ─── SEND OTP ──────────────────────────────────────────────────
exports.sendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        console.log('📧 sendOTP called with email:', email);

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // ─── ✅ EMAIL FORMAT VALIDATION ONLY ──────────────────────
        // 1. Must contain @
        if (!normalizedEmail.includes('@')) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address with @',
                code: 'INVALID_EMAIL'
            });
        }

        const parts = normalizedEmail.split('@');
        if (parts.length !== 2) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address',
                code: 'INVALID_EMAIL'
            });
        }

        const localPart = parts[0];
        const domain = parts[1];

        // 2. Local part must not be empty
        if (!localPart || localPart.length < 1) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address',
                code: 'INVALID_EMAIL'
            });
        }

        // 3. Domain must have a dot
        if (!domain || !domain.includes('.')) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email domain (e.g., .com, .org)',
                code: 'INVALID_EMAIL'
            });
        }

        // 4. Domain must have at least 2 chars after dot
        const domainParts = domain.split('.');
        if (domainParts.length < 2 || domainParts[domainParts.length - 1].length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email domain (e.g., .com, .org)',
                code: 'INVALID_EMAIL'
            });
        }

        // ─── Check if email already registered ────────────────────
        const existingPatient = await Patient.findOne({ email: normalizedEmail });
        const existingPsychiatrist = await Psychiatrist.findOne({ email: normalizedEmail });

        if (existingPatient || existingPsychiatrist) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered. Please login.'
            });
        }

        // ─── Generate OTP ──────────────────────────────────────────
        await OTP.deleteMany({ email: normalizedEmail });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        console.log('📧 OTP for', normalizedEmail, ':', otp);

        await OTP.create({
            email: normalizedEmail,
            otp: otp,
            expiresAt: expiresAt
        });

        // ─── Send OTP email ────────────────────────────────────────
        try {
            await emailService.sendOTP(normalizedEmail, otp, 'User');
            console.log('✅ Email sent to:', normalizedEmail);
        } catch (error) {
            console.error('❌ Email send error:', error.message);
            // Still return success so user can proceed
            // They will see the OTP in the terminal if email fails
        }

        res.json({
            success: true,
            message: 'OTP sent successfully. Please check your email.',
            email: normalizedEmail,
            // ⚠️ Show OTP in response for testing (remove in production)
            debug: { otp: otp }
        });

    } catch (error) {
        console.error('❌ Send OTP error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};
// ─── VERIFY OTP ──────────────────────────────────────────────────
exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        console.log('🔐 verifyOTP called with email:', email, 'otp:', otp);

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Find the OTP
        const otpRecord = await OTP.findOne({
            email: normalizedEmail,
            otp: otp,
            verified: false
        });

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP. Please try again.'
            });
        }

        // Check if expired
        if (new Date() > otpRecord.expiresAt) {
            await OTP.deleteOne({ _id: otpRecord._id });
            return res.status(400).json({
                success: false,
                message: 'OTP has expired. Please request a new one.'
            });
        }

        // Check attempts (max 3)
        if (otpRecord.attempts >= 3) {
            await OTP.deleteOne({ _id: otpRecord._id });
            return res.status(400).json({
                success: false,
                message: 'Too many failed attempts. Please request a new OTP.'
            });
        }

        // Increment attempts
        otpRecord.attempts += 1;
        await otpRecord.save();

        // Mark as verified
        otpRecord.verified = true;
        await otpRecord.save();

        res.json({
            success: true,
            message: 'OTP verified successfully',
            email: normalizedEmail,
            verified: true
        });

    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ─── REGISTER PATIENT ────────────────────────────────────────────
exports.registerPatient = async (req, res) => {
    try {
        const { name, email, password, phone_no } = req.body;

        // Check if OTP was verified
        const otpRecord = await OTP.findOne({
            email: email,
            verified: true
        });

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: 'Please verify your email first.'
            });
        }

        // Create user
        const hashedPassword = await hashPassword(password);
        const patient = new Patient({
            name,
            email,
            password: hashedPassword,
            phone_no,
        });
        await patient.save();

        // Clean up OTP
        await OTP.deleteMany({ email: email });

        const token = jwt.sign(
            { id: patient._id, role: 'patient' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'Registration successful',
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

// ─── REGISTER PSYCHIATRIST ──────────────────────────────────────
exports.registerPsychiatrist = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            phone_no,
            specializations,
            license_number,
            certifications,
            experience_years,
            hospital,
            session_rate,
            languages,
            session_types,
        } = req.body;

        // Check if OTP was verified
        const otpRecord = await OTP.findOne({
            email: email,
            verified: true
        });

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: 'Please verify your email first.'
            });
        }

        // Create psychiatrist
        const hashedPassword = await hashPassword(password);

        const psychiatrist = new Psychiatrist({
            name,
            email,
            password: hashedPassword,
            phone_no: phone_no || '',
            specializations: specializations || [],
            license_number: license_number || '',
            certifications: certifications || '',
            experience_years: experience_years || 0,
            hospital: hospital || '',
            session_rate: session_rate || 0,
            languages: languages || ['English'],
            session_types: session_types || ['video'],
            status: 'pending',
        });
        await psychiatrist.save();

        // Clean up OTP
        await OTP.deleteMany({ email: email });

        res.status(201).json({
            success: true,
            message: 'Psychiatrist registered successfully. Waiting for admin approval.',
            psychiatrist: {
                id: psychiatrist._id,
                name: psychiatrist.name,
                email: psychiatrist.email,
                status: psychiatrist.status,
                specializations: psychiatrist.specializations,
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

// ─── LOGIN PATIENT ──────────────────────────────────────────────
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

// ─── LOGIN PSYCHIATRIST ─────────────────────────────────────────
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

// ─── REGISTER ADMIN ─────────────────────────────────────────────
exports.registerAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existing = await Admin.findOne({ email });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Admin already exists'
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

// ─── LOGIN ADMIN ─────────────────────────────────────────────────
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