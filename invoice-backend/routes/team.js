
// routes/team.js - PRODUCTION READY
const express = require('express');
const router = express.Router();
const apps = require('../lib/appsScriptClient');
const logger = require('../utils/logger');

// ✅ Handle OPTIONS preflight for CORS
router.options('/', (req, res) => {
  res.status(200).end();
});

// GET /api/team
router.get('/', async (req, res) => {
  try {
    logger.info('Fetching team members...');
    
    if (apps.mode === 'stub') {
      const team = apps.getTeam();
      logger.info({ count: team.length }, 'Team members fetched (stub mode)');
      return res.json({ team });
    }
    
    // Remote mode - fetch from Apps Script
    const result = await apps.get('getTeam');
    logger.info({ result: typeof result }, 'Team response received from Apps Script');
    
    // Handle different response formats from Apps Script
    let team = [];
    
    if (Array.isArray(result)) {
      // Direct array response
      team = result;
    } else if (result && Array.isArray(result.team)) {
      // Wrapped in { team: [...] }
      team = result.team;
    } else if (result && typeof result === 'object' && !Array.isArray(result)) {
      // Single object response - wrap in array
      team = [result];
    }
    
    logger.info({ count: team.length }, 'Team members parsed successfully');
    return res.json({ team });
    
  } catch (err) {
    logger.error({ 
      error: err.message, 
      stack: err.stack 
    }, 'Failed to fetch team members');
    
    res.status(502).json({ 
      error: 'Failed to fetch team',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;