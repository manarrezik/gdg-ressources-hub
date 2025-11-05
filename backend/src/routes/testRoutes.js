// src/routes/testRoutes.js
// Test and debug routes for development

const express = require('express');
const router = express.Router();

// GET /api/test - API information and status
router.get('/', (req, res) => {
  res.json({
    message: 'GDG Resource Hub API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      resources: '/api/resources (GET, POST)',
      test: '/api/test'
    }
  });
});

module.exports = router;
