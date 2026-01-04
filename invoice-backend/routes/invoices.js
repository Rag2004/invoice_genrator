
// routes/invoices.js - PRODUCTION FIXED
const express = require('express');
const router = express.Router();
const apps = require('../lib/appsScriptClient');
const logger = require('../utils/logger');
const { sendInvoiceEmail } = require('../utils/invoiceEmailService');

/* ============================================================================
   HELPER: Extract consultantId
============================================================================ */
function getConsultantId(req) {
  return (
    req.user?.consultantId ||
    req.user?.consultant_id ||
    req.user?.id ||
    req.headers['x-consultant-id'] ||
    req.headers['X-Consultant-Id'] ||
    null
  );
}


/* ============================================================================
   🔒 SECURITY: Verify Ownership
============================================================================ */
async function verifyInvoiceOwnership(invoiceId, consultantId) {
  if (!invoiceId || !consultantId) {
    return { ok: false, error: 'Missing invoiceId or consultantId' };
  }

  try {
    const result = await apps.getInvoiceById(invoiceId);
    
    if (!result?.ok) {
      return { ok: false, error: 'Invoice not found', statusCode: 404 };
    }

    const invoiceConsultantId = result.invoice?.consultantId;

    if (invoiceConsultantId && invoiceConsultantId !== consultantId) {
      logger.warn(
        { invoiceId, consultantId, invoiceConsultantId },
        '🚫 Unauthorized access attempt'
      );
      return { ok: false, error: 'Access denied', statusCode: 403 };
    }

    return { ok: true, invoice: result.invoice };
  } catch (err) {
    logger.error(err, 'Ownership verification failed');
    return { ok: false, error: 'Verification failed', statusCode: 500 };
  }
}

/* ============================================================================
   CREATE DRAFT - Store INPUTS only (nested structure)
============================================================================ */

router.post('/draft', async (req, res) => {
  try {
    const consultantId =
      getConsultantId(req) ||
      req.body.consultantId ||
      req.body.data?.consultantId;

    if (!consultantId) {
      return res.status(400).json({ ok: false, error: 'consultantId required' });
    }

    const invoiceData =
      req.body.invoiceData || req.body.data?.invoiceData;

    // ✅ Support nested structure
    const projectCode =
      invoiceData?.project?.projectCode || invoiceData?.projectCode;

    if (!projectCode) {
      return res.status(400).json({ ok: false, error: 'projectCode required' });
    }

    logger.info({ consultantId, projectCode }, 'CREATE DRAFT');

    const result = await apps.createDraft({
      consultantId,
      invoiceData  // ✅ Pass nested structure as-is
    });

    if (!result?.ok) {
      return res.status(500).json({
        ok: false,
        error: result?.error || 'Failed to create draft'
      });
    }

    return res.json(result);
  } catch (err) {
    logger.error(err, 'Create draft failed');
    return res.status(500).json({ ok: false, error: err.message });
  }
});


/* ============================================================================
   UPDATE DRAFT - 🔒 With ownership check
============================================================================ */

router.post('/draft/:invoiceId', async (req, res) => {
  try {
    const consultantId = getConsultantId(req);
    const { invoiceId } = req.params;

    if (!consultantId || !invoiceId) {
      return res.status(400).json({
        ok: false,
        error: 'invoiceId and consultantId required'
      });
    }

    const ownership = await verifyInvoiceOwnership(invoiceId, consultantId);
    if (!ownership.ok) {
      return res.status(ownership.statusCode || 403).json({
        ok: false,
        error: ownership.error
      });
    }

    if (String(ownership.invoice.status).toUpperCase() === 'FINAL') {
      return res.status(400).json({
        ok: false,
        error: 'Cannot edit finalized invoice'
      });
    }

    const { invoiceData } = req.body;

    // ✅ Support nested structure
    const projectCode = 
      invoiceData?.project?.projectCode || invoiceData?.projectCode;

    logger.info(
      {
        invoiceId,
        consultantId,
        projectCode
      },
      'UPDATE DRAFT (authorized)'
    );

    const result = await apps.updateDraft(invoiceId, {
      consultantId,
      invoiceData  // ✅ Pass nested structure as-is
    });

    if (!result?.ok) {
      return res.status(500).json({
        ok: false,
        error: result?.error || 'Failed to update draft'
      });
    }

    return res.json(result);
  } catch (err) {
    logger.error(err, 'Update draft failed');
    return res.status(500).json({ ok: false, error: err.message });
  }
});


/* ============================================================================
   FINALIZE INVOICE - 🔒 Trust frontend snapshot (single source of truth)
============================================================================ */

router.post('/finalize', async (req, res) => {
  try {
    const consultantId = getConsultantId(req);
    if (!consultantId) {
      return res.status(400).json({
        ok: false,
        error: 'consultantId required'
      });
    }

    const { invoiceId, snapshot } = req.body;

    logger.info(
      { consultantId, invoiceId: invoiceId || 'NEW' },
      'FINALIZE INVOICE REQUEST'
    );

    // ------------------------------------------------------------------
    // 1️⃣ STRICT SNAPSHOT VALIDATION
    // ------------------------------------------------------------------
    if (!snapshot || typeof snapshot !== 'object') {
      return res.status(400).json({
        ok: false,
        error: 'snapshot required'
      });
    }

    if (!snapshot.project?.projectCode) {
      return res.status(400).json({
        ok: false,
        error: 'snapshot.project.projectCode required'
      });
    }

    if (!Array.isArray(snapshot.work?.items) || snapshot.work.items.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'snapshot.work.items required'
      });
    }

    // ------------------------------------------------------------------
    // 2️⃣ OPTIONAL OWNERSHIP CHECK (ONLY IF invoiceId PROVIDED)
    // ------------------------------------------------------------------
    if (invoiceId) {
      const ownership = await verifyInvoiceOwnership(invoiceId, consultantId);

      if (!ownership.ok) {
        return res.status(ownership.statusCode || 403).json({
          ok: false,
          error: ownership.error
        });
      }

      if (String(ownership.invoice.status).toUpperCase() === 'FINAL') {
        return res.status(400).json({
          ok: false,
          error: 'Invoice already finalized'
        });
      }
    }

    // ------------------------------------------------------------------
    // 3️⃣ AUDIT TOTALS (DO NOT OVERRIDE FRONTEND)
    // ------------------------------------------------------------------
    const items = snapshot.work.items;

    const auditSubtotal = items.reduce(
      (sum, i) => sum + Number(i.amount || 0),
      0
    );

    const auditGst = Math.round(auditSubtotal * 0.18);
    const auditTotal = auditSubtotal + auditGst;

    if (Math.abs(auditTotal - Number(snapshot.totals?.total || 0)) > 1) {
      logger.warn(
        {
          invoiceId: invoiceId || 'NEW',
          frontendTotal: snapshot.totals?.total,
          backendAuditTotal: auditTotal
        },
        '⚠️ TOTAL MISMATCH (trusting frontend snapshot)'
      );
    }

    // ------------------------------------------------------------------
    // 4️⃣ FINAL CANONICAL PAYLOAD
    // ------------------------------------------------------------------
    const finalInvoiceId = invoiceId || `INV_${Date.now()}`;

    const payload = {
      invoiceId: finalInvoiceId,
      consultantId,
      status: 'FINAL',
      snapshot: {
        ...snapshot,
        meta: {
          ...snapshot.meta,
          invoiceId: finalInvoiceId,
          status: 'FINAL',
          finalizedAt: new Date().toISOString()
        }
      }
    };

    logger.info(
      {
        invoiceId: payload.invoiceId,
        projectCode: snapshot.project.projectCode,
        subtotal: snapshot.totals?.subtotal,
        gst: snapshot.totals?.gst,
        total: snapshot.totals?.total,
        items: items.length
      },
      'FINALIZE → saveInvoice'
    );

    // ------------------------------------------------------------------
    // 5️⃣ SINGLE SOURCE SAVE
    // ------------------------------------------------------------------
    const result = await apps.saveInvoice(payload);

    if (!result?.ok) {
      return res.status(500).json({
        ok: false,
        error: result?.error || 'Failed to save invoice'
      });
    }

    // ------------------------------------------------------------------
    // 6️⃣ SUCCESS RESPONSE
    // ------------------------------------------------------------------
    return res.json({
      ok: true,
      invoiceId: result.invoiceId,
      invoiceNumber: result.invoiceNumber,
      status: 'FINAL'
    });

  } catch (err) {
    logger.error(err, 'FINALIZE FAILED');
    return res.status(500).json({
      ok: false,
      error: err.message || 'internal_error'
    });
  }
});


/* ============================================================================
   LIST INVOICES BY CONSULTANT
============================================================================ */

router.get('/', async (req, res) => {
  try {
    const consultantId = getConsultantId(req);
    if (!consultantId) {
      return res.status(400).json({ ok: false, error: 'consultantId required' });
    }

    logger.info({ consultantId }, 'Listing invoices');

    const result = await apps.listInvoicesByConsultant(consultantId);
    
    if (!result?.ok) {
      return res.status(500).json({ ok: false, invoices: [] });
    }

    return res.json({ ok: true, invoices: result.invoices || [] });
  } catch (err) {
    logger.error(err, 'List invoices failed');
    return res.status(500).json({ ok: false, invoices: [] });
  }
});

/* ============================================================================
   GET SINGLE INVOICE - 🔒 With ownership check
============================================================================ */

router.get('/:invoiceId', async (req, res) => {
  try {
    const consultantId = getConsultantId(req);
    const { invoiceId } = req.params;

    if (!consultantId || !invoiceId) {
      return res.status(400).json({
        ok: false,
        error: 'consultantId and invoiceId required'
      });
    }

    const ownership = await verifyInvoiceOwnership(invoiceId, consultantId);
    if (!ownership.ok) {
      return res.status(ownership.statusCode || 403).json({
        ok: false,
        error: ownership.error
      });
    }

    const invoice = ownership.invoice;

    // ✅ Validate data integrity
    if (String(invoice.status).toUpperCase() === 'FINAL') {
      if (!invoice.snapshot) {
        logger.warn({ invoiceId }, '⚠️ Final invoice missing snapshot');
      }
    } else if (invoice.status === 'DRAFT') {
      if (!invoice.invoiceData) {
        logger.warn({ invoiceId }, '⚠️ Draft missing invoiceData');
      }
    }

    return res.json({ ok: true, invoice });
  } catch (err) {
    logger.error(err, 'Get invoice failed');
    return res.status(500).json({ ok: false, error: err.message });
  }
});


/* ============================================================================
   SHARE INVOICE (EMAIL WITH PDF)
============================================================================ */

router.post('/share', async (req, res) => {
  try {
    const consultantId = getConsultantId(req);
    const { 
      toEmail, 
      invoiceId, 
      html, 
      projectCode, 
      consultantName, 
      total, 
      subtotal, 
      gst 
    } = req.body;
    
    logger.info({
      consultantId,
      toEmail: !!toEmail,
      invoiceId: invoiceId || 'DRAFT',
      hasHtml: !!html
    }, '📧 Share invoice');
    
    if (!toEmail || !html) {
      return res.status(400).json({ 
        ok: false, 
        error: 'email and html required' 
      });
    }

    // 🔒 Verify ownership if invoiceId provided
    if (invoiceId && consultantId) {
      const ownership = await verifyInvoiceOwnership(invoiceId, consultantId);
      if (!ownership.ok) {
        return res.status(ownership.statusCode || 403).json({ 
          ok: false, 
          error: ownership.error 
        });
      }
    }

    const invoice = {
      invoiceNumber: invoiceId || 'DRAFT',
      invoiceId: invoiceId,
      projectCode: projectCode || 'N/A',
      consultantName: consultantName || 'Consultant',
      total: total || 0,
      subtotal: subtotal || 0,
      gst: gst || 0,
    };

    const result = await sendInvoiceEmail({
      toEmail: toEmail,
      invoice: invoice,
      invoiceHTML: html
    });

    logger.info({ toEmail, invoiceId }, '✅ Invoice sent');
    
    return res.json({ 
      ok: true, 
      message: 'Invoice sent successfully',
      format: result.format,
      hasPDF: result.hasPDF
    });
    
  } catch (err) {
    logger.error({ error: err.message }, '❌ Share invoice failed');
    return res.status(500).json({ 
      ok: false, 
      error: err.message || 'Failed to send invoice' 
    });
  }
});

module.exports = router;