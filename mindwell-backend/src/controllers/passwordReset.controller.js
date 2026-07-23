// src/controllers/passwordReset.controller.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Patient = require('../models/Patient');
const Psychiatrist = require('../models/Psychiatrist');
const emailService = require('../services/email.service');

// ─── Send password reset OTP email ───────────────────────────
const sendResetOTPEmail = async (email, otp) => {
    const subject = 'MindWell - Password Reset OTP';
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #6C63FF; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; }
                .otp-code { font-size: 36px; font-weight: bold; color: #6C63FF; text-align: center; letter-spacing: 10px; padding: 20px; background: #F0EFFF; border-radius: 10px; margin: 20px 0; }
                .warning { background: #FFF3CD; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #FFC107; }
                .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🧠 MindWell</h1>
                <p>Password Reset Request</p>
            </div>
            <div class="content">
                <h2>Hello,</h2>
                <p>We received a request to reset your MindWell password.</p>
                <p>Your password reset OTP is:</p>
                <div class="otp-code">${otp}</div>
                <div class="warning">
                    <p><strong>⚠️ This OTP expires in 10 minutes.</strong></p>
                    <p>If you didn't request this, please ignore this email.</p>
                </div>
            </div>
            <div class="footer">
                <p>MindWell - Your Mental Wellness Platform</p>
                <p>© ${new Date().getFullYear()} MindWell. All rights reserved.</p>
            </div>
        </body>
        </html>
    `;

    console.log('📧 Sending password reset OTP to:', email);
    await emailService.sendEmail(email, subject, html);
};

// ─── Request password reset ────────────────────────────────────
const requestPasswordReset = async (req, res) => {
    try {
        const { email, role } = req.body;

        console.log('📧 Password reset request for:', email, 'role:', role);

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Please provide your email address'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // ✅ Find user — they MUST exist for password reset
        let user;
        if (role === 'psychiatrist' || role === 'psychologist') {
            user = await Psychiatrist.findOne({ email: normalizedEmail });
        } else {
            user = await Patient.findOne({ email: normalizedEmail });
        }

        if (!user) {
            // Don't reveal if email exists for security
            return res.status(200).json({
                success: true,
                message: 'If an account exists with this email, you will receive a reset OTP.'
            });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Save OTP to user
        user.resetPasswordToken = otp;
        user.resetPasswordExpires = otpExpiry;
        await user.save();

        // Send OTP email
        try {
            await sendResetOTPEmail(normalizedEmail, otp);
            console.log(`✅ Reset OTP sent to: ${normalizedEmail}`);
        } catch (emailError) {
            console.error('❌ Email send error:', emailError.message);
            // Still return success — OTP saved in DB
        }

        res.status(200).json({
            success: true,
            message: `Password reset OTP sent to ${normalizedEmail}`,
            // ⚠️ Remove in production
            debug: { otp }
        });

    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ─── Verify reset OTP ──────────────────────────────────────────
const verifyResetOTP = async (req, res) => {
    try {
        const { email, otp, role } = req.body;

        console.log('🔍 Verifying reset OTP for:', email);

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        let user;
        if (role === 'psychiatrist' || role === 'psychologist') {
            user = await Psychiatrist.findOne({
                email: normalizedEmail,
                resetPasswordToken: otp,
                resetPasswordExpires: { $gt: new Date() }
            });
        } else {
            user = await Patient.findOne({
                email: normalizedEmail,
                resetPasswordToken: otp,
                resetPasswordExpires: { $gt: new Date() }
            });
        }

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP. Please request a new one.'
            });
        }

        res.status(200).json({
            success: true,
            message: 'OTP verified successfully',
            data: { email: normalizedEmail, role }
        });

    } catch (error) {
        console.error('Verify reset OTP error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ─── Reset password ────────────────────────────────────────────
const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword, role } = req.body;

        console.log('🔐 Resetting password for:', email);

        if (!email || !otp || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Email, OTP and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        let user;
        if (role === 'psychiatrist' || role === 'psychologist') {
            user = await Psychiatrist.findOne({
                email: normalizedEmail,
                resetPasswordToken: otp,
                resetPasswordExpires: { $gt: new Date() }
            });
        } else {
            user = await Patient.findOne({
                email: normalizedEmail,
                resetPasswordToken: otp,
                resetPasswordExpires: { $gt: new Date() }
            });
        }

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP. Please request a new one.'
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        console.log(`✅ Password reset successful for: ${normalizedEmail}`);

        res.status(200).json({
            success: true,
            message: 'Password reset successfully. Please login with your new password.'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    requestPasswordReset,
    verifyResetOTP,
    resetPassword
};