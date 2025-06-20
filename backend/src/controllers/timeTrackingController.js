const database = require('../models/database');
const AuthUtils = require('../utils/auth');
const FraudDetection = require('../utils/fraudDetection');

class TimeTrackingController {
  // Start time tracking
  async startTimeLog(req, res) {
    try {
      const { 
        project_id, 
        task_id, 
        description, 
        ip_address, 
        mac_address, 
        hostname, 
        os_info 
      } = req.body;
      const userId = req.user.id;

      // Check if project exists and user is assigned
      const project = await database.get(`
        SELECT p.id, p.name
        FROM projects p
        JOIN project_assignments pa ON p.id = pa.project_id
        WHERE p.uuid = ? AND pa.user_id = ? AND p.is_active = 1
      `, [project_id, userId]);

      if (!project) {
        return res.status(404).json({ error: 'Project not found or not assigned to user' });
      }

      // Get task (use default task if not specified)
      let task;
      if (task_id) {
        task = await database.get(`
          SELECT id, name FROM tasks 
          WHERE uuid = ? AND project_id = ? AND is_active = 1
        `, [task_id, project.id]);
      } else {
        // Get default task for project
        task = await database.get(`
          SELECT id, name FROM tasks 
          WHERE project_id = ? AND is_active = 1 
          ORDER BY created_at ASC 
          LIMIT 1
        `, [project.id]);
      }

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Check if user has any active time logs
      const activeLog = await database.get(`
        SELECT uuid FROM time_logs 
        WHERE user_id = ? AND is_active = 1
      `, [userId]);

      if (activeLog) {
        return res.status(409).json({ 
          error: 'User already has an active time log',
          active_log_id: activeLog.uuid
        });
      }

      // Fraud detection: Check for concurrent sessions
      const concurrentSessionFlag = await FraudDetection.checkConcurrentSessions(userId, {
        ip_address, mac_address, hostname, os_info
      });

      if (concurrentSessionFlag) {
        await FraudDetection.logSuspiciousActivity(userId, [concurrentSessionFlag], {
          ip_address, mac_address, hostname, os_info, project_id
        });
        
        // Still allow the session but log the suspicious activity
        console.warn(`⚠️ Concurrent session detected for user ${userId}`);
      }

      // Fraud detection: Analyze session patterns
      const sessionFlags = await FraudDetection.analyzeTimeTrackingSession(userId, {
        ip_address, mac_address, hostname, os_info
      });

      if (sessionFlags.length > 0) {
        await FraudDetection.logSuspiciousActivity(userId, sessionFlags, {
          ip_address, mac_address, hostname, os_info, project_id
        });
      }

      // Create new time log
      const uuid = AuthUtils.generateUUID();
      const startTime = new Date().toISOString();

      await database.run(`
        INSERT INTO time_logs (
          uuid, user_id, project_id, task_id, start_time, description,
          ip_address, mac_address, hostname, os_info, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `, [
        uuid, userId, project.id, task.id, startTime, description || null,
        ip_address || null, mac_address || null, hostname || null, os_info || null
      ]);

      res.status(201).json({
        id: uuid,
        project_id,
        project_name: project.name,
        task_id: task_id || null,
        task_name: task.name,
        start_time: startTime,
        description: description || null,
        is_active: true
      });

    } catch (error) {
      console.error('Error starting time log:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Stop time tracking
  async stopTimeLog(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Get active time log
      const timeLog = await database.get(`
        SELECT tl.*, p.uuid as project_uuid, p.name as project_name, 
               t.uuid as task_uuid, t.name as task_name
        FROM time_logs tl
        JOIN projects p ON tl.project_id = p.id
        JOIN tasks t ON tl.task_id = t.id
        WHERE tl.uuid = ? AND tl.user_id = ? AND tl.is_active = 1
      `, [id, userId]);

      if (!timeLog) {
        return res.status(404).json({ error: 'Active time log not found' });
      }

      // Calculate duration
      const endTime = new Date().toISOString();
      const startTime = new Date(timeLog.start_time);
      const duration = Math.floor((new Date(endTime) - startTime) / 1000); // duration in seconds

      // Update time log
      await database.run(`
        UPDATE time_logs 
        SET end_time = ?, duration = ?, is_active = 0, updated_at = CURRENT_TIMESTAMP
        WHERE uuid = ?
      `, [endTime, duration, id]);

      res.json({
        id,
        project_id: timeLog.project_uuid,
        project_name: timeLog.project_name,
        task_id: timeLog.task_uuid,
        task_name: timeLog.task_name,
        start_time: timeLog.start_time,
        end_time: endTime,
        duration,
        description: timeLog.description,
        is_active: false
      });

    } catch (error) {
      console.error('Error stopping time log:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get current active time log
  async getCurrentTimeLog(req, res) {
    try {
      const userId = req.user.id;

      const timeLog = await database.get(`
        SELECT tl.uuid as id, tl.start_time, tl.description, tl.is_active,
               p.uuid as project_id, p.name as project_name,
               t.uuid as task_id, t.name as task_name
        FROM time_logs tl
        JOIN projects p ON tl.project_id = p.id
        JOIN tasks t ON tl.task_id = t.id
        WHERE tl.user_id = ? AND tl.is_active = 1
      `, [userId]);

      if (!timeLog) {
        return res.json({ active_log: null });
      }

      // Calculate current duration
      const startTime = new Date(timeLog.start_time);
      const currentDuration = Math.floor((new Date() - startTime) / 1000);

      res.json({
        active_log: {
          ...timeLog,
          current_duration: currentDuration
        }
      });

    } catch (error) {
      console.error('Error fetching current time log:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get time logs (with filtering)
  async getTimeLogs(req, res) {
    try {
      const {
        user_id,
        project_id,
        start_date,
        end_date,
        limit = 50,
        offset = 0
      } = req.query;

      let whereConditions = [];
      let params = [];

      // If not admin, only show own logs
      if (req.user.role !== 'admin') {
        whereConditions.push('tl.user_id = ?');
        params.push(req.user.id);
      } else if (user_id) {
        // Admin can filter by user_id
        const user = await database.get('SELECT id FROM users WHERE uuid = ?', [user_id]);
        if (user) {
          whereConditions.push('tl.user_id = ?');
          params.push(user.id);
        }
      }

      if (project_id) {
        const project = await database.get('SELECT id FROM projects WHERE uuid = ?', [project_id]);
        if (project) {
          whereConditions.push('tl.project_id = ?');
          params.push(project.id);
        }
      }

      if (start_date) {
        whereConditions.push('tl.start_time >= ?');
        params.push(start_date);
      }

      if (end_date) {
        whereConditions.push('tl.start_time <= ?');
        params.push(end_date);
      }

      const whereClause = whereConditions.length > 0 ? 
        `WHERE ${whereConditions.join(' AND ')}` : '';

      params.push(parseInt(limit), parseInt(offset));

      const timeLogs = await database.all(`
        SELECT tl.uuid as id, tl.start_time, tl.end_time, tl.duration, tl.description,
               tl.ip_address, tl.mac_address, tl.hostname, tl.os_info, tl.is_active,
               u.uuid as user_id, u.first_name, u.last_name, u.email,
               p.uuid as project_id, p.name as project_name,
               t.uuid as task_id, t.name as task_name,
               COUNT(s.id) as screenshot_count
        FROM time_logs tl
        JOIN users u ON tl.user_id = u.id
        JOIN projects p ON tl.project_id = p.id
        JOIN tasks t ON tl.task_id = t.id
        LEFT JOIN screenshots s ON tl.id = s.time_log_id
        ${whereClause}
        GROUP BY tl.id
        ORDER BY tl.start_time DESC
        LIMIT ? OFFSET ?
      `, params);

      // Get total count
      const countParams = params.slice(0, -2); // Remove limit and offset
      const totalResult = await database.get(`
        SELECT COUNT(DISTINCT tl.id) as count
        FROM time_logs tl
        JOIN users u ON tl.user_id = u.id
        JOIN projects p ON tl.project_id = p.id
        JOIN tasks t ON tl.task_id = t.id
        ${whereClause}
      `, countParams);

      res.json({
        time_logs: timeLogs,
        total: totalResult.count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

    } catch (error) {
      console.error('Error fetching time logs:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get time log by ID
  async getTimeLog(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      let whereClause = 'tl.uuid = ?';
      let params = [id];

      // If not admin, only show own logs
      if (req.user.role !== 'admin') {
        whereClause += ' AND tl.user_id = ?';
        params.push(userId);
      }

      const timeLog = await database.get(`
        SELECT tl.uuid as id, tl.start_time, tl.end_time, tl.duration, tl.description,
               tl.ip_address, tl.mac_address, tl.hostname, tl.os_info, tl.is_active,
               u.uuid as user_id, u.first_name, u.last_name, u.email,
               p.uuid as project_id, p.name as project_name,
               t.uuid as task_id, t.name as task_name
        FROM time_logs tl
        JOIN users u ON tl.user_id = u.id
        JOIN projects p ON tl.project_id = p.id
        JOIN tasks t ON tl.task_id = t.id
        WHERE ${whereClause}
      `, params);

      if (!timeLog) {
        return res.status(404).json({ error: 'Time log not found' });
      }

      // Get screenshots for this time log
      const screenshots = await database.all(`
        SELECT uuid as id, file_path, taken_at, upload_status, permission_denied, error_message
        FROM screenshots
        WHERE time_log_id = (SELECT id FROM time_logs WHERE uuid = ?)
        ORDER BY taken_at ASC
      `, [id]);

      timeLog.screenshots = screenshots;

      res.json(timeLog);

    } catch (error) {
      console.error('Error fetching time log:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update time log description
  async updateTimeLog(req, res) {
    try {
      const { id } = req.params;
      const { description } = req.body;
      const userId = req.user.id;

      let whereClause = 'uuid = ?';
      let params = [description, id];

      // If not admin, only allow updating own logs
      if (req.user.role !== 'admin') {
        whereClause += ' AND user_id = ?';
        params.push(userId);
      }

      const result = await database.run(`
        UPDATE time_logs 
        SET description = ?, updated_at = CURRENT_TIMESTAMP
        WHERE ${whereClause}
      `, params);

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Time log not found' });
      }

      res.json({ message: 'Time log updated successfully' });

    } catch (error) {
      console.error('Error updating time log:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new TimeTrackingController();