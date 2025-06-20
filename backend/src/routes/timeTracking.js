const express = require('express');
const router = express.Router();

const TimeTrackingController = require('../controllers/timeTrackingController');
const { authenticateToken, authenticateApiToken } = require('../middleware/auth');
const { 
  validateStartTimeLog, 
  validateStopTimeLog, 
  validateUUID, 
  validatePagination 
} = require('../middleware/validation');

// Routes accessible by API token (desktop app)
router.post('/start', authenticateApiToken, validateStartTimeLog, TimeTrackingController.startTimeLog);
router.post('/:id/stop', authenticateApiToken, validateStopTimeLog, TimeTrackingController.stopTimeLog);
router.get('/current', authenticateApiToken, TimeTrackingController.getCurrentTimeLog);

// Protected routes - JWT required
router.use(authenticateToken);

// Time log operations
router.get('/', validatePagination, TimeTrackingController.getTimeLogs);
router.get('/:id', validateUUID, TimeTrackingController.getTimeLog);
router.put('/:id', validateUUID, TimeTrackingController.updateTimeLog);

module.exports = router;