// routes/auth.js
const express = require('express');
const router = express.Router();

const logger = require('../utils/logger');
const validators = require('../utils/validators');
const jwtHelper = require('../utils/jwtHelper');
const authMiddleware = require('../middleware/authMiddleware');
const appsScript = require('../lib/appsScriptClient');

/**
 * Normalise consultant object coming back from Apps Script
 * into a consistent user shape for the frontend.
 */
function mapConsultantToUser(consultant) {
  if (!consultant) return null;

  const consultantId =
    consultant.consultant_id ||
    consultant.consultantId ||
    consultant.id ||
    consultant.ID ||
    null;

  return {
    consultantId,
    email: consultant.email || '',
    name: consultant.name || '',
    phone: consultant.phone || '',
    status: consultant.status || '',
    createdAt: consultant.created_at || consultant.createdAt || null,
    lastLogin: consultant.last_login || consultant.lastLogin || null,
  };
}

/**
 * POST /api/auth/start-login
 * Body: { email }
 * Calls Apps Script -> startLogin (creates OTP + sends email).
 */
router.post('/start-login', async (req, res) => {
  const { email } = req.body || {};

  if (!email || !validators.isValidEmail?.(email)) {
    return res.status(400).json({
      ok: false,
      error: 'Please provide a valid email address.',
    });
  }

  try {
    const trimmed = String(email).trim().toLowerCase();
    const result = await appsScript.startLogin(trimmed);

    // Apps Script result example:
    // { ok, email, otpType, isExistingUser, expiresAt, error? }

    if (result.ok === false) {
      return res.status(500).json({
        ok: false,
        error: result.error || 'Failed to start login',
      });
    }

    return res.json({
      ok: true,
      email: result.email || trimmed,
      isExistingUser: !!result.isExistingUser,
      expiresAt: result.expiresAt || null,
    });
  } catch (err) {
    logger.error({ err }, 'Error in /auth/start-login');
    return res.status(500).json({
      ok: false,
      error: err.message || 'Failed to start login',
    });
  }
});

/**
 * POST /api/auth/verify-otp
 * Body: { email, otp }
 * Verifies OTP in Apps Script and issues JWT (7d session).
 */
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body || {};

  if (!email || !otp) {
    return res.status(400).json({
      ok: false,
      error: 'Email and OTP are required.',
    });
  }

  try {
    const trimmedEmail = String(email).trim().toLowerCase();
    const result = await appsScript.verifyOtp(trimmedEmail, otp);

    // Apps Script result example:
    // {
    //   ok: true/false,
    //   email,
    //   consultant,
    //   isNew,
    //   needsProfile,
    //   error?
    // }

    if (result.ok === false) {
      const errCode = result.error || '';
      const isClientError =
        errCode === 'invalid_otp' ||
        errCode === 'otp_expired' ||
        errCode === 'too_many_attempts';

      return res.status(isClientError ? 400 : 500).json({
        ok: false,
        error: errCode || 'OTP verification failed',
      });
    }

    const consultant = mapConsultantToUser(result.consultant);
    const needsProfile = !!result.needsProfile;
    const emailForToken = consultant?.email || result.email || trimmedEmail;

    // Payload stored in JWT
    const tokenPayload = {
      sub: consultant?.consultantId || emailForToken,
      email: emailForToken,
      name: consultant?.name || '',
      role: 'consultant',
    };

    const token = jwtHelper.signToken(tokenPayload); // should default to 7 days

    return res.json({
      ok: true,
      token,
      user: consultant || {
        consultantId: null,
        email: emailForToken,
        name: '',
        phone: '',
        status: needsProfile ? 'pending_profile' : 'active',
      },
      needsProfile,
    });
  } catch (err) {
    logger.error({ err }, 'Error in /auth/verify-otp');
    return res.status(500).json({
      ok: false,
      error: err.message || 'Failed to verify OTP',
    });
  }
});

/**
 * POST /api/auth/complete-profile
 * Protected route.
 * Body: { name, phone }
 * Email comes from JWT (req.user.email), then Apps Script updates consultant.
 */
router.post('/complete-profile', authMiddleware, async (req, res) => {
  const { name, phone } = req.body || {};
  const email = req.user?.email;

  if (!email) {
    return res.status(401).json({
      ok: false,
      error: 'No email found in token.',
    });
  }

  if (!name || String(name).trim().length < 2) {
    return res.status(400).json({
      ok: false,
      error: 'Please provide your full name.',
    });
  }

  try {
    const result = await appsScript.completeProfile({
      email,
      name,
      phone,
    });

    // Apps Script result example:
    // { ok: true, consultant: {...}, error? }

    if (result.ok === false) {
      return res.status(500).json({
        ok: false,
        error: result.error || 'Failed to complete profile',
      });
    }

    const consultant = mapConsultantToUser(result.consultant);
    const emailForToken = consultant?.email || email;

    // Optional: issue a fresh token with updated name
    const tokenPayload = {
      sub: consultant?.consultantId || emailForToken,
      email: emailForToken,
      name: consultant?.name || name,
      role: 'consultant',
    };
    const newToken = jwtHelper.signToken(tokenPayload);

    return res.json({
      ok: true,
      token: newToken,
      user: consultant,
    });
  } catch (err) {
    logger.error({ err }, 'Error in /auth/complete-profile');
    return res.status(500).json({
      ok: false,
      error: err.message || 'Failed to complete profile',
    });
  }
});

module.exports = router;
