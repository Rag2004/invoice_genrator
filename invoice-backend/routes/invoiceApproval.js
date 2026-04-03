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

function normalizeGstRate(raw) {
  let r = Number(raw ?? 0);
  if (!Number.isFinite(r)) r = 0;
  if (r > 1) r = r / 100;
  return r;
}

function recomputeTotals(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return snapshot;
  const totals = snapshot.totals || {};
  const items = snapshot.work?.items || [];
  const subtotal = Number(totals.subtotal ?? items.reduce((s, it) => s + Number(it?.amount || 0), 0)) || 0;

  const gstRate = normalizeGstRate(
    totals.gstRate ??
    snapshot.project?.gstRate ??
    snapshot.project?.gst ??
    snapshot.project?.GST ??
    0
  );

  const gst = Math.round(subtotal * gstRate);
  const total = subtotal + gst;

  snapshot.totals = {
    ...totals,
    subtotal,
    gstRate,
    gst,
    total,
  };
  return snapshot;
}

function escapeHtml(input) {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderStatusPage({ title, message, variant = 'success' }) {
  const isSuccess = variant === 'success';
  const accent = isSuccess ? '#16a34a' : '#dc2626';
  const bg = isSuccess ? '#ecfdf5' : '#fef2f2';
  const icon = isSuccess
    ? `
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M20 6L9 17l-5-5" stroke="${accent}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `
    : `
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M18 6L6 18" stroke="${accent}" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M6 6l12 12" stroke="${accent}" stroke-width="2.6" stroke-linecap="round"/>
      </svg>
    `;

  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(title)}</title>
      <style>
        :root { color-scheme: light; }
        body {
          margin: 0;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
          background: #f8fafc;
          color: #0f172a;
        }
        .wrap {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
        }
        .card {
          width: 100%;
          max-width: 520px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
          overflow: hidden;
        }
        .top {
          background: ${bg};
          padding: 26px 22px;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          background: white;
          display: grid;
          place-items: center;
          border: 1px solid rgba(2, 6, 23, 0.06);
        }
        .title {
          font-size: 18px;
          font-weight: 800;
          line-height: 1.2;
          margin: 0;
        }
        .body {
          padding: 18px 22px 22px 22px;
        }
        .msg {
          margin: 0;
          font-size: 14px;
          line-height: 1.6;
          color: #334155;
        }
        .hint {
          margin-top: 14px;
          font-size: 12px;
          color: #64748b;
        }
        .btn {
          margin-top: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          text-decoration: none;
          color: #0f172a;
          font-weight: 700;
          background: #ffffff;
        }
        .btn:active { transform: translateY(1px); }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="card">
          <div class="top">
            <div class="icon">${icon}</div>
            <div>
              <h1 class="title">${escapeHtml(title)}</h1>
            </div>
          </div>
          <div class="body">
            <p class="msg">${escapeHtml(message)}</p>
            <div class="hint">You can safely close this tab.</div>
            <a class="btn" href="https://hourly.design" target="_blank" rel="noopener noreferrer">Go to Hourly</a>
          </div>
        </div>
      </div>
    </body>
  </html>
  `.trim();
}

async function handleApproveToken(v, res) {
  const invoiceId = v.payload.invoiceId;
    const invoiceResult = await apps.getInvoiceById(invoiceId);
    if (!invoiceResult?.ok) {
      return res.status(404).send(renderStatusPage({
        title: 'Invoice not found',
        message: 'We could not find this invoice. Please request a fresh approval email.',
        variant: 'error',
      }));
    }

    const invoice = invoiceResult.invoice;
    let snapshot;
    try {
      snapshot = typeof invoice.snapshot === 'string' ? JSON.parse(invoice.snapshot) : invoice.snapshot;
    } catch (e) {
      return res.status(400).send(renderStatusPage({
        title: 'Invoice data error',
        message: 'This invoice cannot be processed due to invalid data. Please contact support.',
        variant: 'error',
      }));
    }
    snapshot = recomputeTotals(snapshot);

    const clientEmail = snapshot?.client?.email || invoice.client?.email;
    if (!isValidEmail(clientEmail)) {
      return res.status(400).send(renderStatusPage({
        title: 'Client email missing',
        message: 'Client email is missing or invalid on this invoice. Please update the project details and re-generate the invoice.',
        variant: 'error',
      }));
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

    return res.send(renderStatusPage({
      title: 'Approved',
      message: 'Invoice has been approved and sent to the client.',
      variant: 'success',
    }));
}

router.get('/approve', async (req, res) => {
  try {
    const token = req.query.token;
    const v = verifyApprovalToken(token);
    if (!v.ok) {
      const isUsed = String(v.error || '').toLowerCase().includes('used');
      return res.status(400).send(renderStatusPage({
        title: isUsed ? 'Invoice already processed' : 'Invalid approval link',
        message: isUsed
          ? 'This invoice has already been processed. If you need to make changes, please ask the consultant to re-send it for approval.'
          : `This link is ${v.error}. Please request a fresh approval email.`,
        variant: 'error',
      }));
    }
    if (v.payload.action !== 'approve') {
      return res.status(400).send(renderStatusPage({
        title: 'Invalid action',
        message: 'This approval link is not valid. Please request a fresh approval email.',
        variant: 'error',
      }));
    }

    // Preview page with POST form; do not mark token used or send email yet.
    return res.send(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Approve invoice</title>
          <style>
            body { margin:0; font-family: system-ui, -apple-system, Segoe UI, sans-serif; background:#f8fafc; color:#0f172a; }
            .wrap { min-height:100vh; display:grid; place-items:center; padding:24px; }
            .card { width:100%; max-width:520px; background:white; border-radius:16px; border:1px solid #e2e8f0; box-shadow:0 20px 60px rgba(15,23,42,0.08); padding:22px 22px 20px; }
            h1 { font-size:20px; margin:0 0 8px; }
            p { margin:0 0 12px; font-size:14px; line-height:1.6; color:#334155; }
            form { margin-top:16px; display:flex; gap:10px; }
            button { flex:1; border-radius:10px; border:none; padding:10px 14px; font-weight:700; cursor:pointer; }
            .primary { background:#16a34a; color:white; }
            .secondary { background:white; color:#0f172a; border:1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="wrap">
            <div class="card">
              <h1>Approve invoice?</h1>
              <p>Review this invoice in Hourly if needed, then click Approve to send it to the client.</p>
              <form method="POST" action="/api/invoices/approval/approve">
                <input type="hidden" name="token" value="${escapeHtml(token)}" />
                <button type="submit" class="primary">Approve &amp; send to client</button>
                <button type="button" class="secondary" onclick="window.close()">Cancel</button>
              </form>
            </div>
          </div>
        </body>
      </html>
    `.trim());
  } catch (err) {
    logger.error({ err: err.message, stack: err.stack }, 'Approval approve preview failed');
    return res.status(500).send(renderStatusPage({
      title: 'Something went wrong',
      message: err.message || 'Unexpected error',
      variant: 'error',
    }));
  }
});

router.post('/approve', async (req, res) => {
  try {
    const token = req.body?.token || req.query.token;
    const v = verifyApprovalToken(token);
    if (!v.ok) {
      const isUsed = String(v.error || '').toLowerCase().includes('used');
      return res.status(400).send(renderStatusPage({
        title: isUsed ? 'Invoice already processed' : 'Invalid approval link',
        message: isUsed
          ? 'This approval link has already been used. If you made further changes, please ask the consultant to re-send the invoice for approval.'
          : `This link is ${v.error}. Please request a fresh approval email.`,
        variant: 'error',
      }));
    }
    if (v.payload.action !== 'approve') {
      return res.status(400).send(renderStatusPage({
        title: 'Invalid action',
        message: 'This approval link is not valid. Please request a fresh approval email.',
        variant: 'error',
      }));
    }

    markTokenUsed(v.payload.nonce);
    return handleApproveToken(v, res);
  } catch (err) {
    logger.error({ err: err.message, stack: err.stack }, 'Approval approve failed');
    return res.status(500).send(renderStatusPage({
      title: 'Something went wrong',
      message: err.message || 'Unexpected error',
      variant: 'error',
    }));
  }
});

async function handleRejectToken(v, res) {
  const invoiceId = v.payload.invoiceId;
    const invoiceResult = await apps.getInvoiceById(invoiceId);
    if (!invoiceResult?.ok) {
      return res.status(404).send(renderStatusPage({
        title: 'Invoice not found',
        message: 'We could not find this invoice. Please request a fresh approval email.',
        variant: 'error',
      }));
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

    return res.send(renderStatusPage({
      title: 'Rejected',
      message: 'Invoice has been rejected. The consultant has been notified.',
      variant: 'success',
    }));
}

router.get('/reject', async (req, res) => {
  try {
    const token = req.query.token;
    const v = verifyApprovalToken(token);
    if (!v.ok) {
      const isUsed = String(v.error || '').toLowerCase().includes('used');
      return res.status(400).send(renderStatusPage({
        title: isUsed ? 'Invoice already processed' : 'Invalid rejection link',
        message: isUsed
          ? 'This invoice has already been processed. If you need to make changes, please ask the consultant to re-send it for approval.'
          : `This link is ${v.error}. Please request a fresh approval email.`,
        variant: 'error',
      }));
    }
    if (v.payload.action !== 'reject') {
      return res.status(400).send(renderStatusPage({
        title: 'Invalid action',
        message: 'This rejection link is not valid. Please request a fresh approval email.',
        variant: 'error',
      }));
    }

    // Preview page with POST form; do not mark token used or send emails yet.
    return res.send(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Reject invoice</title>
          <style>
            body { margin:0; font-family: system-ui, -apple-system, Segoe UI, sans-serif; background:#f8fafc; color:#0f172a; }
            .wrap { min-height:100vh; display:grid; place-items:center; padding:24px; }
            .card { width:100%; max-width:520px; background:white; border-radius:16px; border:1px solid #e2e8f0; box-shadow:0 20px 60px rgba(15,23,42,0.08); padding:22px 22px 20px; }
            h1 { font-size:20px; margin:0 0 8px; }
            p { margin:0 0 12px; font-size:14px; line-height:1.6; color:#334155; }
            form { margin-top:16px; display:flex; gap:10px; }
            button { flex:1; border-radius:10px; border:none; padding:10px 14px; font-weight:700; cursor:pointer; }
            .danger { background:#dc2626; color:white; }
            .secondary { background:white; color:#0f172a; border:1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="wrap">
            <div class="card">
              <h1>Reject invoice?</h1>
              <p>This will notify the consultant and Hourly that the invoice was rejected so it can be revised.</p>
              <form method="POST" action="/api/invoices/approval/reject">
                <input type="hidden" name="token" value="${escapeHtml(token)}" />
                <button type="submit" class="danger">Reject invoice</button>
                <button type="button" class="secondary" onclick="window.close()">Cancel</button>
              </form>
            </div>
          </div>
        </body>
      </html>
    `.trim());
  } catch (err) {
    logger.error({ err: err.message, stack: err.stack }, 'Approval reject preview failed');
    return res.status(500).send(renderStatusPage({
      title: 'Something went wrong',
      message: err.message || 'Unexpected error',
      variant: 'error',
    }));
  }
});

router.post('/reject', async (req, res) => {
  try {
    const token = req.body?.token || req.query.token;
    const v = verifyApprovalToken(token);
    if (!v.ok) {
      const isUsed = String(v.error || '').toLowerCase().includes('used');
      return res.status(400).send(renderStatusPage({
        title: isUsed ? 'Invoice already processed' : 'Invalid rejection link',
        message: isUsed
          ? 'This rejection link has already been used. If you made further changes, please ask the consultant to re-send the invoice for approval.'
          : `This link is ${v.error}. Please request a fresh approval email.`,
        variant: 'error',
      }));
    }
    if (v.payload.action !== 'reject') {
      return res.status(400).send(renderStatusPage({
        title: 'Invalid action',
        message: 'This rejection link is not valid. Please request a fresh approval email.',
        variant: 'error',
      }));
    }

    markTokenUsed(v.payload.nonce);
    return handleRejectToken(v, res);
  } catch (err) {
    logger.error({ err: err.message, stack: err.stack }, 'Approval reject failed');
    return res.status(500).send(renderStatusPage({
      title: 'Something went wrong',
      message: err.message || 'Unexpected error',
      variant: 'error',
    }));
  }
});

module.exports = router;

