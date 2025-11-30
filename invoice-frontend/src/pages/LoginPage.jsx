// // src/pages/LoginPage.jsx
// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext';

// export default function LoginPage() {
//   const [email, setEmail] = useState('');
//   const [localError, setLocalError] = useState('');
//   const { startLogin, loading, authError } = useAuth();
//   const navigate = useNavigate();

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLocalError('');

//     const trimmed = email.trim().toLowerCase();
//     if (!trimmed) {
//       setLocalError('Please enter your email.');
//       return;
//     }

//     try {
//       await startLogin(trimmed);
//       navigate('/verify-otp');
//     } catch (err) {
//       setLocalError(err.message || 'Something went wrong');
//     }
//   };

//   return (
//     <div className="app-container auth-page">
//       <div className="app-shell" style={{ maxWidth: 480, margin: '3rem auto' }}>
//         <header className="app-header">
//           <h1 className="title">Login to Tech Sprint</h1>
//           <p className="subtitle">Enter your email to receive a one-time login code.</p>
//         </header>

//         <form onSubmit={handleSubmit} className="auth-form card" style={{ padding: '1.5rem' }}>
//           <label className="label">
//             Email
//             <input
//               type="email"
//               className="input"
//               placeholder="you@example.com"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               required
//             />
//           </label>

//           {(localError || authError) && (
//             <div className="auth-error" style={{ color: 'red', marginTop: '0.5rem' }}>
//               {localError || authError}
//             </div>
//           )}

//           <button
//             type="submit"
//             className="btn btn-success"
//             style={{ marginTop: '1rem', width: '100%' }}
//             disabled={loading}
//           >
//             {loading ? 'Sending OTP...' : 'Continue'}
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// }


import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startLogin } from '../api/api';
import { useAuth } from '../context/AuthContext';

import logo from '../assets/1.png'; // adjust path if needed

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { setPendingEmail } = useAuth();   // 👈 now this definitely exists

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      setLoading(true);

      // hit backend to send OTP
      await startLogin(trimmed);

      // save email in auth context for the verify screen
      setPendingEmail(trimmed);

      // go to verify page
      navigate('/verify-otp', { state: { email: trimmed } });
    } catch (err) {
      console.error('startLogin failed', err);
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* top bar with small logo */}
      <header className="login-header">
        <img src={logo} alt="hourlx logo" className="login-logo-small" />
      </header>

      {/* center content */}
      <main className="login-main">
        <div className="login-card">
          <h1 className="login-title">Login</h1>
          <p className="login-subtitle">
            Enter your email to receive a one-time login code.
          </p>

          <form onSubmit={handleSubmit} className="login-form">
            <label className="login-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="login-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />

            {error && <p className="login-error">{error}</p>}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? 'Sending code…' : 'Continue'}
            </button>

            <p className="login-help">
              We’ll email you a 6-digit code. No password needed.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
