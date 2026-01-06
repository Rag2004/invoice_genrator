// src/api/api.js - FIXED VERSION
const API_BASE =
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:4000/api';

const DEFAULT_TIMEOUT = 20000;
// const logger = require('../utils/logger');


// ============================================================================
// HELPER: Get Consultant ID from localStorage
// ============================================================================
function getConsultantId() {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user?.consultantId || user?.consultant_id || user?.id || null;
    }
  } catch (e) {
    console.error('Failed to get consultantId:', e);
  }
  return null;
}

// ============================================================================
// GENERIC FETCH HELPERS
// ============================================================================

async function apiGet(path, requireAuth = false, timeout = DEFAULT_TIMEOUT) {
  const headers = {};
  if (requireAuth) {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('No authentication token found');
    headers['Authorization'] = `Bearer ${token}`;
    
    // ✅ CRITICAL: Always send consultant ID in headers
    const consultantId = getConsultantId();
    if (consultantId) {
      headers['X-Consultant-Id'] = consultantId;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const resp = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const text = await resp.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      console.error('JSON Parse Error:', e, 'Response:', text);
      throw new Error(text || `GET ${path} failed with ${resp.status}`);
    }

    if (!resp.ok) {
      throw new Error(data.message || data.error || `GET ${path} failed with ${resp.status}`);
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Request timeout: ${path} took longer than ${timeout}ms`);
    }
    throw err;
  }
}

async function apiPost(path, body = {}, requireAuth = false, timeout = DEFAULT_TIMEOUT) {
  const headers = { 'Content-Type': 'application/json' };

  if (requireAuth) {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('No authentication token found');
    headers['Authorization'] = `Bearer ${token}`;
    
    // ✅ CRITICAL: Always send consultant ID in headers
    const consultantId = getConsultantId();
    if (consultantId) {
      headers['X-Consultant-Id'] = consultantId;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const resp = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(body || {}),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const text = await resp.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      console.error('JSON Parse Error:', e, 'Response:', text);
      throw new Error(text || `POST ${path} failed with ${resp.status}`);
    }

    if (!resp.ok) {
      throw new Error(data.message || data.error || `POST ${path} failed with ${resp.status}`);
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Request timeout: ${path} took longer than ${timeout}ms`);
    }
    throw err;
  }
}

// ============================================================================
// AUTH APIs
// ============================================================================

export async function startLogin(email) {
  if (!email) throw new Error('Email is required');
  return apiPost('/auth/start-login', { email }, false, 25000);
}

export async function verifyOtp({ email, otp }) {
  if (!email || !otp) throw new Error('Email and OTP are required');
  return apiPost('/auth/verify-otp', { email, otp }, false, 20000);
}

export async function getProfile() {
  return apiGet('/auth/me', true, 10000);
}

export async function updateProfile(profile) {
  return apiPost('/auth/complete-profile', profile, true, 15000);
}

export async function logout() {
  return apiPost('/auth/logout', {}, true);
}

// ============================================================================
// PROJECT / CLIENT / TEAM APIs
// ============================================================================

export async function getTeam() {
  try {
    const response = await apiGet('/team', true);
    
    const teamList = Array.isArray(response) ? response : (response?.team || []);
    
    return {
      team: teamList.map((member) => ({
        id: member.id || member.Id || '',
        name: member.name || member.Name || '',
        baseFactor: Number(member.baseFactor || member.factor || 1),
        defaultMode: member.defaultMode || member.default_mode || 'Online',
        rate: Number(member.rate || member.Hourly_rate || member.hourlyRate || 0),
      }))
    };
  } catch (err) {
    console.error('Error fetching team:', err);
    return { team: [] };
  }
}

export async function getProject(projectCode) {
  if (!projectCode) throw new Error('Project code is required');
  return apiGet(`/projects/${encodeURIComponent(projectCode)}`, true);
}

export async function getClient(clientCode) {
  if (!clientCode) throw new Error('Client code is required');
  return apiGet(`/clients/${encodeURIComponent(clientCode)}`, true);
}

// ============================================================================
// INVOICE APIs - ✅ FIXED WITH CONSULTANT ID
// ============================================================================

export async function createDraft(data) {
  return apiPost('/invoices/draft', data, true);
}

export async function updateDraft(invoiceId, data) {
  if (!invoiceId) throw new Error('Invoice ID is required');
  return apiPost(`/invoices/draft/${encodeURIComponent(invoiceId)}`, data, true, 20000);
}

export async function listDrafts(consultantId) {
  if (!consultantId) {
    consultantId = getConsultantId();
    if (!consultantId) {
      console.warn('⚠️ consultantId missing in listDrafts');
      return { ok: false, drafts: [], error: 'consultantId is required' };
    }
  }
  
  try {
    const result = await apiGet(`/drafts/consultant/${encodeURIComponent(consultantId)}`, true, 15000);
    
    if (result && result.ok && Array.isArray(result.drafts)) {
      return result;
    }
    
    if (result && Array.isArray(result.drafts)) {
      return { ok: true, drafts: result.drafts };
    }
    
    if (Array.isArray(result)) {
      return { ok: true, drafts: result };
    }
    
    console.warn('Unexpected drafts response format:', result);
    return { ok: true, drafts: [] };
    
  } catch (err) {
    console.error('Error listing drafts:', err);
    return { ok: false, drafts: [], error: err.message };
  }
}

export async function getInvoice(invoiceId) {
  if (!invoiceId) {
    throw new Error('Invoice ID is required');
  }

  const res = await apiGet(`/invoices/${encodeURIComponent(invoiceId)}`, true);

  // Normalize response shape
  if (res?.ok && res.invoice) return res;
  if (res?.invoice) return { ok: true, invoice: res.invoice };

  return res;
}
// export async function createFinalInvoice(snapshot) {
//   if (!snapshot) {
//     throw new Error('Invoice snapshot is required');
//   }

//   return apiPost('/invoices/create-final', {
//     snapshot,
//   }, true, 30000);
// }



export async function finalizeInvoice(data) {
  return apiPost('/invoices/finalize', data, true, 30000);
}

// ✅ FIXED: Now includes consultantId automatically
// In api.js - Update this function
export async function listInvoices(limit = 50, consultantId = null) {
  const safeLimit = Math.min(limit, 100);
  
  // If not provided, try to get from localStorage
  if (!consultantId) {
    consultantId = getConsultantId();
  }
  
  if (!consultantId) {
    console.error('❌ Missing consultantId in listInvoices');
    return { ok: false, invoices: [], error: 'consultantId required' };
  }
  
  console.log('📋 Fetching invoices for consultant:', consultantId);
  
  try {
    const result = await apiGet(
      `/invoices?limit=${safeLimit}&consultantId=${encodeURIComponent(consultantId)}`, 
      true, 
      15000
    );
    
    console.log('✅ Invoices API response:', result);
    if (result?.ok && Array.isArray(result.invoices)) {
  return result;
}

if (Array.isArray(result)) {
  return { ok: true, invoices: result };
}

if (Array.isArray(result?.invoices)) {
  return { ok: true, invoices: result.invoices };
}

return { ok: true, invoices: [] };

    
  } catch (err) {
    console.error('❌ Error listing invoices:', err);
    return { ok: false, invoices: [], error: err.message };
  }
}

// export async function getInvoiceById(invoiceId) {
//   if (!invoiceId) {
//     throw new Error('Invoice ID is required');
//   }

//   return apiGet(`/invoices/${encodeURIComponent(invoiceId)}`, true);
// }



export async function sendInvoiceEmail(data) {
  return apiPost('/invoices/send-email', data, true);
}

export async function shareInvoice({ 
  toEmail, 
  invoiceId, 
  html,
  projectCode,
  consultantName,
  total,
  subtotal,
  gst 
}) {
  if (!toEmail) {
    throw new Error('Recipient email is required');
  }
  if (!html) {
    throw new Error('Invoice HTML is required');
  }

  console.log('📤 Sending invoice:', {
    toEmail,
    invoiceId: invoiceId || 'DRAFT',
    htmlLength: html.length,
    projectCode
  });

  try {
    const result = await apiPost('/invoices/share', {
      toEmail,
      html,
      invoiceId: invoiceId || 'DRAFT',
      projectCode,
      consultantName,
      total,
      subtotal,
      gst,
    }, true, 30000);

    console.log('✅ Share API response:', result);
    return result;
  } catch (err) {
    console.error('❌ Share API error:', err);
    throw err;
  }
}

// ============================================================================
// DASHBOARD APIs - ✅ FIXED
// ============================================================================

export async function getDashboardSummary(consultantId) {
  if (!consultantId) {
    consultantId = getConsultantId();
    if (!consultantId) {
      console.warn('⚠️ consultantId missing in getDashboardSummary');
      return {
        ok: false,
        error: 'consultantId is required',
        totalInvoices: 0,
        totalRevenue: 0,
        pendingDrafts: 0,
        paidInvoices: 0,
        recentInvoices: []
      };
    }
  }
  
  try {
    return await apiGet(`/dashboard/summary?consultantId=${encodeURIComponent(consultantId)}`, true, 15000);
  } catch (err) {
    console.error('Error fetching dashboard summary:', err);
    return {
      ok: false,
      error: err.message,
      totalInvoices: 0,
      totalRevenue: 0,
      pendingDrafts: 0,
      paidInvoices: 0,
      recentInvoices: []
    };
  }
}

export async function getDashboardData(consultantId) {
  if (!consultantId) {
    consultantId = getConsultantId();
    if (!consultantId) {
      console.warn('⚠️ consultantId missing in getDashboardData');
      return {
        summary: {
          totalInvoices: 0,
          totalRevenue: 0,
          pendingDrafts: 0,
          paidInvoices: 0,
          recentInvoices: []
        },
        recentInvoices: { ok: true, invoices: [] },
        errors: {
          summary: 'consultantId is required',
          invoices: null,
        }
      };
    }
  }
  
  try {
    const [summary, recentInvoices] = await Promise.allSettled([
      getDashboardSummary(consultantId),
      listInvoices(10, consultantId),
    ]);

    return {
      summary: summary.status === 'fulfilled' ? summary.value : {
        totalInvoices: 0,
        totalRevenue: 0,
        pendingDrafts: 0,
        paidInvoices: 0,
        recentInvoices: []
      },
      recentInvoices: recentInvoices.status === 'fulfilled' ? recentInvoices.value : { 
        ok: true, 
        invoices: [] 
      },
      errors: {
        summary: summary.status === 'rejected' ? summary.reason?.message : null,
        invoices: recentInvoices.status === 'rejected' ? recentInvoices.reason?.message : null,
      }
    };
  } catch (err) {
    console.error('Dashboard data fetch error:', err);
    return {
      summary: {
        totalInvoices: 0,
        totalRevenue: 0,
        pendingDrafts: 0,
        paidInvoices: 0,
        recentInvoices: []
      },
      recentInvoices: { ok: true, invoices: [] },
      errors: {
        summary: err.message,
        invoices: err.message,
      }
    };
  }
}

export async function getInvoicesData(consultantId, limit = 50) {
  if (!consultantId) {
    consultantId = getConsultantId();
    if (!consultantId) {
      console.warn('⚠️ consultantId missing in getInvoicesData');
      return {
        final: { ok: true, invoices: [] },
        drafts: { ok: true, drafts: [] },
        errors: {
          final: 'consultantId is required',
          drafts: 'consultantId is required',
        }
      };
    }
  }
  
  try {
    const [finalInvoices, drafts] = await Promise.allSettled([
      listInvoices(limit, consultantId),
      listDrafts(consultantId),
    ]);

    return {
      final: finalInvoices.status === 'fulfilled' && finalInvoices.value 
        ? finalInvoices.value 
        : { ok: true, invoices: [] },
      drafts: drafts.status === 'fulfilled' && drafts.value
        ? drafts.value 
        : { ok: true, drafts: [] },
      errors: {
        final: finalInvoices.status === 'rejected' ? finalInvoices.reason?.message : null,
        drafts: drafts.status === 'rejected' ? drafts.reason?.message : null,
      }
    };
  } catch (err) {
    console.error('Invoices data fetch error:', err);
    return {
      final: { ok: true, invoices: [] },
      drafts: { ok: true, drafts: [] },
      errors: {
        final: err.message,
        drafts: err.message,
      }
    };
  }
}