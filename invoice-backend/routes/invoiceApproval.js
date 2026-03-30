const express = require('express');
const router = express.Router();

const apps = require('../lib/appsScriptClient');
const logger = require('../utils/logger');
const { sendInvoiceEmail } = require('../utils/invoiceEmailService');
const { verifyApprovalToken, markTokenUsed } = require('../utils/approvalTokens');

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

// NOTE: We reuse the same HTML generator from invoices routes via require
// to keep the PDF/email rendering consistent.
const { _generateInvoiceHTMLFromSnapshot } = require('./invoices');

router.get('/approve', async (req, res) => {
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

    const invoiceHTML = _generateInvoiceHTMLFromSnapshot(snapshot);
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

router.get('/reject', async (req, res) => {
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
    const consultantEmail = snapshot?.consultant?.email || invoice.consultantEmail || invoice.consultant?.email;

    const rejectNoticeHtml = `
      <div style="font-family: Arial, sans-serif;">
        <h2 style="margin:0 0 8px 0;">Invoice rejected</h2>
        <p style="margin:0 0 12px 0;">Invoice <strong>${snapshot?.meta?.invoiceNumber || invoice.invoiceNumber || invoiceId}</strong> has been rejected by Hourly.</p>
        <p style="margin:0;">Please review and re-submit for approval.</p>
      </div>
    `.trim();

    // Consultant notification
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

    // Hourly notification
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

module.exports = router;

