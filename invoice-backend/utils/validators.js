// utils/validators.js
const validator = require('validator');

/**
 * Validate email address
 * @param {string} email
 * @returns {object} { valid: boolean, error: string }
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const trimmedEmail = email.trim().toLowerCase();

  if (!validator.isEmail(trimmedEmail)) {
    return { valid: false, error: 'Invalid email format' };
  }

  // Additional checks
  if (trimmedEmail.length > 254) {
    return { valid: false, error: 'Email is too long' };
  }

  return { valid: true, email: trimmedEmail };
}

/**
 * Validate OTP code
 * @param {string} otp
 * @returns {object} { valid: boolean, error: string }
 */
function validateOTP(otp) {
  if (!otp || typeof otp !== 'string') {
    return { valid: false, error: 'OTP is required' };
  }

  const trimmedOTP = otp.trim();
  const otpLength = parseInt(process.env.OTP_LENGTH) || 6;

  if (trimmedOTP.length !== otpLength) {
    return { valid: false, error: `OTP must be ${otpLength} digits` };
  }

  if (!/^\d+$/.test(trimmedOTP)) {
    return { valid: false, error: 'OTP must contain only digits' };
  }

  return { valid: true, otp: trimmedOTP };
}

/**
 * Validate name
 * @param {string} name
 * @returns {object} { valid: boolean, error: string }
 */
function validateName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Name is required' };
  }

  const trimmedName = name.trim();

  if (trimmedName.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }

  if (trimmedName.length > 100) {
    return { valid: false, error: 'Name is too long (max 100 characters)' };
  }

  // Allow letters, spaces, hyphens, and apostrophes
  if (!/^[a-zA-Z\s'-]+$/.test(trimmedName)) {
    return { valid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
  }

  return { valid: true, name: trimmedName };
}

/**
 * Validate phone number (optional)
 * @param {string} phone
 * @returns {object} { valid: boolean, error: string, phone: string }
 */
function validatePhone(phone) {
  if (!phone) {
    return { valid: true, phone: '' }; // Phone is optional
  }

  if (typeof phone !== 'string') {
    return { valid: false, error: 'Invalid phone number format' };
  }

  const trimmedPhone = phone.trim();

  // Remove common separators
  const cleanPhone = trimmedPhone.replace(/[\s\-\(\)\.]/g, '');

  // Check if it's a valid mobile number (basic check)
  if (!/^\+?\d{10,15}$/.test(cleanPhone)) {
    return { valid: false, error: 'Invalid phone number (10-15 digits required)' };
  }

  return { valid: true, phone: cleanPhone };
}

/**
 * Sanitize string input
 * @param {string} input
 * @returns {string}
 */
function sanitizeString(input) {
  if (!input || typeof input !== 'string') return '';
  
  // Remove potentially dangerous characters
  return validator.escape(input.trim());
}

module.exports = {
  validateEmail,
  validateOTP,
  validateName,
  validatePhone,
  sanitizeString,
};