// routes/companyDetails.js
const express = require('express');
const router = express.Router();
const apps = require('../lib/appsScriptClient');

/**
 * GET /api/company-details
 * Fetch company details from Google Sheets
 */
router.get('/', async (req, res) => {
    try {
        const result = await apps.getCompanyDetails();

        if (!result || !result.ok) {
            return res.status(404).json({
                ok: false,
                error: result?.error || 'Company details not found'
            });
        }

        res.json(result);
    } catch (err) {
        console.error('Error fetching company details:', err);
        res.status(500).json({
            ok: false,
            error: err.message || 'Failed to fetch company details'
        });
    }
});

module.exports = router;
