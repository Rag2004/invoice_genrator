// // test-email.js
// require('dotenv').config();
// const nodemailer = require('nodemailer');

// console.log('🧪 Testing Email Configuration...\n');

// // Check if env variables are loaded
// console.log('📧 Email User:', process.env.EMAIL_USER);
// console.log('🔑 App Password:', process.env.EMAIL_APP_PASSWORD ? '✅ Set' : '❌ Not Set');
// console.log('');

// // Create transporter
// const transporter = nodemailer.createTransport({
//   service: process.env.EMAIL_SERVICE,
//   host: process.env.EMAIL_HOST,
//   port: process.env.EMAIL_PORT,
//   secure: process.env.EMAIL_SECURE === 'true',
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_APP_PASSWORD,
//   },
// });

// // Test email
// const testEmail = {
//   from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
//   to: process.env.EMAIL_USER, // Send to yourself
//   subject: '✅ Invoice App - Email Configuration Test',
//   html: `
//     <!DOCTYPE html>
//     <html>
//       <head>
//         <style>
//           body {
//             font-family: Arial, sans-serif;
//             background-color: #f4f4f4;
//             margin: 0;
//             padding: 0;
//           }
//           .container {
//             max-width: 600px;
//             margin: 50px auto;
//             background: white;
//             border-radius: 12px;
//             overflow: hidden;
//             box-shadow: 0 4px 6px rgba(0,0,0,0.1);
//           }
//           .header {
//             background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//             color: white;
//             padding: 30px;
//             text-align: center;
//           }
//           .content {
//             padding: 30px;
//           }
//           .success-badge {
//             background: #10b981;
//             color: white;
//             padding: 10px 20px;
//             border-radius: 20px;
//             display: inline-block;
//             margin: 20px 0;
//           }
//           .footer {
//             background: #f9fafb;
//             padding: 20px;
//             text-align: center;
//             color: #6b7280;
//             font-size: 14px;
//           }
//         </style>
//       </head>
//       <body>
//         <div class="container">
//           <div class="header">
//             <h1>🎉 Email Test Successful!</h1>
//           </div>
//           <div class="content">
//             <div class="success-badge">
//               ✅ Configuration Working
//             </div>
//             <p>Great news! Your email configuration is set up correctly.</p>
//             <p><strong>Email Service:</strong> ${process.env.EMAIL_SERVICE}</p>
//             <p><strong>From:</strong> ${process.env.EMAIL_USER}</p>
//             <p>You're ready to proceed to <strong>Step 2</strong>!</p>
//           </div>
//           <div class="footer">
//             Invoice Generator - Authentication System
//           </div>
//         </div>
//       </body>
//     </html>
//   `,
// };

// // Send test email
// console.log('📤 Sending test email...\n');

// transporter.sendMail(testEmail, (error, info) => {
//   if (error) {
//     console.error('❌ EMAIL TEST FAILED\n');
//     console.error('Error:', error.message);
//     console.error('\n🔍 Troubleshooting:');
//     console.error('1. Check EMAIL_USER is your full Gmail address');
//     console.error('2. Check EMAIL_APP_PASSWORD has NO SPACES');
//     console.error('3. Verify 2-Step Verification is enabled on Gmail');
//     console.error('4. Make sure you generated an "App Password" (not your Gmail password)');
//     console.error('5. Try generating a new App Password\n');
//     process.exit(1);
//   } else {
//     console.log('✅ EMAIL SENT SUCCESSFULLY!\n');
//     console.log('📬 Message ID:', info.messageId);
//     console.log('📧 Check your inbox:', process.env.EMAIL_USER);
//     console.log('\n🎉 Step 1 Complete! You can proceed to Step 2.\n');
//     process.exit(0);
//   }
// });
// test-email.js - Run this to test your email configuration
// Usage: node test-email.js

require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('🧪 Testing Email Configuration...\n');
  
  // Check environment variables
  console.log('📋 Configuration Check:');
  console.log('EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
  console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
  console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_APP_PASSWORD:', process.env.EMAIL_APP_PASSWORD ? `${process.env.EMAIL_APP_PASSWORD.substring(0, 4)}****` : 'NOT SET');
  console.log('EMAIL_FROM_ADDRESS:', process.env.EMAIL_FROM_ADDRESS);
  console.log('');

  // Validate required fields
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    console.error('❌ ERROR: EMAIL_USER or EMAIL_APP_PASSWORD not set in .env');
    process.exit(1);
  }

  // Create transporter
  console.log('🔧 Creating email transporter...');
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || 587),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });

  // Verify connection
  console.log('🔍 Verifying SMTP connection...');
  try {
    await transporter.verify();
    console.log('✅ SMTP connection successful!\n');
  } catch (error) {
    console.error('❌ SMTP connection failed:');
    console.error(error.message);
    console.error('\n💡 Common issues:');
    console.error('1. App Password is incorrect (should be 16 characters)');
    console.error('2. 2-Factor Authentication not enabled on Gmail');
    console.error('3. "Less secure app access" is ON (should be OFF, use App Password instead)');
    console.error('4. Wrong email/password combination');
    process.exit(1);
  }

  // Send test email
  console.log('📧 Sending test email...');
  const testOTP = '123456';
  
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'Invoice Generator'}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to: process.env.EMAIL_USER, // Send to yourself for testing
    subject: '🧪 Test Email - OTP Service',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f3f4f6; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); }
            .header { color: #667eea; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
            .otp { background: #f0f9ff; border: 2px solid #3b82f6; padding: 20px; border-radius: 12px; text-align: center; }
            .otp-code { font-size: 36px; font-weight: bold; color: #1e40af; letter-spacing: 6px; font-family: monospace; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">🧪 Email Service Test</div>
            <p>This is a test email from your Invoice Generator application.</p>
            <p>If you're seeing this, your email configuration is working correctly!</p>
            <div class="otp">
              <div style="font-size: 14px; color: #1e40af; margin-bottom: 10px;">TEST OTP CODE</div>
              <div class="otp-code">${testOTP}</div>
            </div>
            <div class="footer">
              <strong>✅ Email Service Status: WORKING</strong><br>
              Sent from: ${process.env.EMAIL_FROM_ADDRESS}<br>
              Service: ${process.env.EMAIL_SERVICE}<br>
              Time: ${new Date().toLocaleString()}
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
TEST EMAIL - OTP Service

This is a test email from your Invoice Generator application.

Test OTP Code: ${testOTP}

If you're seeing this, your email configuration is working correctly!

---
Email Service Status: WORKING
Sent from: ${process.env.EMAIL_FROM_ADDRESS}
Service: ${process.env.EMAIL_SERVICE}
Time: ${new Date().toLocaleString()}
    `.trim(),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully!');
    console.log('📬 Message ID:', info.messageId);
    console.log('📧 Email sent to:', process.env.EMAIL_USER);
    console.log('\n✨ Check your inbox (and spam folder) for the test email.\n');
    console.log('🎉 Email service is working correctly!');
  } catch (error) {
    console.error('❌ Failed to send test email:');
    console.error(error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('1. Check if Gmail blocked the login attempt');
    console.error('2. Visit: https://myaccount.google.com/lesssecureapps');
    console.error('3. Check for security alerts: https://myaccount.google.com/notifications');
    console.error('4. Make sure you\'re using an App Password, not your regular password');
    process.exit(1);
  }
}

// Run the test
testEmail().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});