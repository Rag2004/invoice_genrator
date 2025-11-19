// lib/appsScriptClient.js
const fetch = require('node-fetch')
const { URLSearchParams } = require('url')
const logger = require('../utils/logger')

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || ''
const APPS_SCRIPT_TOKEN = process.env.APPS_SCRIPT_TOKEN || ''
const TIMEOUT = Number(process.env.APPS_SCRIPT_TIMEOUT_MS || 10000)
const RETRIES = Number(process.env.APPS_SCRIPT_RETRIES || 2)

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)) }

async function fetchWithTimeout(url, opts = {}, timeout = TIMEOUT) {
  const controller = new (global.AbortController || require('abort-controller'))()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal })
    return res
  } finally {
    clearTimeout(id)
  }
}

async function requestWithRetry(url, opts = {}, retries = RETRIES) {
  let attempt = 0
  while (true) {
    try {
      const res = await fetchWithTimeout(url, opts)
      const text = await res.text()
      let json = {}
      try { json = text ? JSON.parse(text) : {} } catch(e) { json = { raw: text } }
      if (!res.ok) {
        const err = json?.error || json?.message || `HTTP ${res.status}`
        throw new Error(err)
      }
      return json
    } catch (err) {
      attempt++
      logger.warn({ attempt, err: err.message }, 'appsScript request failed')
      if (attempt > retries) throw err
      await sleep(500 * attempt)
    }
  }
}

// If APPS_SCRIPT_URL is not configured, provide an in-memory stub
if (!APPS_SCRIPT_URL) {
  logger.info('APPS_SCRIPT_URL not set — running appsScriptClient in STUB mode (local memory).')

  const memory = {
    team: [
      { id: 'tm_1', name: 'Asha Sharma', factor: 1.0, defaultMode: 'Online' },
      { id: 'tm_2', name: 'Vikram Rao', factor: 1.5, defaultMode: 'Studio' }
    ],
    projects: {
      'P001': { code: 'P001', clientCode: 'C001', package: 'Starter', hourlyRate: 5000, serviceFeePct: 25, gstPct: 18 }
    },
    clients: {
      'C001': { code: 'C001', name: 'Acme Pvt Ltd', billingAddress: '123 Business Rd, City', contactEmail: 'billing@acme.test' }
    },
    invoices: [],
    lastSeqByDate: {} // map yyyy-mm-dd => seq
  }

  function getTeam() { return memory.team }
  function getProject(code) { return memory.projects[code] || null }
  function getClient(code) { return memory.clients[code] || null }

  function getNextInvoiceSequence() {
    const d = new Date()
    const key = d.toISOString().slice(0,10)
    memory.lastSeqByDate[key] = (memory.lastSeqByDate[key] || 0) + 1
    return memory.lastSeqByDate[key]
  }

  function createInvoice(payload) {
    const seq = getNextInvoiceSequence()
    const dd = new Date()
    const ddmmyy = dd.toLocaleDateString('en-GB').replace(/\//g,'')
    const name = (payload.consultantName || 'Consultant').split(' ')[0]
    const invoiceNumber = `${ddmmyy}_${name}_${String(seq).padStart(3,'0')}`
    const id = `inv_${Date.now()}`
    const row = { id, invoiceNumber, ...payload, createdAt: new Date().toISOString() }
    memory.invoices.push(row)
    return { ok: true, invoiceId: id, invoiceNumber }
  }

  async function sendInvoiceEmail({ invoiceId, toEmail }) {
    // stub: pretend it's sent
    logger.info({ invoiceId, toEmail }, 'stub sendInvoiceEmail')
    return { ok: true }
  }

  module.exports = {
    mode: 'stub',
    getTeam,
    getProject,
    getClient,
    createInvoice,
    sendInvoiceEmail
  }
} else {
  // Real Apps Script proxy
  function buildUrlWithToken(action, params = {}) {
    const url = new URL(APPS_SCRIPT_URL)
    const p = new URLSearchParams(params)
    p.set('action', action)
    p.set('token', APPS_SCRIPT_TOKEN)
    url.search = p.toString()
    return url.toString()
  }

  async function get(action, params = {}) {
    const url = buildUrlWithToken(action, params)
    return await requestWithRetry(url, { method: 'GET' })
  }

  async function post(action, data = {}) {
    const url = `${APPS_SCRIPT_URL}?token=${encodeURIComponent(APPS_SCRIPT_TOKEN)}`
    const body = JSON.stringify({ action, data })
    return await requestWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    })
  }

  module.exports = {
    mode: 'remote',
    get,
    post
  }
}
