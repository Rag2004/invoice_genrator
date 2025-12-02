// // middleware/authMiddleware.js
// const jwtHelper = require('../utils/jwtHelper');

// /**
//  * JWT auth middleware.
//  * - Expects header: Authorization: Bearer <token>
//  * - On success sets req.user = decodedToken (normalized)
//  * - Dev helper: if header x-consultant-id is present, it will be used (for local testing)
//  */
// function authMiddleware(req, res, next) {
//   // Dev shortcut: allow setting consultant id directly via header (only used if present)
//   // Useful for local testing when you don't want to generate a JWT every time.
//   const devConsultantId = req.headers['x-consultant-id'];
//   if (devConsultantId) {
//     req.user = req.user || {};
//     // normalize into multiple fields downstream may expect
//     req.user.consultant_id = req.user.consultantId = req.user.id = String(devConsultantId);
//     return next();
//   }

//   const header = req.headers.authorization || '';
//   const [scheme, token] = header.split(' ');

//   if (!token || (scheme && scheme.toLowerCase() !== 'bearer')) {
//     return res.status(401).json({
//       ok: false,
//       error: 'Missing or invalid Authorization header',
//     });
//   }

//   try {
//     const decoded = jwtHelper.verifyToken(token); // should throw if invalid/expired

//     // normalize the commonly-used identifier keys so downstream handlers can rely on consultant_id
//     const user = Object.assign({}, decoded);

//     // possible field names in tokens: consultant_id, consultantId, id, sub, userId
//     const idFromToken =
//       user.consultant_id ||
//       user.consultantId ||
//       user.id ||
//       user.sub ||
//       user.userId ||
//       null;

//     if (idFromToken) {
//       user.consultant_id = String(idFromToken);
//       user.consultantId = String(idFromToken);
//       user.id = String(idFromToken);
//     }

//     req.user = user;
//     return next();
//   } catch (err) {
//     return res.status(401).json({
//       ok: false,
//       error: 'Invalid or expired token',
//     });
//   }
// }

// module.exports = authMiddleware;
// middleware/authMiddleware.js
const jwtHelper = require('../utils/jwtHelper');

/**
 * JWT auth middleware.
 * - Expects header: Authorization: Bearer <token>
 * - On success sets req.user = decodedToken (normalized)
 * - Dev helper: if header x-consultant-id is present, it will be used (for local testing)
 */
function authMiddleware(req, res, next) {
  // Dev shortcut: allow setting consultant id directly via header (only used if present)
  const devConsultantId = req.headers['x-consultant-id'] || req.headers['x-consultantid'];
  if (devConsultantId) {
    req.user = req.user || {};
    req.user.consultant_id = req.user.consultantId = req.user.id = String(devConsultantId);
    return next();
  }

  const header = req.headers.authorization || '';
  const parts = header.split(' ').filter(Boolean);
  const scheme = parts[0] || '';
  const token = parts[1] || null;

  if (!token || (scheme && scheme.toLowerCase() !== 'bearer')) {
    return res.status(401).json({
      ok: false,
      error: 'Missing or invalid Authorization header',
    });
  }

  try {
    const decoded = jwtHelper.verifyToken(token); // should throw if invalid/expired

    const user = Object.assign({}, decoded);

    // possible field names in tokens: consultant_id, consultantId, id, sub, userId
    const idFromToken =
      user.consultant_id ||
      user.consultantId ||
      user.id ||
      user.sub ||
      user.userId ||
      null;

    if (idFromToken) {
      user.consultant_id = String(idFromToken);
      user.consultantId = String(idFromToken);
      user.id = String(idFromToken);
    }

    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({
      ok: false,
      error: 'Invalid or expired token',
    });
  }
}

module.exports = authMiddleware;
