// // lib/appsScriptClient.js
// const fetch = require('node-fetch')
// const { URLSearchParams } = require('url')
// const logger = require('../utils/logger')

// const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || ''
// const APPS_SCRIPT_TOKEN = process.env.APPS_SCRIPT_TOKEN || ''
// const TIMEOUT = Number(process.env.APPS_SCRIPT_TIMEOUT_MS || 10000)
// const RETRIES = Number(process.env.APPS_SCRIPT_RETRIES || 2)

// function sleep(ms){ return new Promise(r=>setTimeout(r, ms)) }

// async function fetchWithTimeout(url, opts = {}, timeout = TIMEOUT) {
//   const controller = new (global.AbortController || require('abort-controller'))()
//   const id = setTimeout(() => controller.abort(), timeout)
//   try {
//     const res = await fetch(url, { ...opts, signal: controller.signal })
//     return res
//   } finally {
//     clearTimeout(id)
//   }
// }

// async function requestWithRetry(url, opts = {}, retries = RETRIES) {
//   let attempt = 0
//   while (true) {
//     try {
//       const res = await fetchWithTimeout(url, opts)
//       const text = await res.text()
//       let json = {}
//       try { json = text ? JSON.parse(text) : {} } catch(e) { json = { raw: text } }
//       if (!res.ok) {
//         const err = json?.error || json?.message || `HTTP ${res.status}`
//         throw new Error(err)
//       }
//       return json
//     } catch (err) {
//       attempt++
//       logger.warn({ attempt, err: err.message }, 'appsScript request failed')
//       if (attempt > retries) throw err
//       await sleep(500 * attempt)
//     }
//   }
// }

// // If APPS_SCRIPT_URL is not configured, provide an in-memory stub
// if (!APPS_SCRIPT_URL) {
//   logger.info('APPS_SCRIPT_URL not set — running appsScriptClient in STUB mode (local memory).')

//   const memory = {
//     team: [
//       { id: 'tm_1', name: 'Asha Sharma', factor: 1.0, defaultMode: 'Online' },
//       { id: 'tm_2', name: 'Vikram Rao', factor: 1.5, defaultMode: 'Studio' }
//     ],
//     projects: {
//       'P001': { code: 'P001', clientCode: 'C001', package: 'Starter', hourlyRate: 5000, serviceFeePct: 25, gstPct: 18 }
//     },
//     clients: {
//       'C001': { code: 'C001', name: 'Acme Pvt Ltd', billingAddress: '123 Business Rd, City', contactEmail: 'billing@acme.test' }
//     },
//     invoices: [],
//     lastSeqByDate: {} // map yyyy-mm-dd => seq
//   }

//   function getTeam() { return memory.team }
//   function getProject(code) { return memory.projects[code] || null }
//   function getClient(code) { return memory.clients[code] || null }

//   function getNextInvoiceSequence() {
//     const d = new Date()
//     const key = d.toISOString().slice(0,10)
//     memory.lastSeqByDate[key] = (memory.lastSeqByDate[key] || 0) + 1
//     return memory.lastSeqByDate[key]
//   }

//   function createInvoice(payload) {
//     const seq = getNextInvoiceSequence()
//     const dd = new Date()
//     const ddmmyy = dd.toLocaleDateString('en-GB').replace(/\//g,'')
//     const name = (payload.consultantName || 'Consultant').split(' ')[0]
//     const invoiceNumber = `${ddmmyy}_${name}_${String(seq).padStart(3,'0')}`
//     const id = `inv_${Date.now()}`
//     const row = { id, invoiceNumber, ...payload, createdAt: new Date().toISOString() }
//     memory.invoices.push(row)
//     return { ok: true, invoiceId: id, invoiceNumber }
//   }

//   async function sendInvoiceEmail({ invoiceId, toEmail }) {
//     // stub: pretend it's sent
//     logger.info({ invoiceId, toEmail }, 'stub sendInvoiceEmail')
//     return { ok: true }
//   }

//   module.exports = {
//     mode: 'stub',
//     getTeam,
//     getProject,
//     getClient,
//     createInvoice,
//     sendInvoiceEmail
//   }
// } else {
//   // Real Apps Script proxy
//   function buildUrlWithToken(action, params = {}) {
//     const url = new URL(APPS_SCRIPT_URL)
//     const p = new URLSearchParams(params)
//     p.set('action', action)
//     p.set('token', APPS_SCRIPT_TOKEN)
//     url.search = p.toString()
//     return url.toString()
//   }

//   async function get(action, params = {}) {
//     const url = buildUrlWithToken(action, params)
//     return await requestWithRetry(url, { method: 'GET' })
//   }

//   async function post(action, data = {}) {
//     const url = `${APPS_SCRIPT_URL}?token=${encodeURIComponent(APPS_SCRIPT_TOKEN)}`
//     const body = JSON.stringify({ action, data })
//     return await requestWithRetry(url, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body
//     })
//   }

//   module.exports = {
//     mode: 'remote',
//     get,
//     post
//   }
// }
// lib/appsScriptClient.js
const fetch = require('node-fetch');
const { URLSearchParams } = require('url');
const logger = require('../utils/logger');

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || '';
const APPS_SCRIPT_TOKEN = process.env.APPS_SCRIPT_TOKEN || '';
const TIMEOUT = Number(process.env.APPS_SCRIPT_TIMEOUT_MS || 10000);
const RETRIES = Number(process.env.APPS_SCRIPT_RETRIES || 2);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithTimeout(url, opts = {}, timeout = TIMEOUT) {
  const controller = new (global.AbortController || require('abort-controller'))();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function requestWithRetry(url, opts = {}, retries = RETRIES) {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await fetchWithTimeout(url, opts);
      const text = await res.text();
      let json = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch (e) {
        json = { raw: text };
      }
      if (!res.ok) {
        const err = json?.error || json?.message || `HTTP ${res.status}`;
        throw new Error(err);
      }
      return json;
    } catch (err) {
      attempt++;
      logger.warn({ attempt, err: err.message }, 'appsScript request failed');
      if (attempt > retries) throw err;
      await sleep(500 * attempt);
    }
  }
}

// ============================================================================
// STUB MODE (no APPS_SCRIPT_URL) – in-memory fake for local dev
// ============================================================================

if (!APPS_SCRIPT_URL) {
  logger.info(
    'APPS_SCRIPT_URL not set — running appsScriptClient in STUB mode (local memory).'
  );

  const memory = {
    team: [
      { id: 'tm_1', name: 'Asha Sharma', factor: 1.0, defaultMode: 'Online' },
      { id: 'tm_2', name: 'Vikram Rao', factor: 1.5, defaultMode: 'Studio' },
    ],
    projects: {
      P001: {
        code: 'P001',
        clientCode: 'C001',
        package: 'Starter',
        hourlyRate: 5000,
        serviceFeePct: 25,
        gstPct: 18,
      },
    },
    clients: {
      C001: {
        code: 'C001',
        name: 'Acme Pvt Ltd',
        billingAddress: '123 Business Rd, City',
        contactEmail: 'billing@acme.test',
      },
    },
    invoices: [],
    lastSeqByDate: {}, // map yyyy-mm-dd => seq
  };

  function getTeam() {
    return memory.team;
  }

  function getProject(code) {
    return memory.projects[code] || null;
  }

  function getClient(code) {
    return memory.clients[code] || null;
  }

  function getNextInvoiceSequence() {
    const d = new Date();
    const key = d.toISOString().slice(0, 10);
    memory.lastSeqByDate[key] = (memory.lastSeqByDate[key] || 0) + 1;
    return memory.lastSeqByDate[key];
  }

  function createInvoice(payload) {
    const seq = getNextInvoiceSequence();
    const dd = new Date();
    const ddmmyy = dd.toLocaleDateString('en-GB').replace(/\//g, '');
    const name = (payload.consultantName || 'Consultant').split(' ')[0];
    const invoiceNumber = `${ddmmyy}_${name}_${String(seq).padStart(3, '0')}`;
    const id = `inv_${Date.now()}`;
    const row = {
      id,
      invoiceNumber,
      ...payload,
      createdAt: new Date().toISOString(),
    };
    memory.invoices.push(row);
    return { ok: true, invoiceId: id, invoiceNumber };
  }

  async function sendInvoiceEmail({ invoiceId, toEmail }) {
    // stub: pretend it's sent
    logger.info({ invoiceId, toEmail }, 'stub sendInvoiceEmail');
    return { ok: true };
  }

  // ---------- NEW: AUTH STUBS ----------

  async function startLogin(email) {
    const trimmed = String(email || '').trim().toLowerCase();
    logger.info({ email: trimmed }, 'stub startLogin');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    return {
      ok: true,
      email: trimmed,
      otpType: 'login',
      isExistingUser: false,
      expiresAt,
    };
  }

  async function verifyOtp(email, otp) {
    const trimmedEmail = String(email || '').trim().toLowerCase();
    const cleanOtp = String(otp || '').trim();
    logger.info({ email: trimmedEmail, otp: cleanOtp }, 'stub verifyOtp');

    // Always accept in stub mode
    return {
      ok: true,
      email: trimmedEmail,
      needsProfile: true,
      isNew: true,
      consultant: {
        consultant_id: 'CONS_001',
        email: trimmedEmail,
        name: '',
        phone: '',
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        status: 'pending_profile',
      },
    };
  }

  async function completeProfile({ email, name, phone }) {
    const trimmedEmail = String(email || '').trim().toLowerCase();
    const trimmedName = String(name || '').trim();
    const trimmedPhone = String(phone || '').trim();
    logger.info(
      { email: trimmedEmail, name: trimmedName, phone: trimmedPhone },
      'stub completeProfile'
    );

    return {
      ok: true,
      consultant: {
        consultant_id: 'CONS_001',
        email: trimmedEmail,
        name: trimmedName,
        phone: trimmedPhone,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        status: 'active',
      },
    };
  }

  module.exports = {
    mode: 'stub',

    // existing
    getTeam,
    getProject,
    getClient,
    createInvoice,
    sendInvoiceEmail,

    // new auth helpers
    startLogin,
    verifyOtp,
    completeProfile,
  };
} else {
  // ==========================================================================
  // REMOTE MODE – real Apps Script proxy
  // ==========================================================================

  function buildUrlWithToken(action, params = {}) {
    const url = new URL(APPS_SCRIPT_URL);
    const p = new URLSearchParams(params);
    p.set('action', action);
    p.set('token', APPS_SCRIPT_TOKEN);
    url.search = p.toString();
    return url.toString();
  }

  async function get(action, params = {}) {
    const url = buildUrlWithToken(action, params);
    return await requestWithRetry(url, { method: 'GET' });
  }

  async function post(action, data = {}) {
    const url = `${APPS_SCRIPT_URL}?token=${encodeURIComponent(
      APPS_SCRIPT_TOKEN
    )}`;
    const body = JSON.stringify({ action, data });
    return await requestWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  }

  // ---------- NEW: AUTH HELPERS (proxy to Apps Script actions) ----------

  async function startLogin(email) {
    const trimmed = String(email || '').trim().toLowerCase();
    return post('startLogin', { email: trimmed, otpType: 'login' });
  }

  async function verifyOtp(email, otp) {
    const trimmedEmail = String(email || '').trim().toLowerCase();
    const cleanOtp = String(otp || '').trim();
    return post('verifyOtp', {
      email: trimmedEmail,
      otp: cleanOtp,
      otpType: 'login',
    });
  }

  async function completeProfile(payload) {
    // payload: { email, name, phone }
    const email = String(payload.email || '').trim().toLowerCase();
    const name = String(payload.name || '').trim();
    const phone = String(payload.phone || '').trim();
    return post('completeProfile', { email, name, phone });
  }

  module.exports = {
    mode: 'remote',

    // low-level
    get,
    post,

    // high-level auth helpers
    startLogin,
    verifyOtp,
    completeProfile,
  };
}
