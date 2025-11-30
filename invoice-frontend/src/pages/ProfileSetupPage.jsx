// src/pages/ProfileSetupPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProfileSetupPage() {
  const { user, completeProfile, loading, authError, token } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [localError, setLocalError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!name.trim()) {
      setLocalError('Please enter your name.');
      return;
    }

    try {
      await completeProfile({ name: name.trim(), phone: phone.trim() });
      navigate('/', { replace: true });
    } catch (err) {
      setLocalError(err.message || 'Failed to save profile');
    }
  };

  return (
    <div className="app-container auth-page">
      <div className="app-shell" style={{ maxWidth: 480, margin: '3rem auto' }}>
        <header className="app-header">
          <h1 className="title">Complete your profile</h1>
          <p className="subtitle">Just a few details so we can personalise your dashboard.</p>
        </header>

        <form onSubmit={handleSubmit} className="card" style={{ padding: '1.5rem' }}>
          <label className="label">
            Full Name
            <input
              type="text"
              className="input"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

          <label className="label" style={{ marginTop: '0.75rem' }}>
            Phone (optional)
            <input
              type="tel"
              className="input"
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>

          {(localError || authError) && (
            <div className="auth-error" style={{ color: 'red', marginTop: '0.75rem' }}>
              {localError || authError}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-success"
            style={{ marginTop: '1.25rem', width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Finish & Go to Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
