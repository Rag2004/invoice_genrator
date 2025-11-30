// routes/dashboard.js
const express = require('express');
const router = express.Router();

const authMiddlewareModule = require('../middleware/authMiddleware');
const appsScriptClient = require('../lib/appsScriptClient');

// 🔹 Safely pick the auth middleware:
// - if module itself is a function -> use it
// - else if it has .requireAuth -> use that
// - else fallback to a no-op (for now)
const requireAuth =
  typeof authMiddlewareModule === 'function'
    ? authMiddlewareModule
    : typeof authMiddlewareModule?.requireAuth === 'function'
      ? authMiddlewareModule.requireAuth
      : (req, res, next) => {
          console.warn(
            '[WARN] authMiddleware is missing or not a function; continuing WITHOUT auth on /api/dashboard'
          );
          next();
        };

// GET /api/dashboard/summary
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const user = req.user || {};
    const consultantId =
      user.consultant_id || user.consultantId || user.id || null;

    if (!consultantId) {
      return res.status(400).json({
        ok: false,
        error: 'Missing consultant id on auth token',
      });
    }

    const result = await appsScriptClient.listInvoicesByConsultant(
      consultantId
    );

    if (!result || result.ok === false) {
      return res.status(500).json({
        ok: false,
        error: result?.error || 'Failed to fetch invoices',
      });
    }

    const invoices = result.invoices || [];

    const totalInvoices = invoices.length;

    const totalAmount = invoices.reduce((sum, inv) => {
      const val =
        Number(inv.totalAmount) ||
        Number(inv.total) ||
        Number(inv.grandTotal) ||
        0;
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    const sorted = [...invoices].sort((a, b) => {
      const aTime = new Date(a.createdAt || a.created_at || 0).getTime();
      const bTime = new Date(b.createdAt || b.created_at || 0).getTime();
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
    console.error('dashboard summary error', err);
    res.status(500).json({
      ok: false,
      error: 'Server error while loading dashboard',
    });
  }
});

module.exports = router;
