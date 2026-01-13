
// routes/clients.js - UPDATED WITH EMAIL SUPPORT
const express = require('express');
const router = express.Router();
const apps = require('../lib/appsScriptClient');
const logger = require('../utils/logger');

/* ============================================================================
   GET CLIENT BY CODE - ✅ Now includes email
============================================================================ */
router.get('/:code', async (req, res) => {
  const code = req.params.code;
  
  try {
    logger.info({ clientCode: code }, 'Fetching client');
    
    const client = await apps.getClient(code);
    
    if (!client) {
      return res.status(404).json({ 
        ok: false, 
        error: 'Client not found' 
      });
    }
    
    // ✅ Normalize response to include email
    const normalizedClient = {
      code: client.Client_Code || client.client_code,
      name: client.Client_name || client.name || "",
      businessName: client.Buisness_Name || client.businessName || "",
      billingAddress: client.Billing_Address || client.billingAddress || "",
      pan: client.Client_PAN || client.PAN || "",
      gstin: client.Client_GST || client.GSTIN || client.gstin || "",
      stateCode: client.State || client.Client_State || client.state || "",
      email: client.Client_email || client.email || "" // ✅ CRITICAL
    };
    
    return res.json({ 
      ok: true, 
      client: normalizedClient 
    });
    
  } catch (err) {
    logger.error({ err: err.message, clientCode: code }, 'Failed to fetch client');
    return res.status(502).json({ 
      ok: false, 
      error: 'Failed to fetch client' 
    });
  }
});

module.exports = router;