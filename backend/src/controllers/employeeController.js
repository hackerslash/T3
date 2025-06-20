const database = require('../models/database');
const AuthUtils = require('../utils/auth');
const EmailService = require('../utils/email');

class EmployeeController {
  // Create new employee (Insightful-compatible)
  async createEmployee(req, res) {
    try {
      const { email, first_name, last_name, password } = req.body;

      // Check if employee already exists
      const existingUser = await database.get(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUser) {
        return res.status(409).json({
          error: 'Employee with this email already exists'
        });
      }

      // Hash password and generate tokens
      const passwordHash = await AuthUtils.hashPassword(password);
      const uuid = AuthUtils.generateUUID();
      const verificationToken = AuthUtils.generateVerificationToken();

      // Insert new employee
      const result = await database.run(`
        INSERT INTO users (uuid, email, password_hash, first_name, last_name, verification_token)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [uuid, email, passwordHash, first_name, last_name, verificationToken]);

      // Send verification email
      const emailResult = await EmailService.sendVerificationEmail(
        email, 
        first_name, 
        verificationToken
      );

      // Return Insightful-compatible response
      res.status(201).json({
        id: uuid,
        email,
        first_name,
        last_name,
        is_active: false,
        is_verified: false,
        created_at: new Date().toISOString(),
        email_sent: emailResult.success
      });

    } catch (error) {
      console.error('Error creating employee:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get all employees
  async getEmployees(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const employees = await database.all(`
        SELECT uuid as id, email, first_name, last_name, is_active, is_verified, 
               role, created_at, updated_at
        FROM users 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `, [limit, offset]);

      const total = await database.get('SELECT COUNT(*) as count FROM users');

      res.json({
        employees,
        total: total.count,
        limit,
        offset
      });

    } catch (error) {
      console.error('Error fetching employees:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get employee by ID
  async getEmployee(req, res) {
    try {
      const { id } = req.params;

      const employee = await database.get(`
        SELECT uuid as id, email, first_name, last_name, is_active, is_verified, 
               role, created_at, updated_at
        FROM users 
        WHERE uuid = ?
      `, [id]);

      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      res.json(employee);

    } catch (error) {
      console.error('Error fetching employee:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update employee
  async updateEmployee(req, res) {
    try {
      const { id } = req.params;
      const { first_name, last_name, is_active } = req.body;

      // Check if employee exists
      const employee = await database.get('SELECT id FROM users WHERE uuid = ?', [id]);
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      // Build update query dynamically
      const updates = [];
      const values = [];

      if (first_name !== undefined) {
        updates.push('first_name = ?');
        values.push(first_name);
      }
      if (last_name !== undefined) {
        updates.push('last_name = ?');
        values.push(last_name);
      }
      if (is_active !== undefined) {
        updates.push('is_active = ?');
        values.push(is_active ? 1 : 0);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      await database.run(`
        UPDATE users 
        SET ${updates.join(', ')} 
        WHERE uuid = ?
      `, values);

      // Return updated employee
      const updatedEmployee = await database.get(`
        SELECT uuid as id, email, first_name, last_name, is_active, is_verified, 
               role, created_at, updated_at
        FROM users 
        WHERE uuid = ?
      `, [id]);

      res.json(updatedEmployee);

    } catch (error) {
      console.error('Error updating employee:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Activate employee
  async activateEmployee(req, res) {
    try {
      const { id } = req.params;

      const result = await database.run(`
        UPDATE users 
        SET is_active = 1, updated_at = CURRENT_TIMESTAMP 
        WHERE uuid = ?
      `, [id]);

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      res.json({ message: 'Employee activated successfully' });

    } catch (error) {
      console.error('Error activating employee:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Deactivate employee
  async deactivateEmployee(req, res) {
    try {
      const { id } = req.params;

      const result = await database.run(`
        UPDATE users 
        SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
        WHERE uuid = ?
      `, [id]);

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      res.json({ message: 'Employee deactivated successfully' });

    } catch (error) {
      console.error('Error deactivating employee:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Verify employee email
  async verifyEmployee(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: 'Verification token is required' });
      }

      const user = await database.get(
        'SELECT id, uuid, email, first_name FROM users WHERE verification_token = ?',
        [token]
      );

      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired verification token' });
      }

      // Update user as verified and active
      await database.run(`
        UPDATE users 
        SET is_verified = 1, is_active = 1, verification_token = NULL, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [user.id]);

      // Generate API token for desktop app
      const apiToken = AuthUtils.generateApiToken();
      const tokenHash = AuthUtils.hashApiToken(apiToken);
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year expiry

      await database.run(`
        INSERT INTO api_tokens (user_id, token_hash, expires_at)
        VALUES (?, ?, ?)
      `, [user.id, tokenHash, expiresAt.toISOString()]);

      res.json({
        message: 'Email verified successfully',
        user: {
          id: user.uuid,
          email: user.email,
          first_name: user.first_name
        },
        api_token: apiToken,
        download_url: `${process.env.DESKTOP_APP_DOWNLOAD_URL}/desktop-app`
      });

    } catch (error) {
      console.error('Error verifying employee:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Generate API token for employee
  async generateToken(req, res) {
    try {
      const { id } = req.params;

      // Check if employee exists
      const employee = await database.get('SELECT id, email FROM users WHERE uuid = ?', [id]);
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      // Generate new API token
      const apiToken = require('crypto').randomBytes(32).toString('hex');
      const AuthUtils = require('../utils/auth');
      const tokenHash = AuthUtils.hashApiToken(apiToken);
      
      // Store token hash in database
      await database.run(`
        INSERT OR REPLACE INTO api_tokens (user_id, token_hash, created_at, expires_at)
        VALUES (?, ?, CURRENT_TIMESTAMP, datetime('now', '+1 year'))
      `, [employee.id, tokenHash]);

      res.json({
        api_token: apiToken,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      });

    } catch (error) {
      console.error('Error generating token:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Employee-specific methods

  // Get employee profile (for logged-in employee)
  async getProfile(req, res) {
    try {
      const userId = req.user.userId;

      const user = await database.get(`
        SELECT uuid as id, email, first_name, last_name, is_active, is_verified, created_at
        FROM users 
        WHERE id = ? AND role = 'employee'
      `, [userId]);

      if (!user) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      res.json({
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`.trim(),
        is_active: user.is_active,
        created_at: user.created_at
      });

    } catch (error) {
      console.error('Error getting employee profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get employee stats
  async getStats(req, res) {
    try {
      const userId = req.user.userId;
      const today = new Date().toISOString().split('T')[0];
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const monthStart = new Date();
      monthStart.setDate(1);

      // Get time stats
      const todayStats = await database.get(`
        SELECT COALESCE(SUM(duration), 0) as total_seconds
        FROM time_logs 
        WHERE user_id = ? AND DATE(start_time) = ?
      `, [userId, today]);

      const weekStats = await database.get(`
        SELECT COALESCE(SUM(duration), 0) as total_seconds
        FROM time_logs 
        WHERE user_id = ? AND start_time >= ?
      `, [userId, weekStart.toISOString()]);

      const monthStats = await database.get(`
        SELECT COALESCE(SUM(duration), 0) as total_seconds
        FROM time_logs 
        WHERE user_id = ? AND start_time >= ?
      `, [userId, monthStart.toISOString()]);

      // Get active sessions
      const activeSessions = await database.get(`
        SELECT COUNT(*) as count
        FROM time_logs 
        WHERE user_id = ? AND end_time IS NULL
      `, [userId]);

      // Get projects count
      const projectsCount = await database.get(`
        SELECT COUNT(DISTINCT project_id) as count
        FROM project_assignments 
        WHERE user_id = ?
      `, [userId]);

      res.json({
        total_hours_today: Math.round(todayStats.total_seconds / 3600 * 100) / 100,
        total_hours_week: Math.round(weekStats.total_seconds / 3600 * 100) / 100,
        total_hours_month: Math.round(monthStats.total_seconds / 3600 * 100) / 100,
        active_sessions: activeSessions.count,
        projects_count: projectsCount.count
      });

    } catch (error) {
      console.error('Error getting employee stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get employee time logs
  async getTimeLogs(req, res) {
    try {
      const userId = req.user.userId;
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const timeLogs = await database.all(`
        SELECT 
          tl.id,
          tl.project_id,
          tl.start_time,
          tl.end_time,
          tl.duration,
          p.name as project_name
        FROM time_logs tl
        LEFT JOIN projects p ON tl.project_id = p.id
        WHERE tl.user_id = ?
        ORDER BY tl.start_time DESC
        LIMIT ? OFFSET ?
      `, [userId, limit, offset]);

      res.json(timeLogs);

    } catch (error) {
      console.error('Error getting employee time logs:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Download desktop app
  async downloadApp(req, res) {
    try {
      // For now, return a placeholder response
      // In a real implementation, this would serve the actual app binary
      res.json({
        message: 'Desktop app download will be available soon',
        download_url: '/api/employees/download-app/binary',
        version: '1.0.0',
        platforms: ['windows', 'macos', 'linux']
      });

    } catch (error) {
      console.error('Error downloading app:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new EmployeeController();