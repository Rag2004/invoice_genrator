
const fetch = require('node-fetch');
const { URLSearchParams, URL } = require('url');
const logger = require('../utils/logger');

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || '';
const APPS_SCRIPT_TOKEN = process.env.APPS_SCRIPT_TOKEN || '';
const TIMEOUT = Number(process.env.APPS_SCRIPT_TIMEOUT_MS || 20000);
const RETRIES = Number(process.env.APPS_SCRIPT_RETRIES || 2);

// ============================================================================
// VALIDATION
// ============================================================================
if (!APPS_SCRIPT_URL || !APPS_SCRIPT_TOKEN) {
  throw new Error('❌ APPS_SCRIPT_URL and APPS_SCRIPT_TOKEN must be set in .env');
}

logger.info({ url: APPS_SCRIPT_URL.substring(0, 50) }, '✅ Apps Script client initialized');

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithTimeout(url, opts = {}, timeout = TIMEOUT) {
  const startTime = Date.now();
  const AbortControllerImpl = global.AbortController || require('abort-controller');
  const controller = new AbortControllerImpl();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    const elapsed = Date.now() - startTime;
    logger.info({ elapsed, status: res.status }, 'Apps Script request completed');
    return res;
  } catch (err) {
    if (err.name === 'AbortError') {
      logger.error({ timeout }, 'Apps Script request timeout');
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
}

async function requestWithRetry(url, opts = {}, retries = RETRIES) {
  let attempt = 0;
  
  while (true) {
    try {
      logger.info({ attempt: attempt + 1 }, 'Apps Script request');
      const res = await fetchWithTimeout(url, opts);
      const text = await res.text();
      
      let json = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch (e) {
        json = { raw: text };
      }
      
      if (!res.ok) {
        const errMsg = json?.error || json?.message || `HTTP ${res.status}`;
        throw new Error(errMsg);
      }
      
      return json;
    } catch (err) {
      attempt++;
      logger.warn({ attempt, err: err.message }, 'Apps Script request failed');
      
      if (attempt > retries) {
        const finalErr = new Error(`Apps Script failed after ${attempt} attempts: ${err.message}`);
        logger.error({ attempts: attempt }, 'Apps Script exhausted retries');
        throw finalErr;
      }
      
      await sleep(500 * attempt);
    }
  }
}

// ============================================================================
// API COMMUNICATION
// ============================================================================

// function buildUrlWithToken(action, params = {}) {
//   const url = new URL(APPS_SCRIPT_URL);
//   const p = new URLSearchParams(params);
//   p.set('action', action);
//   p.set('token', APPS_SCRIPT_TOKEN);
//   url.search = p.toString();
//   return url.toString();
// }

async function get(action, params = {}) {
  const url = new URL(APPS_SCRIPT_URL);
  const p = new URLSearchParams(params);
  p.set('action', action);
  p.set('token', APPS_SCRIPT_TOKEN);
  url.search = p.toString();

  return await requestWithRetry(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${APPS_SCRIPT_TOKEN}`,
    },
  });
}


async function post(action, data = {}) {
  const body = JSON.stringify({
  action,
  token: APPS_SCRIPT_TOKEN,
  data
});


  return await requestWithRetry(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${APPS_SCRIPT_TOKEN}`,
    },
    body,
  });
}


// ============================================================================
// PROJECT / CLIENT / TEAM APIs
// ============================================================================

async function getProject(code) {
  return get('getProject', { code });
}

async function getClient(code) {
  return get('getClient', { code });
}

async function getTeam() {
  const result = await get('getTeam', {});
  
  if (result && Array.isArray(result)) {
    return {
      team: result.map(member => ({
        id: member.id || member.Id || '',
        name: member.name || member.Name || '',
        baseFactor: Number(member.baseFactor || member.BaseFactor || member.factor || 1),
        defaultMode: member.defaultMode || member.mode || 'Online',
      }))
    };
  }
  
  if (result && result.team) {
    return { team: result.team };
  }
  
  return { team: [] };
}

async function getInvoiceSetupAction(code) {
  return post('getInvoiceSetup', { code });
}

// ============================================================================
// AUTH APIs
// ============================================================================

async function startLogin(email) {
  const trimmed = String(email || '').trim().toLowerCase();

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // 🔥 Respond immediately
  setImmediate(async () => {
    try {
      await storeOtpFromBackend({
        email: trimmed,
        otp,
        otp_type: 'login'
      });

      logger.info({ email: trimmed }, 'OTP stored successfully');
    } catch (err) {
      logger.error({ err: err.message, email: trimmed }, 'OTP storage failed');
    }
  });

  // ✅ frontend gets response instantly
  return { ok: true };
}



async function verifyOtp(email, otp) {
  return post('verifyOTP', {
    email: String(email).trim().toLowerCase(),
    otp: String(otp).trim()
  });
}


async function completeProfile(payload) {
  const email = String(payload.email || '').trim().toLowerCase();
  const name = String(payload.name || '').trim();
  const phone = String(payload.phone || '').trim();
  return post('completeProfile', { email, name, phone });
}

async function storeOtpFromBackend(data) {
  return post('storeOTP', {
    email: data.email,
    otp: data.otp,
    otp_type: data.otp_type || 'login'
  });
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

// ============================================================================
// INVOICE APIs (UNIFIED - DRAFT & FINAL) ✅ FIXED
// ============================================================================

// CREATE DRAFT
async function createDraft(data) {
  return post('createDraft', data);
}

// UPDATE DRAFT (or any invoice with status=DRAFT)
async function updateDraft(invoiceId, data) {
  return post('updateDraft', { invoiceId, ...data });
}

// GET SINGLE DRAFT
async function getDraft(invoiceId) {
  return get('getDraft', { invoiceId });
}

// ✅ NEW: Get invoice by ID (works for DRAFT or FINAL)
async function getInvoiceById(invoiceId) {
  if (!invoiceId) {
    return { ok: false, error: 'invoiceId required' };
  }
  
  try {
    // Try getting as draft first
    const result = await getDraft(invoiceId);
    
    if (result?.ok) {
      return { ok: true, invoice: result.invoice };
    }
    
    // If not found as draft, try as final invoice
    const finalResult = await get('getInvoice', { invoiceId });
    
    if (finalResult?.ok) {
      return { ok: true, invoice: finalResult.invoice };
    }
    
    return { ok: false, error: 'Invoice not found' };
  } catch (err) {
    logger.error({ err: err.message, invoiceId }, 'getInvoiceById failed');
    return { ok: false, error: err.message };
  }
}

// LIST ALL DRAFTS FOR CONSULTANT
async function listDraftsByConsultant(consultantId) {
  if (!consultantId) {
    logger.warn('listDraftsByConsultant called without consultantId');
    return { ok: false, error: 'consultantId required', drafts: [] };
  }
  
  try {
    const result = await get('getAllDrafts', { consultantId });
    
    if (!result) {
      return { ok: false, error: 'No response', drafts: [] };
    }
    
    if (result.ok === true && Array.isArray(result.drafts)) {
      return result;
    }
    
    if (Array.isArray(result)) {
      return { ok: true, drafts: result };
    }
    
    return { ok: true, drafts: [] };
  } catch (err) {
    logger.error({ err: err.message, consultantId }, 'listDraftsByConsultant failed');
    return { ok: false, error: err.message, drafts: [] };
  }
}

// ALIAS for compatibility
// async function getAllDrafts(params) {
//   const consultantId = params?.consultantId || params?.consultant_id || '';
//   return listDraftsByConsultant(consultantId);
// }
// async function listDraftsByConsultant(consultantId) {
//   if (!consultantId) {
//     logger.warn('listDraftsByConsultant called without consultantId');
//     return { ok: false, error: 'consultantId required', drafts: [] };
//   }
  
//   try {
//     const result = await get('getAllDrafts', { consultantId });
    
//     if (!result) {
//       return { ok: false, error: 'No response', drafts: [] };
//     }
    
//     if (result.ok === true && Array.isArray(result.drafts)) {
//       return result;
//     }
    
//     if (Array.isArray(result)) {
//       return { ok: true, drafts: result };
//     }
    
//     return { ok: true, drafts: [] };
//   } catch (err) {
//     logger.error({ err: err.message, consultantId }, 'listDraftsByConsultant failed');
//     return { ok: false, error: err.message, drafts: [] };
//   }
// }
async function getAllDrafts(params) {
  const consultantId = params?.consultantId || params?.consultant_id || '';
  return listDraftsByConsultant(consultantId);
}
// FINALIZE INVOICE (DRAFT → FINAL, generates invoice number)
async function saveInvoice(data) {
  logger.info({ 
    invoiceId: data.invoiceId,
    consultantId: data.consultantId,
    status: 'FINAL' 
  }, 'Finalizing invoice');
  
  return post('saveInvoice', data);
}

// LIST ALL INVOICES FOR CONSULTANT (BOTH DRAFT & FINAL)
async function listInvoicesByConsultant(consultantId) {
  if (!consultantId) {
    logger.warn('listInvoicesByConsultant called without consultantId');
    return { ok: false, error: 'consultantId required', invoices: [] };
  }
  
  try {
    const result = await post('listInvoicesByConsultant', { consultantId });
    
    if (!result) {
      return { ok: false, error: 'No response', invoices: [] };
    }
    
    if (result.ok === true && Array.isArray(result.invoices)) {
      logger.info({ count: result.invoices.length }, 'Invoices fetched');
      return result;
    }
    
    if (result.ok === false) {
      logger.error({ error: result.error }, 'Apps Script error');
      return { ok: false, error: result.error, invoices: [] };
    }
    
    if (Array.isArray(result)) {
      return { ok: true, invoices: result };
    }
    
    return { ok: true, invoices: [] };
  } catch (err) {
    logger.error({ err: err.message, consultantId }, 'listInvoicesByConsultant failed');
    return { ok: false, error: err.message, invoices: [] };
  }
}

// DASHBOARD STATS
async function getDashboard(consultantId) {
  if (!consultantId) {
    return { ok: false, error: 'consultantId required' };
  }
  
  return post('getDashboard', { consultantId });
}

// SEND INVOICE EMAIL
async function sendInvoiceEmail(data) {
  return post('sendInvoiceEmail', data);
}

// ============================================================================
// EXPORTS ✅ COMPLETE
// ============================================================================

module.exports = {
  mode: 'remote',
  
  // Core
  get,
  post,
  
  // Project & Client
  getProject,
  getClient,
  getTeam,
  getInvoiceSetupAction,
  
  // Auth
  startLogin,
  verifyOtp,
  completeProfile,
  storeOtpFromBackend,
  verifyOtpFromBackend,
  getConsultantByEmailAction,
  createConsultantAction,
  updateConsultantLastLoginAction,
  updateConsultantProfileAction,
  
  // Invoices ✅ UPDATED
  createDraft,
  updateDraft,
  getDraft,
  getInvoiceById,              // ✅ NEW - Get any invoice (draft or final)
  getAllDrafts,                // Backward compat alias
  listDraftsByConsultant,      // ✅ NEW - Clearer name
  saveInvoice,
  listInvoicesByConsultant,
  getDashboard,
  sendInvoiceEmail,
};