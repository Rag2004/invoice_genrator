// utils/emailService.js
const nodemailer = require('nodemailer');

// Create email transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

/**
 * Send OTP email
 * @param {string} email - Recipient email
 * @param {string} otp - 6-digit OTP
 * @param {string} name - User's name (optional)
 * @param {string} type - 'signup' or 'login'
 */
async function sendOTPEmail(email, otp, name = '', type = 'login') {
  const expiryMinutes = process.env.OTP_EXPIRY_MINUTES || 10;
  
  const subject = type === 'signup' 
    ? '🎉 Welcome to Invoice Generator - Verify Your Email'
    : '🔐 Your Login Code for Invoice Generator';
  
  const greeting = name ? `Hi ${name}` : 'Hello';
  const purpose = type === 'signup'
    ? 'Welcome to Invoice Generator! To complete your registration, please verify your email address.'
    : 'You requested to log in to your Invoice Generator account.';

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to: email,
    subject: subject,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background-color: #f3f4f6;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              font-size: 28px;
              margin-bottom: 10px;
              font-weight: 700;
            }
            .header p {
              font-size: 16px;
              opacity: 0.95;
            }
            .content {
              padding: 40px 30px;
            }
            .greeting {
              font-size: 18px;
              color: #1f2937;
              margin-bottom: 20px;
            }
            .message {
              color: #4b5563;
              line-height: 1.6;
              margin-bottom: 30px;
              font-size: 15px;
            }
            .otp-container {
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              border: 2px solid #3b82f6;
              border-radius: 12px;
              padding: 30px;
              text-align: center;
              margin: 30px 0;
            }
            .otp-label {
              font-size: 14px;
              color: #1e40af;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 15px;
            }
            .otp-code {
              font-size: 42px;
              font-weight: 700;
              color: #1e40af;
              letter-spacing: 8px;
              margin: 10px 0;
              font-family: 'Courier New', monospace;
            }
            .expiry {
              color: #ef4444;
              font-size: 14px;
              margin-top: 15px;
              font-weight: 600;
            }
            .warning {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .warning-title {
              font-weight: 700;
              color: #92400e;
              margin-bottom: 8px;
              font-size: 14px;
            }
            .warning-text {
              color: #78350f;
              font-size: 13px;
              line-height: 1.5;
            }
            .footer {
              background: #f9fafb;
              padding: 30px;
              text-align: center;
              color: #6b7280;
              font-size: 13px;
              line-height: 1.6;
            }
            .footer a {
              color: #3b82f6;
              text-decoration: none;
            }
            .divider {
              height: 1px;
              background: #e5e7eb;
              margin: 30px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Verification Code</h1>
              <p>Invoice Generator</p>
            </div>
            
            <div class="content">
              <div class="greeting">${greeting},</div>
              
              <div class="message">
                ${purpose}
              </div>
              
              <div class="otp-container">
                <div class="otp-label">Your Verification Code</div>
                <div class="otp-code">${otp}</div>
                <div class="expiry">⏱️ Expires in ${expiryMinutes} minutes</div>
              </div>
              
              <div class="warning">
                <div class="warning-title">🔒 Security Notice</div>
                <div class="warning-text">
                  Never share this code with anyone. Invoice Generator will never ask for your code via phone, email, or any other method.
                </div>
              </div>
              
              <div class="divider"></div>
              
              <div class="message" style="margin-bottom: 0;">
                If you didn't request this code, please ignore this email or contact our support team.
              </div>
            </div>
            
            <div class="footer">
              <strong>Invoice Generator</strong><br>
              Professional Invoice Management System<br><br>
              
              Need help? Contact us at <a href="mailto:${process.env.EMAIL_FROM_ADDRESS}">${process.env.EMAIL_FROM_ADDRESS}</a><br><br>
              
              © ${new Date().getFullYear()} Invoice Generator. All rights reserved.
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
${greeting},

${purpose}

Your verification code is: ${otp}

This code will expire in ${expiryMinutes} minutes.

SECURITY NOTICE:
Never share this code with anyone. Invoice Generator will never ask for your code via phone, email, or any other method.

If you didn't request this code, please ignore this email.

---
Invoice Generator
${process.env.EMAIL_FROM_ADDRESS}
    `.trim(),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ OTP email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email send failed:', error);
    throw new Error('Failed to send OTP email');
  }
}

/**
 * Send welcome email after successful registration
 */
async function sendWelcomeEmail(email, name) {
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to: email,
    subject: '🎉 Welcome to Invoice Generator!',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; background-color: #f3f4f6; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
            .content { padding: 40px 30px; }
            .button { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; margin: 20px 0; }
            .footer { background: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome Aboard!</h1>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <p style="margin: 20px 0; color: #4b5563; line-height: 1.6;">
                Welcome to Invoice Generator! Your account has been successfully created.
              </p>
              <p style="margin: 20px 0; color: #4b5563; line-height: 1.6;">
                You can now start creating professional invoices in seconds.
              </p>
              <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
            </div>
            <div class="footer">
              © ${new Date().getFullYear()} Invoice Generator. All rights reserved.
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent to:', email);
  } catch (error) {
    console.error('❌ Welcome email failed:', error);
    // Don't throw error - welcome email is not critical
  }
}

module.exports = {
  sendOTPEmail,
  sendWelcomeEmail,
};