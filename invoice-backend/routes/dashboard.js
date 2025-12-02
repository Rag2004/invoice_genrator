
// // routes/dashboard.js
// const express = require('express');
// const router = express.Router();

// const authMiddleware = require('../middleware/authMiddleware');
// const appsScriptClient = require('../lib/appsScriptClient');

// /**
//  * GET /api/dashboard/summary
//  * - Uses req.user.* to find consultant id or accepts ?consultantId param
//  */
// router.get('/summary', authMiddleware, async (req, res) => {
//   try {
//     const user = req.user || {};
//     const tokenConsultantId = user.consultant_id || user.consultantId || user.consultant || user.sub || user.id || null;
//     const queryConsultantId = req.query.consultantId || req.query.consultant_id || null;

//     const consultantId = (queryConsultantId && String(queryConsultantId).trim()) || (tokenConsultantId && String(tokenConsultantId).trim());

//     if (!consultantId) {
//       return res.status(400).json({ ok: false, error: 'Missing consultantId in token or query param (consultantId)' });
//     }

//     // appsScriptClient.listInvoicesByConsultant returns { ok: true, invoices: [...] } or throws
//     const result = await appsScriptClient.listInvoicesByConsultant(consultantId);

//     if (!result || result.ok === false) {
//       return res.status(500).json({ ok: false, error: result?.error || 'Failed to fetch invoices from Apps Script' });
//     }

//     const invoices = result.invoices || [];

//     // total invoices (final/paid) vs drafts - try to be defensive about fields
//     const totalInvoices = invoices.filter(inv => {
//       const status = String(inv.status || inv.state || '').toLowerCase();
//       return status === 'final' || status === 'paid' || status === 'completed';
//     }).length;

//     const totalAmount = invoices.reduce((sum, inv) => {
//       const val = Number(inv.totalAmount || inv.total || inv.netEarnings || inv.amount || inv.subtotal || 0);
//       return sum + (isNaN(val) ? 0 : val);
//     }, 0);

//     const sorted = invoices.slice().sort((a, b) => {
//       const aTime = new Date(a.createdAt || a.created_at || a.invoiceDate || a.createdAtISO || 0).getTime();
//       const bTime = new Date(b.createdAt || b.created_at || b.invoiceDate || b.createdAtISO || 0).getTime();
//       return bTime - aTime;
//     });

//     const lastInvoices = sorted.slice(0, 5);

//     return res.json({
//       ok: true,
//       summary: {
//         consultantId,
//         totalInvoices,
//         totalAmount,
//         lastInvoices,
//       },
//     });
//   } catch (err) {
//     console.error('dashboard summary error', err);
//     return res.status(500).json({
//       ok: false,
//       error: 'Server error while loading dashboard summary',
//       message: err && err.message,
//     });
//   }
// });

// module.exports = router;
// routes/dashboard.js
const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const appsScriptClient = require('../lib/appsScriptClient');

/**
 * GET /api/dashboard/summary
 * - Uses req.user.* to find consultant id or accepts ?consultantId param
 * - Prefer appsScriptClient.getDashboard if available (remote/GAS provides it),
 *   otherwise fallback to previous listInvoicesByConsultant + server-side summary.
 */
router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const user = req.user || {};
    const tokenConsultantId = user.consultant_id || user.consultantId || user.consultant || user.sub || user.id || null;
    const queryConsultantId = req.query.consultantId || req.query.consultant_id || null;

    const consultantId = (queryConsultantId && String(queryConsultantId).trim()) || (tokenConsultantId && String(tokenConsultantId).trim());

    if (!consultantId) {
      return res.status(400).json({ ok: false, error: 'Missing consultantId in token or query param (consultantId)' });
    }

    // If appsScriptClient has getDashboard, prefer it (Apps Script may compute richer summary)
    if (typeof appsScriptClient.getDashboard === 'function') {
      try {
        const dash = await appsScriptClient.getDashboard(consultantId);
        if (dash && dash.ok) {
          // normalize fields to what frontend expects
          return res.json({
            ok: true,
            summary: {
              consultantId: dash.consultantId || dash.consultant_id || consultantId,
              totalInvoices: dash.totalInvoices || dash.total_invoices || dash.totalInvoicesCount || 0,
              totalAmount: dash.totalRevenue || dash.total_amount || dash.totalAmount || 0,
              lastInvoices: dash.recentInvoices || dash.recentInvoices || dash.lastInvoices || []
            }
          });
        }
        // if upstream returned a failure, fall back to invoices listing below
        console.warn('appsScriptClient.getDashboard returned not-ok, falling back:', dash);
      } catch (e) {
        console.warn('appsScriptClient.getDashboard failed, falling back to listInvoicesByConsultant:', e && e.stack ? e.stack : e);
      }
    }

    // Fallback: fetch invoices and compute summary server-side (existing behaviour)
    const result = await appsScriptClient.listInvoicesByConsultant(consultantId);
    if (!result || result.ok === false) {
      return res.status(500).json({ ok: false, error: result?.error || 'Failed to fetch invoices from Apps Script' });
    }

    const invoices = result.invoices || [];

    const totalInvoices = invoices.filter(inv => {
      const status = String(inv.status || inv.state || '').toLowerCase();
      return status === 'final' || status === 'paid' || status === 'completed';
    }).length;

    const totalAmount = invoices.reduce((sum, inv) => {
      const val = Number(inv.totalAmount || inv.total || inv.amount || inv.subtotal || 0);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    const sorted = invoices.slice().sort((a, b) => {
      const aTime = new Date(a.createdAt || a.created_at || a.invoiceDate || a.createdAtISO || 0).getTime();
      const bTime = new Date(b.createdAt || b.created_at || b.invoiceDate || b.createdAtISO || 0).getTime();
      return bTime - aTime;
    });

    const lastInvoices = sorted.slice(0, 5);

    return res.json({
      ok: true,
      summary: {
        consultantId,
        totalInvoices,
        totalAmount,
        lastInvoices,
      },
    });
  } catch (err) {
    console.error('dashboard summary error', err && err.stack ? err.stack : err);
    return res.status(500).json({
      ok: false,
      error: 'Server error while loading dashboard summary',
      message: err && err.message,
    });
  }
});

module.exports = router;
