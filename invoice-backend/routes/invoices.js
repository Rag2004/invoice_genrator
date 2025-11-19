// routes/invoices.js
const express = require('express')
const router = express.Router()
const apps = require('../lib/appsScriptClient')
const logger = require('../utils/logger')

const ADMIN_API_KEY = process.env.ADMIN_API_KEY || ''

// POST /api/invoices  (create new invoice)
// Body: { projectCode, clientCode, consultantName, date, billingAddress, items, subtotal, serviceFeePct, notes }
router.post('/', async (req, res) => {
  const payload = req.body || {}
  // basic validation
  if (!payload.projectCode || !payload.clientCode || !payload.consultantName || !Array.isArray(payload.items)) {
    return res.status(400).json({ error: 'missing required fields' })
  }

  try {
    if (apps.mode === 'stub') {
      const result = apps.createInvoice(payload)
      return res.json(result)
    } else {
      const result = await apps.post('createInvoice', payload)
      return res.json(result)
    }
  } catch (err) {
    logger.error(err)
    res.status(502).json({ error: err.message || 'create invoice failed' })
  }
})

// POST /api/invoices/send  (send invoice by email) 
// Body: { invoiceId, toEmail } 
router.post('/send', async (req, res) => {
  const { invoiceId, toEmail } = req.body || {}
  if (!toEmail) return res.status(400).json({ error: 'toEmail is required' })

  try {
    if (apps.mode === 'stub') {
      const r = await apps.sendInvoiceEmail({ invoiceId, toEmail })
      return res.json(r)
    } else {
      const r = await apps.post('sendInvoiceEmail', { invoiceId, toEmail })
      return res.json(r)
    }
  } catch (err) {
    logger.error(err)
    res.status(502).json({ error: 'send failed' })
  }
})

module.exports = router
