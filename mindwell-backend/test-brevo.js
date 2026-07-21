// test-brevo.js
const dotenv = require('dotenv');
dotenv.config();
const emailService = require('./src/services/email.service');

async function testEmail() {
    console.log('📧 Testing Brevo email service...');
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Set' : '❌ Missing');
    console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
    
    try {
        await emailService.sendEmail(
            'fatimaamjad353@gmail.com',
            'Test Email from MindWell',
            '<h1>Hello!</h1><p>Brevo is working! 🎉</p>'
        );
        console.log('✅ Email sent!');
    } catch (error) {
        console.error('❌ Failed:', error.message);
    }
}

testEmail();