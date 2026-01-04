// utils/validators.js
const validator = require('validator');

/**
 * Helper to normalize shape so both `valid` and `isValid` work.
 */
function wrapValidity(result) {
  // always add isValid mirror of valid, and vice-versa
  if (typeof result.valid === 'boolean' && typeof result.isValid !== 'boolean') {
    result.isValid = result.valid;
  }
  if (typeof result.isValid === 'boolean' && typeof result.valid !== 'boolean') {
    result.valid = result.isValid;
  }
  return result;
}

/**
 * Validate email address
 * @param {string} email
 * @returns {{ valid: boolean, isValid: boolean, error?: string, email?: string }}
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return wrapValidity({ valid: false, error: 'Email is required' });
  }

  const trimmedEmail = email.trim().toLowerCase();

  if (!validator.isEmail(trimmedEmail)) {
    return wrapValidity({ valid: false, error: 'Invalid email format' });
  }

  // Additional checks
  if (trimmedEmail.length > 254) {
    return wrapValidity({ valid: false, error: 'Email is too long' });
  }

  return wrapValidity({ valid: true, email: trimmedEmail });
}

/**
 * Validate OTP code
 * @param {string} otp
 * @returns {{ valid: boolean, isValid: boolean, error?: string, otp?: string }}
 */
function validateOTP(otp) {
  if (!otp || typeof otp !== 'string') {
    return wrapValidity({ valid: false, error: 'OTP is required' });
  }

  const trimmedOTP = otp.trim();
  const otpLength = parseInt(process.env.OTP_LENGTH, 10) || 6;

  if (trimmedOTP.length !== otpLength) {
    return wrapValidity({
      valid: false,
      error: `OTP must be ${otpLength} digits`,
    });
  }

  if (!/^\d+$/.test(trimmedOTP)) {
    return wrapValidity({
      valid: false,
      error: 'OTP must contain only digits',
    });
  }

  return wrapValidity({ valid: true, otp: trimmedOTP });
}

/**
 * Validate name
 * @param {string} name
 * @returns {{ valid: boolean, isValid: boolean, error?: string, name?: string }}
 */
function validateName(name) {
  if (!name || typeof name !== 'string') {
    return wrapValidity({ valid: false, error: 'Name is required' });
  }

  const trimmedName = name.trim();

  if (trimmedName.length < 2) {
    return wrapValidity({
      valid: false,
      error: 'Name must be at least 2 characters',
    });
  }

  if (trimmedName.length > 100) {
    return wrapValidity({
      valid: false,
      error: 'Name is too long (max 100 characters)',
    });
  }

  // Allow letters, spaces, hyphens, and apostrophes
  if (!/^[a-zA-Z\s'-]+$/.test(trimmedName)) {
    return wrapValidity({
      valid: false,
      error:
        'Name can only contain letters, spaces, hyphens, and apostrophes',
    });
  }

  return wrapValidity({ valid: true, name: trimmedName });
}

/**
 * Validate phone number (optional)
 * @param {string} phone
 * @returns {{ valid: boolean, isValid: boolean, error?: string, phone?: string }}
 */
function validatePhone(phone) {
  if (!phone) {
    // Phone is optional
    return wrapValidity({ valid: true, phone: '' });
  }

  if (typeof phone !== 'string') {
    return wrapValidity({
      valid: false,
      error: 'Invalid phone number format',
    });
  }

  const trimmedPhone = phone.trim();

  // Remove common separators
  const cleanPhone = trimmedPhone.replace(/[\s\-\(\)\.]/g, '');

  // Basic mobile number check
  if (!/^\+?\d{10,15}$/.test(cleanPhone)) {
    return wrapValidity({
      valid: false,
      error: 'Invalid phone number (10-15 digits required)',
    });
  }

  return wrapValidity({ valid: true, phone: cleanPhone });
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
