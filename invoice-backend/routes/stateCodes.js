// routes/stateCodes.js
const express = require('express');
const router = express.Router();
const { STATE_CODES, getStateCode, getStateWithCode } = require('../utils/stateCodes');

/**
 * GET /api/state-codes
 * Get all state codes or a specific state code
 * Query params:
 *   - state: (optional) State name to get code for
 */
router.get('/', (req, res) => {
    try {
        const { state } = req.query;

        if (state) {
            // Return specific state code
            const code = getStateCode(state);
            const formatted = getStateWithCode(state);

            res.json({
                ok: true,
                state,
                code,
                formatted
            });
        } else {
            // Return all state codes
            res.json({
                ok: true,
                stateCodes: STATE_CODES
            });
        }
    } catch (err) {
        console.error('Error fetching state codes:', err);
        res.status(500).json({
            ok: false,
            error: err.message || 'Failed to fetch state codes'
        });
    }
});

module.exports = router;
