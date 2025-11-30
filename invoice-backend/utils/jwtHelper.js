const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

/**
 * Generate JWT token for user (main function)
 * @param {object} payload - User data { sub, email, name }
 * @returns {string} - JWT token
 */
function generateToken(payload) {
  try {
    const token = jwt.sign(
      {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role || 'consultant',
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
 * Alias so existing code using jwtHelper.signToken keeps working.
 */
function signToken(payload) {
  return generateToken(payload);
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'invoice-generator',
      audience: 'invoice-app',
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw new Error('Token verification failed');
  }
}

/**
 * Decode without validation
 */
function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
}

/**
 * Check expiry
 */
function isTokenExpired(token) {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    return Date.now() >= decoded.exp * 1000;
  } catch {
    return true;
  }
}

/**
 * Time left before expiry (ms)
 */
function getTokenExpiry(token) {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return 0;
    return decoded.exp * 1000 - Date.now();
  } catch {
    return 0;
  }
}

module.exports = {
  signToken,        // <-- required by your /verify-otp route
  generateToken,
  verifyToken,
  decodeToken,
  isTokenExpired,
  getTokenExpiry,
};
