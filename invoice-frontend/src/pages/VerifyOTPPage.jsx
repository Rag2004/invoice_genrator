// // src/pages/VerifyOTPPage.jsx
// import React, { useState, useEffect, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { verifyOtp, startLogin } from '../api/api';
// import { useAuth } from '../context/AuthContext';
// import logo from '../assets/1.png';

// export default function VerifyOTPPage() {
//   const navigate = useNavigate();
//   const { pendingEmail, setAuthFromToken, clearPendingEmail } = useAuth();

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
//     // Only allow digits
//     if (value && !/^\d$/.test(value)) return;

//     const newOtp = [...otp];
//     newOtp[index] = value;
//     setOtp(newOtp);

//     if (error) setError('');

//     // Auto-focus next input
//     if (value && index < 5) {
//       inputRefs.current[index + 1]?.focus();
//     }
//   };

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

//     if (pastedData.length === 6) {
//       setOtp(pastedData.split(''));
//       inputRefs.current[5]?.focus();
//       if (error) setError('');
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     const otpString = otp.join('');

//     console.log('🔍 Submit Debug:', {
//       pendingEmail,
//       otp,
//       otpString,
//       otpLength: otpString.length,
//     });

//     if (otpString.length !== 6) {
//       setError('Please enter all 6 digits');
//       return;
//     }

//     try {
//       setSubmitting(true);
//       setError('');

//       console.log('🔐 Verifying OTP:', { email: pendingEmail, otp: otpString });

//       // Verify OTP with backend
//       const data = await verifyOtp({ email: pendingEmail, otp: otpString });

//       console.log('✅ OTP verified successfully:', data);

//       if (data?.token) {
//         // 1. Save token
//         localStorage.setItem('authToken', data.token);

//         // 2. Clear pending email (OTP step is done)
//         clearPendingEmail();

//         // 3. Load user profile into context
//         console.log('🔄 Updating auth context...');
//         const userData = await setAuthFromToken(data.token);
//         console.log('✅ Auth context updated:', userData);

//         // 4. Decide where to go
//         const needsProfile =
//           data.needsProfile || userData?.needsProfile || !userData?.name;

//         if (needsProfile) {
//           console.log('📝 Redirecting to profile setup');
//           navigate('/setup-profile', { replace: true });
//         } else {
//           console.log('✅ Redirecting to dashboard');
//           navigate('/dashboard', { replace: true });
//         }
//       } else {
//         throw new Error('No token received from server');
//       }
//     } catch (err) {
//       console.error('❌ OTP verification failed:', err);

//       let errorMessage = 'Invalid code. Please try again.';
//       if (err.message) {
//         errorMessage = err.message;
//       }

//       setError(errorMessage);

//       // Clear OTP on error
//       setOtp(['', '', '', '', '', '']);
//       inputRefs.current[0]?.focus();
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   const handleChangeEmail = () => {
//     console.log('🔄 Changing email, returning to login');
//     clearPendingEmail();
//     navigate('/login');
//   };

//   const handleResendOTP = async () => {
//     if (resending) return;

//     try {
//       setResending(true);
//       setError('');

//       console.log('📤 Resending OTP to:', pendingEmail);
//       await startLogin(pendingEmail);
//       console.log('✅ OTP resent successfully');

//       alert('✅ New code sent to your email!');

//       setOtp(['', '', '', '', '', '']);
//       inputRefs.current[0]?.focus();
//     } catch (err) {
//       console.error('❌ Resend OTP failed:', err);
//       setError('Failed to resend code. Please try again.');
//     } finally {
//       setResending(false);
//     }
//   };

//   // If someone opens /verify-otp directly with no email,
//   // we just don't render anything (no auto redirect)
//   if (!pendingEmail) {
//     return null;
//   }

//   return (
//     <div className="auth-page">
//       {/* Top Logo */}
//       <header className="auth-header">
//         <img src={logo} alt="Invoice Generator" className="auth-logo" />
//       </header>

//       {/* Main Content */}
//       <main className="auth-main">
//         <div className="auth-card">
//           <div className="auth-icon">🔐</div>

//           <h1 className="auth-title">Enter Verification Code</h1>

//           <p className="auth-subtitle">
//             We've sent a 6-digit code to
//             <br />
//             <strong>{pendingEmail}</strong>
//           </p>

//           <form onSubmit={handleSubmit} className="otp-form">
//             <div className="otp-inputs" onPaste={handlePaste}>
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
//               <div className="auth-error">
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
//           </p>
//         </div>
//       </main>
//     </div>
//   );
// }
// src/pages/VerifyOTPPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyOtp, startLogin } from '../api/api';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/1.png';

export default function VerifyOTPPage() {
  const navigate = useNavigate();
  const { pendingEmail, setAuthFromToken, clearPendingEmail } = useAuth();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  // Refs for OTP inputs
  const inputRefs = useRef([]);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index, value) => {
    // Only allow single digit 0-9
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (error) setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 are filled (optional)
    // if (newOtp.join('').length === 6) handleSubmitAuto(newOtp.join(''));
  };

  // Optional auto submit helper (uncomment call above to enable)
  async function handleSubmitAuto(otpString) {
    // small wrapper that avoids double-action
    if (submitting) return;
    try {
      setSubmitting(true);
      await submitOtp(otpString);
    } finally {
      setSubmitting(false);
    }
  }

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

    // If it's a full 6-digit paste, auto-submit (optional)
    // if (pastedData.length === 6) handleSubmitAuto(pastedData);
  };

  // Extract OTP submit logic to reuse (so auto-submit can reuse)
  async function submitOtp(otpString) {
    // defensive
    if (!pendingEmail) {
      throw new Error('No pending email provided for verification.');
    }

    // Verify OTP with backend
    const data = await verifyOtp({ email: pendingEmail, otp: otpString });
    // api.verifyOtp throws on non-2xx or returns parsed JSON on success.

    // If backend returned an OK object but no token, show friendly message
    if (!data || !data.token) {
      const msg = (data && (data.error || data.message)) || 'No token returned by server';
      const err = new Error(msg);
      err.raw = data;
      throw err;
    }

    // Save token and populate auth context
    localStorage.setItem('authToken', data.token);
    clearPendingEmail();
    const userData = await setAuthFromToken(data.token);
    return { data, userData };
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');

    console.log('🔍 Submit Debug:', { pendingEmail, otp, otpString, otpLength: otpString.length });

    if (otpString.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      console.log('🔐 Verifying OTP:', { email: pendingEmail, otp: otpString });

      const { data: resultData, userData } = await submitOtp(otpString);

      console.log('✅ OTP verified successfully:', resultData);

      const needsProfile = resultData.needsProfile || userData?.needsProfile || !userData?.name;

      if (needsProfile) {
        navigate('/setup-profile', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      // err.message should already contain a useful message from api.js
      console.error('❌ OTP verification failed:', err, 'raw:', err.raw || err);
      let message = 'Invalid code. Please try again.';
      // if the backend sent a specific message, surface it
      if (err.message && typeof err.message === 'string' && err.message.trim()) {
        message = err.message;
      } else if (err.raw && (err.raw.error || err.raw.message)) {
        message = err.raw.error || err.raw.message;
      }
      setError(message);

      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeEmail = () => {
    console.log('🔄 Changing email, returning to login');
    clearPendingEmail();
    navigate('/login');
  };

  const handleResendOTP = async () => {
    if (resending) return;
    if (!pendingEmail) {
      setError('Missing email to resend OTP to.');
      return;
    }

    try {
      setResending(true);
      setError('');
      console.log('📤 Resending OTP to:', pendingEmail);
      await startLogin(pendingEmail);
      console.log('✅ OTP resent successfully');
      alert('✅ New code sent to your email!');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      console.error('❌ Resend OTP failed:', err);
      // try to show server message if available
      const msg = err && err.message ? err.message : 'Failed to resend code. Please try again.';
      setError(msg);
    } finally {
      setResending(false);
    }
  };

  // If someone opens /verify-otp directly with no email, do not render
  if (!pendingEmail) return null;

  const formatDate = (d) => (d ? new Date(d).toLocaleString() : '');

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

            <button
              type="button"
              className="auth-link"
              onClick={handleResendOTP}
              disabled={submitting || resending}
            >
              {resending ? 'Sending...' : "Didn't receive a code? Resend"}
            </button>
          </form>

          <p className="auth-footer-text">
            Check your spam folder if you don't see the email
            {/* optionally show debug info during dev */}
            {/* <br/>Debug: last send at {formatDate(lastSentAt)} */}
          </p>
        </div>
      </main>
    </div>
  );
}
