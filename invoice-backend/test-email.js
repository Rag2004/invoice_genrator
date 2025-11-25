// test-email.js
require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('🧪 Testing Email Configuration...\n');

// Check if env variables are loaded
console.log('📧 Email User:', process.env.EMAIL_USER);
console.log('🔑 App Password:', process.env.EMAIL_APP_PASSWORD ? '✅ Set' : '❌ Not Set');
console.log('');

// Create transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

// Test email
const testEmail = {
  from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
  to: process.env.EMAIL_USER, // Send to yourself
  subject: '✅ Invoice App - Email Configuration Test',
  html: `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 50px auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .content {
            padding: 30px;
          }
          .success-badge {
            background: #10b981;
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            display: inline-block;
            margin: 20px 0;
          }
          .footer {
            background: #f9fafb;
            padding: 20px;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Email Test Successful!</h1>
          </div>
          <div class="content">
            <div class="success-badge">
              ✅ Configuration Working
            </div>
            <p>Great news! Your email configuration is set up correctly.</p>
            <p><strong>Email Service:</strong> ${process.env.EMAIL_SERVICE}</p>
            <p><strong>From:</strong> ${process.env.EMAIL_USER}</p>
            <p>You're ready to proceed to <strong>Step 2</strong>!</p>
          </div>
          <div class="footer">
            Invoice Generator - Authentication System
          </div>
        </div>
      </body>
    </html>
  `,
};

// Send test email
console.log('📤 Sending test email...\n');

transporter.sendMail(testEmail, (error, info) => {
  if (error) {
    console.error('❌ EMAIL TEST FAILED\n');
    console.error('Error:', error.message);
    console.error('\n🔍 Troubleshooting:');
    console.error('1. Check EMAIL_USER is your full Gmail address');
    console.error('2. Check EMAIL_APP_PASSWORD has NO SPACES');
    console.error('3. Verify 2-Step Verification is enabled on Gmail');
    console.error('4. Make sure you generated an "App Password" (not your Gmail password)');
    console.error('5. Try generating a new App Password\n');
    process.exit(1);
  } else {
    console.log('✅ EMAIL SENT SUCCESSFULLY!\n');
    console.log('📬 Message ID:', info.messageId);
    console.log('📧 Check your inbox:', process.env.EMAIL_USER);
    console.log('\n🎉 Step 1 Complete! You can proceed to Step 2.\n');
    process.exit(0);
  }
});