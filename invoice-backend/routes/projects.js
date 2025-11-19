// routes/projects.js
const express = require('express')
const router = express.Router()
const apps = require('../lib/appsScriptClient')
const logger = require('../utils/logger')

// GET /api/projects/:code
router.get('/:code', async (req, res) => {
  const code = req.params.code
  try {
    if (apps.mode === 'stub') {
      const project = apps.getProject(code)
      if (!project) return res.status(404).json({ error: 'not found' })
      return res.json({ project })
    } else {
      const project = await apps.get('getProject', { code })
      return res.json({ project })
    }
  } catch (err) {
    logger.error(err)
    res.status(502).json({ error: 'Failed to fetch project' })
  }
})

module.exports = router
