// routes/modes.js
const express = require('express');
const router = express.Router();
const { callAppsScript } = require('../lib/appsScriptClient');

// GET /api/modes
router.get('/', async (req, res) => {
  try {
    const data = await callAppsScript({
      action: 'getModes'
    });
    
    res.json(data);
  } catch (err) {
    console.error('Error fetching modes:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to fetch modes',
      modes: [
        { label: 'Online | Face-Time', factor: 1 },
        { label: 'Online | Studio-Time', factor: 1.5 },
        { label: 'Offline | Studio-Time', factor: 0.75 }
      ]
    });
  }
});

module.exports = router;