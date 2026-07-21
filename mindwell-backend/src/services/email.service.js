// src/services/email.service.js
const nodemailer = require('nodemailer');

let transporter = null;

const initTransporter = () => {
    if (transporter) return transporter;

    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const emailPort = parseInt(process.env.EMAIL_PORT) || 587;
    const emailSecure = process.env.EMAIL_SECURE === 'true';
    const emailFrom = process.env.EMAIL_FROM || emailUser;

    console.log('📧 Gmail Email config:', { 
        host: emailHost,
        port: emailPort,
        user: emailUser ? '✅ Set' : '❌ Missing',
        pass: emailPass ? '✅ Set (length: ' + (emailPass ? emailPass.length : 0) + ')' : '❌ Missing',
        from: emailFrom
    });

    if (!emailUser || !emailPass) {
        console.log('⚠️ Email credentials not configured. Email sending will not work.');
        return null;
    }

    transporter = nodemailer.createTransport({
        host: emailHost,
        port: emailPort,
        secure: emailSecure,
        auth: {
            user: emailUser,
            pass: emailPass
        }
    });

    // Verify connection
    transporter.verify((error, success) => {
        if (error) {
            console.error('❌ Email transporter error:', error.message);
        } else {
            console.log('✅ Gmail service connected successfully');
        }
    });

    return transporter;
};

// ─── Send email ──────────────────────────────────────────────────
exports.sendEmail = async (to, subject, html) => {
    try {
        const transporter = initTransporter();
        if (!transporter) {
            console.log('⚠️ Email service not configured. Skipping email send.');
            return;
        }

        const emailFrom = process.env.EMAIL_FROM || process.env.EMAIL_USER;

        console.log('📧 Sending email to:', to);
        console.log('📧 From:', emailFrom);

        const info = await transporter.sendMail({
            from: `"MindWell" <${emailFrom}>`,
            to: to,
            subject: subject,
            html: html
        });

        console.log('✅ Email sent successfully to:', to);
        console.log('📧 Message ID:', info.messageId);
        return info;
    } catch (error) {
        console.error('❌ Email send error:', error.message);
        if (error.response) {
            console.error('Response:', error.response);
        }
        throw error;
    }
};

// ─── Send OTP email ─────────────────────────────────────────────
exports.sendOTP = async (email, otp, name) => {
    const subject = 'MindWell - Your Verification Code';
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #6C63FF; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; }
                .otp-code { font-size: 32px; font-weight: bold; color: #6C63FF; text-align: center; letter-spacing: 8px; padding: 20px; background: #f0f0f0; border-radius: 10px; margin: 20px 0; }
                .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🧠 MindWell</h1>
                <p>Your Verification Code</p>
            </div>
            <div class="content">
                <h2>Hello,</h2>
                <p>Your verification code for MindWell is:</p>
                <div class="otp-code">${otp}</div>
                <p>This code will expire in <strong>5 minutes</strong>.</p>
                <p>If you didn't request this, please ignore this email.</p>
            </div>
            <div class="footer">
                <p>MindWell - Your Mental Wellness Platform</p>
            </div>
        </body>
        </html>
    `;

    await exports.sendEmail(email, subject, html);
};