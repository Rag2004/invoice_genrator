
// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const logger = require('./utils/logger');
const { verifyEmailConfig } = require('./utils/invoiceEmailService');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();
const port = process.env.PORT || 4000;

// -------------------- CORS CONFIG (FIXED) --------------------
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5174';

const corsOptions = {
  origin: FRONTEND_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'x-consultant-id',
    'X-Requested-With',
    'Accept'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours
};

// ✅ Apply CORS middleware BEFORE routes
app.use(cors(corsOptions));

// ✅ Handle preflight requests for ALL routes
app.options('*', cors(corsOptions));

// ✅ Body parser - INCREASED LIMIT for invoice HTML
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '5mb' }));

// -------------------- ROUTES -------------------------
app.get('/health', (req, res) => res.json({ 
  ok: true, 
  env: process.env.NODE_ENV || 'dev', 
  now: new Date().toISOString() 
}));

// ✅ Mount specific routes FIRST (most specific to least specific)
const authRouter = require('./routes/auth');
const invoicesRouter = require('./routes/invoices');
const dashboardRouter = require('./routes/dashboard');
const modesRouter = require('./routes/modes');

app.use('/api/auth', authRouter);
app.use('/api/invoices', authMiddleware, invoicesRouter);       // ✅ This handles /share, /drafts/*, etc.
app.use('/api/dashboard', dashboardRouter);
app.use('/api/modes', modesRouter);

// ✅ OPTIONAL: Generic routes (only if ./routes/index.js exists)
// Remove this if you don't have a routes/index.js file
try {
  const routes = require('./routes');
  app.use('/api', routes);
  logger.info('✅ Generic routes loaded from ./routes');
} catch (err) {
  logger.info('ℹ️  No generic routes/index.js file (this is OK)');
}

// Admin / debug endpoint to reset stub memory if using stub mode
app.post('/api/admin/reset-stub', (req, res) => {
  const key = req.headers['x-api-key'] || req.query.apiKey;
  if (key !== (process.env.ADMIN_API_KEY || '')) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    const apps = require('./lib/appsScriptClient');
    if (apps.mode !== 'stub') {
      return res.status(400).json({ error: 'not available' });
    }
    if (apps._memory) {
      apps._memory.invoices = [];
      apps._memory.drafts = [];
      apps._memory.consultants = new Map();
      apps._memory.otpSessions = new Map();
    }
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ✅ Test endpoint to verify invoice routes are loaded
app.get('/api/invoices-test', (req, res) => {
  res.json({
    ok: true,
    message: 'Invoice routes are loaded!',
    availableRoutes: [
      'POST /api/invoices/draft',
      'POST /api/invoices/draft/:id',
      'POST /api/invoices/finalize',
      'POST /api/invoices/share',
      'POST /api/invoices/send-email',
      'GET  /api/invoices',
      'GET  /api/invoices/:id',
      'GET  /api/invoices/drafts/consultant/:id',
      'GET  /api/invoices/drafts/item/:id'
    ]
  });
});

// -------------------- 404 HANDLER (MUST BE AFTER ALL ROUTES) ------------------
app.use((req, res, next) => {
  logger.warn({ method: req.method, path: req.path }, 'Route not found');
  res.status(404).json({ 
    ok: false,
    error: `Cannot ${req.method} ${req.path}`,
    message: 'Endpoint not found'
  });
});

// -------------------- ERROR HANDLER (MUST BE LAST) ------------------
app.use((err, req, res, next) => {
  logger.error({ 
    err: err.message, 
    stack: err.stack,
    method: req.method,
    path: req.path
  }, 'Server error');
  
  res.status(err.status || 500).json({ 
    ok: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// -------------------- EMAIL & PDF VERIFICATION ------------------
// Verify email and PDF generation on startup
(async () => {
  console.log('\n🔍 Starting service checks...\n');
  
  // Test email
  try {
    const isConfigured = await verifyEmailConfig();
    if (!isConfigured) {
      console.log('⚠️  Email service not configured');
      console.log('   Set EMAIL_USER and EMAIL_PASSWORD in .env file\n');
    }
  } catch (err) {
    console.error('❌ Email verification failed:', err.message);
    console.log('   Invoice sharing will not work until email is configured\n');
  }
  
  // Test PDF generation
  try {
    const { testPuppeteer } = require('./utils/pdfGenerator');
    await testPuppeteer();
    console.log('');
  } catch (err) {
    console.error('⚠️  PDF generation test skipped:', err.message);
    console.log('');
  }
})();

// -------------------- START SERVER -------------------
app.listen(port, () => {
  logger.info(`Invoice backend listening on port ${port}`);
  logger.info(`APPS_SCRIPT_URL set: ${Boolean(process.env.APPS_SCRIPT_URL)}`);
  logger.info(`CORS enabled for: ${FRONTEND_ORIGIN}`);
  
  console.log(`\n🚀 Server running at http://localhost:${port}`);
  console.log(`📧 Email: ${process.env.EMAIL_USER ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`🔗 CORS: ${FRONTEND_ORIGIN}`);
  console.log(`\n📋 Route Test: http://localhost:${port}/api/invoices-test\n`);
});

console.log('🟢 Server started.');