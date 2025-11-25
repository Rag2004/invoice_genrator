// utils/jwtHelper.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

/**
 * Generate JWT token for user
 * @param {object} payload - User data { id, email, name }
 * @returns {string} - JWT token
 */
function generateToken(payload) {
  try {
    const token = jwt.sign(
      {
        id: payload.id,
        email: payload.email,
        name: payload.name,
        type: 'access',
      },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRY,
        issuer: 'invoice-generator',
        audience: 'invoice-app',
      }
    );
    return token;
  } catch (error) {
    console.error('Error generating token:', error);
    throw new Error('Failed to generate token');
  }
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {object} - Decoded payload
 */
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'invoice-generator',
      audience: 'invoice-app',
    });
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token verification failed');
    }
  }
}

/**
 * Decode token without verification (for debugging)
 * @param {string} token - JWT token
 * @returns {object} - Decoded payload
 */
function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
}

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean}
 */
function isTokenExpired(token) {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    return Date.now() >= decoded.exp * 1000;
  } catch (error) {
    return true;
  }
}

/**
 * Get time until token expires
 * @param {string} token - JWT token
 * @returns {number} - Milliseconds until expiry
 */
function getTokenExpiry(token) {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return 0;
    return decoded.exp * 1000 - Date.now();
  } catch (error) {
    return 0;
  }
}

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
  isTokenExpired,
  getTokenExpiry,
};