
// routes/projects.js
const express = require('express');
const router = express.Router();
const apps = require('../lib/appsScriptClient');
const logger = require('../utils/logger');

/**
 * GET /api/projects/:code
 * Basic project lookup (used by Invoice page).
 * Returns: { project: { ... } }
 */
router.get('/:code', async (req, res) => {
  const rawCode = req.params.code || '';
  const code = rawCode.toString().trim();

  if (!code) {
    return res.status(400).json({ ok: false, error: 'project_code_required' });
  }

  try {
    logger.info({ code, mode: apps.mode }, 'GET /api/projects/:code');

    // ----- STUB MODE -----
    if (apps.mode === 'stub') {
      const project = apps.getProject(code);
      if (!project) {
        logger.warn({ code }, 'Project not found in stub memory');
        return res.status(404).json({ ok: false, error: 'project_not_found' });
      }

      logger.info({ code, project }, 'Project found (stub)');
      return res.json({ project });
    }

    // ----- REMOTE MODE (Apps Script) -----
    const result = await apps.getProject(code);

    logger.info(
      {
        code,
        resultType: typeof result,
        resultKeys: result ? Object.keys(result) : null,
        ok: result && result.ok,
      },
      'Apps Script getProject response'
    );

    if (!result) {
      logger.error({ code }, 'No response from Apps Script getProject');
      return res
        .status(502)
        .json({ ok: false, error: 'no_response_from_apps_script' });
    }

    // Apps Script now returns: { ok: true, project: {...} }
    if (result.ok === false) {
      const errMsg = result.error || 'project_not_found';
      logger.warn({ code, errMsg }, 'Apps Script getProject returned error');
      return res.status(404).json({ ok: false, error: errMsg });
    }

    const project = result.project || result;

    if (!project || Object.keys(project).length === 0) {
      logger.error(
        { code, result },
        'Project field missing/empty in Apps Script response'
      );
      // important: DO NOT use "project_not_found_in_response" anymore
      return res
        .status(404)
        .json({ ok: false, error: 'project_not_found' });
    }

    logger.info(
      {
        code,
        projectCode: project.code || project.projectCode,
        clientCode: project.clientCode,
      },
      'Project found successfully'
    );

    return res.json({ project });
  } catch (err) {
    logger.error(
      {
        code,
        message: err.message,
        stack: err.stack,
      },
      'Error in GET /api/projects/:code'
    );
    return res.status(502).json({
      ok: false,
      error: 'failed_to_fetch_project',
      message: err.message,
    });
  }
});

/**
 * GET /api/projects/:code/setup
 * OPTIONAL richer endpoint that returns project + client + consultant
 * Uses Apps Script getInvoiceSetupAction.
 * Returns: { ok, project, client, consultant }
 */
router.get('/:code/setup', async (req, res) => {
  const rawCode = req.params.code || '';
  const code = rawCode.toString().trim();

  if (!code) {
    return res.status(400).json({ ok: false, error: 'project_code_required' });
  }

  try {
    logger.info({ code, mode: apps.mode }, 'GET /api/projects/:code/setup');

    // ----- STUB MODE -----
    if (apps.mode === 'stub') {
      const project = apps.getProject(code);
      if (!project) {
        return res.status(404).json({ ok: false, error: 'project_not_found' });
      }

      // In stub, we don't have clients/consultants wired, so return basic shape
      return res.json({
        ok: true,
        project,
        client: null,
        consultant: null,
      });
    }

    // ----- REMOTE MODE (Apps Script) -----
    // Call Apps Script action getInvoiceSetup
    const result = await apps.get('getInvoiceSetup', { code });

    logger.info(
      {
        code,
        resultType: typeof result,
        resultKeys: result ? Object.keys(result) : null,
        ok: result && result.ok,
      },
      'Apps Script getInvoiceSetup response'
    );

    if (!result) {
      return res
        .status(502)
        .json({ ok: false, error: 'no_response_from_apps_script' });
    }

    if (result.ok === false) {
      const errMsg = result.error || 'invoice_setup_failed';
      return res.status(404).json({ ok: false, error: errMsg });
    }

    const { project, client, consultant } = result;

    if (!project) {
      // you **were** seeing "project_not_found_in_response" from here
      return res
        .status(404)
        .json({ ok: false, error: 'project_not_found' });
    }

    // client & consultant can be null – that’s fine
    return res.json({
      ok: true,
      project,
      client: client || null,
      consultant: consultant || null,
    });
  } catch (err) {
    logger.error(
      {
        code,
        message: err.message,
        stack: err.stack,
      },
      'Error in GET /api/projects/:code/setup'
    );
    return res.status(502).json({
      ok: false,
      error: 'failed_to_fetch_invoice_setup',
      message: err.message,
    });
  }
});

module.exports = router;
