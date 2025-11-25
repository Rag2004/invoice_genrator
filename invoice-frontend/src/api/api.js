
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

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

async function fetchJson(url, options = {}) {
  const resp = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Request failed ${resp.status}: ${text}`);
  }

  // Handle empty responses safely
  const text = await resp.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON from ${url}: ${text}`);
  }
}

/**
 * GET /api/team
 * Returns list of team members from backend (which calls Apps Script getTeam)
 */
export async function getTeam() {
  return fetchJson(`${API_BASE}/team`);
}

/**
 * GET /api/projects/:code
 * Load a single project by project code
 */
export async function getProject(code) {
  if (!code) throw new Error('project code required');
  const safe = encodeURIComponent(code);
  return fetchJson(`${API_BASE}/projects/${safe}`);
}

/**
 * GET /api/clients/:code
 * Load a single client by client code
 */
export async function getClient(code) {
  if (!code) throw new Error('client code required');
  const safe = encodeURIComponent(code);
  return fetchJson(`${API_BASE}/clients/${safe}`);
}

/**
 * GET /api/invoices/:invoiceId
 * Load a single invoice (draft or final) by invoiceId
 * Used to “resume” a previously saved draft.
 */
export async function getInvoiceById(invoiceId) {
  if (!invoiceId) {
    throw new Error('invoiceId is required');
  }
  const safe = encodeURIComponent(invoiceId);
  return fetchJson(`${API_BASE}/invoices/${safe}`);
}
