// utils/otpGenerator.js
const crypto = require('crypto');

/**
 * Generate a random OTP code
 * @param {number} length - Length of OTP (default: 6)
 * @returns {string} - OTP code
 */
function generateOTP(length = 6) {
  // Generate random number with specified length
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  const otp = Math.floor(min + Math.random() * (max - min + 1));
  return otp.toString();
}

/**
 * Generate OTP with expiry time
 * @returns {object} - { otp, expiresAt }
 */
function generateOTPWithExpiry() {
  const otpLength = parseInt(process.env.OTP_LENGTH) || 6;
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
  
  const otp = generateOTP(otpLength);
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  
  return {
    otp,
    expiresAt,
    expiryMinutes,
  };
}

/**
 * Check if OTP is expired
 * @param {Date} expiresAt - Expiry timestamp
 * @returns {boolean}
 */
function isOTPExpired(expiresAt) {
  return new Date() > new Date(expiresAt);
}

/**
 * Format time remaining for OTP
 * @param {Date} expiresAt - Expiry timestamp
 * @returns {string} - "9 minutes 30 seconds"
 */
function getTimeRemaining(expiresAt) {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry - now;
  
  if (diffMs <= 0) return 'Expired';
  
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  
  if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  return `${seconds} second${seconds !== 1 ? 's' : ''}`;
}

module.exports = {
  generateOTP,
  generateOTPWithExpiry,
  isOTPExpired,
  getTimeRemaining,
};