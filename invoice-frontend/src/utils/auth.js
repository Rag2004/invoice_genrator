// src/utils/auth.js

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

/**
 * Start login: send OTP to email
 * POST /api/auth/start-login
 */
export async function startLogin(email) {
  const res = await fetch(`${API_BASE}/auth/start-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.ok === false) {
    throw new Error(data.error || 'Failed to start login');
  }

  return data; // { ok, email, isExistingUser, expiresAt }
}

/**
 * Verify OTP
 * POST /api/auth/verify-otp
 */
// src/utils/auth.js

export async function verifyOtp({ email, otp }) {
  const res = await fetch(`${API_BASE}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.ok === false) {
    const code = data.error || '';
    let message = 'Invalid OTP';

    if (code === 'otp_expired') {
      message = 'This code has expired. Please request a new OTP.';
    } else if (code === 'invalid_otp') {
      message = 'Incorrect code. Please check and try again.';
    } else if (code === 'too_many_attempts') {
      message = 'Too many attempts. Please request a new OTP.';
    } else if (data.error) {
      message = data.error;
    }

    throw new Error(message);
  }

  return data; // { ok, token, user, needsProfile }
}

/**
 * Complete profile
 * POST /api/auth/complete-profile
 * Requires Authorization: Bearer <token>
 */
export async function completeProfileRequest({ token, name, phone }) {
  const res = await fetch(`${API_BASE}/auth/complete-profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, phone }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.ok === false) {
    throw new Error(data.error || 'Failed to complete profile');
  }

  return data; // { ok, token, user }
}

/* ---------- LocalStorage helpers for 7-day session ---------- */

const STORAGE_KEY = 'invoice_auth_state';
const SESSION_DAYS = 7;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

export function saveAuthToStorage({ token, user, needsProfile }) {
  const expiresAt = Date.now() + SESSION_MS;
  const payload = { token, user, needsProfile: !!needsProfile, expiresAt };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  return payload;
}

export function loadAuthFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.expiresAt) return null;
    if (parsed.expiresAt < Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearAuthFromStorage() {
  localStorage.removeItem(STORAGE_KEY);
}
