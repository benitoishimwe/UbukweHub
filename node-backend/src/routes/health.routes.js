'use strict';

const express = require('express');

const router = express.Router();

// ─── GET /api/health/ (also matches /api/health) ─────────────────────────────
// Basic liveness probe — no DB dependency.
router.get('/', (req, res) => {
  return res.status(200).json({
    status: 'healthy',
    service: 'prani-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
