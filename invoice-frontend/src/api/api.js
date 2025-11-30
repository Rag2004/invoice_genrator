
// const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

// async function rawFetch(path, opts = {}) {
//   const url = `${BASE}${path}`;
//   const res = await fetch(url, opts);
//   const text = await res.text();
//   let json = {};
//   try { 
//     json = text ? JSON.parse(text) : {}; 
//   } catch(e) {
//     throw new Error(`Invalid JSON from ${url}: ${text}`);
//   }
//   if (!res.ok) {
//     const errMsg = json?.error || json?.message || `HTTP ${res.status}`;
//     throw new Error(errMsg);
//   }
//   return json;
// }

// export async function getTeam() {
//   const res = await rawFetch('/team');
//   return res.team || [];
// }

// export async function getProject(code) {
//   const res = await rawFetch(`/projects/${encodeURIComponent(code)}`);
//   return res.project;
// }

// export async function getClient(code) {
//   const res = await rawFetch(`/clients/${encodeURIComponent(code)}`);
//   return res.client;
// }

// export async function createInvoice(payload) {
//   const res = await rawFetch('/invoices', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(payload)
//   });
//   return res;
// }

// export async function saveInvoice(payload) {
//   // Alias for createInvoice
//   return createInvoice(payload);
// }

// export async function sendInvoiceEmail({ invoiceId, toEmail }) {
//   const res = await rawFetch('/invoices/send', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ invoiceId, toEmail })
//   });
//   return res;
// }

// // Legacy aliases for backward compatibility
// export const fetchProject = getProject;
// export const fetchClient = getClient;
// export const fetchTeam = getTeam;
// src/api/api.js

// src/api/api.js
// Central API helper for auth + invoice endpoints

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

// ---------- Generic helpers ----------
async function apiGet(path) {
  const resp = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || `GET ${path} failed with ${resp.status}`);
  }
  return resp.json();
}

async function apiPost(path, body) {
  const resp = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(body || {}),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || `POST ${path} failed with ${resp.status}`);
  }
  return resp.json();
}

// ===================== AUTH APIs =====================

// Start login: send OTP to email
export async function startLogin(email) {
  if (!email) throw new Error('Email is required');
  return apiPost('/auth/start-login', { email });
}

// Verify OTP
export async function verifyOtp({ email, otp }) {
  if (!email || !otp) throw new Error('Email and OTP are required');
  return apiPost('/auth/verify-otp', { email, otp });
}

// Get logged-in user profile
// src/api/api.js

// Get logged-in user profile
export async function getProfile() {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Failed to get profile');
    }

    return data;
  } catch (error) {
    console.error('❌ getProfile error:', error);
    throw error;
  }
}

// Update profile (name, etc.)
export async function updateProfile(profile) {
  return apiPost('/auth/update-profile', profile);
}

// Logout
export async function logout() {
  return apiPost('/auth/logout', {});
}

// ===================== INVOICE / SHEETS APIs =====================

// Team members sheet
export async function getTeam() {
  return apiGet('/team');
}

// Project sheet by project code
export async function getProject(projectCode) {
  if (!projectCode) throw new Error('Project code is required');
  return apiGet(`/projects/${encodeURIComponent(projectCode)}`);
}

// Client sheet by client code
export async function getClient(clientCode) {
  if (!clientCode) throw new Error('Client code is required');
  return apiGet(`/clients/${encodeURIComponent(clientCode)}`);
}

// Invoice by ID (for loading drafts)
export async function getInvoiceById(invoiceId) {
  if (!invoiceId) throw new Error('Invoice ID is required');
  return apiGet(`/invoices/${encodeURIComponent(invoiceId)}`);
}
