
// // routes/invoices.js - PRODUCTION FIXED
// const express = require('express');
// const router = express.Router();
// const apps = require('../lib/appsScriptClient');
// const logger = require('../utils/logger');
// const { sendInvoiceEmail } = require('../utils/invoiceEmailService');

// /* ============================================================================
//    HELPER: Extract consultantId
// ============================================================================ */
// function getConsultantId(req) {
//   return (
//     req.user?.consultantId ||
//     req.user?.consultant_id ||
//     req.user?.id ||
//     req.headers['x-consultant-id'] ||
//     req.headers['X-Consultant-Id'] ||
//     null
//   );
// }


// /* ============================================================================
//    🔒 SECURITY: Verify Ownership
// ============================================================================ */
// async function verifyInvoiceOwnership(invoiceId, consultantId) {
//   if (!invoiceId || !consultantId) {
//     return { ok: false, error: 'Missing invoiceId or consultantId' };
//   }

//   try {
//     const result = await apps.getInvoiceById(invoiceId);
    
//     if (!result?.ok) {
//       return { ok: false, error: 'Invoice not found', statusCode: 404 };
//     }

//     const invoiceConsultantId = result.invoice?.consultantId;

//     if (invoiceConsultantId && invoiceConsultantId !== consultantId) {
//       logger.warn(
//         { invoiceId, consultantId, invoiceConsultantId },
//         '🚫 Unauthorized access attempt'
//       );
//       return { ok: false, error: 'Access denied', statusCode: 403 };
//     }

//     return { ok: true, invoice: result.invoice };
//   } catch (err) {
//     logger.error(err, 'Ownership verification failed');
//     return { ok: false, error: 'Verification failed', statusCode: 500 };
//   }
// }

// /* ============================================================================
//    CREATE DRAFT - Store INPUTS only (nested structure)
// ============================================================================ */

// router.post('/draft', async (req, res) => {
//   try {
//     const consultantId =
//       getConsultantId(req) ||
//       req.body.consultantId ||
//       req.body.data?.consultantId;

//     if (!consultantId) {
//       return res.status(400).json({ ok: false, error: 'consultantId required' });
//     }

//     const invoiceData =
//       req.body.invoiceData || req.body.data?.invoiceData;

//     // ✅ Support nested structure
//     const projectCode =
//       invoiceData?.project?.projectCode || invoiceData?.projectCode;

//     if (!projectCode) {
//       return res.status(400).json({ ok: false, error: 'projectCode required' });
//     }

//     logger.info({ consultantId, projectCode }, 'CREATE DRAFT');

//     const result = await apps.createDraft({
//       consultantId,
//       invoiceData  // ✅ Pass nested structure as-is
//     });

//     if (!result?.ok) {
//       return res.status(500).json({
//         ok: false,
//         error: result?.error || 'Failed to create draft'
//       });
//     }

//     return res.json(result);
//   } catch (err) {
//     logger.error(err, 'Create draft failed');
//     return res.status(500).json({ ok: false, error: err.message });
//   }
// });


// /* ============================================================================
//    UPDATE DRAFT - 🔒 With ownership check
// ============================================================================ */

// router.post('/draft/:invoiceId', async (req, res) => {
//   try {
//     const consultantId = getConsultantId(req);
//     const { invoiceId } = req.params;

//     if (!consultantId || !invoiceId) {
//       return res.status(400).json({
//         ok: false,
//         error: 'invoiceId and consultantId required'
//       });
//     }

//     const ownership = await verifyInvoiceOwnership(invoiceId, consultantId);
//     if (!ownership.ok) {
//       return res.status(ownership.statusCode || 403).json({
//         ok: false,
//         error: ownership.error
//       });
//     }

//     if (String(ownership.invoice.status).toUpperCase() === 'FINAL') {
//       return res.status(400).json({
//         ok: false,
//         error: 'Cannot edit finalized invoice'
//       });
//     }

//     const { invoiceData } = req.body;

//     // ✅ Support nested structure
//     const projectCode = 
//       invoiceData?.project?.projectCode || invoiceData?.projectCode;

//     logger.info(
//       {
//         invoiceId,
//         consultantId,
//         projectCode
//       },
//       'UPDATE DRAFT (authorized)'
//     );

//     const result = await apps.updateDraft(invoiceId, {
//       consultantId,
//       invoiceData  // ✅ Pass nested structure as-is
//     });

//     if (!result?.ok) {
//       return res.status(500).json({
//         ok: false,
//         error: result?.error || 'Failed to update draft'
//       });
//     }

//     return res.json(result);
//   } catch (err) {
//     logger.error(err, 'Update draft failed');
//     return res.status(500).json({ ok: false, error: err.message });
//   }
// });


// /* ============================================================================
//    FINALIZE INVOICE - 🔒 Trust frontend snapshot (single source of truth)
// ============================================================================ */

// router.post('/finalize', async (req, res) => {
//   try {
//     const consultantId = getConsultantId(req);
//     if (!consultantId) {
//       return res.status(400).json({
//         ok: false,
//         error: 'consultantId required'
//       });
//     }

//     const { invoiceId, snapshot } = req.body;

//     logger.info(
//       { consultantId, invoiceId: invoiceId || 'NEW' },
//       'FINALIZE INVOICE REQUEST'
//     );

//     // ------------------------------------------------------------------
//     // 1️⃣ STRICT SNAPSHOT VALIDATION
//     // ------------------------------------------------------------------
//     if (!snapshot || typeof snapshot !== 'object') {
//       return res.status(400).json({
//         ok: false,
//         error: 'snapshot required'
//       });
//     }

//     if (!snapshot.project?.projectCode) {
//       return res.status(400).json({
//         ok: false,
//         error: 'snapshot.project.projectCode required'
//       });
//     }

//     if (!Array.isArray(snapshot.work?.items) || snapshot.work.items.length === 0) {
//       return res.status(400).json({
//         ok: false,
//         error: 'snapshot.work.items required'
//       });
//     }

//     // ------------------------------------------------------------------
//     // 2️⃣ OPTIONAL OWNERSHIP CHECK (ONLY IF invoiceId PROVIDED)
//     // ------------------------------------------------------------------
//     if (invoiceId) {
//       const ownership = await verifyInvoiceOwnership(invoiceId, consultantId);

//       if (!ownership.ok) {
//         return res.status(ownership.statusCode || 403).json({
//           ok: false,
//           error: ownership.error
//         });
//       }

//       if (String(ownership.invoice.status).toUpperCase() === 'FINAL') {
//         return res.status(400).json({
//           ok: false,
//           error: 'Invoice already finalized'
//         });
//       }
//     }

//     // ------------------------------------------------------------------
//     // 3️⃣ AUDIT TOTALS (DO NOT OVERRIDE FRONTEND)
//     // ------------------------------------------------------------------
//     const items = snapshot.work.items;

//     const auditSubtotal = items.reduce(
//       (sum, i) => sum + Number(i.amount || 0),
//       0
//     );

//     const auditGst = Math.round(auditSubtotal * 0.18);
//     const auditTotal = auditSubtotal + auditGst;

//     if (Math.abs(auditTotal - Number(snapshot.totals?.total || 0)) > 1) {
//       logger.warn(
//         {
//           invoiceId: invoiceId || 'NEW',
//           frontendTotal: snapshot.totals?.total,
//           backendAuditTotal: auditTotal
//         },
//         '⚠️ TOTAL MISMATCH (trusting frontend snapshot)'
//       );
//     }

//     // ------------------------------------------------------------------
//     // 4️⃣ FINAL CANONICAL PAYLOAD
//     // ------------------------------------------------------------------
//     const finalInvoiceId = invoiceId || `INV_${Date.now()}`;

//     const payload = {
//       invoiceId: finalInvoiceId,
//       consultantId,
//       status: 'FINAL',
//       snapshot: {
//         ...snapshot,
//         meta: {
//           ...snapshot.meta,
//           invoiceId: finalInvoiceId,
//           status: 'FINAL',
//           finalizedAt: new Date().toISOString()
//         }
//       }
//     };

//     logger.info(
//       {
//         invoiceId: payload.invoiceId,
//         projectCode: snapshot.project.projectCode,
//         subtotal: snapshot.totals?.subtotal,
//         gst: snapshot.totals?.gst,
//         total: snapshot.totals?.total,
//         items: items.length
//       },
//       'FINALIZE → saveInvoice'
//     );

//     // ------------------------------------------------------------------
//     // 5️⃣ SINGLE SOURCE SAVE
//     // ------------------------------------------------------------------
//     const result = await apps.saveInvoice(payload);

//     if (!result?.ok) {
//       return res.status(500).json({
//         ok: false,
//         error: result?.error || 'Failed to save invoice'
//       });
//     }

//     // ------------------------------------------------------------------
//     // 6️⃣ SUCCESS RESPONSE
//     // ------------------------------------------------------------------
//     return res.json({
//       ok: true,
//       invoiceId: result.invoiceId,
//       invoiceNumber: result.invoiceNumber,
//       status: 'FINAL'
//     });

//   } catch (err) {
//     logger.error(err, 'FINALIZE FAILED');
//     return res.status(500).json({
//       ok: false,
//       error: err.message || 'internal_error'
//     });
//   }
// });


// /* ============================================================================
//    LIST INVOICES BY CONSULTANT
// ============================================================================ */

// router.get('/', async (req, res) => {
//   try {
//     const consultantId = getConsultantId(req);
//     if (!consultantId) {
//       return res.status(400).json({ ok: false, error: 'consultantId required' });
//     }

//     logger.info({ consultantId }, 'Listing invoices');

//     const result = await apps.listInvoicesByConsultant(consultantId);
    
//     if (!result?.ok) {
//       return res.status(500).json({ ok: false, invoices: [] });
//     }

//     return res.json({ ok: true, invoices: result.invoices || [] });
//   } catch (err) {
//     logger.error(err, 'List invoices failed');
//     return res.status(500).json({ ok: false, invoices: [] });
//   }
// });

// /* ============================================================================
//    GET SINGLE INVOICE - 🔒 With ownership check
// ============================================================================ */

// router.get('/:invoiceId', async (req, res) => {
//   try {
//     const consultantId = getConsultantId(req);
//     const { invoiceId } = req.params;

//     if (!consultantId || !invoiceId) {
//       return res.status(400).json({
//         ok: false,
//         error: 'consultantId and invoiceId required'
//       });
//     }

//     const ownership = await verifyInvoiceOwnership(invoiceId, consultantId);
//     if (!ownership.ok) {
//       return res.status(ownership.statusCode || 403).json({
//         ok: false,
//         error: ownership.error
//       });
//     }

//     const invoice = ownership.invoice;

//     // ✅ Validate data integrity
//     if (String(invoice.status).toUpperCase() === 'FINAL') {
//       if (!invoice.snapshot) {
//         logger.warn({ invoiceId }, '⚠️ Final invoice missing snapshot');
//       }
//     } else if (invoice.status === 'DRAFT') {
//       if (!invoice.invoiceData) {
//         logger.warn({ invoiceId }, '⚠️ Draft missing invoiceData');
//       }
//     }

//     return res.json({ ok: true, invoice });
//   } catch (err) {
//     logger.error(err, 'Get invoice failed');
//     return res.status(500).json({ ok: false, error: err.message });
//   }
// });


// /* ============================================================================
//    SHARE INVOICE (EMAIL WITH PDF)
// ============================================================================ */

// router.post('/share', async (req, res) => {
//   try {
//     const consultantId = getConsultantId(req);
//     const { 
//       toEmail, 
//       invoiceId, 
//       html, 
//       projectCode, 
//       consultantName, 
//       total, 
//       subtotal, 
//       gst 
//     } = req.body;
    
//     logger.info({
//       consultantId,
//       toEmail: !!toEmail,
//       invoiceId: invoiceId || 'DRAFT',
//       hasHtml: !!html
//     }, '📧 Share invoice');
    
//     if (!toEmail || !html) {
//       return res.status(400).json({ 
//         ok: false, 
//         error: 'email and html required' 
//       });
//     }

//     // 🔒 Verify ownership if invoiceId provided
//     if (invoiceId && consultantId) {
//       const ownership = await verifyInvoiceOwnership(invoiceId, consultantId);
//       if (!ownership.ok) {
//         return res.status(ownership.statusCode || 403).json({ 
//           ok: false, 
//           error: ownership.error 
//         });
//       }
//     }

//     const invoice = {
//       invoiceNumber: invoiceId || 'DRAFT',
//       invoiceId: invoiceId,
//       projectCode: projectCode || 'N/A',
//       consultantName: consultantName || 'Consultant',
//       total: total || 0,
//       subtotal: subtotal || 0,
//       gst: gst || 0,
//     };

//     const result = await sendInvoiceEmail({
//       toEmail: toEmail,
//       invoice: invoice,
//       invoiceHTML: html
//     });

//     logger.info({ toEmail, invoiceId }, '✅ Invoice sent');
    
//     return res.json({ 
//       ok: true, 
//       message: 'Invoice sent successfully',
//       format: result.format,
//       hasPDF: result.hasPDF
//     });
    
//   } catch (err) {
//     logger.error({ error: err.message }, '❌ Share invoice failed');
//     return res.status(500).json({ 
//       ok: false, 
//       error: err.message || 'Failed to send invoice' 
//     });
//   }
// });

// module.exports = router;

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

module.exports = router;