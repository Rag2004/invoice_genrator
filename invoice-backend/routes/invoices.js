

// ============================================================================
// routes/invoices.js - UPDATED WITH SECURE CLIENT EMAIL
// ============================================================================

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
        error: 'Invoice ID required - cannot share drafts' 
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
          error: 'Can only share finalized invoices'
        });
      }
    }
    
    // ✅ SECURITY: Fetch invoice to get CLIENT EMAIL from stored data
    const invoiceResult = await apps.getInvoiceById(invoiceId);
    
    if (!invoiceResult?.ok) {
      return res.status(404).json({
        ok: false,
        error: 'Invoice not found'
      });
    }
    
    const invoice = invoiceResult.invoice;
    
    // ✅ CRITICAL: Extract client email from invoice snapshot (SINGLE SOURCE OF TRUTH)
    let clientEmail = null;
    
    if (invoice.snapshot?.client?.email) {
      clientEmail = invoice.snapshot.client.email;
    } else if (invoice.client?.email) {
      clientEmail = invoice.client.email;
    }
    
    // ✅ VALIDATION: Client email must exist in invoice data
    if (!clientEmail || !clientEmail.trim()) {
      logger.error({ invoiceId }, '❌ Client email missing in invoice data');
      return res.status(400).json({ 
        ok: false, 
        error: 'Client email not found in invoice data. Please contact support.' 
      });
    }
    
    // ✅ VALIDATION: Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientEmail)) {
      logger.error({ invoiceId, clientEmail }, '❌ Invalid client email format');
      return res.status(400).json({
        ok: false,
        error: 'Invalid client email format in records'
      });
    }
    
    logger.info({ 
      invoiceId, 
      clientEmail: clientEmail.replace(/(?<=.{2}).*(?=@)/, '***') // Mask for logs
    }, '✅ Using client email from invoice data');
    
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
    };
    
    // ✅ SEND EMAIL (toEmail comes from invoice data ONLY)
    const result = await sendInvoiceEmail({
      toEmail: clientEmail, // 🔒 SECURITY: From invoice data only
      invoice: emailPayload,
      invoiceHTML: html
    });
    
    logger.info({ 
      invoiceId, 
      clientEmail: clientEmail.replace(/(?<=.{2}).*(?=@)/, '***')
    }, '✅ Invoice sent successfully to client');
    
    return res.json({ 
      ok: true, 
      message: 'Invoice sent successfully to client',
      sentTo: clientEmail.replace(/(?<=.{2}).*(?=@)/, '***'), // Masked response
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
    
    // ✅ EXTRACT: Client email from snapshot
    const clientEmail = snapshot?.client?.email;
    
    if (!clientEmail || !clientEmail.trim()) {
      logger.error({ invoiceId }, '❌ Client email missing in invoice snapshot');
      return res.status(400).json({ 
        ok: false, 
        error: 'Client email not found in invoice. Please update the project with client email and regenerate the invoice.' 
      });
    }
    
    // ✅ VALIDATE: Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientEmail)) {
      logger.error({ invoiceId, clientEmail }, '❌ Invalid client email format');
      return res.status(400).json({
        ok: false,
        error: 'Invalid client email format in invoice data'
      });
    }
    
    logger.info({ 
      invoiceId, 
      clientEmail: clientEmail.replace(/(?<=.{2}).*(?=@)/, '***')
    }, '✅ Client email found, generating invoice HTML');
    
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
    };
    
    // ✅ SEND: Email with PDF
    const emailResult = await sendInvoiceEmail({
      toEmail: clientEmail,
      invoice: emailPayload,
      invoiceHTML: invoiceHTML
    });
    
    logger.info({ 
      invoiceId,
      invoiceNumber: emailPayload.invoiceNumber,
      clientEmail: clientEmail.replace(/(?<=.{2}).*(?=@)/, '***'),
      hasPDF: emailResult.hasPDF
    }, '✅ Invoice auto-shared successfully');
    
    return res.json({ 
      ok: true,
      success: true,
      message: 'Invoice sent successfully',
      sentTo: clientEmail, // ✅ Return full email (frontend can mask if needed)
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
  const totals = snapshot.totals || {};
  const serviceProvider = snapshot.serviceProvider || {};
  const compliance = snapshot.compliance || {};
  const notes = snapshot.notes || '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${meta.invoiceNumber || 'DRAFT'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica', Arial, sans-serif;
      background: #ffffff;
      color: #2d3748;
      font-size: 10pt;
      line-height: 1.4;
    }
    .invoice-container {
      max-width: 210mm;
      margin: 0 auto;
      background: white;
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
    }
    .info-value.empty {
      color: #a0aec0;
      font-style: italic;
    }
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
    }
    thead th:last-child {
      border-right: none;
    }
    thead th.right {
      text-align: right;
    }
    thead th.center {
      text-align: center;
    }
    tbody td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
      border-right: 1px solid #e2e8f0;
      font-size: 9pt;
      color: #2d3748;
    }
    tbody td:last-child {
      border-right: none;
    }
    tbody tr:last-child td {
      border-bottom: none;
    }
    tbody td.center {
      text-align: center;
    }
    tbody td.right {
      text-align: right;
      font-weight: 600;
    }
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
    .totals-row:last-child {
      border-bottom: none;
    }
    .totals-label {
      font-size: 9pt;
      color: #2d3748;
      font-weight: 600;
    }
    .totals-value {
      font-size: 9pt;
      font-weight: 600;
      color: #2d3748;
      text-align: right;
      white-space: nowrap;
    }
    .totals-row.total {
      background: #2d3748;
    }
    .totals-row.total .totals-label,
    .totals-row.total .totals-value {
      color: #ffffff;
      font-size: 10pt;
      font-weight: 700;
    }
    .footer {
      padding: 20px 30px;
      border-top: 2px solid #cbd5e0;
      text-align: center;
      font-size: 7pt;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div class="invoice-title">INVOICE</div>
    </div>

    <!-- Service Provider -->
    <div class="section">
      <div class="section-header">HOURLY VENTURES LLP</div>
      <div class="section-body">
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
      <div class="section-body">
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Business Name</div>
            <div class="info-value ${!consultant.businessName ? 'empty' : ''}">
              ${consultant.businessName || 'Not provided'}
            </div>
          </div>
          <div class="info-item">
            <div class="info-label">Registered Office</div>
            <div class="info-value ${!consultant.registeredOffice ? 'empty' : ''}">
              ${consultant.registeredOffice || 'Not provided'}
            </div>
          </div>
          <div class="info-item">
            <div class="info-label">State Name & Code</div>
            <div class="info-value ${!consultant.stateCode ? 'empty' : ''}">
              ${consultant.stateCode || 'Not provided'}
            </div>
          </div>
          <div class="info-item">
            <div class="info-label">PAN</div>
            <div class="info-value ${!consultant.pan ? 'empty' : ''}">
              ${consultant.pan || 'Not provided'}
            </div>
          </div>
          <div class="info-item">
            <div class="info-label">GSTIN</div>
            <div class="info-value ${!consultant.gstin ? 'empty' : ''}">
              ${consultant.gstin || 'Not provided'}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Client -->
    <div class="section">
      <div class="section-header">CLIENT</div>
      <div class="section-body">
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Name (ID)</div>
            <div class="info-value">${client.name || 'Not provided'}</div>
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

    <!-- Invoice Details -->
    <div class="section">
      <div class="section-header">INVOICE AND SERVICE DETAILS</div>
      <div class="section-body">
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Invoice No.</div>
            <div class="info-value">${meta.invoiceNumber || '—'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Invoice Date</div>
            <div class="info-value">${meta.invoiceDate || '—'}</div>
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
            <div class="info-label">Consultant Fee (Hourly)</div>
            <div class="info-value">${formatINR(consultant.hourlyRate || 0)}/hr</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Team Summary -->
    <div class="section">
      <div class="section-header">TEAM SUMMARY AND BILLING</div>
      <div class="section-body">
        <table>
          <thead>
            <tr>
              <th style="width: 5%">#</th>
              <th style="width: 25%">Team Member</th>
              <th class="center" style="width: 20%">Mode</th>
              <th class="right" style="width: 12%">Rate</th>
              <th class="right" style="width: 15%">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${(work.items || []).map((item, idx) => `
              <tr>
                <td class="center">${idx + 1}</td>
                <td>${item.name || '—'}</td>
                <td class="center">${item.mode || '—'}</td>
                <td class="right">${formatINR(item.rate || 0)}</td>
                <td class="right">${formatINR(item.amount || 0)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals-section">
          <div class="notes-box">
            <div class="notes-label">NOTES</div>
            <div>${notes || 'No additional notes'}</div>
          </div>
          
          <div class="totals-box">
            <div class="totals-row">
              <div class="totals-label">Subtotal</div>
              <div class="totals-value">${formatINR(totals.subtotal || 0)}</div>
            </div>
            <div class="totals-row">
              <div class="totals-label">Tax</div>
              <div class="totals-value">${formatINR(totals.gst || 0)}</div>
            </div>
            <div class="totals-row total">
              <div class="totals-label">Total Amount</div>
              <div class="totals-value">${formatINR(totals.total || 0)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      Invoice generated on Hourly.Design
    </div>
  </div>
</body>
</html>
  `.trim();
}

module.exports = router;