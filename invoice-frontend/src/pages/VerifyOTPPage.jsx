// // src/pages/VerifyOTPPage.jsx - FIXED
// import React, { useState, useEffect, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { verifyOtp, startLogin } from '../api/api';
// import { useAuth } from '../context/AuthContext';
// import logo from '../assets/1.png';
// import '../styles/VerifyOTPPage.css';

// export default function VerifyOTPPage() {
//   const navigate = useNavigate();
//   // ✅ FIXED: Removed clearPendingEmail, we'll use setPendingEmail('') instead
//   const { pendingEmail, setPendingEmail, setAuthFromToken } = useAuth();

//   const [otp, setOtp] = useState(['', '', '', '', '', '']);
//   const [error, setError] = useState('');
//   const [submitting, setSubmitting] = useState(false);
//   const [resending, setResending] = useState(false);

//   // Refs for OTP inputs
//   const inputRefs = useRef([]);

//   // Focus first input on mount
//   useEffect(() => {
//     if (inputRefs.current[0]) {
//       inputRefs.current[0].focus();
//     }
//   }, []);

//   const handleChange = (index, value) => {
//     // Only allow single digit 0-9
//     if (value && !/^\d$/.test(value)) return;

//     const newOtp = [...otp];
//     newOtp[index] = value;
//     setOtp(newOtp);

//     if (error) setError('');

//     // Auto-focus next input
//     if (value && index < 5) {
//       inputRefs.current[index + 1]?.focus();
//     }

//     // Auto-submit when all 6 are filled (optional)
//     // if (newOtp.join('').length === 6) handleSubmitAuto(newOtp.join(''));
//   };

//   // Optional auto submit helper (uncomment call above to enable)
//   async function handleSubmitAuto(otpString) {
//     // small wrapper that avoids double-action
//     if (submitting) return;
//     try {
//       setSubmitting(true);
//       await submitOtp(otpString);
//     } finally {
//       setSubmitting(false);
//     }
//   }

//   const handleKeyDown = (index, e) => {
//     if (e.key === 'Backspace') {
//       if (!otp[index] && index > 0) {
//         inputRefs.current[index - 1]?.focus();
//       } else {
//         const newOtp = [...otp];
//         newOtp[index] = '';
//         setOtp(newOtp);
//       }
//     }

//     if (e.key === 'ArrowLeft' && index > 0) {
//       inputRefs.current[index - 1]?.focus();
//     }
//     if (e.key === 'ArrowRight' && index < 5) {
//       inputRefs.current[index + 1]?.focus();
//     }
//   };

//   const handlePaste = (e) => {
//     e.preventDefault();
//     const pastedData = e.clipboardData
//       .getData('text')
//       .replace(/\D/g, '')
//       .slice(0, 6);

//     if (!pastedData) return;

//     const digits = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
//     setOtp(digits);
//     inputRefs.current[5]?.focus();
//     if (error) setError('');

//     // If it's a full 6-digit paste, auto-submit (optional)
//     // if (pastedData.length === 6) handleSubmitAuto(pastedData);
//   };

//   // Extract OTP submit logic to reuse (so auto-submit can reuse)
//   async function submitOtp(otpString) {
//     // defensive
//     if (!pendingEmail) {
//       throw new Error('No pending email provided for verification.');
//     }

//     // Verify OTP with backend
//     const data = await verifyOtp({ email: pendingEmail, otp: otpString });
//     // api.verifyOtp throws on non-2xx or returns parsed JSON on success.

//     // If backend returned an OK object but no token, show friendly message
//     if (!data || !data.token) {
//       const msg = (data && (data.error || data.message)) || 'No token returned by server';
//       const err = new Error(msg);
//       err.raw = data;
//       throw err;
//     }

//     // Save token and populate auth context
//     localStorage.setItem('authToken', data.token);
//     // ✅ FIXED: Clear pending email using setPendingEmail
//     setPendingEmail('');
//     const userData = await setAuthFromToken(data.token);
//     return { data, userData };
//   }

//   const handleSubmit = async (e) => {
//   e.preventDefault();
//   const otpString = otp.join('');

//   if (otpString.length !== 6) {
//     setError('Please enter all 6 digits');
//     return;
//   }

//   setSubmitting(true);
//   setError('');

//   try {
//     const { data: resultData, userData } = await submitOtp(otpString);

//     // ✅ SUCCESS PATH ONLY
//     const needsProfile =
//       resultData?.needsProfile === true ||
//       userData?.needsProfile === true;

//     if (needsProfile) {
//       navigate('/setup-profile', { replace: true });
//     } else {
//       navigate('/dashboard', { replace: true });
//     }

//   } catch (err) {
//     console.error('❌ OTP verification failed:', err, err.raw);

//     /* --------------------------------------------------
//        🔒 LOGIN-ONLY MODE: EMAIL NOT ALLOWED
//     -------------------------------------------------- */
//     if (
//       err.message === 'email_not_allowed' ||
//       err.raw?.error === 'email_not_allowed' ||
//       err.message?.toLowerCase().includes('not authorized')
//     ) {
//       setError('Your email is not authorized. Please contact the administrator.');

//       // Clear state
//       setPendingEmail('');
//       setOtp(['', '', '', '', '', '']);

//       // Redirect cleanly
//       setTimeout(() => {
//         navigate('/login', { replace: true });
//       }, 1500);

//       return; // ⛔ STOP HERE (no setup-profile)
//     }

//     /* --------------------------------------------------
//        ❌ NORMAL OTP ERROR
//     -------------------------------------------------- */
//     let message = 'Invalid code. Please try again.';
//     if (err.message && err.message.trim()) {
//       message = err.message;
//     } else if (err.raw?.error || err.raw?.message) {
//       message = err.raw.error || err.raw.message;
//     }

//     setError(message);
//     setOtp(['', '', '', '', '', '']);
//     inputRefs.current[0]?.focus();

//   } finally {
//     setSubmitting(false);
//   }
// };

//   const handleChangeEmail = () => {
//     // ✅ FIXED: Clear pending email using setPendingEmail
//     setPendingEmail('');
//     navigate('/login');
//   };

//   const handleResendOTP = async () => {
//     if (resending) return;
//     if (!pendingEmail) {
//       setError('Missing email to resend OTP to.');
//       return;
//     }

//     try {
//       setResending(true);
//       setError('');
//       await startLogin(pendingEmail);
//       alert('✅ New code sent to your email!');
//       setOtp(['', '', '', '', '', '']);
//       inputRefs.current[0]?.focus();
//     } catch (err) {
//       console.error('❌ Resend OTP failed:', err);
//       // try to show server message if available
//       const msg = err && err.message ? err.message : 'Failed to resend code. Please try again.';
//       setError(msg);
//     } finally {
//       setResending(false);
//     }
//   };

//   // If someone opens /verify-otp directly with no email, do not render
//   if (!pendingEmail) return null;

//   const formatDate = (d) => (d ? new Date(d).toLocaleString() : '');

//   return (
//     <div className="auth-page">
//       <header className="auth-header">
//         <img src={logo} alt="Invoice Generator" className="auth-logo" />
//       </header>

//       <main className="auth-main">
//         <div className="auth-card">
//           <div className="auth-icon">🔐</div>

//           <h1 className="auth-title">Enter Verification Code</h1>

//           <p className="auth-subtitle">
//             We've sent a 6-digit code to
//             <br />
//             <strong>{pendingEmail}</strong>
//           </p>

//           <form onSubmit={handleSubmit} className="otp-form" onPaste={handlePaste}>
//             <div className="otp-inputs">
//               {otp.map((digit, index) => (
//                 <input
//                   key={index}
//                   ref={(el) => (inputRefs.current[index] = el)}
//                   type="text"
//                   inputMode="numeric"
//                   maxLength={1}
//                   className="otp-input"
//                   value={digit}
//                   onChange={(e) => handleChange(index, e.target.value)}
//                   onKeyDown={(e) => handleKeyDown(index, e)}
//                   disabled={submitting}
//                   autoComplete="off"
//                   aria-label={`Digit ${index + 1}`}
//                 />
//               ))}
//             </div>

//             {error && (
//               <div className="auth-error" role="alert" aria-live="assertive">
//                 <span>⚠️</span> {error}
//               </div>
//             )}

//             <button
//               type="submit"
//               className="auth-button auth-button-primary"
//               disabled={submitting || otp.join('').length !== 6}
//             >
//               {submitting ? (
//                 <>
//                   <span className="spinner" />
//                   Verifying...
//                 </>
//               ) : (
//                 'Verify & Continue'
//               )}
//             </button>

//             <button
//               type="button"
//               className="auth-button auth-button-secondary"
//               onClick={handleChangeEmail}
//               disabled={submitting || resending}
//             >
//               Change Email
//             </button>

//             <button
//               type="button"
//               className="auth-link"
//               onClick={handleResendOTP}
//               disabled={submitting || resending}
//             >
//               {resending ? 'Sending...' : "Didn't receive a code? Resend"}
//             </button>
//           </form>

//           <p className="auth-footer-text">
//             Check your spam folder if you don't see the email
//             {/* optionally show debug info during dev */}
//             {/* <br/>Debug: last send at {formatDate(lastSentAt)} */}
//           </p>
//         </div>
//       </main>
//     </div>
//   );
// }
// src/pages/VerifyOTPPage.jsx - WITH TIMER
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyOtp, startLogin } from '../api/api';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/1.png';
import '../styles/VerifyOTPPage.css';

export default function VerifyOTPPage() {
  const navigate = useNavigate();
  const { pendingEmail, setPendingEmail, setAuthFromToken, otpSentAt, setOtpSentAt } = useAuth();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  
  // ✅ NEW: Timer state
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef([]);

  // ✅ TIMER LOGIC
  useEffect(() => {
    if (!otpSentAt) {
      setCanResend(true);
      return;
    }

    const calculateRemaining = () => {
      const elapsed = Math.floor((Date.now() - otpSentAt) / 1000);
      const remaining = Math.max(0, 60 - elapsed);
      setCountdown(remaining);
      setCanResend(remaining === 0);
      return remaining;
    };

    // Initial calculation
    const remaining = calculateRemaining();

    // Only set interval if there's time left
    if (remaining > 0) {
      const interval = setInterval(() => {
        const newRemaining = calculateRemaining();
        if (newRemaining === 0) {
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [otpSentAt]);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (error) setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }

    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6);

    if (!pastedData) return;

    const digits = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
    setOtp(digits);
    inputRefs.current[5]?.focus();
    if (error) setError('');
  };

  async function submitOtp(otpString) {
    if (!pendingEmail) {
      throw new Error('No pending email provided for verification.');
    }

    const data = await verifyOtp({ email: pendingEmail, otp: otpString });

    if (!data || !data.token) {
      const msg = (data && (data.error || data.message)) || 'No token returned by server';
      const err = new Error(msg);
      err.raw = data;
      throw err;
    }

    localStorage.setItem('authToken', data.token);
    setPendingEmail('');
    const userData = await setAuthFromToken(data.token);
    return { data, userData };
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');

    if (otpString.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const { data: resultData, userData } = await submitOtp(otpString);

      const needsProfile =
        resultData?.needsProfile === true ||
        userData?.needsProfile === true;

      if (needsProfile) {
        navigate('/setup-profile', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }

    } catch (err) {
      console.error('❌ OTP verification failed:', err, err.raw);

      if (
        err.message === 'email_not_allowed' ||
        err.raw?.error === 'email_not_allowed' ||
        err.message?.toLowerCase().includes('not authorized')
      ) {
        setError('Your email is not authorized. Please contact the administrator.');
        setPendingEmail('');
        setOtp(['', '', '', '', '', '']);

        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 1500);

        return;
      }

      let message = 'Invalid code. Please try again.';
      if (err.message && err.message.trim()) {
        message = err.message;
      } else if (err.raw?.error || err.raw?.message) {
        message = err.raw.error || err.raw.message;
      }

      setError(message);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();

    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeEmail = () => {
    setPendingEmail('');
    navigate('/login');
  };

  const handleResendOTP = async () => {
    if (resending || !canResend) return;
    if (!pendingEmail) {
      setError('Missing email to resend OTP to.');
      return;
    }

    try {
      setResending(true);
      setError('');
      
      await startLogin(pendingEmail);
      
      // ✅ RESET TIMER
      const now = Date.now();
      setOtpSentAt(now);
      setCountdown(60);
      setCanResend(false);
      alert('✅ New code sent to your email!');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      console.error('❌ Resend OTP failed:', err);
      const msg = err && err.message ? err.message : 'Failed to resend code. Please try again.';
      setError(msg);
    } finally {
      setResending(false);
    }
  };

  if (!pendingEmail) return null;

  return (
    <div className="auth-page">
      <header className="auth-header">
        <img src={logo} alt="Invoice Generator" className="auth-logo" />
      </header>

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-icon">🔐</div>

          <h1 className="auth-title">Enter Verification Code</h1>

          <p className="auth-subtitle">
            We've sent a 6-digit code to
            <br />
            <strong>{pendingEmail}</strong>
          </p>

          <form onSubmit={handleSubmit} className="otp-form" onPaste={handlePaste}>
            <div className="otp-inputs">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className="otp-input"
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={submitting}
                  autoComplete="off"
                  aria-label={`Digit ${index + 1}`}
                />
              ))}
            </div>

            {error && (
              <div className="auth-error" role="alert" aria-live="assertive">
                <span>⚠️</span> {error}
              </div>
            )}

            <button
              type="submit"
              className="auth-button auth-button-primary"
              disabled={submitting || otp.join('').length !== 6}
            >
              {submitting ? (
                <>
                  <span className="spinner" />
                  Verifying...
                </>
              ) : (
                'Verify & Continue'
              )}
            </button>

            <button
              type="button"
              className="auth-button auth-button-secondary"
              onClick={handleChangeEmail}
              disabled={submitting || resending}
            >
              Change Email
            </button>

            {/* ✅ CONDITIONAL RESEND BUTTON WITH TIMER */}
            {canResend ? (
              <button
                type="button"
                className="auth-link"
                onClick={handleResendOTP}
                disabled={submitting || resending}
              >
                {resending ? 'Sending...' : "Didn't receive a code? Resend"}
              </button>
            ) : (
              <p className="auth-countdown">
                Resend available in <strong>{countdown}s</strong>
              </p>
            )}
          </form>

          <p className="auth-footer-text">
            Check your spam folder if you don't see the email
          </p>
        </div>
      </main>
    </div>
  );
}