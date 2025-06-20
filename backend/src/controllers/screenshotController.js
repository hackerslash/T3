const database = require('../models/database');
const AuthUtils = require('../utils/auth');
const FraudDetection = require('../utils/fraudDetection');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

class ScreenshotController {
  constructor() {
    this.setupMulter();
  }

  setupMulter() {
    // Configure multer for file uploads
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = process.env.UPLOAD_PATH || './uploads';
        const userPath = path.join(uploadPath, 'screenshots', req.user.uuid);
        
        // Create directory if it doesn't exist
        fs.mkdirSync(userPath, { recursive: true });
        cb(null, userPath);
      },
      filename: (req, file, cb) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const extension = path.extname(file.originalname);
        cb(null, `screenshot-${timestamp}${extension}`);
      }
    });

    this.upload = multer({
      storage,
      limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
      },
      fileFilter: (req, file, cb) => {
        // Accept only image files
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'), false);
        }
      }
    });
  }

  // Upload screenshot
  async uploadScreenshot(req, res) {
    try {
      const { time_log_id, taken_at, permission_denied, error_message } = req.body;
      const userId = req.user.id;

      // Validate time_log_id
      const timeLog = await database.get(`
        SELECT id FROM time_logs 
        WHERE uuid = ? AND user_id = ?
      `, [time_log_id, userId]);

      if (!timeLog) {
        return res.status(404).json({ error: 'Time log not found or not owned by user' });
      }

      const uuid = AuthUtils.generateUUID();
      let filePath = null;
      let fileSize = 0;
      let uploadStatus = 'failed';

      // Handle permission denied case
      if (permission_denied === 'true' || permission_denied === true) {
        uploadStatus = 'permission_denied';
      } else if (req.file) {
        // Process and compress the image
        try {
          const originalPath = req.file.path;
          const compressedPath = originalPath.replace(/\.[^/.]+$/, '_compressed.jpg');

          // Compress image using sharp
          await sharp(originalPath)
            .jpeg({ quality: 80, progressive: true })
            .resize(1920, 1080, { 
              fit: 'inside', 
              withoutEnlargement: true 
            })
            .toFile(compressedPath);

          // Get file size and remove original
          const stats = fs.statSync(compressedPath);
          fileSize = stats.size;
          filePath = compressedPath;
          uploadStatus = 'completed';

          // Remove original uncompressed file
          fs.unlinkSync(originalPath);

        } catch (compressionError) {
          console.error('Error compressing image:', compressionError);
          // Fall back to original file
          filePath = req.file.path;
          fileSize = req.file.size;
          uploadStatus = 'completed';
        }
      }

      // Fraud detection: Analyze screenshot patterns
      const screenshotFlags = await FraudDetection.analyzeScreenshotPatterns(userId, timeLog.id);
      
      if (screenshotFlags.length > 0) {
        await FraudDetection.logSuspiciousActivity(userId, screenshotFlags, {
          time_log_id: timeLog.id,
          file_size: fileSize,
          permission_denied: permission_denied,
          screenshot_uuid: uuid
        });
      }

      // Save screenshot record
      await database.run(`
        INSERT INTO screenshots (
          uuid, time_log_id, user_id, file_path, file_size, taken_at,
          upload_status, permission_denied, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        uuid, timeLog.id, userId, filePath, fileSize, taken_at || new Date().toISOString(),
        uploadStatus, permission_denied ? 1 : 0, error_message || null
      ]);

      res.status(201).json({
        id: uuid,
        time_log_id,
        upload_status: uploadStatus,
        file_size: fileSize,
        taken_at: taken_at || new Date().toISOString(),
        permission_denied: permission_denied ? true : false,
        error_message: error_message || null
      });

    } catch (error) {
      console.error('Error uploading screenshot:', error);
      
      // Clean up uploaded file if there was an error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get screenshots with filtering
  async getScreenshots(req, res) {
    try {
      const {
        user_id,
        time_log_id,
        start_date,
        end_date,
        limit = 50,
        offset = 0
      } = req.query;

      let whereConditions = [];
      let params = [];

      // If not admin, only show own screenshots
      if (req.user.role !== 'admin') {
        whereConditions.push('s.user_id = ?');
        params.push(req.user.id);
      } else if (user_id) {
        // Admin can filter by user_id
        const user = await database.get('SELECT id FROM users WHERE uuid = ?', [user_id]);
        if (user) {
          whereConditions.push('s.user_id = ?');
          params.push(user.id);
        }
      }

      if (time_log_id) {
        const timeLog = await database.get('SELECT id FROM time_logs WHERE uuid = ?', [time_log_id]);
        if (timeLog) {
          whereConditions.push('s.time_log_id = ?');
          params.push(timeLog.id);
        }
      }

      if (start_date) {
        whereConditions.push('s.taken_at >= ?');
        params.push(start_date);
      }

      if (end_date) {
        whereConditions.push('s.taken_at <= ?');
        params.push(end_date);
      }

      const whereClause = whereConditions.length > 0 ? 
        `WHERE ${whereConditions.join(' AND ')}` : '';

      params.push(parseInt(limit), parseInt(offset));

      const screenshots = await database.all(`
        SELECT s.uuid as id, s.file_path, s.file_size, s.taken_at, s.upload_status,
               s.permission_denied, s.error_message, s.created_at,
               tl.uuid as time_log_id, tl.start_time, tl.end_time,
               u.uuid as user_id, u.first_name, u.last_name, u.email,
               p.uuid as project_id, p.name as project_name
        FROM screenshots s
        JOIN time_logs tl ON s.time_log_id = tl.id
        JOIN users u ON s.user_id = u.id
        JOIN projects p ON tl.project_id = p.id
        ${whereClause}
        ORDER BY s.taken_at DESC
        LIMIT ? OFFSET ?
      `, params);

      // Get total count
      const countParams = params.slice(0, -2); // Remove limit and offset
      const totalResult = await database.get(`
        SELECT COUNT(*) as count
        FROM screenshots s
        JOIN time_logs tl ON s.time_log_id = tl.id
        JOIN users u ON s.user_id = u.id
        JOIN projects p ON tl.project_id = p.id
        ${whereClause}
      `, countParams);

      // Add download URLs and remove file paths for security
      const screenshotsWithUrls = screenshots.map(screenshot => ({
        ...screenshot,
        download_url: screenshot.file_path ? `/api/screenshots/${screenshot.id}/download` : null,
        file_path: undefined // Remove file path from response
      }));

      res.json({
        screenshots: screenshotsWithUrls,
        total: totalResult.count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

    } catch (error) {
      console.error('Error fetching screenshots:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get screenshot by ID
  async getScreenshot(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      let whereClause = 's.uuid = ?';
      let params = [id];

      // If not admin, only show own screenshots
      if (req.user.role !== 'admin') {
        whereClause += ' AND s.user_id = ?';
        params.push(userId);
      }

      const screenshot = await database.get(`
        SELECT s.uuid as id, s.file_path, s.file_size, s.taken_at, s.upload_status,
               s.permission_denied, s.error_message, s.created_at,
               tl.uuid as time_log_id, tl.start_time, tl.end_time,
               u.uuid as user_id, u.first_name, u.last_name, u.email,
               p.uuid as project_id, p.name as project_name
        FROM screenshots s
        JOIN time_logs tl ON s.time_log_id = tl.id
        JOIN users u ON s.user_id = u.id
        JOIN projects p ON tl.project_id = p.id
        WHERE ${whereClause}
      `, params);

      if (!screenshot) {
        return res.status(404).json({ error: 'Screenshot not found' });
      }

      // Add download URL and remove file path
      screenshot.download_url = screenshot.file_path ? `/api/screenshots/${screenshot.id}/download` : null;
      delete screenshot.file_path;

      res.json(screenshot);

    } catch (error) {
      console.error('Error fetching screenshot:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Download screenshot file
  async downloadScreenshot(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      let whereClause = 's.uuid = ?';
      let params = [id];

      // If not admin, only allow downloading own screenshots
      if (req.user.role !== 'admin') {
        whereClause += ' AND s.user_id = ?';
        params.push(userId);
      }

      const screenshot = await database.get(`
        SELECT s.file_path, s.taken_at, u.first_name, u.last_name
        FROM screenshots s
        JOIN users u ON s.user_id = u.id
        WHERE ${whereClause}
      `, params);

      if (!screenshot || !screenshot.file_path) {
        return res.status(404).json({ error: 'Screenshot file not found' });
      }

      // Check if file exists
      if (!fs.existsSync(screenshot.file_path)) {
        return res.status(404).json({ error: 'Screenshot file not found on disk' });
      }

      // Set appropriate headers
      const filename = `screenshot-${screenshot.first_name}-${screenshot.last_name}-${screenshot.taken_at}.jpg`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'image/jpeg');

      // Stream the file
      const fileStream = fs.createReadStream(screenshot.file_path);
      fileStream.pipe(res);

    } catch (error) {
      console.error('Error downloading screenshot:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Delete screenshot
  async deleteScreenshot(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      let whereClause = 'uuid = ?';
      let params = [id];

      // If not admin, only allow deleting own screenshots
      if (req.user.role !== 'admin') {
        whereClause += ' AND user_id = ?';
        params.push(userId);
      }

      // Get screenshot info first
      const screenshot = await database.get(`
        SELECT file_path FROM screenshots WHERE ${whereClause}
      `, params);

      if (!screenshot) {
        return res.status(404).json({ error: 'Screenshot not found' });
      }

      // Delete from database
      await database.run(`DELETE FROM screenshots WHERE ${whereClause}`, params);

      // Delete file from disk
      if (screenshot.file_path && fs.existsSync(screenshot.file_path)) {
        fs.unlinkSync(screenshot.file_path);
      }

      res.json({ message: 'Screenshot deleted successfully' });

    } catch (error) {
      console.error('Error deleting screenshot:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get screenshot statistics
  async getScreenshotStats(req, res) {
    try {
      const { user_id, start_date, end_date } = req.query;

      let whereConditions = [];
      let params = [];

      // If not admin, only show own stats
      if (req.user.role !== 'admin') {
        whereConditions.push('s.user_id = ?');
        params.push(req.user.id);
      } else if (user_id) {
        const user = await database.get('SELECT id FROM users WHERE uuid = ?', [user_id]);
        if (user) {
          whereConditions.push('s.user_id = ?');
          params.push(user.id);
        }
      }

      if (start_date) {
        whereConditions.push('s.taken_at >= ?');
        params.push(start_date);
      }

      if (end_date) {
        whereConditions.push('s.taken_at <= ?');
        params.push(end_date);
      }

      const whereClause = whereConditions.length > 0 ? 
        `WHERE ${whereConditions.join(' AND ')}` : '';

      const stats = await database.get(`
        SELECT 
          COUNT(*) as total_screenshots,
          COUNT(CASE WHEN upload_status = 'completed' THEN 1 END) as successful_uploads,
          COUNT(CASE WHEN upload_status = 'permission_denied' THEN 1 END) as permission_denied,
          COUNT(CASE WHEN upload_status = 'failed' THEN 1 END) as failed_uploads,
          SUM(file_size) as total_file_size,
          AVG(file_size) as average_file_size
        FROM screenshots s
        ${whereClause}
      `, params);

      res.json(stats);

    } catch (error) {
      console.error('Error fetching screenshot stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new ScreenshotController();