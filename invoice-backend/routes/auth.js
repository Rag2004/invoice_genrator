// routes/auth.js
const express = require('express');
const router = express.Router();

const {
  validateEmail,
  validateOTP,
  validateName,
  validatePhone,
} = require('../utils/validators');

const emailService = require('../utils/emailService');
const jwtHelper = require('../utils/jwtHelper');
const appsScript = require('../lib/appsScriptClient');

// Import auth middleware for protected routes
const authMiddleware = require('../middleware/authMiddleware');

function log(...args) {
  console.log('[auth]', ...args);
}

function extractConsultantId(consultantObj) {
  if (!consultantObj) return null;
  return (
    consultantObj.consultant_id ||
    consultantObj.consultantId ||
    consultantObj.id ||
    consultantObj.consultant_id === 0 ? String(consultantObj.consultant_id) : null
  );
}

function normalizeConsultantObject(raw) {
  // normalize a consultant object into a predictable shape
  if (!raw || typeof raw !== 'object') return null;
  return {
    consultant_id: raw.consultant_id || raw.consultantId || raw.id || raw.consultant_id || null,
    email: raw.email || raw.emailAddress || raw.Email || '',
    name: raw.name || raw.fullName || '',
    phone: raw.phone || raw.mobile || '',
    created_at: raw.created_at || raw.createdAt || '',
    last_login: raw.last_login || raw.lastLogin || '',
    status: raw.status || ''
  };
}

/**
 * POST /api/auth/start-login
 * Body: { email }
 */
router.post('/start-login', async (req, res) => {
  try {
    const { email } = req.body || {};
    const { valid, error, email: cleanEmail } = validateEmail(email);

    if (!valid) {
      return res.status(400).json({ ok: false, error });
    }

    const otpLength = parseInt(process.env.OTP_LENGTH, 10) || 6;
    const otpType = 'login';

    // Generate OTP in backend flow — but delegated to appsScript.createOtpSession / storeOtpFromBackend
    // We'll call the backend helper that your appsScriptClient exposes:
    let storeResult;
    try {
      storeResult = await appsScript.storeOtpFromBackend({
        email: cleanEmail,
        otp_type: otpType,
        // appsScript.storeOtpFromBackend can generate OTP if not provided
      });
      log('appsScript.startLogin ->', JSON.stringify(storeResult));
    } catch (err) {
      console.error('[auth] appsScript.storeOtpFromBackend threw:', err && err.stack ? err.stack : err);
      return res.status(502).json({ ok: false, error: 'otp_store_failed', message: 'Failed to store OTP (upstream).' });
    }

    if (!storeResult || storeResult.ok === false) {
      console.error('[auth] Failed to store OTP:', storeResult);
      return res.status(500).json({
        ok: false,
        error: storeResult?.error || 'Failed to generate OTP. Please try again.',
      });
    }

    // Non-blocking email - appsScript may already send it, but we try local sending as fallback.
    try {
      if (process.env.NODE_ENV !== 'production') {
        // In dev we still attempt to log or send via configured mailer if needed
        log('DEV OTP stored for', cleanEmail);
      }
    } catch (e) {
      // ignore
    }

    return res.json({
      ok: true,
      email: storeResult.email || cleanEmail,
      otpType,
      expiresAt: storeResult.expiresAt || storeResult.expires_at || null,
      message: 'OTP sent to your email (or logged in dev).',
    });
  } catch (err) {
    console.error('[auth] start-login error', err && err.stack ? err.stack : err);
    return res.status(500).json({
      ok: false,
      error: 'Failed to start login. Please try again.',
    });
  }
});

/**
 * POST /api/auth/verify-otp
 * Body: { email, otp }
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body || {};

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({ ok: false, error: emailCheck.error });
    }

    const otpCheck = validateOTP(String(otp || ''));
    if (!otpCheck.valid) {
      return res.status(400).json({ ok: false, error: otpCheck.error });
    }

    const cleanEmail = emailCheck.email;
    const cleanOtp = otpCheck.otp;

    // 1) verify OTP with Apps Script (defensive)
    let verifyResult;
    try {
      verifyResult = await appsScript.verifyOtpFromBackend({
        email: cleanEmail,
        otp: cleanOtp,
      });
      log('appsScript.verifyOtp ->', JSON.stringify(verifyResult));
    } catch (err) {
      console.error('[auth] appsScript.verifyOtpFromBackend threw:', err && err.stack ? err.stack : err);
      return res.status(502).json({
        ok: false,
        error: 'apps_script_unavailable',
        message: 'Failed to verify OTP (upstream service error).'
      });
    }

    if (!verifyResult || verifyResult.ok === false) {
      const upstreamError = verifyResult?.error || verifyResult?.message || 'Invalid or expired OTP';
      console.warn('[auth] OTP verify failed ->', verifyResult);
      return res.status(400).json({
        ok: false,
        error: upstreamError,
        message: verifyResult?.message || 'Invalid or expired OTP',
      });
    }

    // 2) fetch consultant or create a stub
    let consultantResult;
    try {
      consultantResult = await appsScript.getConsultantByEmailAction({
        email: cleanEmail,
      });
      log('appsScript.getConsultantByEmailAction ->', JSON.stringify(consultantResult));
    } catch (err) {
      console.error('[auth] getConsultantByEmailAction threw:', err && err.stack ? err.stack : err);
      consultantResult = null;
    }

    let consultant = null;
    let needsProfile = false;

    // If consultantResult missing or not ok -> create consultant
    const hasValidConsultant = !!(consultantResult && consultantResult.ok && consultantResult.consultant);
    if (!hasValidConsultant) {
      log('[auth] consultant not found, attempting to create minimal consultant for', cleanEmail);
      let createResult;
      try {
        createResult = await appsScript.createConsultantAction({
          email: cleanEmail,
          name: '',
          phone: '',
        });
        log('appsScript.createConsultantAction ->', JSON.stringify(createResult));
      } catch (err) {
        console.error('[auth] createConsultantAction threw:', err && err.stack ? err.stack : err);
        return res.status(502).json({ ok: false, error: 'create_consultant_failed', message: 'Could not create consultant (upstream).' });
      }

      if (!createResult || createResult.ok === false || !createResult.consultant) {
        console.error('[auth] createConsultantAction result invalid:', createResult);
        return res.status(500).json({
          ok: false,
          error: createResult?.error || 'create_failed',
          message: 'Failed to create consultant.'
        });
      }

      consultant = normalizeConsultantObject(createResult.consultant);
      needsProfile = true;
    } else {
      consultant = normalizeConsultantObject(consultantResult.consultant);
      const hasName = !!(consultant.name && consultant.name.trim());
      needsProfile = !hasName;
    }

    // Defensive check: ensure consultant_id exists
    const consultantId = extractConsultantId(consultant);
    if (!consultantId) {
      console.error('[auth] missing consultant id from Apps Script', JSON.stringify(consultant));
      // try to create again as fallback
      try {
        const createAgain = await appsScript.createConsultantAction({
          email: cleanEmail,
          name: consultant.name || '',
          phone: consultant.phone || '',
        });
        log('appsScript.createConsultantAction (fallback) ->', JSON.stringify(createAgain));
        if (createAgain && createAgain.ok && createAgain.consultant) {
          consultant = normalizeConsultantObject(createAgain.consultant);
        }
      } catch (e) {
        console.error('[auth] fallback createConsultantAction threw:', e && e.stack ? e.stack : e);
      }
    }

    // Update last_login (best-effort)
    try {
      await appsScript.updateConsultantLastLoginAction({ email: cleanEmail });
    } catch (e) {
      console.warn('[auth] updateConsultantLastLoginAction failed (non-blocking):', e && e.stack ? e.stack : e);
    }

    // final check
    const finalConsultantId = extractConsultantId(consultant);
    if (!finalConsultantId) {
      console.error('[auth] still missing consultant id - cannot sign token', JSON.stringify(consultant));
      return res.status(500).json({ ok: false, error: 'missing_consultant_id', message: 'Server misconfiguration.' });
    }

    // 4) sign JWT
    const tokenPayload = {
      consultant_id: finalConsultantId,
      email: consultant.email || cleanEmail,
      name: consultant.name || '',
    };

    const token = jwtHelper.signToken(tokenPayload);

    return res.json({
      ok: true,
      token,
      needsProfile,
      consultant,
    });
  } catch (err) {
    console.error('verify-otp error', err && err.stack ? err.stack : err);
    return res.status(500).json({
      ok: false,
      error: 'Failed to verify OTP. Please try again.',
    });
  }
});

/**
 * POST /api/auth/complete-profile
 * Body: { email, name, phone }
 */
router.post('/complete-profile', async (req, res) => {
  try {
    const { email, name, phone } = req.body || {};

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({ ok: false, error: emailCheck.error });
    }

    const nameCheck = validateName(name);
    if (!nameCheck.valid) {
      return res.status(400).json({ ok: false, error: nameCheck.error });
    }

    const phoneCheck = validatePhone(phone);
    if (!phoneCheck.valid) {
      return res.status(400).json({ ok: false, error: phoneCheck.error });
    }

    const result = await appsScript.updateConsultantProfileAction({
      email: emailCheck.email,
      name: nameCheck.name,
      phone: phoneCheck.phone,
    });

    if (!result || result.ok === false) {
      return res.status(500).json({
        ok: false,
        error: result?.error || 'Failed to update profile',
      });
    }

    const consultant = result.consultant;

    const tokenPayload = {
      consultant_id: consultant.consultant_id,
      email: consultant.email,
      name: consultant.name || '',
    };

    const token = jwtHelper.signToken(tokenPayload);

    return res.json({
      ok: true,
      token,
      consultant,
    });
  } catch (err) {
    console.error('complete-profile error', err && err.stack ? err.stack : err);
    return res.status(500).json({
      ok: false,
      error: 'Failed to complete profile. Please try again.',
    });
  }
});

/**
 * GET /api/auth/me
 * Protected route to get current user info
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const email = req.user?.email;

    if (!email) {
      return res.status(401).json({
        ok: false,
        error: 'No email found in token',
      });
    }

    let result;
    try {
      result = await appsScript.getConsultantByEmailAction({ email });
      log('appsScript.getConsultantByEmailAction ->', JSON.stringify(result));
    } catch (err) {
      console.error('[auth] getConsultantByEmailAction threw:', err && err.stack ? err.stack : err);
      return res.status(502).json({ ok: false, error: 'upstream_error', message: 'Failed to fetch user profile.' });
    }

    if (!result || result.ok === false || !result.consultant) {
      return res.status(404).json({
        ok: false,
        error: 'User not found',
      });
    }

    const consultant = normalizeConsultantObject(result.consultant);
    const needsProfile = !consultant?.name || consultant.name.trim() === '';

    log('Profile fetched for:', email);

    return res.json({
      ok: true,
      user: {
        ...consultant,
        needsProfile,
      },
    });
  } catch (err) {
    console.error('auth/me error:', err && err.stack ? err.stack : err);
    return res.status(500).json({
      ok: false,
      error: err.message || 'Failed to get profile',
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout endpoint (token removal happens on client side)
 */
router.post('/logout', authMiddleware, (req, res) => {
  log('User logged out:', req.user?.email);

  return res.json({
    ok: true,
    message: 'Logged out successfully',
  });
});

module.exports = router;
