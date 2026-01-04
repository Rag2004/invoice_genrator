
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
  if (!raw || typeof raw !== 'object') return null;

  return {
    consultant_id:
      raw.consultant_id ||
      raw.consultantId ||
      raw.id ||
      null,

    email: raw.email || raw.emailAddress || '',
    name: raw.name || raw.fullName || raw.Consultant_name || '',
    phone: raw.phone || raw.mobile || '',

    // ✅ BUSINESS FIELDS (YOU WERE DROPPING THESE)
    business_name: raw.business_name || '',
    business_registered_office: raw.business_registered_office || '',
    business_pan: raw.business_pan || '',
    business_gstin: raw.business_gstin || '',
    business_cin: raw.business_cin || '',
    business_state_code: raw.business_state_code || '',

    created_at: raw.created_at || raw.createdAt || '',
    last_login: raw.last_login || raw.lastLogin || '',
    status: raw.status || '',
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

    log('Starting login for:', cleanEmail);

    // 1. Generate OTP
    const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
    log('Generated OTP:', generatedOTP);

    // 2. Calculate expiry time
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 10;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

    // 3. Store OTP in Apps Script
    let storeResult;
    try {
      storeResult = await appsScript.storeOtpFromBackend({
        email: cleanEmail,
        otp: generatedOTP,
        otp_type: otpType,
        expires_at: expiresAt,
      });
      log('OTP stored in Apps Script:', JSON.stringify(storeResult));
    } catch (err) {
      console.error('[auth] storeOtpFromBackend threw:', err?.stack || err);
      return res.status(502).json({ 
        ok: false, 
        error: 'otp_store_failed', 
        message: 'Failed to store OTP. Please try again.' 
      });
    }

    if (!storeResult || storeResult.ok === false) {
      console.error('[auth] Failed to store OTP:', storeResult);
      return res.status(500).json({
        ok: false,
        error: storeResult?.error || 'failed_to_store_otp',
        message: 'Failed to store OTP. Please try again.',
      });
    }

    // 4. Send email with OTP
    try {
      // Check if user exists to determine email type
      let userName = '';
      let emailType = 'login';
      
      try {
        const consultantResult = await appsScript.getConsultantByEmailAction({ email: cleanEmail });
        if (consultantResult?.ok && consultantResult?.consultant) {
          userName = consultantResult.consultant.name || '';
          emailType = 'login';
        } else {
          emailType = 'signup';
        }
      } catch (e) {
        log('Could not fetch consultant, defaulting to login type');
        emailType = 'login';
      }

      // Send the OTP email
      await emailService.sendOTPEmail(cleanEmail, generatedOTP, userName, emailType);
      log('✅ OTP email sent successfully to:', cleanEmail);
      
    } catch (emailError) {
      console.error('[auth] Failed to send OTP email:', emailError?.stack || emailError);
      // Continue - OTP is stored, just log the email error
      log('⚠️ Email sending failed, but OTP is stored. User can retry if needed.');
    }

    return res.json({
      ok: true,
      email: cleanEmail,
      otpType,
      expiresAt: expiresAt,
      message: 'OTP sent to your email.',
    });
    
  } catch (err) {
    console.error('[auth] start-login error:', err?.stack || err);
    return res.status(500).json({
      ok: false,
      error: 'server_error',
      message: 'Failed to start login. Please try again.',
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