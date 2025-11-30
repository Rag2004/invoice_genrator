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

// small helper to log consistently
function log(...args) {
  console.log('[auth]', ...args);
}

// simple numeric OTP generator for login
function generateNumericOtp(length) {
  const len = Number(length) || 6;
  let code = '';
  for (let i = 0; i < len; i++) {
    code += Math.floor(Math.random() * 10); // 0–9
  }
  return code;
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
    const otp = generateNumericOtp(otpLength);

    // expires in 10 minutes
    const expiresAt = new Date(
      Date.now() + (parseInt(process.env.OTP_TTL_MS, 10) || 10 * 60 * 1000)
    ).toISOString();

    // 1) store OTP in Apps Script / stub memory
    const storeResult = await appsScript.storeOtpFromBackend({
      email: cleanEmail,
      otp,
      otp_type: otpType,
      expires_at: expiresAt,
    });

    // Check if storage failed
    if (!storeResult || storeResult.ok === false) {
      console.error('Failed to store OTP:', storeResult?.error);
      return res.status(500).json({
        ok: false,
        error: 'Failed to generate OTP. Please try again.',
      });
    }

    // 2) send OTP email – but DON'T break login if email fails
    try {
      const emailResult = await emailService.sendOTPEmail(
        cleanEmail,
        otp,
        '', // name (optional)
        otpType // "login"
      );
      log('OTP email send result:', emailResult);
    } catch (emailErr) {
      console.error('sendOTPEmail failed (dev will still continue):', emailErr);
    }

    // 3) For local dev, log OTP to console so you can see it
    log('DEV OTP for', cleanEmail, '=>', otp);

    return res.json({
      ok: true,
      email: cleanEmail,
      otpType,
      expiresAt,
      message: 'OTP sent to your email (or console in dev).',
    });
  } catch (err) {
    console.error('start-login error', err);
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

    // 1) verify OTP
    const verifyResult = await appsScript.verifyOtpFromBackend({
      email: cleanEmail,
      otp: cleanOtp,
    });

    if (!verifyResult || verifyResult.ok === false) {
      return res.status(400).json({
        ok: false,
        error: verifyResult?.error || 'Invalid or expired OTP',
      });
    }

    // 2) fetch consultant or create a stub
    let consultantResult = await appsScript.getConsultantByEmailAction({
      email: cleanEmail,
    });
    let consultant = null;
    let needsProfile = false;

    if (!consultantResult || consultantResult.ok === false) {
      // not found -> create minimal consultant
      const create = await appsScript.createConsultantAction({
        email: cleanEmail,
        name: '',
        phone: '',
      });

      if (!create || create.ok === false) {
        return res.status(500).json({
          ok: false,
          error: create?.error || 'Failed to create consultant',
        });
      }

      consultant = create.consultant;
      needsProfile = true;
    } else {
      consultant = consultantResult.consultant;
      const hasName = !!(consultant.name && consultant.name.trim());
      needsProfile = !hasName;
    }

    // 3) update last_login
    await appsScript.updateConsultantLastLoginAction({
      email: cleanEmail,
    });

    // 4) sign JWT
    const tokenPayload = {
      consultant_id: consultant.consultant_id,
      email: consultant.email,
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
    console.error('verify-otp error', err);
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
    console.error('complete-profile error', err);
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

    // Get consultant from Apps Script
    const result = await appsScript.getConsultantByEmailAction({
      email: email,
    });

    if (!result || result.ok === false) {
      return res.status(404).json({
        ok: false,
        error: 'User not found',
      });
    }

    const consultant = result.consultant;
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
    console.error('auth/me error:', err);
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