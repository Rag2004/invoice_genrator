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
    consultants: new Map(), // email -> consultant object
    otpSessions: new Map(), // email -> { otp, expires_at, attempts }
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
      isExistingUser: memory.consultants.has(trimmed),
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

    const consultant = {
      consultant_id: 'CONS_001',
      email: trimmedEmail,
      name: trimmedName,
      phone: trimmedPhone,
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
      status: 'active',
    };

    memory.consultants.set(trimmedEmail, consultant);

    return {
      ok: true,
      consultant,
    };
  }

  // NEW: Backend-specific auth functions (matches your Apps Script actions)
  
  async function storeOtpFromBackend(data) {
    const { email, otp, otp_type, expires_at } = data;
    const trimmed = String(email || '').trim().toLowerCase();

    memory.otpSessions.set(trimmed, {
      otp,
      otp_type,
      expires_at,
      attempts: 0,
      created_at: new Date().toISOString(),
    });

    logger.info(
      { email: trimmed, otp, otp_type },
      'stub storeOtpFromBackend'
    );

    return {
      ok: true,
      email: trimmed,
      otp_type: otp_type || 'login',
    };
  }

  async function verifyOtpFromBackend(data) {
    const { email, otp } = data;
    const trimmed = String(email || '').trim().toLowerCase();
    const cleanOtp = String(otp || '').trim();

    const session = memory.otpSessions.get(trimmed);

    if (!session) {
      logger.warn({ email: trimmed }, 'stub: No OTP session found');
      return { ok: false, error: 'No OTP found for this email' };
    }

    if (session.otp !== cleanOtp) {
      logger.warn({ email: trimmed }, 'stub: Invalid OTP');
      return { ok: false, error: 'Invalid OTP' };
    }

    // Check expiry
    const now = new Date();
    const expiresAt = new Date(session.expires_at);
    if (now > expiresAt) {
      logger.warn({ email: trimmed }, 'stub: OTP expired');
      memory.otpSessions.delete(trimmed);
      return { ok: false, error: 'OTP has expired' };
    }

    // Valid - remove session
    memory.otpSessions.delete(trimmed);
    logger.info({ email: trimmed }, 'stub verifyOtpFromBackend: success');

    return {
      ok: true,
      email: trimmed,
    };
  }

  async function getConsultantByEmailAction(data) {
    const trimmed = String(data.email || '').trim().toLowerCase();
    const consultant = memory.consultants.get(trimmed);

    if (!consultant) {
      logger.info({ email: trimmed }, 'stub: Consultant not found');
      return { ok: false, error: 'Consultant not found' };
    }

    logger.info({ email: trimmed }, 'stub getConsultantByEmailAction');
    return { ok: true, consultant };
  }

  async function createConsultantAction(data) {
    const { email, name, phone } = data;
    const trimmed = String(email || '').trim().toLowerCase();

    const consultant = {
      consultant_id: `CONS_${Date.now()}`,
      email: trimmed,
      name: name || '',
      phone: phone || '',
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
      status: name ? 'active' : 'pending_profile',
    };

    memory.consultants.set(trimmed, consultant);
    logger.info({ email: trimmed }, 'stub createConsultantAction');

    return { ok: true, consultant };
  }

  async function updateConsultantLastLoginAction(data) {
    const trimmed = String(data.email || '').trim().toLowerCase();
    const consultant = memory.consultants.get(trimmed);

    if (!consultant) {
      logger.warn({ email: trimmed }, 'stub: Consultant not found for last login update');
      return { ok: false, error: 'Consultant not found' };
    }

    consultant.last_login = new Date().toISOString();
    memory.consultants.set(trimmed, consultant);

    logger.info({ email: trimmed }, 'stub updateConsultantLastLoginAction');
    return { ok: true, consultant };
  }

  async function updateConsultantProfileAction(data) {
    const { email, name, phone } = data;
    const trimmed = String(email || '').trim().toLowerCase();
    let consultant = memory.consultants.get(trimmed);

    if (!consultant) {
      // Create if doesn't exist
      consultant = {
        consultant_id: `CONS_${Date.now()}`,
        email: trimmed,
        name: '',
        phone: '',
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        status: 'pending_profile',
      };
    }

    consultant.name = name || consultant.name;
    consultant.phone = phone || consultant.phone;
    consultant.status = 'active';
    consultant.last_login = new Date().toISOString();

    memory.consultants.set(trimmed, consultant);
    logger.info({ email: trimmed }, 'stub updateConsultantProfileAction');

    return { ok: true, consultant };
  }

  module.exports = {
    mode: 'stub',

    // existing
    getTeam,
    getProject,
    getClient,
    createInvoice,
    sendInvoiceEmail,

    // auth helpers (old flow)
    startLogin,
    verifyOtp,
    completeProfile,

    // auth helpers (backend flow - matches Apps Script actions)
    storeOtpFromBackend,
    verifyOtpFromBackend,
    getConsultantByEmailAction,
    createConsultantAction,
    updateConsultantLastLoginAction,
    updateConsultantProfileAction,
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

  // ---------- AUTH HELPERS (old flow) ----------

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
    const email = String(payload.email || '').trim().toLowerCase();
    const name = String(payload.name || '').trim();
    const phone = String(payload.phone || '').trim();
    return post('completeProfile', { email, name, phone });
  }

  // ---------- AUTH HELPERS (backend flow - matches Apps Script actions) ----------

  async function storeOtpFromBackend(data) {
    return post('storeOTP', data);
  }

  async function verifyOtpFromBackend(data) {
    return post('verifyOTP', data);
  }

  async function getConsultantByEmailAction(data) {
    return post('getConsultantByEmail', data);
  }

  async function createConsultantAction(data) {
    return post('createConsultant', data);
  }

  async function updateConsultantLastLoginAction(data) {
    return post('updateConsultantLastLogin', data);
  }

  async function updateConsultantProfileAction(data) {
    return post('updateConsultantProfile', data);
  }

  module.exports = {
    mode: 'remote',

    // low-level
    get,
    post,

    // auth helpers (old flow)
    startLogin,
    verifyOtp,
    completeProfile,

    // auth helpers (backend flow)
    storeOtpFromBackend,
    verifyOtpFromBackend,
    getConsultantByEmailAction,
    createConsultantAction,
    updateConsultantLastLoginAction,
    updateConsultantProfileAction,
  };
}