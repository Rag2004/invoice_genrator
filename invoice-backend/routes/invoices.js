
// const express = require('express');
// const router = express.Router();
// const apps = require('../lib/appsScriptClient');
// const logger = require('../utils/logger');

// // Simple GET for debugging – optional but handy
// router.get('/', (req, res) => {
//   return res.json({ ok: true, message: 'Invoices router is mounted' });
// });

// /**
//  * POST /api/invoices
//  * Creates or updates an invoice (DRAFT or FINAL)
//  * Body comes from frontend App.jsx handleSaveClick
//  */
// router.post('/', async (req, res) => {
//   const inv = req.body || {};
//   const isFinal = !!inv.finalize;

//   // -------- Validation --------
//   // Always require projectCode – Apps Script also expects this.
//   if (!inv.projectCode) {
//     return res.status(400).json({ error: 'projectCode is required' });
//   }

//   // Only enforce strict validation for FINAL invoices
//   if (isFinal || inv.status === 'FINAL') {
//     if (!inv.clientCode) {
//       return res.status(400).json({ error: 'clientCode is required for FINAL' });
//     }
//     if (!inv.consultantName) {
//       return res.status(400).json({ error: 'consultantName is required for FINAL' });
//     }
//     if (!Array.isArray(inv.items) || inv.items.length === 0) {
//       return res.status(400).json({ error: 'items are required for FINAL' });
//     }
//   }

//   // -------- Map frontend to Apps Script payload --------
//   const payload = {
//     invoiceId: inv.invoiceId || null,

//     projectCode: inv.projectCode,
//     clientCode: inv.clientCode,
//     consultantId: inv.consultantId,
//     consultantName: inv.consultantName,
//     billingAddress: inv.billingAddress,
//     invoiceDate: inv.invoiceDate || inv.date || null,

//     subtotal: inv.subtotal,
//     gst: inv.gst || 0,
//     serviceFeePct: inv.serviceFeePct,
//     serviceFee: inv.serviceFee,
//     netEarnings: inv.netEarnings,

//     items: inv.items || [],
//     notes: inv.notes || '',

//     finalize: isFinal,
//     status: isFinal ? 'FINAL' : (inv.status || 'DRAFT'),
//   };

//   console.log('📤 Payload sent to Apps Script:', payload);

//   try {
//     let result;

//     if (apps.mode === 'stub') {
//       // In stub mode, use in-memory implementation if available
//       if (typeof apps.saveInvoice === 'function') {
//         result = apps.saveInvoice(payload);
//       } else if (typeof apps.createInvoice === 'function') {
//         result = apps.createInvoice(payload);
//       } else {
//         throw new Error('Stub mode: saveInvoice/createInvoice not implemented');
//       }
//     } else {
//       // LIVE: call actual Apps Script web app
//       result = await apps.post('saveInvoice', payload);
//     }

//     console.log('✅ Apps Script result:', result);
//     return res.json(result);
//   } catch (err) {
//     logger.error(err);
//     return res
//       .status(502)
//       .json({ error: err.message || 'save invoice failed' });
//   }
// });

// /**
//  * POST /api/invoices/send
//  * Body: { invoiceId, toEmail }
//  */
// router.post('/send', async (req, res) => {
//   const { invoiceId, toEmail } = req.body || {};
//   if (!toEmail) {
//     return res.status(400).json({ error: 'toEmail is required' });
//   }

//   try {
//     let r;
//     if (apps.mode === 'stub') {
//       r = await apps.sendInvoiceEmail({ invoiceId, toEmail });
//     } else {
//       r = await apps.post('sendInvoiceEmail', { invoiceId, toEmail });
//     }
//     return res.json(r);
//   } catch (err) {
//     logger.error(err);
//     res.status(502).json({ error: 'send failed' });
//   }
// });

// module.exports = router;

// routes/invoices.js
const express = require('express');
const router = express.Router();
const apps = require('../lib/appsScriptClient');
const logger = require('../utils/logger');

/**
 * GET /api/invoices
 * Simple debug route to confirm router is mounted
 */
router.get('/', (req, res) => {
  return res.json({ ok: true, message: 'Invoices router is mounted', mode: apps.mode });
});

/**
 * GET /api/invoices/:id
 * Load a single invoice (draft or final) by invoiceId
 */
router.get('/:id', async (req, res) => {
  const invoiceId = req.params.id;
  if (!invoiceId) {
    return res.status(400).json({ error: 'invoiceId is required' });
  }

  try {
    let result;

    if (apps.mode === 'stub') {
      // Stub mode doesn't yet implement loading by ID
      return res.status(501).json({ error: 'getInvoice not implemented in stub mode' });
    } else {
      // Calls Apps Script GET ?action=getInvoice&invoiceId=...
      result = await apps.get('getInvoice', { invoiceId });
    }

    if (!result) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    return res.json(result);
  } catch (err) {
    logger.error(err);
    return res.status(502).json({ error: err.message || 'get invoice failed' });
  }
});

/**
 * POST /api/invoices
 * Create or update an invoice (DRAFT or FINAL)
 * Body comes from frontend App.jsx handleSaveClick
 */
router.post('/', async (req, res) => {
  const inv = req.body || {};
  const isFinal = !!inv.finalize;

  // -------- Validation --------
  // Always require projectCode – basic sanity
  if (!inv.projectCode) {
    return res.status(400).json({ error: 'projectCode is required' });
  }

  // Only enforce strict validation for FINAL invoices
  if (isFinal || inv.status === 'FINAL') {
    if (!inv.clientCode) {
      return res.status(400).json({ error: 'clientCode is required for FINAL' });
    }
    if (!inv.consultantName) {
      return res.status(400).json({ error: 'consultantName is required for FINAL' });
    }
    if (!Array.isArray(inv.items) || inv.items.length === 0) {
      return res.status(400).json({ error: 'items are required for FINAL' });
    }
  }

  // -------- Map frontend body to Apps Script payload --------
  const payload = {
    invoiceId: inv.invoiceId || null,

    projectCode: inv.projectCode,
    clientCode: inv.clientCode,
    consultantId: inv.consultantId,
    consultantName: inv.consultantName,
    billingAddress: inv.billingAddress,
    invoiceDate: inv.invoiceDate || inv.date || null,

    subtotal: inv.subtotal,
    gst: inv.gst || 0,
    serviceFeePct: inv.serviceFeePct,
    serviceFee: inv.serviceFee,
    netEarnings: inv.netEarnings,

    items: inv.items || [],
    notes: inv.notes || '',

    finalize: isFinal,
    status: isFinal ? 'FINAL' : (inv.status || 'DRAFT'),
  };

  logger.info({ payload }, 'Saving invoice via Apps Script');

  try {
    let result;

    if (apps.mode === 'stub') {
      // In stub mode, fall back to in-memory createInvoice if available
      if (typeof apps.saveInvoice === 'function') {
        result = apps.saveInvoice(payload);
      } else if (typeof apps.createInvoice === 'function') {
        result = apps.createInvoice(payload);
      } else {
        throw new Error('Stub mode: saveInvoice/createInvoice not implemented');
      }
    } else {
      // LIVE: call Apps Script web app with action "saveInvoice"
      result = await apps.post('saveInvoice', payload);
    }

    logger.info({ result }, 'Apps Script saveInvoice result');
    return res.json(result);
  } catch (err) {
    logger.error(err);
    return res
      .status(502)
      .json({ error: err.message || 'save invoice failed' });
  }
});

/**
 * POST /api/invoices/send
 * Send invoice by email
 * Body: { invoiceId, toEmail }
 */
router.post('/send', async (req, res) => {
  const { invoiceId, toEmail } = req.body || {};
  if (!toEmail) {
    return res.status(400).json({ error: 'toEmail is required' });
  }

  try {
    let r;
    if (apps.mode === 'stub') {
      r = await apps.sendInvoiceEmail({ invoiceId, toEmail });
    } else {
      r = await apps.post('sendInvoiceEmail', { invoiceId, toEmail });
    }
    return res.json(r);
  } catch (err) {
    logger.error(err);
    res.status(502).json({ error: 'send failed' });
  }
});

module.exports = router;
