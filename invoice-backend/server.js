// server.js - PRODUCTION READY

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const logger = require('./utils/logger');
const { verifyEmailConfig } = require('./utils/invoiceEmailService');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();
const port = process.env.PORT || 4000;
const isProduction = process.env.NODE_ENV === 'production';

// -------------------- CORS CONFIG (PRODUCTION SAFE) --------------------
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  ...(process.env.FRONTEND_ORIGIN ? process.env.FRONTEND_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean) : []),
  'https://earnest-acceptance-production-b2de.up.railway.app',
].filter((o, i, arr) => arr.indexOf(o) === i);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server & Railway internal calls
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    logger.warn({ origin }, 'CORS blocked');
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Consultant-Id',
    'Accept',
  ],
};

app.use(cors(corsOptions));
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

// ✅ Import all route modules
const authRouter = require('./routes/auth');
const projectsRouter = require('./routes/projects');     // ✅ ADDED
const clientsRouter = require('./routes/clients');       // ✅ ADDED
const teamRouter = require('./routes/team');             // ✅ ADDED
const invoicesRouter = require('./routes/invoices');
const draftsRouter = require('./routes/drafts');         // ✅ ADDED (if exists)
const dashboardRouter = require('./routes/dashboard');
const modesRouter = require('./routes/modes');

// ✅ Register routes in correct order (most specific first)
app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter); // ✅ ADDED - Handles /setup endpoint
app.use('/api/clients', authMiddleware, clientsRouter);    // ✅ ADDED
app.use('/api/team', authMiddleware, teamRouter);          // ✅ ADDED
app.use('/api/invoices', authMiddleware, invoicesRouter);
app.use('/api/dashboard', authMiddleware, dashboardRouter);
app.use('/api/modes', authMiddleware, modesRouter);

// ✅ Drafts route (if you have a separate drafts router)
try {
  app.use('/api/drafts', authMiddleware, draftsRouter);
  logger.info('✅ Drafts routes loaded');
} catch (err) {
  logger.info('ℹ️  No separate drafts router (handled by invoices)');
}

// ✅ OPTIONAL: Generic routes fallback
try {
  const routes = require('./routes');
  app.use('/api', routes);
  logger.info('✅ Generic routes loaded from ./routes');
} catch (err) {
  logger.info('ℹ️  No generic routes/index.js file (this is OK)');
}

// Admin / debug endpoint — only in non-production or when ADMIN_API_KEY is set
if (!isProduction || process.env.ADMIN_API_KEY) {
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
}

// Test routes — disabled in production to avoid leaking API structure
if (!isProduction) {
  app.get('/api/test-routes', (req, res) => {
  res.json({
    ok: true,
    message: 'All routes are loaded!',
    availableRoutes: {
      auth: [
        'POST /api/auth/start-login',
        'POST /api/auth/verify-otp',
        'GET  /api/auth/me',
        'POST /api/auth/complete-profile',
        'POST /api/auth/logout'
      ],
      projects: [
        'GET  /api/projects/:code',
        'GET  /api/projects/:code/setup'  // ✅ This is what was missing!
      ],
      clients: [
        'GET  /api/clients/:code'
      ],
      team: [
        'GET  /api/team'
      ],
      invoices: [
        'POST /api/invoices/draft',
        'POST /api/invoices/draft/:id',
        'POST /api/invoices/finalize',
        'POST /api/invoices/share',         // ✅ Secure email endpoint
        'GET  /api/invoices',
        'GET  /api/invoices/:id'
      ],
      dashboard: [
        'GET  /api/dashboard/summary'
      ]
    }
  });
  });
}

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
(async () => {
  logger.info('Starting service checks…');

  try {
    const isConfigured = await verifyEmailConfig();
    if (!isConfigured) {
      logger.warn('Email service not configured — set EMAIL_USER and EMAIL_PASSWORD');
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'Email verification failed — invoice sharing may not work');
  }

  if (!isProduction) {
    try {
      const { testPuppeteer } = require('./utils/pdfGenerator');
      await testPuppeteer();
    } catch (err) {
      logger.warn({ err: err.message }, 'PDF generation test skipped');
    }
  }
})();

// -------------------- START SERVER -------------------
app.listen(port, () => {
  logger.info({ port, env: process.env.NODE_ENV || 'development' }, 'Invoice backend listening');
  logger.info({ APPS_SCRIPT_URL: Boolean(process.env.APPS_SCRIPT_URL), allowedOrigins }, 'CORS enabled');
  if (!isProduction) {
    logger.info({ testRoutes: `http://localhost:${port}/api/test-routes` }, 'Dev routes available');
  }
});