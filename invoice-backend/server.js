// server.js
require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const logger = require('./utils/logger')
const routes = require('./routes')

const app = express()
const port = process.env.PORT || 4000

app.use(cors())
app.use(bodyParser.json({ limit: '1mb' }))

// health
app.get('/health', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'dev' }))

// mount API routes
app.use('/api', routes)

// admin route example (protected)
app.post('/api/admin/reset-stub', (req, res) => {
  const key = req.headers['x-api-key'] || req.query.apiKey
  if (key !== (process.env.ADMIN_API_KEY || '')) return res.status(401).json({ error: 'unauthorized' })
  // only available in stub mode
  const apps = require('./lib/appsScriptClient')
  if (apps.mode !== 'stub') return res.status(400).json({ error: 'not available' })
  // reset stub memory (danger!)
  // NOTE: in real app you'd persist to DB; this is just a dev helper
  apps.memory = null
  return res.json({ ok: true })
})

app.use((err, req, res, next) => {
  logger.error(err)
  res.status(500).json({ error: 'internal server error' })
})

app.listen(port, () => {
  logger.info(`Invoice backend listening on port ${port}`)
  logger.info(`APPS_SCRIPT_URL set: ${Boolean(process.env.APPS_SCRIPT_URL)}`)
})
