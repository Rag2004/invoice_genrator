// // utils/otpGenerator.js
// const crypto = require('crypto');

// /**
//  * Generate a random OTP code
//  * @param {number} length - Length of OTP (default: 6)
//  * @returns {string} - OTP code
//  */
// function generateOTP(length = 6) {
//   // Generate random number with specified length
//   const min = Math.pow(10, length - 1);
//   const max = Math.pow(10, length) - 1;
//   const otp = Math.floor(min + Math.random() * (max - min + 1));
//   return otp.toString();
// }

// /**
//  * Generate OTP with expiry time
//  * @returns {object} - { otp, expiresAt }
//  */
// function generateOTPWithExpiry() {
//   const otpLength = parseInt(process.env.OTP_LENGTH) || 6;
//   const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
  
//   const otp = generateOTP(otpLength);
//   const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  
//   return {
//     otp,
//     expiresAt,
//     expiryMinutes,
//   };
// }

// /**
//  * Check if OTP is expired
//  * @param {Date} expiresAt - Expiry timestamp
//  * @returns {boolean}
//  */
// function isOTPExpired(expiresAt) {
//   return new Date() > new Date(expiresAt);
// }

// /**
//  * Format time remaining for OTP
//  * @param {Date} expiresAt - Expiry timestamp
//  * @returns {string} - "9 minutes 30 seconds"
//  */
// function getTimeRemaining(expiresAt) {
//   const now = new Date();
//   const expiry = new Date(expiresAt);
//   const diffMs = expiry - now;
  
//   if (diffMs <= 0) return 'Expired';
  
//   const minutes = Math.floor(diffMs / 60000);
//   const seconds = Math.floor((diffMs % 60000) / 1000);
  
//   if (minutes > 0) {
//     return `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`;
//   }
//   return `${seconds} second${seconds !== 1 ? 's' : ''}`;
// }

// module.exports = {
//   generateOTP,
//   generateOTPWithExpiry,
//   isOTPExpired,
//   getTimeRemaining,
// };
/**
 * POST /api/auth/verify-otp
 * Body: { email, otp }
 *
 * This version adds:
 * - defensive try/catch around each appsScript call
 * - detailed logging of returned object / errors
 * - mapping of known script errors to friendly messages
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

    // 1) verify OTP — wrap call in try/catch because appsScript may throw
    let verifyResult;
    try {
      verifyResult = await appsScript.verifyOtpFromBackend({
        email: cleanEmail,
        otp: cleanOtp,
      });
      log('verifyOtpFromBackend ->', JSON.stringify(verifyResult));
    } catch (err) {
      console.error('[auth] verifyOtpFromBackend threw:', err && err.stack ? err.stack : err);
      // Return a 502 indicating upstream (Apps Script) failure
      return res.status(502).json({
        ok: false,
        error: 'apps_script_unavailable',
        message: 'Failed to verify OTP (upstream service error).'
      });
    }

    // If appsScript returned an error object
    if (!verifyResult || verifyResult.ok === false || verifyResult.error) {
      // map some common errors to friendly messages
      const code = verifyResult?.error || 'verify_failed';
      const map = {
        otp_expired: 'OTP expired',
        invalid_otp: 'Invalid OTP',
        too_many_attempts: 'Too many attempts',
      };
      const userMessage = map[code] || (verifyResult?.message || verifyResult?.error || 'Invalid or expired OTP');
      console.warn('[auth] OTP verify failed for', cleanEmail, '->', verifyResult);
      return res.status(400).json({
        ok: false,
        error: code,
        message: userMessage,
        raw: verifyResult
      });
    }

    // 2) fetch consultant by email (apps script) — again defensive
    let consultantResult;
    try {
      consultantResult = await appsScript.getConsultantByEmailAction({ email: cleanEmail });
      log('getConsultantByEmailAction ->', JSON.stringify(consultantResult));
    } catch (err) {
      console.error('[auth] getConsultantByEmailAction threw:', err && err.stack ? err.stack : err);
      // fallback to create consultant if the get action fails in an unexpected way
      consultantResult = { ok: false, error: 'get_consultant_failed' };
    }

    let consultant = null;
    let needsProfile = false;

    if (!consultantResult || consultantResult.ok === false || !consultantResult.consultant) {
      // Not found or error -> create consultant
      let create;
      try {
        create = await appsScript.createConsultantAction({
          email: cleanEmail,
          name: '',
          phone: '',
        });
        log('createConsultantAction ->', JSON.stringify(create));
      } catch (err) {
        console.error('[auth] createConsultantAction threw:', err && err.stack ? err.stack : err);
        return res.status(502).json({
          ok: false,
          error: 'create_consultant_failed',
          message: 'Could not create consultant (upstream error).'
        });
      }

      if (!create || create.ok === false) {
        console.error('[auth] createConsultantAction failed result:', create);
        return res.status(500).json({
          ok: false,
          error: create?.error || 'create_failed',
          message: 'Failed to create consultant.'
        });
      }

      consultant = create.consultant;
      needsProfile = true;
    } else {
      consultant = consultantResult.consultant;
      const hasName = !!(consultant.name && consultant.name.trim());
      needsProfile = !hasName;
    }

    // 3) update last_login (best-effort — don't block on failure)
    try {
      await appsScript.updateConsultantLastLoginAction({ email: cleanEmail });
    } catch (err) {
      console.warn('[auth] updateConsultantLastLoginAction failed (non-blocking):', err && err.stack ? err.stack : err);
      // don't return error — just log
    }

    // 4) sign JWT
    if (!consultant || !consultant.consultant_id) {
      console.error('[auth] missing consultant id, cannot sign token', consultant);
      return res.status(500).json({ ok: false, error: 'missing_consultant_id', message: 'Server misconfiguration.' });
    }

    const tokenPayload = {
      consultant_id: consultant.consultant_id,
      email: consultant.email,
      name: consultant.name || '',
    };

    const token = jwtHelper.signToken(tokenPayload);

    // successful response (include consultant and flag whether profile needed)
    return res.json({
      ok: true,
      token,
      needsProfile,
      consultant,
    });
  } catch (err) {
    // fallback: catch anything unexpected
    console.error('[auth] verify-otp top-level error:', err && err.stack ? err.stack : err);
    return res.status(500).json({
      ok: false,
      error: 'server_error',
      message: err.message || 'Failed to verify OTP. Please try again.',
    });
  }
});
