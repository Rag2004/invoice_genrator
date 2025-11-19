// routes/team.js
const express = require('express')
const router = express.Router()
const apps = require('../lib/appsScriptClient')
const logger = require('../utils/logger')

// GET /api/team
router.get('/', async (req, res) => {
  try {
    if (apps.mode === 'stub') {
      const team = apps.getTeam()
      return res.json({ team })
    } else {
      const json = await apps.get('getTeam')
      return res.json({ team: json })
    }
  } catch (err) {
    logger.error(err)
    res.status(502).json({ error: 'Failed to fetch team' })
  }
})

module.exports = router
