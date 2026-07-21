// test-email.js
const dotenv = require('dotenv');
dotenv.config();
const nodemailer = require('nodemailer');

async function testEmail() {
    console.log('📧 Testing email service...');
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Set (length: ' + process.env.EMAIL_PASS.length + ')' : '❌ Missing');
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('❌ Email credentials missing in .env');
        return;
    }

    try {
        // Create transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        console.log('✅ Transporter created successfully');

        // Verify connection
        await transporter.verify();
        console.log('✅ SMTP connection verified');

        // Send test email
        const info = await transporter.sendMail({
            from: `"MindWell Test" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: 'Test Email from MindWell',
            html: '<h1>Hello!</h1><p>This is a test email from MindWell.</p>'
        });

        console.log('✅ Test email sent successfully!');
        console.log('📧 Message ID:', info.messageId);
        console.log('📧 Response:', info.response);
    } catch (error) {
        console.error('❌ Test email failed:');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        if (error.response) {
            console.error('Response:', error.response);
        }
        if (error.responseCode) {
            console.error('Response Code:', error.responseCode);
        }
    }
}

testEmail();