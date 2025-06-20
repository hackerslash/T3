const express = require('express');
const router = express.Router();

const ScreenshotController = require('../controllers/screenshotController');
const { authenticateToken, authenticateApiToken } = require('../middleware/auth');
const { validateScreenshotQuery, validateUUID } = require('../middleware/validation');

// Routes accessible by API token (desktop app)
router.post('/upload', authenticateApiToken, ScreenshotController.upload.single('screenshot'), ScreenshotController.uploadScreenshot);

// Protected routes - JWT and API token
router.get('/', [authenticateToken, authenticateApiToken], validateScreenshotQuery, ScreenshotController.getScreenshots);
router.get('/stats', [authenticateToken, authenticateApiToken], ScreenshotController.getScreenshotStats);
router.get('/:id', [authenticateToken, authenticateApiToken], validateUUID, ScreenshotController.getScreenshot);
router.get('/:id/download', [authenticateToken, authenticateApiToken], validateUUID, ScreenshotController.downloadScreenshot);
router.delete('/:id', [authenticateToken, authenticateApiToken], validateUUID, ScreenshotController.deleteScreenshot);

module.exports = router;