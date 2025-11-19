// // src/api/api.js
// const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api'

// async function rawFetch(path, opts = {}) {
//   const url = `${BASE}${path}`
//   const res = await fetch(url, opts)
//   const text = await res.text()
//   let json = {}
//   try { json = text ? JSON.parse(text) : {} } catch(e) {
//     throw new Error(`Invalid JSON from ${url}: ${text}`)
//   }
//   if (!res.ok) {
//     const errMsg = json?.error || json?.message || `HTTP ${res.status}`
//     throw new Error(errMsg)
//   }
//   return json
// }

// export async function getTeam() {
//   const res = await rawFetch('/team')
//   return res.team || []
// }

// export async function getProject(code) {
//   const res = await rawFetch(`/projects/${encodeURIComponent(code)}`)
//   return res.project
// }

// export async function getClient(code) {
//   const res = await rawFetch(`/clients/${encodeURIComponent(code)}`)
//   return res.client
// }

// export async function createInvoice(payload) {
//   // backend will compute sequence and invoiceNumber
//   const res = await rawFetch('/invoices', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(payload)
//   })
//   return res
// }

// export async function sendInvoiceEmail({ invoiceId, toEmail }) {
//   const res = await rawFetch('/invoices/send', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ invoiceId, toEmail })
//   })
//   return res
// }
// src/api/api.js
const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

async function rawFetch(path, opts = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, opts);
  const text = await res.text();
  let json = {};
  try { 
    json = text ? JSON.parse(text) : {}; 
  } catch(e) {
    throw new Error(`Invalid JSON from ${url}: ${text}`);
  }
  if (!res.ok) {
    const errMsg = json?.error || json?.message || `HTTP ${res.status}`;
    throw new Error(errMsg);
  }
  return json;
}

export async function getTeam() {
  const res = await rawFetch('/team');
  return res.team || [];
}

export async function getProject(code) {
  const res = await rawFetch(`/projects/${encodeURIComponent(code)}`);
  return res.project;
}

export async function getClient(code) {
  const res = await rawFetch(`/clients/${encodeURIComponent(code)}`);
  return res.client;
}

export async function createInvoice(payload) {
  const res = await rawFetch('/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res;
}

export async function saveInvoice(payload) {
  // Alias for createInvoice
  return createInvoice(payload);
}

export async function sendInvoiceEmail({ invoiceId, toEmail }) {
  const res = await rawFetch('/invoices/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invoiceId, toEmail })
  });
  return res;
}

// Legacy aliases for backward compatibility
export const fetchProject = getProject;
export const fetchClient = getClient;
export const fetchTeam = getTeam;