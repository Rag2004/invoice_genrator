// middleware/authMiddleware.js
const jwtHelper = require('../utils/jwtHelper');

/**
 * Simple JWT auth middleware.
 * Expects header: Authorization: Bearer <token>
 * On success, sets req.user = decodedToken and calls next().
 */
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (!token || scheme.toLowerCase() !== 'bearer') {
    return res.status(401).json({
      ok: false,
      error: 'Missing or invalid Authorization header',
    });
  }

  try {
    const decoded = jwtHelper.verifyToken(token); // your helper should throw if invalid
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({
      ok: false,
      error: 'Invalid or expired token',
    });
  }
}

module.exports = authMiddleware;
