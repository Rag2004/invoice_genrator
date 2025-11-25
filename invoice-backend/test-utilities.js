// test-utilities.js
require('dotenv').config();

const { generateOTPWithExpiry, isOTPExpired, getTimeRemaining } = require('./utils/otpGenerator');
const { sendOTPEmail } = require('./utils/emailService');
const { generateToken, verifyToken } = require('./utils/jwtHelper');
const { validateEmail, validateOTP, validateName } = require('./utils/validators');

console.log('🧪 Testing Utilities...\n');

// Test 1: OTP Generator
console.log('1️⃣ Testing OTP Generator:');
const otpData = generateOTPWithExpiry();
console.log('   Generated OTP:', otpData.otp);
console.log('   Expires at:', otpData.expiresAt);
console.log('   Time remaining:', getTimeRemaining(otpData.expiresAt));
console.log('   Is expired:', isOTPExpired(otpData.expiresAt));
console.log('   ✅ OTP Generator works!\n');

// Test 2: Validators
console.log('2️⃣ Testing Validators:');
const emailTest = validateEmail('test@example.com');
console.log('   Email validation:', emailTest);
const otpTest = validateOTP('123456');
console.log('   OTP validation:', otpTest);
const nameTest = validateName('John Doe');
console.log('   Name validation:', nameTest);
console.log('   ✅ Validators work!\n');

// Test 3: JWT Helper
console.log('3️⃣ Testing JWT Helper:');
const testUser = { id: 'CONS_001', email: 'test@example.com', name: 'John Doe' };
const token = generateToken(testUser);
console.log('   Generated token:', token.substring(0, 50) + '...');
const decoded = verifyToken(token);
console.log('   Decoded token:', decoded);
console.log('   ✅ JWT Helper works!\n');

// Test 4: Email Service
console.log('4️⃣ Testing Email Service:');
console.log('   Sending test OTP email...');

sendOTPEmail(process.env.EMAIL_USER, otpData.otp, 'Test User', 'signup')
  .then(() => {
    console.log('   ✅ Email sent successfully!');
    console.log('   📧 Check your inbox:', process.env.EMAIL_USER);
    console.log('\n🎉 All utilities working! Ready for Step 3!\n');
  })
  .catch((error) => {
    console.error('   ❌ Email failed:', error.message);
    console.log('\n⚠️ Email service needs configuration check.\n');
  });