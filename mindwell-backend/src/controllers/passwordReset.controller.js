// src/controllers/passwordReset.controller.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Patient = require('../models/Patient');
const Psychiatrist = require('../models/Psychiatrist');
const emailService = require('../services/email.service');

// ─── Generate reset token ──────────────────────────────────────────
const generateResetToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// ─── Send password reset email ─────────────────────────────────────
const sendResetEmail = async (email, resetToken, role) => {
    // ─── Simple web link (no deep linking) ─────────────────────
    const resetLink = `http://192.168.10.6:8081/reset-password?token=${resetToken}&role=${role}`;
    
    const subject = 'MindWell - Password Reset Request';
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #6C63FF; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; background: #6C63FF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
                .warning { background: #FFF3CD; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #FFC107; }
                .link-box { background: #f0f0f0; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px; margin: 10px 0; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🧠 MindWell</h1>
                <p>Password Reset Request</p>
            </div>
            <div class="content">
                <h2>Hello,</h2>
                <p>We received a request to reset your password for your MindWell account.</p>
                
                <p>Click the button below to reset your password:</p>
                <div style="text-align: center;">
                    <a href="${resetLink}" class="button">Reset Password</a>
                </div>
                
                <div class="warning">
                    <p><strong>⚠️ This link will expire in 1 hour.</strong></p>
                    <p>If you didn't request this, you can safely ignore this email.</p>
                </div>
                
                <p>Or copy and paste this link into your browser:</p>
                <div class="link-box">${resetLink}</div>
                
                <p style="font-size: 12px; color: #888; margin-top: 20px;">
                    If you're having trouble, please contact support at support@mindwell.com
                </p>
            </div>
            <div class="footer">
                <p>MindWell - Your Mental Wellness Platform</p>
                <p>© ${new Date().getFullYear()} MindWell. All rights reserved.</p>
            </div>
        </body>
        </html>
    `;

    console.log('📧 Sending password reset email to:', email);
    console.log('🔗 Reset Link:', resetLink);
    await emailService.sendEmail(email, subject, html);
};

// ─── Request password reset ────────────────────────────────────────
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

        if (!role || !['patient', 'psychologist'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Please specify a valid role (patient or psychologist)'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Find user by email and role
        let user;
        if (role === 'patient') {
            user = await Patient.findOne({ email: normalizedEmail });
        } else {
            user = await Psychiatrist.findOne({ email: normalizedEmail });
        }

        if (!user) {
            // Don't reveal if email exists or not for security
            return res.status(200).json({
                success: true,
                message: 'If an account exists with this email, you will receive a reset link.'
            });
        }

        // Generate reset token
        const resetToken = generateResetToken();
        const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Save token to user
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = resetExpiry;
        await user.save();

        // Send email
        await sendResetEmail(normalizedEmail, resetToken, role);

        console.log(`✅ Password reset email sent to: ${normalizedEmail} (${role})`);

        res.status(200).json({
            success: true,
            message: 'If an account exists with this email, you will receive a reset link.'
        });

    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ─── Verify reset token ────────────────────────────────────────────
const verifyResetToken = async (req, res) => {
    try {
        const { token, role } = req.query;

        console.log('🔍 Verifying reset token:', token, 'role:', role);

        if (!token || !role) {
            return res.status(400).json({
                success: false,
                message: 'Invalid reset link'
            });
        }

        // Find user by token
        let user;
        if (role === 'patient') {
            user = await Patient.findOne({
                resetPasswordToken: token,
                resetPasswordExpires: { $gt: new Date() }
            });
        } else {
            user = await Psychiatrist.findOne({
                resetPasswordToken: token,
                resetPasswordExpires: { $gt: new Date() }
            });
        }

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset link. Please request a new one.'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Token is valid',
            data: {
                email: user.email,
                role: role
            }
        });

    } catch (error) {
        console.error('Verify reset token error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ─── Reset password ────────────────────────────────────────────────
const resetPassword = async (req, res) => {
    try {
        const { token, role, newPassword } = req.body;

        console.log('🔐 Resetting password for token:', token);

        if (!token || !role || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide token, role, and new password'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Find user by token
        let user;
        if (role === 'patient') {
            user = await Patient.findOne({
                resetPasswordToken: token,
                resetPasswordExpires: { $gt: new Date() }
            });
        } else {
            user = await Psychiatrist.findOne({
                resetPasswordToken: token,
                resetPasswordExpires: { $gt: new Date() }
            });
        }

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset link. Please request a new one.'
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password and clear reset fields
        user.password = hashedPassword;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        console.log(`✅ Password reset successful for: ${user.email} (${role})`);

        res.status(200).json({
            success: true,
            message: 'Password reset successful! You can now login with your new password.'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ─── EXPORT ALL FUNCTIONS ──────────────────────────────────────────
module.exports = {
    requestPasswordReset,
    verifyResetToken,
    resetPassword
};