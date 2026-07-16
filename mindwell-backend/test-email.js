// test-email.js
require('dotenv').config();
const emailService = require('./src/services/email.service');

const testEmail = async () => {
    console.log('📧 Testing email service...');
    console.log('SMTP_USER:', process.env.SMTP_USER);
    console.log('SMTP_HOST:', process.env.SMTP_HOST);
    console.log('SMTP_PORT:', process.env.SMTP_PORT);

    const result = await emailService.sendOTP(
        'fatimaamjad353@gmail.com',
        '123456',
        'Test User'
    );

    console.log('Result:', result);
};

testEmail();