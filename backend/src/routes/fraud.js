const express = require('express');
const router = express.Router();
const fraudController = require('../controllers/fraudController');
const { authenticateJWT, requireRole } = require('../middleware/auth');

// All fraud routes require admin authentication
router.use(authenticateJWT);
router.use(requireRole('admin'));

// Get fraud alerts with filtering and pagination
router.get('/alerts', fraudController.getFraudAlerts);

// Get specific fraud alert details
router.get('/alerts/:id', fraudController.getFraudAlert);

// Resolve fraud alert
router.put('/alerts/:id/resolve', fraudController.resolveFraudAlert);

// Get fraud statistics
router.get('/stats', fraudController.getFraudStats);

module.exports = router;