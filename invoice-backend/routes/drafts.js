
// routes/drafts.js
const express = require('express');
const router = express.Router();
const apps = require('../lib/appsScriptClient');
const logger = require('../utils/logger');

// ============================================================================
// POST /api/drafts - Create new draft (CONSULTANT-SPECIFIC)
// ============================================================================
router.post('/', async (req, res) => {
  try {
    const consultantId = req.headers['x-consultant-id'] || req.body.consultantId;
    
    if (!consultantId) {
      logger.warn('Create draft: Missing consultantId');
      return res.status(400).json({ error: 'consultantId required' });
    }

    const draftData = {
      consultantId,
      projectCode: req.body.projectCode || '',
      clientCode: req.body.clientCode || '',
      consultantName: req.body.consultantName || '',
      invoiceData: req.body.invoiceData || {},
      completionPercentage: req.body.completionPercentage || 0,
    };

    logger.info({ 
      consultantId, 
      projectCode: draftData.projectCode,
      clientCode: draftData.clientCode 
    }, 'Creating draft');

    const result = await apps.createDraft(draftData);

    if (!result || !result.ok) {
      logger.error({ result }, 'Failed to create draft');
      return res.status(500).json({ error: result?.error || 'Failed to create draft' });
    }

    logger.info({ invoiceId: result.invoiceId }, 'Draft created successfully');
    return res.json(result);
    
  } catch (err) {
    logger.error({ err: err.message, stack: err.stack }, 'Error creating draft');
    return res.status(502).json({ error: 'Failed to create draft', message: err.message });
  }
});

// ============================================================================
// PUT /api/drafts/:invoiceId - Update existing draft (CONSULTANT-SPECIFIC)
// ============================================================================
router.put('/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const consultantId = req.headers['x-consultant-id'] || req.body.consultantId;

    if (!invoiceId) {
      return res.status(400).json({ error: 'invoiceId required' });
    }

    if (!consultantId) {
      return res.status(400).json({ error: 'consultantId required' });
    }

    const updateData = {
      consultantId, // ✅ Always include consultantId
      projectCode: req.body.projectCode,
      clientCode: req.body.clientCode,
      consultantName: req.body.consultantName,
      invoiceData: req.body.invoiceData,
      completionPercentage: req.body.completionPercentage,
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    logger.info({ invoiceId, consultantId }, 'Updating draft');

    const result = await apps.updateDraft(invoiceId, updateData);

    if (!result || !result.ok) {
      logger.error({ result }, 'Failed to update draft');
      return res.status(500).json({ error: result?.error || 'Failed to update draft' });
    }

    logger.info({ invoiceId }, 'Draft updated successfully');
    return res.json(result);
    
  } catch (err) {
    logger.error({ err: err.message, stack: err.stack }, 'Error updating draft');
    return res.status(502).json({ error: 'Failed to update draft', message: err.message });
  }
});

// ============================================================================
// GET /api/drafts/consultant/:consultantId - List all drafts (NEW ROUTE)
// ============================================================================
router.get('/consultant/:consultantId', async (req, res) => {
  try {
    const { consultantId } = req.params;

    if (!consultantId) {
      logger.warn('List drafts: Missing consultantId');
      return res.status(400).json({ error: 'consultantId required' });
    }

    logger.info({ consultantId }, 'Listing drafts for consultant (via URL param)');

    const result = await apps.listDrafts(consultantId);

    if (!result || !result.ok) {
      logger.error({ result }, 'Failed to list drafts');
      return res.status(500).json({ error: result?.error || 'Failed to list drafts' });
    }

    const draftCount = result.drafts ? result.drafts.length : 0;
    logger.info({ consultantId, draftCount }, 'Drafts retrieved successfully');
    
    return res.json(result);
    
  } catch (err) {
    logger.error({ err: err.message, stack: err.stack }, 'Error listing drafts');
    return res.status(502).json({ error: 'Failed to list drafts', message: err.message });
  }
});

// ============================================================================
// GET /api/drafts - List all drafts for consultant (CONSULTANT-SPECIFIC)
// ============================================================================
router.get('/', async (req, res) => {
  try {
    const consultantId = req.headers['x-consultant-id'] || req.query.consultantId;

    if (!consultantId) {
      logger.warn('List drafts: Missing consultantId');
      return res.status(400).json({ error: 'consultantId required' });
    }

    logger.info({ consultantId }, 'Listing drafts for consultant');

    const result = await apps.listDrafts(consultantId);

    if (!result || !result.ok) {
      logger.error({ result }, 'Failed to list drafts');
      return res.status(500).json({ error: result?.error || 'Failed to list drafts' });
    }

    const draftCount = result.drafts ? result.drafts.length : 0;
    logger.info({ consultantId, draftCount }, 'Drafts retrieved successfully');
    
    return res.json(result);
    
  } catch (err) {
    logger.error({ err: err.message, stack: err.stack }, 'Error listing drafts');
    return res.status(502).json({ error: 'Failed to list drafts', message: err.message });
  }
});

// ============================================================================
// GET /api/drafts/:invoiceId - Get single draft (CONSULTANT-SPECIFIC)
// ============================================================================
// routes/drafts.js - Add this route

// GET SINGLE DRAFT BY ID
router.get('/item/:invoiceId', async (req, res) => {
  try {
    const consultantId = getConsultantId(req);
    const { invoiceId } = req.params;

    if (!invoiceId) {
      return res.status(400).json({ ok: false, error: 'invoiceId required' });
    }

    logger.info({ invoiceId, consultantId }, 'Getting draft by ID');

    const result = await apps.getDraft(invoiceId);
    
    if (!result?.ok) {
      return res.status(404).json({ ok: false, error: 'Draft not found' });
    }

    // 🔒 Verify ownership
    const draftConsultantId = result.invoice?.consultantId || 
                               result.invoice?.consultant_id;

    if (consultantId && draftConsultantId && draftConsultantId !== consultantId) {
      logger.warn({ invoiceId, consultantId }, '🚫 Unauthorized draft access');
      return res.status(403).json({ ok: false, error: 'Access denied' });
    }

    return res.json({ ok: true, invoice: result.invoice });
  } catch (err) {
    logger.error(err, 'Get draft failed');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================================
// DELETE /api/drafts/:invoiceId - Delete draft (OPTIONAL)
// ============================================================================
router.delete('/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const consultantId = req.headers['x-consultant-id'];

    if (!invoiceId) {
      return res.status(400).json({ error: 'invoiceId required' });
    }

    if (!consultantId) {
      return res.status(400).json({ error: 'consultantId required' });
    }

    logger.info({ invoiceId, consultantId }, 'Deleting draft');

    // First verify ownership
    const checkResult = await apps.getDraft(invoiceId);
    if (!checkResult || !checkResult.ok || !checkResult.draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    if (checkResult.draft.consultantId !== consultantId) {
      logger.warn({ invoiceId, consultantId }, 'Delete denied - not owner');
      return res.status(403).json({ error: 'Access denied' });
    }

    // TODO: Implement deleteDraft in Apps Script
    // const result = await apps.deleteDraft(invoiceId);

    logger.info({ invoiceId }, 'Draft deleted successfully');
    return res.json({ ok: true, message: 'Draft deleted' });
    
  } catch (err) {
    logger.error({ err: err.message, stack: err.stack }, 'Error deleting draft');
    return res.status(502).json({ error: 'Failed to delete draft', message: err.message });
  }
});

module.exports = router;