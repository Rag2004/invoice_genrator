
// src/api/api.js
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

// ---------- Generic helpers ----------
async function apiGet(path, requireAuth = false) {
  const headers = {};
  if (requireAuth) {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('No authentication token found');
    headers['Authorization'] = `Bearer ${token}`;
  }
  const resp = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers,
  });

  const text = await resp.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    throw new Error(text || `GET ${path} failed with ${resp.status}`);
  }

  if (!resp.ok) {
    throw new Error(data.message || data.error || `GET ${path} failed with ${resp.status}`);
  }
  return data;
}

async function apiPost(path, body = {}, requireAuth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (requireAuth) {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('No authentication token found');
    headers['Authorization'] = `Bearer ${token}`;
  }
  const resp = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(body || {}),
  });

  const text = await resp.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    throw new Error(text || `POST ${path} failed with ${resp.status}`);
  }

  if (!resp.ok) {
    throw new Error(data.message || data.error || `POST ${path} failed with ${resp.status}`);
  }
  return data;
}

// ===================== AUTH APIs =====================
export async function startLogin(email) {
  if (!email) throw new Error('Email is required');
  return apiPost('/auth/start-login', { email });
}

export async function verifyOtp({ email, otp }) {
  if (!email || !otp) throw new Error('Email and OTP are required');
  return apiPost('/auth/verify-otp', { email, otp });
}

export async function getProfile() {
  return apiGet('/auth/me', true);
}

export async function updateProfile(profile) {
  return apiPost('/auth/complete-profile', profile, true);
}

export async function logout() {
  return apiPost('/auth/logout', {}, true);
}

// ===================== INVOICE / SHEETS APIs =====================

export async function getTeam() {
  return apiGet('/team', true);
}

export async function getProject(projectCode) {
  if (!projectCode) throw new Error('Project code is required');
  return apiGet(`/projects/${encodeURIComponent(projectCode)}`, true);
}

export async function getClient(clientCode) {
  if (!clientCode) throw new Error('Client code is required');
  return apiGet(`/clients/${encodeURIComponent(clientCode)}`, true);
}

export async function getInvoiceById(invoiceId) {
  if (!invoiceId) throw new Error('Invoice ID is required');
  return apiGet(`/invoices/${encodeURIComponent(invoiceId)}`, true);
}

// ===================== DASHBOARD =====================

/**
 * Get dashboard summary for logged-in consultant.
 * Uses Authorization header (token stored in localStorage.authToken).
 */
export async function getDashboardSummary() {
  // Calls backend: GET /api/dashboard/summary
  return apiGet('/dashboard/summary', true);
}
// src/api/api.js
// const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';
// const DEV_CONSULTANT_ID = import.meta.env.VITE_DEV_CONSULTANT_ID || ''; // set in .env for local dev, e.g. CONS_001

// // ---------- Generic helpers ----------
// async function apiGet(path, opts = { requireAuth: false, devConsultantId: null }) {
//   const { requireAuth = false, devConsultantId = null } = opts || {};
//   const headers = {};

//   if (requireAuth) {
//     const token = localStorage.getItem('authToken');
//     if (!token) {
//       // if we are in dev and a dev consultant id is provided, send it as header
//       const fallback = devConsultantId || DEV_CONSULTANT_ID;
//       if (!fallback) throw new Error('No authentication token found');
//       headers['x-consultant-id'] = fallback;
//     } else {
//       headers['Authorization'] = `Bearer ${localStorage.getItem('authToken')}`;
//     }
//   }

//   const resp = await fetch(`${API_BASE}${path}`, {
//     credentials: 'include',
//     headers,
//   });

//   const text = await resp.text();
//   let data;
//   try {
//     data = text ? JSON.parse(text) : {};
//   } catch (e) {
//     throw new Error(text || `GET ${path} failed with ${resp.status}`);
//   }

//   if (!resp.ok) {
//     // standardize error message
//     const msg = data.message || data.error || `GET ${path} failed with ${resp.status}`;
//     throw new Error(msg);
//   }
//   return data;
// }

// async function apiPost(path, body = {}, opts = { requireAuth: false, devConsultantId: null }) {
//   const { requireAuth = false, devConsultantId = null } = opts || {};
//   const headers = { 'Content-Type': 'application/json' };

//   if (requireAuth) {
//     const token = localStorage.getItem('authToken');
//     if (!token) {
//       const fallback = devConsultantId || DEV_CONSULTANT_ID;
//       if (!fallback) throw new Error('No authentication token found');
//       headers['x-consultant-id'] = fallback;
//     } else {
//       headers['Authorization'] = `Bearer ${localStorage.getItem('authToken')}`;
//     }
//   }

//   const resp = await fetch(`${API_BASE}${path}`, {
//     method: 'POST',
//     headers,
//     credentials: 'include',
//     body: JSON.stringify(body || {}),
//   });

//   const text = await resp.text();
//   let data;
//   try {
//     data = text ? JSON.parse(text) : {};
//   } catch (e) {
//     throw new Error(text || `POST ${path} failed with ${resp.status}`);
//   }

//   if (!resp.ok) {
//     const msg = data.message || data.error || `POST ${path} failed with ${resp.status}`;
//     throw new Error(msg);
//   }
//   return data;
// }

// // ===================== AUTH APIs =====================
// export async function startLogin(email) {
//   if (!email) throw new Error('Email is required');
//   return apiPost('/auth/start-login', { email });
// }

// export async function verifyOtp({ email, otp }) {
//   if (!email || !otp) throw new Error('Email and OTP are required');
//   return apiPost('/auth/verify-otp', { email, otp });
// }

// export async function getProfile() {
//   return apiGet('/auth/me', { requireAuth: true });
// }

// export async function updateProfile(profile) {
//   return apiPost('/auth/complete-profile', profile, { requireAuth: true });
// }

// export async function logout() {
//   return apiPost('/auth/logout', {}, { requireAuth: true });
// }

// // ===================== INVOICE / SHEETS APIs =====================

// export async function getTeam() {
//   return apiGet('/team', { requireAuth: true });
// }

// export async function getProject(projectCode) {
//   if (!projectCode) throw new Error('Project code is required');
//   return apiGet(`/projects/${encodeURIComponent(projectCode)}`, { requireAuth: true });
// }

// export async function getClient(clientCode) {
//   if (!clientCode) throw new Error('Client code is required');
//   return apiGet(`/clients/${encodeURIComponent(clientCode)}`, { requireAuth: true });
// }

// export async function getInvoiceById(invoiceId) {
//   if (!invoiceId) throw new Error('Invoice ID is required');
//   return apiGet(`/invoices/${encodeURIComponent(invoiceId)}`, { requireAuth: true });
// }

// // ===================== DASHBOARD =====================

// /**
//  * Get dashboard summary for logged-in consultant.
//  * Uses Authorization header (token stored in localStorage.authToken).
//  *
//  * If token absent and VITE_DEV_CONSULTANT_ID env var is set, it will use that as x-consultant-id header.
//  */
// export async function getDashboardSummary() {
//   return apiGet('/dashboard/summary', { requireAuth: true });
// }
