// src/services/email.service.js
const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        // ─── Initialize email transporter ──────────────────────
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true' || false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        // ─── Verify connection on startup ──────────────────────
        this.verifyConnection();
    }

    // ─── Verify Email Connection ──────────────────────────────
    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('✅ Email service connected successfully');
        } catch (error) {
            console.error('❌ Email service connection failed:', error.message);
        }
    }

   // src/services/email.service.js
// Update the sendOTP function with better content

async sendOTP(email, otp, name = 'User') {
    const subject = 'MindWell - Your Verification Code';
    
    // ✅ Better HTML with plain text version
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }
                .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; }
                .header { text-align: center; padding-bottom: 20px; border-bottom: 2px solid #6C63FF; }
                .logo { font-size: 28px; font-weight: 700; color: #6C63FF; }
                .otp-box { background: #F0EFFF; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }
                .otp-code { font-size: 40px; font-weight: 700; color: #6C63FF; letter-spacing: 10px; }
                .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🧠 MindWell</div>
                </div>
                <h2>Hello ${name}!</h2>
                <p>Thank you for choosing MindWell. Please use the verification code below:</p>
                <div class="otp-box">
                    <div class="otp-code">${otp}</div>
                </div>
                <p>This code will expire in <strong>5 minutes</strong>.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <div class="footer">
                    <p>© 2024 MindWell. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const result = await this.sendEmail({
        to: email,
        subject,
        html,
        text: `Your MindWell verification code is: ${otp}\nThis code expires in 5 minutes.\n\nIf you didn't request this, please ignore this email.`
    });

    return result;
}
    // ─── Core Send Function ────────────────────────────────────
    async sendEmail({ to, subject, html, text, attachments = [] }) {
        try {
            const info = await this.transporter.sendMail({
                from: `"MindWell" <${process.env.SMTP_USER}>`,
                to: to,
                subject: subject,
                text: text || html.replace(/<[^>]*>/g, ''),
                html: html,
                attachments: attachments
            });

            console.log(`✅ Email sent to ${to}: ${info.messageId}`);
            return {
                success: true,
                messageId: info.messageId,
                response: info.response
            };

        } catch (error) {
            console.error(`❌ Email send failed to ${to}:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ─── Build OTP HTML Template ──────────────────────────────
    buildOTPHTML(otp, name) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; margin: 0; }
                    .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .header { text-align: center; padding-bottom: 20px; border-bottom: 2px solid #6C63FF; }
                    .logo { font-size: 28px; font-weight: 700; color: #6C63FF; }
                    .otp-box { background: #F0EFFF; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }
                    .otp-code { font-size: 40px; font-weight: 700; color: #6C63FF; letter-spacing: 10px; }
                    .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">🧠 MindWell</div>
                    </div>
                    <h2>Hello ${name}!</h2>
                    <p>Thank you for choosing MindWell. Please use the verification code below to complete your registration:</p>
                    <div class="otp-box">
                        <div class="otp-code">${otp}</div>
                    </div>
                    <p>This code will expire in <strong>5 minutes</strong>.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                    <div class="footer">
                        <p>© 2024 MindWell. All rights reserved.</p>
                        <p>Your wellness, our priority 💙</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }
}

module.exports = new EmailService();