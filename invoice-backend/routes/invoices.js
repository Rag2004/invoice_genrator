

// ============================================================================
// routes/invoices.js - UPDATED WITH SECURE CLIENT EMAIL
// ============================================================================

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const apps = require('../lib/appsScriptClient');
const logger = require('../utils/logger');
const { sendInvoiceEmail } = require('../utils/invoiceEmailService');
const { generateInvoicePDF } = require('../utils/pdfGenerator');
const { createApprovalToken, verifyApprovalToken, markTokenUsed } = require('../utils/approvalTokens');

// Load logo for PDF generation
const logoPath = path.join(__dirname, '../assets/logo.png');
let logoBase64 = '';
try {
  if (fs.existsSync(logoPath)) {
    logoBase64 = fs.readFileSync(logoPath).toString('base64');
  }
} catch (err) {
  console.error('Error loading PDF logo:', err);
}

/* ============================================================================
   HELPER: Parse comma-separated emails
============================================================================ */
function parseEmailList(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return !!email && emailRegex.test(String(email).trim());
}

function getBackendBaseUrl(req) {
  const envUrl = process.env.BACKEND_PUBLIC_URL;
  if (envUrl) return String(envUrl).replace(/\/+$/, '');
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http');
  const host = (req.headers['x-forwarded-host'] || req.get('host'));
  return `${proto}://${host}`;
}

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
   ✅ UPDATED: Logs if client email is missing in snapshot
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

    // ✅ WARN if client email is missing in snapshot
    if (!snapshot.client?.email) {
      logger.warn(
        {
          invoiceId: invoiceId || 'NEW',
          clientCode: snapshot.client?.code,
          projectCode: snapshot.project?.projectCode
        },
        '⚠️ Client email missing in finalization snapshot - invoice may not be shareable'
      );
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

    // Respect GST rate from snapshot when present (0 is valid)
    let auditGstRate = snapshot.totals?.gstRate;
    if (auditGstRate == null && snapshot.totals?.gst != null && auditSubtotal > 0) {
      auditGstRate = Number(snapshot.totals.gst) / auditSubtotal;
    }
    auditGstRate = Number(auditGstRate ?? 0.18);
    if (!Number.isFinite(auditGstRate)) auditGstRate = 0.18;
    if (auditGstRate > 1) auditGstRate = auditGstRate / 100;

    const auditGst = Math.round(auditSubtotal * auditGstRate);
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
        clientCode: snapshot.client?.code,
        hasClientEmail: !!snapshot.client?.email,
        subtotal: snapshot.totals?.subtotal,
        gst: snapshot.totals?.gst,
        total: snapshot.totals?.total,
        items: items.length
      },
      'FINALIZE → saveInvoice'
    );

    // ------------------------------------------------------------------
    // 5️⃣ SINGLE SOURCE SAVE (Apps Script will hydrate client email)
    // ------------------------------------------------------------------
    const result = await apps.saveInvoice(payload);

    if (!result?.ok) {
      return res.status(500).json({
        ok: false,
        error: result?.error || 'Failed to save invoice'
      });
    }

    // ✅ Log if client email was returned (for debugging)
    if (result.clientEmail) {
      logger.info(
        {
          invoiceId: result.invoiceId,
          clientEmail: result.clientEmail.replace(/(?<=.{2}).*(?=@)/, '***')
        },
        '✅ Invoice finalized with client email'
      );
    }

    // ------------------------------------------------------------------
    // 6️⃣ SUCCESS RESPONSE
    // ------------------------------------------------------------------
    return res.json({
      ok: true,
      invoiceId: result.invoiceId,
      invoiceNumber: result.invoiceNumber,
      status: 'FINAL',
      clientEmail: result.clientEmail || null // ✅ Pass to frontend (optional)
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
   📄 DOWNLOAD INVOICE PDF - Puppeteer-based server-side rendering
   Returns a downloadable PDF file generated from the invoice snapshot
============================================================================ */
router.get('/:invoiceId/pdf', async (req, res) => {
  try {
    const consultantId = getConsultantId(req);
    const { invoiceId } = req.params;

    if (!consultantId || !invoiceId) {
      return res.status(400).json({
        ok: false,
        error: 'consultantId and invoiceId required'
      });
    }

    // Verify ownership
    const ownership = await verifyInvoiceOwnership(invoiceId, consultantId);
    if (!ownership.ok) {
      return res.status(ownership.statusCode || 403).json({
        ok: false,
        error: ownership.error
      });
    }

    const invoice = ownership.invoice;

    // Only finalized invoices have snapshots
    if (String(invoice.status).toUpperCase() !== 'FINAL') {
      return res.status(400).json({
        ok: false,
        error: 'Can only generate PDF for finalized invoices'
      });
    }

    // Parse snapshot
    let snapshot;
    try {
      snapshot = typeof invoice.snapshot === 'string'
        ? JSON.parse(invoice.snapshot)
        : invoice.snapshot;
    } catch (err) {
      logger.error({ invoiceId, error: err.message }, 'Failed to parse snapshot for PDF');
      return res.status(400).json({
        ok: false,
        error: 'Invalid invoice snapshot format'
      });
    }

    if (!snapshot) {
      return res.status(400).json({
        ok: false,
        error: 'Invoice snapshot not found'
      });
    }

    logger.info({ invoiceId, invoiceNumber: invoice.invoiceNumber }, 'Generating PDF...');

    // Generate HTML from snapshot (reuse existing helper)
    const invoiceHTML = generateInvoiceHTMLFromSnapshot(snapshot);

    // Generate PDF using Puppeteer
    const pdfBuffer = await generateInvoicePDF(invoiceHTML, {
      invoiceNumber: invoice.invoiceNumber || invoiceId,
      projectCode: snapshot.project?.projectCode || 'N/A',
    });

    const filename = `${invoice.invoiceNumber || 'Invoice'}.pdf`;

    logger.info({
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      pdfSize: pdfBuffer.length
    }, 'PDF generated successfully');

    // Send PDF as downloadable file
    // Use res.end() + Buffer.from() to avoid any string encoding that res.send() might apply
    const pdfFilename = encodeURIComponent(filename);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${pdfFilename}`);
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.setHeader('Pragma', 'no-cache');

    return res.end(Buffer.from(pdfBuffer));

  } catch (err) {
    logger.error({ error: err.message, stack: err.stack }, 'PDF generation failed');
    return res.status(500).json({
      ok: false,
      error: `PDF generation failed: ${err.message}`
    });
  }
});

/* ============================================================================
   🔒 SECURE SHARE INVOICE - USES CLIENT EMAIL FROM INVOICE DATA ONLY
   ✅ UPDATED: No toEmail parameter - fetches from invoice snapshot
============================================================================ */
router.post('/share', async (req, res) => {
  try {
    const consultantId = getConsultantId(req);
    const {
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
      invoiceId: invoiceId || 'UNKNOWN',
      hasHtml: !!html
    }, '📧 Share invoice request');

    // ✅ VALIDATION: Required fields
    if (!html) {
      return res.status(400).json({
        ok: false,
        error: 'Invoice HTML required'
      });
    }

    if (!invoiceId) {
      return res.status(400).json({
        ok: false,
        error: 'Invoice ID required'
      });
    }

    // ✅ SECURITY: Verify ownership
    if (consultantId) {
      const ownership = await verifyInvoiceOwnership(invoiceId, consultantId);
      if (!ownership.ok) {
        return res.status(ownership.statusCode || 403).json({
          ok: false,
          error: ownership.error
        });
      }
    }

    // ✅ INTERNAL SEND: Hourly + consultant (NO client)
    const hourlyRecipients = parseEmailList(process.env.ADMIN_CC_EMAIL);
    if (hourlyRecipients.length === 0) {
      return res.status(500).json({
        ok: false,
        error: 'Hourly recipient emails not configured. Set ADMIN_CC_EMAIL in backend .env'
      });
    }

    const consultantEmail = req.user?.email;
    // For admin approval email: ONLY Hourly admins get approve/reject buttons.
    // Consultant will receive a separate FYI email without approval links.

    // ✅ SECURITY: Fetch invoice for canonical metadata (invoice #, etc.)
    const invoiceResult = await apps.getInvoiceById(invoiceId);

    if (!invoiceResult?.ok) {
      return res.status(404).json({
        ok: false,
        error: 'Invoice not found'
      });
    }

    const invoice = invoiceResult.invoice;

    // ✅ BUILD EMAIL PAYLOAD
    const emailPayload = {
      invoiceNumber: invoice.invoiceNumber || invoiceId,
      invoiceId: invoiceId,
      projectCode: invoice.projectCode || projectCode || 'N/A',
      consultantName: invoice.consultantName || consultantName || 'Consultant',
      clientName: invoice.client?.name || invoice.snapshot?.client?.name || 'Client',
      total: total || invoice.totals?.total || invoice.total || 0,
      subtotal: subtotal || invoice.totals?.subtotal || invoice.subtotal || 0,
      gst: gst || invoice.totals?.gst || invoice.gst || 0,
      _recipientType: 'internal',
      _approvalLinks: (() => {
        const base = getBackendBaseUrl(req);
        const approveToken = createApprovalToken({ invoiceId, action: 'approve' });
        const rejectToken = createApprovalToken({ invoiceId, action: 'reject' });
        return {
          approveUrl: `${base}/api/invoices/approval/approve?token=${encodeURIComponent(approveToken)}`,
          rejectUrl: `${base}/api/invoices/approval/reject?token=${encodeURIComponent(rejectToken)}`,
        };
      })(),
    };

    // ✅ SEND EMAIL (Hourly recipients as TO, consultant as CC)
    const result = await sendInvoiceEmail({
      toEmail: hourlyRecipients,
      invoice: emailPayload,
      invoiceHTML: html
    });

    // ✅ Send separate FYI copy to consultant (no approval links)
    if (isValidEmail(consultantEmail)) {
      try {
        const consultantPayload = {
          ...emailPayload,
          _approvalLinks: null,
        };
        await sendInvoiceEmail({
          toEmail: String(consultantEmail).trim(),
          invoice: consultantPayload,
          invoiceHTML: html
        });
      } catch (e) {
        logger.warn({ invoiceId, err: e.message }, 'Failed to send consultant FYI approval email');
      }
    }

    logger.info({
      invoiceId,
      hourlyRecipientsCount: hourlyRecipients.length,
      hasConsultantEmail: !!consultantEmail
    }, '✅ Invoice sent for approval (internal)');

    return res.json({
      ok: true,
      message: 'Invoice sent for approval',
      sentTo: hourlyRecipients,
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
// ADD THIS TO backend/routes/invoices.js (after the existing /share route)

/* ============================================================================
   🚀 AUTO-SHARE INVOICE - Simplified one-click share from invoice list
   Backend generates HTML from snapshot and sends to client
============================================================================ */
router.post('/share-auto', async (req, res) => {
  try {
    const consultantId = getConsultantId(req);
    const { invoiceId } = req.body;

    logger.info({
      consultantId,
      invoiceId: invoiceId || 'UNKNOWN'
    }, '🚀 Auto-share invoice request');

    // ✅ VALIDATION: Invoice ID required
    if (!invoiceId) {
      return res.status(400).json({
        ok: false,
        error: 'Invoice ID required'
      });
    }

    // ✅ SECURITY: Verify ownership
    if (consultantId) {
      const ownership = await verifyInvoiceOwnership(invoiceId, consultantId);
      if (!ownership.ok) {
        return res.status(ownership.statusCode || 403).json({
          ok: false,
          error: ownership.error
        });
      }

      // ✅ CRITICAL: Only allow sharing finalized invoices
      if (String(ownership.invoice.status).toUpperCase() !== 'FINAL') {
        return res.status(400).json({
          ok: false,
          error: 'Can only share finalized invoices. Please finalize the invoice first.'
        });
      }
    }

    // ✅ FETCH: Get full invoice with snapshot
    const invoiceResult = await apps.getInvoiceById(invoiceId);

    if (!invoiceResult?.ok) {
      return res.status(404).json({
        ok: false,
        error: 'Invoice not found'
      });
    }

    const invoice = invoiceResult.invoice;

    // ✅ PARSE: Extract snapshot
    let snapshot;
    try {
      snapshot = typeof invoice.snapshot === 'string'
        ? JSON.parse(invoice.snapshot)
        : invoice.snapshot;
    } catch (err) {
      logger.error({ invoiceId, error: err.message }, '❌ Failed to parse snapshot');
      return res.status(400).json({
        ok: false,
        error: 'Invalid invoice snapshot format'
      });
    }

    if (!snapshot) {
      return res.status(400).json({
        ok: false,
        error: 'Invoice snapshot not found. Cannot share draft invoices.'
      });
    }

    // ✅ INTERNAL SEND: Hourly + consultant only (NO client)
    const hourlyRecipients = parseEmailList(process.env.ADMIN_CC_EMAIL);
    if (hourlyRecipients.length === 0) {
      return res.status(500).json({
        ok: false,
        error: 'Hourly recipient emails not configured. Set ADMIN_CC_EMAIL in backend .env'
      });
    }

    const consultantEmail = req.user?.email;
    const ccEmails = [];
    if (isValidEmail(consultantEmail)) {
      ccEmails.push(String(consultantEmail).trim());
    }

    logger.info({
      invoiceId,
      hourlyRecipientsCount: hourlyRecipients.length,
      hasConsultantEmail: !!consultantEmail
    }, '✅ Sending invoice for approval (internal) and generating HTML');

    // ✅ GENERATE: Invoice HTML from snapshot
    const invoiceHTML = generateInvoiceHTMLFromSnapshot(snapshot);

    // ✅ BUILD: Email payload
    const emailPayload = {
      invoiceNumber: snapshot.meta?.invoiceNumber || invoice.invoiceNumber || invoiceId,
      invoiceId: invoiceId,
      projectCode: snapshot.project?.projectCode || 'N/A',
      consultantName: snapshot.consultant?.name || 'Consultant',
      clientName: snapshot.client?.name || 'Client',
      total: snapshot.totals?.total || 0,
      subtotal: snapshot.totals?.subtotal || 0,
      gst: snapshot.totals?.gst || 0,
      _recipientType: 'internal',
      ccEmails,
    };

    // ✅ SEND: Email with PDF
    const emailResult = await sendInvoiceEmail({
      toEmail: hourlyRecipients,
      invoice: emailPayload,
      invoiceHTML: invoiceHTML
    });

    logger.info({
      invoiceId,
      invoiceNumber: emailPayload.invoiceNumber,
      hasPDF: emailResult.hasPDF
    }, '✅ Invoice sent for approval successfully (internal)');

    return res.json({
      ok: true,
      success: true,
      message: 'Invoice sent for approval',
      sentTo: hourlyRecipients, // list
      invoiceNumber: emailPayload.invoiceNumber,
      hasPDF: emailResult.hasPDF,
      filename: emailResult.filename,
      format: emailResult.format,
      messageId: emailResult.messageId
    });

  } catch (err) {
    logger.error({ error: err.message, stack: err.stack }, '❌ Auto-share failed');
    return res.status(500).json({
      ok: false,
      error: err.message || 'Failed to share invoice'
    });
  }
});

/* ============================================================================
   ✅ EMAIL APPROVAL LINKS (no login required)
============================================================================ */
router.get('/approval/approve', async (req, res) => {
  try {
    const token = req.query.token;
    const v = verifyApprovalToken(token);
    if (!v.ok) {
      return res.status(400).send(`<html><body style="font-family:Arial;padding:24px"><h2>Invalid approval link</h2><p>${v.error}</p></body></html>`);
    }
    if (v.payload.action !== 'approve') {
      return res.status(400).send(`<html><body style="font-family:Arial;padding:24px"><h2>Invalid action</h2></body></html>`);
    }
    markTokenUsed(v.payload.nonce);

    const invoiceId = v.payload.invoiceId;
    const invoiceResult = await apps.getInvoiceById(invoiceId);
    if (!invoiceResult?.ok) {
      return res.status(404).send(`<html><body style="font-family:Arial;padding:24px"><h2>Invoice not found</h2></body></html>`);
    }

    const invoice = invoiceResult.invoice;
    let snapshot;
    try {
      snapshot = typeof invoice.snapshot === 'string' ? JSON.parse(invoice.snapshot) : invoice.snapshot;
    } catch (e) {
      return res.status(400).send(`<html><body style="font-family:Arial;padding:24px"><h2>Invalid invoice snapshot</h2></body></html>`);
    }

    const clientEmail = snapshot?.client?.email || invoice.client?.email;
    if (!isValidEmail(clientEmail)) {
      return res.status(400).send(`<html><body style="font-family:Arial;padding:24px"><h2>Client email missing/invalid</h2></body></html>`);
    }

    const hourlyRecipients = parseEmailList(process.env.ADMIN_CC_EMAIL);
    const consultantEmail = snapshot?.consultant?.email || invoice.consultantEmail || invoice.consultant?.email;
    const ccEmails = [
      ...hourlyRecipients,
      ...(isValidEmail(consultantEmail) ? [String(consultantEmail).trim()] : []),
    ].filter((v2, i, arr) => arr.indexOf(v2) === i);

    const invoiceHTML = generateInvoiceHTMLFromSnapshot(snapshot);
    const emailPayload = {
      invoiceNumber: snapshot.meta?.invoiceNumber || invoice.invoiceNumber || invoiceId,
      invoiceId,
      projectCode: snapshot.project?.projectCode || invoice.projectCode || 'N/A',
      consultantName: snapshot.consultant?.name || invoice.consultantName || 'Consultant',
      clientName: snapshot.client?.name || 'Client',
      total: snapshot.totals?.total || 0,
      subtotal: snapshot.totals?.subtotal || 0,
      gst: snapshot.totals?.gst || 0,
      _recipientType: 'client',
      ccEmails,
    };

    await sendInvoiceEmail({
      toEmail: String(clientEmail).trim(),
      invoice: emailPayload,
      invoiceHTML,
    });

    return res.send(`<html><body style="font-family:Arial;padding:24px"><h2>Approved</h2><p>Invoice has been approved and sent to the client.</p></body></html>`);
  } catch (err) {
    logger.error({ err: err.message, stack: err.stack }, 'Approval approve failed');
    return res.status(500).send(`<html><body style="font-family:Arial;padding:24px"><h2>Error</h2><p>${err.message}</p></body></html>`);
  }
});

router.get('/approval/reject', async (req, res) => {
  try {
    const token = req.query.token;
    const v = verifyApprovalToken(token);
    if (!v.ok) {
      return res.status(400).send(`<html><body style="font-family:Arial;padding:24px"><h2>Invalid rejection link</h2><p>${v.error}</p></body></html>`);
    }
    if (v.payload.action !== 'reject') {
      return res.status(400).send(`<html><body style="font-family:Arial;padding:24px"><h2>Invalid action</h2></body></html>`);
    }
    markTokenUsed(v.payload.nonce);

    const invoiceId = v.payload.invoiceId;
    const invoiceResult = await apps.getInvoiceById(invoiceId);
    if (!invoiceResult?.ok) {
      return res.status(404).send(`<html><body style="font-family:Arial;padding:24px"><h2>Invoice not found</h2></body></html>`);
    }

    const invoice = invoiceResult.invoice;
    let snapshot;
    try {
      snapshot = typeof invoice.snapshot === 'string' ? JSON.parse(invoice.snapshot) : invoice.snapshot;
    } catch (e) {
      snapshot = null;
    }

    const hourlyRecipients = parseEmailList(process.env.ADMIN_CC_EMAIL);
    const consultantEmail = (snapshot?.consultant?.email) || invoice.consultantEmail || invoice.consultant?.email;

    const rejectNoticeHtml = `
      <div style="font-family: Arial, sans-serif;">
        <h2 style="margin:0 0 8px 0;">Invoice rejected</h2>
        <p style="margin:0 0 12px 0;">Invoice <strong>${snapshot?.meta?.invoiceNumber || invoice.invoiceNumber || invoiceId}</strong> has been rejected by Hourly.</p>
        <p style="margin:0;">Please review and re-submit for approval.</p>
      </div>
    `.trim();

    // Notify consultant (if available)
    if (isValidEmail(consultantEmail)) {
      await sendInvoiceEmail({
        toEmail: String(consultantEmail).trim(),
        invoice: {
          invoiceNumber: snapshot?.meta?.invoiceNumber || invoice.invoiceNumber || invoiceId,
          projectCode: snapshot?.project?.projectCode || invoice.projectCode || 'N/A',
          consultantName: snapshot?.consultant?.name || invoice.consultantName || 'Consultant',
          total: snapshot?.totals?.total || 0,
          _recipientType: 'internal',
          _approvalLinks: null,
        },
        invoiceHTML: rejectNoticeHtml,
      });
    }

    // Notify Hourly (admin list)
    if (hourlyRecipients.length) {
      await sendInvoiceEmail({
        toEmail: hourlyRecipients,
        invoice: {
          invoiceNumber: snapshot?.meta?.invoiceNumber || invoice.invoiceNumber || invoiceId,
          projectCode: snapshot?.project?.projectCode || invoice.projectCode || 'N/A',
          consultantName: snapshot?.consultant?.name || invoice.consultantName || 'Consultant',
          total: snapshot?.totals?.total || 0,
          _recipientType: 'internal',
          _approvalLinks: null,
        },
        invoiceHTML: rejectNoticeHtml,
      });
    }

    return res.send(`<html><body style="font-family:Arial;padding:24px"><h2>Rejected</h2><p>Invoice has been rejected. The consultant has been notified.</p></body></html>`);
  } catch (err) {
    logger.error({ err: err.message, stack: err.stack }, 'Approval reject failed');
    return res.status(500).send(`<html><body style="font-family:Arial;padding:24px"><h2>Error</h2><p>${err.message}</p></body></html>`);
  }
});

/* ============================================================================
   ✅ SEND TO CLIENT (after approval)
   Sends to client email in snapshot; CC Hourly + consultant
============================================================================ */
router.post('/send-to-client', async (req, res) => {
  try {
    // 🔒 Hourly admin approval only
    const key = req.headers['x-api-key'] || req.query.apiKey || req.body?.apiKey;
    if (!key || key !== (process.env.ADMIN_API_KEY || '')) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const consultantId = getConsultantId(req);
    const { invoiceId } = req.body;

    if (!invoiceId) {
      return res.status(400).json({ ok: false, error: 'Invoice ID required' });
    }

    // ✅ SECURITY: Verify ownership
    if (consultantId) {
      const ownership = await verifyInvoiceOwnership(invoiceId, consultantId);
      if (!ownership.ok) {
        return res.status(ownership.statusCode || 403).json({
          ok: false,
          error: ownership.error
        });
      }
      if (String(ownership.invoice.status).toUpperCase() !== 'FINAL') {
        return res.status(400).json({
          ok: false,
          error: 'Can only send finalized invoices'
        });
      }
    }

    const invoiceResult = await apps.getInvoiceById(invoiceId);
    if (!invoiceResult?.ok) {
      return res.status(404).json({ ok: false, error: 'Invoice not found' });
    }

    const invoice = invoiceResult.invoice;
    let snapshot;
    try {
      snapshot = typeof invoice.snapshot === 'string'
        ? JSON.parse(invoice.snapshot)
        : invoice.snapshot;
    } catch (err) {
      logger.error({ invoiceId, error: err.message }, '❌ Failed to parse snapshot');
      return res.status(400).json({ ok: false, error: 'Invalid invoice snapshot format' });
    }

    const clientEmail = snapshot?.client?.email;
    if (!isValidEmail(clientEmail)) {
      return res.status(400).json({
        ok: false,
        error: 'Client email not found or invalid in invoice snapshot'
      });
    }

    const hourlyRecipients = parseEmailList(process.env.ADMIN_CC_EMAIL);
    const consultantEmail = req.user?.email;
    const ccEmails = [
      ...hourlyRecipients,
      ...(isValidEmail(consultantEmail) ? [String(consultantEmail).trim()] : []),
    ].filter((v, i, arr) => arr.indexOf(v) === i);

    const invoiceHTML = generateInvoiceHTMLFromSnapshot(snapshot);
    const emailPayload = {
      invoiceNumber: snapshot.meta?.invoiceNumber || invoice.invoiceNumber || invoiceId,
      invoiceId: invoiceId,
      projectCode: snapshot.project?.projectCode || 'N/A',
      consultantName: snapshot.consultant?.name || 'Consultant',
      clientName: snapshot.client?.name || 'Client',
      total: snapshot.totals?.total || 0,
      subtotal: snapshot.totals?.subtotal || 0,
      gst: snapshot.totals?.gst || 0,
      _recipientType: 'client',
      ccEmails,
    };

    const emailResult = await sendInvoiceEmail({
      toEmail: String(clientEmail).trim(),
      invoice: emailPayload,
      invoiceHTML,
    });

    return res.json({
      ok: true,
      success: true,
      message: 'Invoice sent to client',
      sentTo: String(clientEmail).trim(),
      hasPDF: emailResult.hasPDF,
      filename: emailResult.filename,
      messageId: emailResult.messageId,
    });
  } catch (err) {
    logger.error({ error: err.message, stack: err.stack }, '❌ Send-to-client failed');
    return res.status(500).json({ ok: false, error: err.message || 'Failed to send invoice to client' });
  }
});

/* ============================================================================
   HELPER: Generate Invoice HTML from Snapshot
============================================================================ */
function generateInvoiceHTMLFromSnapshot(snapshot) {
  const formatINR = (value) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  };

  const meta = snapshot.meta || {};
  const consultant = snapshot.consultant || {};
  const client = snapshot.client || {};
  const work = snapshot.work || {};
  const stages = work.stages || [];
  const items = work.items || [];
  const totals = snapshot.totals || {};
  const serviceProvider = snapshot.serviceProvider || {};
  const compliance = snapshot.compliance || {};
  const project = snapshot.project || {};
  const notes = snapshot.notes || '';

  // Helper to check if value is truly empty
  const isEmpty = (val) => val === "" || val === null || val === undefined;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${meta.invoiceNumber || 'DRAFT'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica', 'Helvetica Neue', Arial, sans-serif;
      background: #ffffff;
      color: #2d3748;
      font-size: 10pt;
      line-height: 1.4;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .invoice-container {
      max-width: 210mm;
      margin: 0 auto;
      background: white;
      padding-bottom: 30px;
    }
    .header {
      background: #e8e8e8;
      padding: 20px 30px;
      text-align: center;
      margin-bottom: 20px;
    }
    .invoice-title {
      font-size: 36pt;
      font-weight: 700;
      letter-spacing: 4px;
      color: #2d3748;
    }
    .section {
      border-bottom: 1px solid #e2e8f0;
    }
    .section-header {
      background: #e8e8e8;
      padding: 6px 30px;
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #4a5568;
      border-bottom: 1px solid #e2e8f0;
    }
    .section-body {
      padding: 16px 30px;
    }
    .section-body.compact {
      padding: 12px 30px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px 30px;
      font-size: 9pt;
    }
    .info-item {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .info-label {
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #718096;
      letter-spacing: 0.5px;
    }
    .info-value {
      font-size: 9pt;
      color: #2d3748;
      font-weight: 400;
      line-height: 1.3;
      word-wrap: break-word;
    }
    .info-value.empty {
      color: #a0aec0;
      font-style: italic;
    }
    .info-value.strong {
      font-weight: 700;
    }

    /* Stages Grid */
    .stages-grid {
      display: grid;
      grid-template-columns: 70px 1fr 140px;
      gap: 0;
      border: 1px solid #cbd5e0;
      font-size: 9pt;
      margin: 16px 0;
    }
    .stages-header {
      background: #e8e8e8;
      padding: 10px 12px;
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #4a5568;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #cbd5e0;
      border-right: 1px solid #e2e8f0;
    }
    .stages-header:last-child { border-right: none; }
    .stages-header.center { text-align: center; }
    .stages-cell {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
      border-right: 1px solid #e2e8f0;
      font-size: 9pt;
      color: #2d3748;
    }
    .stages-cell:nth-child(3n) { border-right: none; }
    .stages-cell.center { text-align: center; }
    .stages-cell.strong { font-weight: 700; }
    .stages-cell:last-child, .stages-cell:nth-last-child(2), .stages-cell:nth-last-child(3) {
      border-bottom: none;
    }

    /* Billing Table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 9pt;
      border: 1px solid #cbd5e0;
    }
    thead th {
      background: #e8e8e8;
      padding: 10px 12px;
      text-align: left;
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #4a5568;
      border-bottom: 2px solid #cbd5e0;
      border-right: 1px solid #e2e8f0;
      letter-spacing: 0.5px;
    }
    thead th:last-child { border-right: none; }
    thead th.right { text-align: right; }
    thead th.center { text-align: center; }
    tbody td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
      border-right: 1px solid #e2e8f0;
      font-size: 9pt;
      color: #2d3748;
      vertical-align: middle;
    }
    tbody td:last-child { border-right: none; }
    tbody tr:last-child td { border-bottom: none; }
    tbody td.center { text-align: center; }
    tbody td.right { text-align: right; font-weight: 600; }
    .stage-col { text-align: center; width: 70px; font-weight: 600; }

    .totals-section {
      margin-top: 20px;
      display: grid;
      grid-template-columns: 1fr 280px;
      gap: 20px;
      border: 1px solid #cbd5e0;
    }
    .notes-box {
      padding: 16px;
      border-right: 1px solid #cbd5e0;
    }
    .notes-label {
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #4a5568;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .totals-box {
      display: flex;
      flex-direction: column;
    }
    .totals-row {
      display: grid;
      grid-template-columns: 1fr auto;
      padding: 12px 16px;
      border-bottom: 1px solid #cbd5e0;
      font-size: 9pt;
      align-items: center;
      gap: 30px;
    }
    .totals-row:last-child { border-bottom: none; }
    .totals-label { font-size: 9pt; color: #2d3748; font-weight: 600; }
    .totals-value {
      font-size: 9pt;
      font-weight: 600;
      color: #2d3748;
      text-align: right;
      white-space: nowrap;
    }
    .totals-row.total, .totals-row.balance {
      background: #2d3748;
      border: none;
    }
    .totals-row.total .totals-label, .totals-row.total .totals-value,
    .totals-row.balance .totals-label, .totals-row.balance .totals-value {
      color: #ffffff;
      font-size: 10pt;
      font-weight: 700;
    }
    
    .terms-text {
      font-size: 8pt;
      color: #4a5568;
      line-height: 1.6;
    }
    .terms-text p { margin: 0 0 6px 0; }

    .footer {
      padding: 20px 30px;
      border-top: 2px solid #cbd5e0;
      text-align: center;
      font-size: 7pt;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    @media print {
      .section-body { page-break-inside: avoid; }
      .page-break-before { page-break-before: always; }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div class="invoice-title">INVOICE</div>
    </div>

    <!-- Hourly Ventures LLP -->
    <div class="section">
      <div class="section-header">${serviceProvider.name || 'HOURLY VENTURES LLP'}</div>
      <div class="section-body compact">
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Registered Office</div>
            <div class="info-value">${serviceProvider.registeredOffice || ''}</div>
          </div>
          <div class="info-item">
            <div class="info-label">State Name & Code</div>
            <div class="info-value">${serviceProvider.stateCode || ''}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Email ID</div>
            <div class="info-value">${serviceProvider.email || ''}</div>
          </div>
          <div class="info-item">
            <div class="info-label">PAN</div>
            <div class="info-value">${serviceProvider.pan || ''}</div>
          </div>
          <div class="info-item">
            <div class="info-label">CIN</div>
            <div class="info-value">${serviceProvider.cin || ''}</div>
          </div>
          <div class="info-item">
            <div class="info-label">GSTIN</div>
            <div class="info-value">${serviceProvider.gstin || ''}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Service Provider (Consultant) -->
    <div class="section">
      <div class="section-header">SERVICE PROVIDER</div>
      <div class="section-body compact">
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Business Name</div>
            <div class="info-value ${!consultant.businessName ? 'empty' : ''}">${consultant.businessName || 'Not provided'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Registered Office</div>
            <div class="info-value ${!consultant.registeredOffice ? 'empty' : ''}">${consultant.registeredOffice || 'Not provided'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">State Name & Code</div>
            <div class="info-value ${!consultant.stateCode ? 'empty' : ''}">${consultant.stateCode || 'Not provided'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">PAN</div>
            <div class="info-value ${!consultant.pan ? 'empty' : ''}">${consultant.pan || 'Not provided'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">GSTIN</div>
            <div class="info-value ${!consultant.gstin ? 'empty' : ''}">${consultant.gstin || 'Not provided'}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Client -->
    <div class="section">
      <div class="section-header">CLIENT</div>
      <div class="section-body compact">
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Name (ID)</div>
            <div class="info-value">${client.name || 'Not provided'}${client.code ? ` (${client.code})` : ''}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Billing Address</div>
            <div class="info-value">${client.billingAddress || 'Not provided'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">State Name & Code</div>
            <div class="info-value">${client.stateCode || 'Not provided'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">PAN</div>
            <div class="info-value">${client.pan || 'Not provided'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">GSTIN</div>
            <div class="info-value">${client.gstin || 'Not provided'}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Invoice and Service Details -->
    <div class="section">
      <div class="section-header">INVOICE AND SERVICE DETAILS</div>
      <div class="section-body compact">
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Invoice No.</div>
            <div class="info-value strong">${meta.invoiceNumber || '—'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Invoice Date</div>
            <div class="info-value strong">${meta.invoiceDate || '—'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">SAC Code</div>
            <div class="info-value">${compliance.sacCode || '—'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Supply Description</div>
            <div class="info-value">${compliance.supplyDescription || '—'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Consultant Name</div>
            <div class="info-value">${consultant.name || 'Not provided'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Consultant ID</div>
            <div class="info-value strong">${consultant.id || 'Not provided'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Consultant Fee (Hourly)</div>
            <div class="info-value strong">${formatINR(consultant.hourlyRate || 0)}/hr</div>
          </div>
          <div class="info-item">
            <div class="info-label">Project ID</div>
            <div class="info-value strong">${project.projectCode || 'Not provided'}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Stages and Inclusions -->
    ${stages.length > 0 ? `
    <div class="section">
      <div class="section-header">STAGES AND INCLUSIONS</div>
      <div class="section-body">
        <div class="stages-grid">
          <div class="stages-header">Sr. No.</div>
          <div class="stages-header">Inclusions / Description</div>
          <div class="stages-header center">Timeline (Days)</div>
          ${stages.map((stage, idx) => {
    const subStagesText = (stage?.subStages || [])
      .map(x => x?.label || x?.name)
      .filter(Boolean)
      .join(", ");
    return `
            <div class="stages-cell center strong">${idx + 1}.</div>
            <div class="stages-cell">
              ${stage?.stage ? `<strong>${stage.stage}: </strong>` : ''}
              ${stage?.description || subStagesText || '—'}
            </div>
            <div class="stages-cell center strong">${stage?.days ? Number(stage.days) : '—'}</div>
            `;
  }).join('')}
        </div>
      </div>
    </div>
    ` : ''}

    <!-- Team Summary and Billing -->
    <div class="section page-break-before">
      <div class="section-header">TEAM SUMMARY AND BILLING</div>
      <div class="section-body">
        <table>
          <thead>
            <tr>
              <th style="width: 5%">#</th>
              <th style="width: 25%">Team Member</th>
              <th class="center" style="width: 20%">Mode</th>
              ${stages.slice(0, 6).map((_, idx) => `
                <th class="center stage-col">Stage ${idx + 1}</th>
              `).join('')}
              <th class="right" style="width: 12%">Rate</th>
              <th class="right" style="width: 15%">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, idx) => {
    const stageHours = item?.stageHours || {};
    return `
              <tr>
                <td class="center">${idx + 1}</td>
                <td>${item.name || '—'}</td>
                <td class="center">${item.mode || '—'}</td>
                ${stages.slice(0, 6).map((stage) => {
      const sid = stage.id ?? "";
      const subMap = stageHours[sid] || {};
      const totalStageHours = Object.values(subMap).reduce((sum, v) => sum + (Number(v) || 0), 0);
      return `
                  <td class="center stage-col">${totalStageHours > 0 ? totalStageHours : '—'}</td>
                  `;
    }).join('')}
                <td class="right">${formatINR(item.rate || 0)}</td>
                <td class="right">${formatINR(item.amount || 0)}</td>
              </tr>
              `;
  }).join('')}
          </tbody>
        </table>

        <div class="totals-section">
          <div class="notes-box">
            <div class="notes-label">NOTES</div>
            <div style="font-size: 9pt; color: ${notes ? '#2d3748' : '#a0aec0'}; font-style: ${notes ? 'normal' : 'italic'}">
              ${notes || 'No additional notes'}
            </div>
          </div>
          
          <div class="totals-box">
            <div class="totals-row">
              <div class="totals-label">Subtotal</div>
              <div class="totals-value">${formatINR(totals.subtotal || 0)}</div>
            </div>
            <div class="totals-row">
              <div class="totals-label">Adjustment</div>
              <div class="totals-value">${formatINR(0)}</div>
            </div>
            <div class="totals-row">
              <div class="totals-label">Tax</div>
              <div class="totals-value">${formatINR(totals.gst || 0)}</div>
            </div>
            <div class="totals-row total">
              <div class="totals-label">Total Amount</div>
              <div class="totals-value">${formatINR(totals.total || 0)}</div>
            </div>
            <div class="totals-row balance">
              <div class="totals-label">Balance Due</div>
              <div class="totals-value">${formatINR(totals.total || 0)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Terms and Conditions -->
    <div class="section">
      <div class="section-header">TERMS AND CONDITIONS</div>
      <div class="section-body compact">
        <div class="terms-text">
          <p>As per Agreement</p>
          <p>* Reverse Charge Mechanism not applicable</p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer" style="display: flex; align-items: center; justify-content: center; gap: 8px;">
      <span>INVOICE GENERATED ON</span>
      <a href="https://hourly.design" target="_blank" style="display: flex; align-items: center; text-decoration: none;">
        ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" style="height: 14pt; width: auto; vertical-align: middle;" alt="Hourly" />` : '<span style="color: #2d3748; font-weight: 700;">HOURLY.DESIGN</span>'}
      </a>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// Export router (default) + internal helper for public approval routes
module.exports = router;
module.exports._generateInvoiceHTMLFromSnapshot = generateInvoiceHTMLFromSnapshot;