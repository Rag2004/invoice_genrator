// routes/clients.js
const express = require('express')
const router = express.Router()
const apps = require('../lib/appsScriptClient')
const logger = require('../utils/logger')

// GET /api/clients/:code
router.get('/:code', async (req, res) => {
  const code = req.params.code
  try {
    if (apps.mode === 'stub') {
      const client = apps.getClient(code)
      if (!client) return res.status(404).json({ error: 'not found' })
      return res.json({ client })
    } else {
      const client = await apps.get('getClient', { code })
      return res.json({ client })
    }
  } catch (err) {
    logger.error(err)
    res.status(502).json({ error: 'Failed to fetch client' })
  }
})

module.exports = router
