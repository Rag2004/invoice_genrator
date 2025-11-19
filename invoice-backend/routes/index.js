// routes/index.js
const express = require('express')
const router = express.Router()

router.use('/team', require('./team'))
router.use('/projects', require('./projects'))
router.use('/clients', require('./clients'))
router.use('/invoices', require('./invoices'))
router.use('/modes', require('./modes'))

module.exports = router
