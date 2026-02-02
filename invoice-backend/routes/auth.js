
// // routes/auth.js
// const express = require('express');
// const router = express.Router();

// const {
//   validateEmail,
//   validateOTP,
//   validateName,
//   validatePhone,
// } = require('../utils/validators');

// const emailService = require('../utils/emailService');
// const jwtHelper = require('../utils/jwtHelper');
// const appsScript = require('../lib/appsScriptClient');

// // Import auth middleware for protected routes
// const authMiddleware = require('../middleware/authMiddleware');

// function log(...args) {
//   console.log('[auth]', ...args);
// }

// function extractConsultantId(consultantObj) {
//   if (!consultantObj) return null;
//   return (
//     consultantObj.consultant_id ||
//     consultantObj.consultantId ||
//     consultantObj.id ||
//     consultantObj.consultant_id === 0 ? String(consultantObj.consultant_id) : null
//   );
// }

// function normalizeConsultantObject(raw) {
//   if (!raw || typeof raw !== 'object') return null;

//   return {
//     consultant_id:
//       raw.consultant_id ||
//       raw.consultantId ||
//       raw.id ||
//       null,

//     email: raw.email || raw.emailAddress || '',
//     name: raw.name || raw.fullName || raw.Consultant_name || '',
//     phone: raw.phone || raw.mobile || '',

//     // ✅ BUSINESS FIELDS (YOU WERE DROPPING THESE)
//     business_name: raw.business_name || '',
//     business_registered_office: raw.business_registered_office || '',
//     business_pan: raw.business_pan || '',
//     business_gstin: raw.business_gstin || '',
//     business_cin: raw.business_cin || '',
//     business_state_code: raw.business_state_code || '',

//     created_at: raw.created_at || raw.createdAt || '',
//     last_login: raw.last_login || raw.lastLogin || '',
//     status: raw.status || '',
//   };
// }


// /**
//  * POST /api/auth/start-login
//  * Body: { email }
//  */
// router.post('/start-login', (req, res) => {
//   const { email } = req.body || {};
//   const { valid, error, email: cleanEmail } = validateEmail(email);

//   if (!valid) {
//     return res.status(400).json({ ok: false, error });
//   }

//   // ✅ RESPOND IMMEDIATELY (NO AWAIT, NO BLOCKING)
//   res.json({
//     ok: true,
//     email: cleanEmail,
//     message: 'If the email exists, an OTP will be sent.',
//   });

//   // 🔥 FIRE-AND-FORGET BACKGROUND WORK
//   setImmediate(async () => {
//     try {
//       log('Starting login (background) for:', cleanEmail);

//       const otpType = 'login';
//       const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
//       const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 10;
//       const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

//       // 1️⃣ Store OTP in Apps Script
//       await appsScript.storeOtpFromBackend({
//         email: cleanEmail,
//         otp: generatedOTP,
//         otp_type: otpType,
//         expires_at: expiresAt,
//       });

//       log('OTP stored successfully for:', cleanEmail);

//       // 2️⃣ Determine email type (best-effort, non-blocking)
//       let userName = '';
//       let emailType = 'login';

//       try {
//         const consultantResult = await appsScript.getConsultantByEmailAction({
//           email: cleanEmail,
//         });

//         if (!consultantResult?.ok || !consultantResult?.consultant) {
//           emailType = 'signup';
//         } else {
//           userName = consultantResult.consultant.name || '';
//         }
//       } catch (_) {
//         emailType = 'login';
//       }

//       // 3️⃣ Send OTP email
//       await emailService.sendOTPEmail(
//         cleanEmail,
//         generatedOTP,
//         userName,
//         emailType
//       );

//       log('OTP email sent to:', cleanEmail);
//     } catch (err) {
//       console.error('[auth] background start-login failed:', err?.stack || err);
//     }
//   });
// });

// /**
//  * POST /api/auth/verify-otp
//  * Body: { email, otp }
//  */
// router.post('/verify-otp', async (req, res) => {
//   try {
//     const { email, otp } = req.body || {};

//     const emailCheck = validateEmail(email);
//     if (!emailCheck.valid) {
//       return res.status(400).json({ ok: false, error: emailCheck.error });
//     }

//     const otpCheck = validateOTP(String(otp || ''));
//     if (!otpCheck.valid) {
//       return res.status(400).json({ ok: false, error: otpCheck.error });
//     }

//     const cleanEmail = emailCheck.email;
//     const cleanOtp = otpCheck.otp;

//     // 1) verify OTP with Apps Script (defensive)
//     let verifyResult;
//     try {
//       verifyResult = await appsScript.verifyOtpFromBackend({
//         email: cleanEmail,
//         otp: cleanOtp,
//       });
//       log('appsScript.verifyOtp ->', JSON.stringify(verifyResult));
//     } catch (err) {
//       console.error('[auth] appsScript.verifyOtpFromBackend threw:', err && err.stack ? err.stack : err);
//       return res.status(502).json({
//         ok: false,
//         error: 'apps_script_unavailable',
//         message: 'Failed to verify OTP (upstream service error).'
//       });
//     }

//     if (!verifyResult || verifyResult.ok === false) {
//       const upstreamError = verifyResult?.error || verifyResult?.message || 'Invalid or expired OTP';
//       console.warn('[auth] OTP verify failed ->', verifyResult);
//       return res.status(400).json({
//         ok: false,
//         error: upstreamError,
//         message: verifyResult?.message || 'Invalid or expired OTP',
//       });
//     }

//     // 2) fetch consultant or create a stub
//     let consultantResult;
//     try {
//       consultantResult = await appsScript.getConsultantByEmailAction({
//         email: cleanEmail,
//       });
//       log('appsScript.getConsultantByEmailAction ->', JSON.stringify(consultantResult));
//     } catch (err) {
//       console.error('[auth] getConsultantByEmailAction threw:', err && err.stack ? err.stack : err);
//       consultantResult = null;
//     }

//     let consultant = null;
//     let needsProfile = false;

//     // If consultantResult missing or not ok -> create consultant
//     const hasValidConsultant = !!(consultantResult && consultantResult.ok && consultantResult.consultant);
//     if (!hasValidConsultant) {
//       log('[auth] consultant not found, attempting to create minimal consultant for', cleanEmail);
//       let createResult;
//       try {
//         createResult = await appsScript.createConsultantAction({
//           email: cleanEmail,
//           name: '',
//           phone: '',
//         });
//         log('appsScript.createConsultantAction ->', JSON.stringify(createResult));
//       } catch (err) {
//         console.error('[auth] createConsultantAction threw:', err && err.stack ? err.stack : err);
//         return res.status(502).json({ ok: false, error: 'create_consultant_failed', message: 'Could not create consultant (upstream).' });
//       }

//       if (!createResult || createResult.ok === false || !createResult.consultant) {
//         console.error('[auth] createConsultantAction result invalid:', createResult);
//         return res.status(500).json({
//           ok: false,
//           error: createResult?.error || 'create_failed',
//           message: 'Failed to create consultant.'
//         });
//       }

//       consultant = normalizeConsultantObject(createResult.consultant);
//       needsProfile = true;
//     } else {
//       consultant = normalizeConsultantObject(consultantResult.consultant);
//       const hasName = !!(consultant.name && consultant.name.trim());
//       needsProfile = !hasName;
//     }

//     // Defensive check: ensure consultant_id exists
//     const consultantId = extractConsultantId(consultant);
//     if (!consultantId) {
//       console.error('[auth] missing consultant id from Apps Script', JSON.stringify(consultant));
//       // try to create again as fallback
//       try {
//         const createAgain = await appsScript.createConsultantAction({
//           email: cleanEmail,
//           name: consultant.name || '',
//           phone: consultant.phone || '',
//         });
//         log('appsScript.createConsultantAction (fallback) ->', JSON.stringify(createAgain));
//         if (createAgain && createAgain.ok && createAgain.consultant) {
//           consultant = normalizeConsultantObject(createAgain.consultant);
//         }
//       } catch (e) {
//         console.error('[auth] fallback createConsultantAction threw:', e && e.stack ? e.stack : e);
//       }
//     }

//     // Update last_login (best-effort)
//     try {
//       await appsScript.updateConsultantLastLoginAction({ email: cleanEmail });
//     } catch (e) {
//       console.warn('[auth] updateConsultantLastLoginAction failed (non-blocking):', e && e.stack ? e.stack : e);
//     }

//     // final check
//     const finalConsultantId = extractConsultantId(consultant);
//     if (!finalConsultantId) {
//       console.error('[auth] still missing consultant id - cannot sign token', JSON.stringify(consultant));
//       return res.status(500).json({ ok: false, error: 'missing_consultant_id', message: 'Server misconfiguration.' });
//     }

//     // 4) sign JWT
//     const tokenPayload = {
//       consultant_id: finalConsultantId,
//       email: consultant.email || cleanEmail,
//       name: consultant.name || '',
//     };

//     const token = jwtHelper.signToken(tokenPayload);

//     return res.json({
//       ok: true,
//       token,
//       needsProfile,
//       consultant,
//     });
//   } catch (err) {
//     console.error('verify-otp error', err && err.stack ? err.stack : err);
//     return res.status(500).json({
//       ok: false,
//       error: 'Failed to verify OTP. Please try again.',
//     });
//   }
// });

// /**
//  * POST /api/auth/complete-profile
//  * Body: { email, name, phone }
//  */
// router.post('/complete-profile', async (req, res) => {
//   try {
//     const { email, name, phone } = req.body || {};

//     const emailCheck = validateEmail(email);
//     if (!emailCheck.valid) {
//       return res.status(400).json({ ok: false, error: emailCheck.error });
//     }

//     const nameCheck = validateName(name);
//     if (!nameCheck.valid) {
//       return res.status(400).json({ ok: false, error: nameCheck.error });
//     }

//     const phoneCheck = validatePhone(phone);
//     if (!phoneCheck.valid) {
//       return res.status(400).json({ ok: false, error: phoneCheck.error });
//     }

//     const result = await appsScript.updateConsultantProfileAction({
//       email: emailCheck.email,
//       name: nameCheck.name,
//       phone: phoneCheck.phone,
//     });

//     if (!result || result.ok === false) {
//       return res.status(500).json({
//         ok: false,
//         error: result?.error || 'Failed to update profile',
//       });
//     }

//     const consultant = result.consultant;

//     const tokenPayload = {
//       consultant_id: consultant.consultant_id,
//       email: consultant.email,
//       name: consultant.name || '',
//     };

//     const token = jwtHelper.signToken(tokenPayload);

//     return res.json({
//       ok: true,
//       token,
//       consultant,
//     });
//   } catch (err) {
//     console.error('complete-profile error', err && err.stack ? err.stack : err);
//     return res.status(500).json({
//       ok: false,
//       error: 'Failed to complete profile. Please try again.',
//     });
//   }
// });

// /**
//  * GET /api/auth/me
//  * Protected route to get current user info
//  */
// router.get('/me', authMiddleware, async (req, res) => {
//   try {
//     const email = req.user?.email;

//     if (!email) {
//       return res.status(401).json({
//         ok: false,
//         error: 'No email found in token',
//       });
//     }

//     let result;
//     try {
//       result = await appsScript.getConsultantByEmailAction({ email });
//       log('appsScript.getConsultantByEmailAction ->', JSON.stringify(result));
//     } catch (err) {
//       console.error('[auth] getConsultantByEmailAction threw:', err && err.stack ? err.stack : err);
//       return res.status(502).json({ ok: false, error: 'upstream_error', message: 'Failed to fetch user profile.' });
//     }

//     if (!result || result.ok === false || !result.consultant) {
//       return res.status(404).json({
//         ok: false,
//         error: 'User not found',
//       });
//     }

//     const consultant = normalizeConsultantObject(result.consultant);
//     const needsProfile = !consultant?.name || consultant.name.trim() === '';

//     log('Profile fetched for:', email);

//     return res.json({
//       ok: true,
//       user: {
//         ...consultant,
//         needsProfile,
//       },
//     });
//   } catch (err) {
//     console.error('auth/me error:', err && err.stack ? err.stack : err);
//     return res.status(500).json({
//       ok: false,
//       error: err.message || 'Failed to get profile',
//     });
//   }
// });

// /**
//  * POST /api/auth/logout
//  * Logout endpoint (token removal happens on client side)
//  */
// router.post('/logout', authMiddleware, (req, res) => {
//   log('User logged out:', req.user?.email);

//   return res.json({
//     ok: true,
//     message: 'Logged out successfully',
//   });
// });

// module.exports = router;
// routes/auth.js - OPTIMIZED VERSION (NO TIMEOUT)
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

    // ✅ BUSINESS FIELDS
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
router.post('/start-login', (req, res) => {
  const { email } = req.body || {};
  const { valid, error, email: cleanEmail } = validateEmail(email);

  if (!valid) {
    return res.status(400).json({ ok: false, error });
  }

  // ✅ RESPOND IMMEDIATELY (NO AWAIT, NO BLOCKING)
  res.json({
    ok: true,
    email: cleanEmail,
    message: 'If the email exists, an OTP will be sent.',
  });

  // 🔥 FIRE-AND-FORGET BACKGROUND WORK
  setImmediate(async () => {
    try {
      log('Starting login (background) for:', cleanEmail);

      const otpType = 'login';
      const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
      const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 10;
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

      // 1️⃣ Store OTP in Apps Script
      await appsScript.storeOtpFromBackend({
        email: cleanEmail,
        otp: generatedOTP,
        otp_type: otpType,
        expires_at: expiresAt,
      });

      log('OTP stored successfully for:', cleanEmail);

      // 2️⃣ Determine email type (best-effort, non-blocking)
      let userName = '';
      let emailType = 'login';

      try {
        const consultantResult = await appsScript.getConsultantByEmailAction({
          email: cleanEmail,
        });

        if (!consultantResult?.ok || !consultantResult?.consultant) {
          emailType = 'signup';
        } else {
          userName = consultantResult.consultant.name || '';
        }
      } catch (_) {
        emailType = 'login';
      }

      // 3️⃣ Send OTP email
      await emailService.sendOTPEmail(
        cleanEmail,
        generatedOTP,
        userName,
        emailType
      );

      log('OTP email sent to:', cleanEmail);
    } catch (err) {
      console.error('[auth] background start-login failed:', err?.stack || err);
    }
  });
});

/**
 * POST /api/auth/verify-otp
 * Body: { email, otp }
 * 
 * ✅ OPTIMIZED: Reduced from 4 sequential calls to 3
 * ✅ OPTIMIZED: Last login update is now non-blocking
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

    log('⏱️ [TIMING] verify-otp started for:', cleanEmail);
    const startTime = Date.now();

    // 1) ✅ CALL 1: Verify OTP with Apps Script (~3-5s)
    let verifyResult;
    try {
      const verifyStart = Date.now();
      verifyResult = await appsScript.verifyOtpFromBackend({
        email: cleanEmail,
        otp: cleanOtp,
      });
      log(`⏱️ [TIMING] verifyOtp took ${Date.now() - verifyStart}ms`);
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

    // 2) ✅ CALL 2: Fetch consultant or create (~3-5s)
    let consultantResult;
    try {
      const consultantStart = Date.now();
      consultantResult = await appsScript.getConsultantByEmailAction({
        email: cleanEmail,
      });
      log(`⏱️ [TIMING] getConsultant took ${Date.now() - consultantStart}ms`);
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
        const createStart = Date.now();
        createResult = await appsScript.createConsultantAction({
          email: cleanEmail,
          name: '',
          phone: '',
        });
        log(`⏱️ [TIMING] createConsultant took ${Date.now() - createStart}ms`);
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

    // ✅ OPTIMIZATION: Update last_login in background (fire-and-forget, non-blocking)
    // This saves 3-5 seconds on the response time
    setImmediate(async () => {
      try {
        const loginStart = Date.now();
        await appsScript.updateConsultantLastLoginAction({ email: cleanEmail });
        log(`⏱️ [TIMING] updateLastLogin took ${Date.now() - loginStart}ms (background)`);
      } catch (e) {
        console.warn('[auth] updateConsultantLastLoginAction failed (non-blocking):', e && e.stack ? e.stack : e);
      }
    });

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

    log(`⏱️ [TIMING] Total verify-otp time: ${Date.now() - startTime}ms`);

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