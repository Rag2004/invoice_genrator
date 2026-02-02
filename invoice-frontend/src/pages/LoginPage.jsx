// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { startLogin } from '../api/api';
// import { useAuth } from '../context/AuthContext';
// import '../styles/LoginPage.css';

// import logo from '../assets/1.png'; // adjust path if needed

// export default function LoginPage() {
//   const [email, setEmail] = useState('');
//   const [error, setError] = useState('');
//   const [loading, setLoading] = useState(false);

//   const navigate = useNavigate();
//   const { setPendingEmail } = useAuth();   // 👈 now this definitely exists

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError('');

//     const trimmed = email.trim();
//     if (!trimmed || !trimmed.includes('@')) {
//       setError('Please enter a valid email address.');
//       return;
//     }

//     try {
//       setLoading(true);

//       // hit backend to send OTP
//       await startLogin(trimmed);

//       // save email in auth context for the verify screen
//       setPendingEmail(trimmed);

//       // go to verify page
//       navigate('/verify-otp', { state: { email: trimmed } });
//     } catch (err) {
//       console.error('startLogin failed', err);
//       setError(err?.message || 'Something went wrong. Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="login-page">
//       {/* top bar with small logo */}
//       <header className="login-header">
//         <img src={logo} alt="hourlx logo" className="login-logo-small" />
//       </header>

//       {/* center content */}
//       <main className="login-main">
//         <div className="login-card">
//           <h1 className="login-title">Login</h1>
//           <p className="login-subtitle">
//             Enter your email to receive a one-time login code.
//           </p>

//           <form onSubmit={handleSubmit} className="login-form">
//             <label className="login-label" htmlFor="email">
//               Email
//             </label>
//             <input
//               id="email"
//               type="email"
//               className="login-input"
//               placeholder="you@example.com"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               disabled={loading}
//             />

//             {error && <p className="login-error">{error}</p>}

//             <button
//               type="submit"
//               className="login-button"
//               disabled={loading}
//             >
//               {loading ? 'Sending code…' : 'Continue'}
//             </button>

//             <p className="login-help">
//               We’ll email you a 6-digit code. No password needed.
//             </p>
//           </form>
//         </div>
//       </main>
//     </div>
//   );
// }
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startLogin } from '../api/api';
import { useAuth } from '../context/AuthContext';
import '../styles/LoginPage.css';

import logo from '../assets/1.png';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { setPendingEmail, setOtpSentAt } = useAuth(); // ✅ ADD setOtpSentAt

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

      // ✅ SAVE timestamp when OTP was sent
      const now = Date.now();
      setPendingEmail(trimmed);
      setOtpSentAt(now);

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
      <header className="login-header">
        <img src={logo} alt="hourlx logo" className="login-logo-small" />
      </header>

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
              We'll email you a 6-digit code. No password needed.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}