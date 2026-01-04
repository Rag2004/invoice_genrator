
// src/components/Auth/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, requireProfileSetup = false }) {
  const { user, loading, isAuthenticated, needsProfile } = useAuth();

  console.log('🛡️ ProtectedRoute check:', {
    user: user
      ? { id: user.id, name: user.name, email: user.email }
      : null,
    loading,
    isAuthenticated,
    needsProfile,
  });

  // While auth is being checked
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div className="spinner-large"></div>
          <p
            style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              marginTop: '20px',
            }}
          >
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // Not logged in at all → go to login
  if (!isAuthenticated) {
    console.log('❌ Not authenticated, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  // This route is ONLY for users who still need to set up profile
  if (requireProfileSetup) {
    if (!needsProfile) {
      console.log('🛡️ Profile already complete → redirecting to /dashboard');
      return <Navigate to="/dashboard" replace />;
    }
    console.log('🛡️ Logged in + needsProfile → allow profile setup page');
    return children;
  }

  // Normal protected routes (dashboard etc.). If profile not complete, push them to setup.
  if (needsProfile) {
    console.log('🛡️ Needs profile → redirecting to /setup-profile');
    return <Navigate to="/setup-profile" replace />;
  }

  // Fully authenticated + profile complete → show protected content
  console.log('✅ Authenticated, rendering protected content');
  return children;
}
