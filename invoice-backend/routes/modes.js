// routes/modes.js
const express = require('express');
const router = express.Router();
const apps = require('../lib/appsScriptClient');

// GET /api/modes
router.get('/', async (req, res) => {
  try {
    const data = await apps.get('getModes');

    // Normalize the response
    const modes = Array.isArray(data) ? data : (data?.modes || []);

    res.json({
      modes: modes.map(m => ({
        label: m.Mode || m.mode || m.label || '',
        factor: Number(m.Factor || m.factor || 1),
        description: m.Description || m.description || '',
      }))
    });
  } catch (err) {
    console.error('Error fetching modes:', err);
    res.status(500).json({
      error: err.message || 'Failed to fetch modes',
      modes: [
        { label: 'Online | Face-Time', factor: 1 },
        { label: 'Offline | Studio-Time', factor: 0.75 },
        { label: 'Offline | Site-Time', factor: 1.5 },
      ]
    });
  }
});

module.exports = router;