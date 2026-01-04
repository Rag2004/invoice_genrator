// utils/jwtHelper.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

/**
 * Generate JWT token for user (main function)
 * Accepts payload that may include:
 * - consultant_id (preferred)
 * - sub (fallback)
 * - email, name, role
 *
 * Token will include:
 * - sub (string) -> consultant_id or payload.sub
 * - consultant_id (explicit claim)
 * - email, name, role, type
 */
function generateToken(payload = {}) {
  try {
    // Prefer consultant_id, otherwise fallback to sub
    const consultantId = payload.consultant_id || payload.consultantId || payload.sub || payload.id || null;

    const claims = {
      // keep backward-compatible fields
      sub: consultantId || undefined,
      consultant_id: consultantId || undefined,

      // user-visible fields
      email: payload.email || undefined,
      name: payload.name || undefined,
      role: payload.role || 'consultant',
      type: payload.type || 'access',
    };

    // Remove undefined keys to keep token compact
    const finalClaims = {};
    Object.keys(claims).forEach(k => {
      if (claims[k] !== undefined) finalClaims[k] = claims[k];
    });

    const token = jwt.sign(finalClaims, JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
      issuer: 'invoice-generator',
      audience: 'invoice-app',
    });
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
  signToken,
  generateToken,
  verifyToken,
  decodeToken,
  isTokenExpired,
  getTokenExpiry,
};
