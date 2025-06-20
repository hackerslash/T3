const database = require('../models/database');
const AuthUtils = require('../utils/auth');
const EmailService = require('../utils/email');

class AuthController {
  // Login with email and password
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Get user from database
      const user = await database.get(`
        SELECT id, uuid, email, password_hash, first_name, last_name, is_active, is_verified, role
        FROM users 
        WHERE email = ?
      `, [email]);

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Check if user is active
      if (!user.is_active) {
        return res.status(401).json({ error: 'Account is not active' });
      }

      // Verify password
      const isValidPassword = await AuthUtils.comparePassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Generate JWT token
      const token = AuthUtils.generateJWT({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      res.json({
        token,
        user: {
          id: user.uuid,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          is_verified: user.is_verified
        }
      });

    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Employee login (same as login but specifically for employees)
  async employeeLogin(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Get user from database
      const user = await database.get(`
        SELECT id, uuid, email, password_hash, first_name, last_name, is_active, is_verified, role
        FROM users 
        WHERE email = ? AND role = 'employee'
      `, [email]);

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Check if user is active
      if (!user.is_active) {
        return res.status(401).json({ error: 'Account is not active' });
      }

      // Verify password
      const isValidPassword = await AuthUtils.comparePassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Generate JWT token
      const token = AuthUtils.generateJWT({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      res.json({
        token,
        user: {
          id: user.uuid,
          email: user.email,
          name: `${user.first_name} ${user.last_name}`.trim(),
          role: user.role,
          is_verified: user.is_verified
        }
      });

    } catch (error) {
      console.error('Error during employee login:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Generate API token for desktop app
  async generateApiToken(req, res) {
    try {
      const userId = req.user.id;

      // Deactivate existing tokens
      await database.run(`
        UPDATE api_tokens 
        SET is_active = 0 
        WHERE user_id = ?
      `, [userId]);

      // Generate new token
      const apiToken = AuthUtils.generateApiToken();
      const tokenHash = AuthUtils.hashApiToken(apiToken);
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year expiry

      await database.run(`
        INSERT INTO api_tokens (user_id, token_hash, expires_at)
        VALUES (?, ?, ?)
      `, [userId, tokenHash, expiresAt.toISOString()]);

      res.json({
        api_token: apiToken,
        expires_at: expiresAt.toISOString()
      });

    } catch (error) {
      console.error('Error generating API token:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Refresh JWT token
  async refreshToken(req, res) {
    try {
      const userId = req.user.id;

      // Get fresh user data
      const user = await database.get(`
        SELECT id, uuid, email, first_name, last_name, is_active, role
        FROM users 
        WHERE id = ? AND is_active = 1
      `, [userId]);

      if (!user) {
        return res.status(401).json({ error: 'User not found or inactive' });
      }

      // Generate new JWT token
      const token = AuthUtils.generateJWT({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      res.json({
        token,
        user: {
          id: user.uuid,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role
        }
      });

    } catch (error) {
      console.error('Error refreshing token:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get current user profile
  async getProfile(req, res) {
    try {
      const user = await database.get(`
        SELECT uuid as id, email, first_name, last_name, is_active, is_verified, role, created_at
        FROM users 
        WHERE id = ?
      `, [req.user.id]);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);

    } catch (error) {
      console.error('Error fetching profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const { first_name, last_name } = req.body;
      const userId = req.user.id;

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

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(userId);

      await database.run(`
        UPDATE users 
        SET ${updates.join(', ')} 
        WHERE id = ?
      `, values);

      // Return updated profile
      const updatedUser = await database.get(`
        SELECT uuid as id, email, first_name, last_name, is_active, is_verified, role, created_at
        FROM users 
        WHERE id = ?
      `, [userId]);

      res.json(updatedUser);

    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const { current_password, new_password } = req.body;
      const userId = req.user.id;

      if (!current_password || !new_password) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }

      // Get current password hash
      const user = await database.get(`
        SELECT password_hash FROM users WHERE id = ?
      `, [userId]);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify current password
      const isValidPassword = await AuthUtils.comparePassword(current_password, user.password_hash);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const newPasswordHash = await AuthUtils.hashPassword(new_password);

      // Update password
      await database.run(`
        UPDATE users 
        SET password_hash = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [newPasswordHash, userId]);

      res.json({ message: 'Password changed successfully' });

    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Request password reset
  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const user = await database.get(`
        SELECT id, first_name, email FROM users WHERE email = ? AND is_active = 1
      `, [email]);

      if (!user) {
        // Don't reveal if email exists or not
        return res.json({ message: 'If the email exists, a password reset link has been sent' });
      }

      // Generate reset token
      const resetToken = AuthUtils.generateVerificationToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

      // Store reset token (reuse verification_token field)
      await database.run(`
        UPDATE users 
        SET verification_token = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [resetToken, user.id]);

      // Send password reset email
      await EmailService.sendPasswordResetEmail(user.email, user.first_name, resetToken);

      res.json({ message: 'If the email exists, a password reset link has been sent' });

    } catch (error) {
      console.error('Error requesting password reset:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Reset password with token
  async resetPassword(req, res) {
    try {
      const { token, new_password } = req.body;

      if (!token || !new_password) {
        return res.status(400).json({ error: 'Token and new password are required' });
      }

      const user = await database.get(`
        SELECT id FROM users 
        WHERE verification_token = ? AND updated_at > datetime('now', '-1 hour')
      `, [token]);

      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      // Hash new password
      const passwordHash = await AuthUtils.hashPassword(new_password);

      // Update password and clear token
      await database.run(`
        UPDATE users 
        SET password_hash = ?, verification_token = NULL, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [passwordHash, user.id]);

      res.json({ message: 'Password reset successfully' });

    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Logout (invalidate API tokens)
  async logout(req, res) {
    try {
      const userId = req.user.id;

      // Deactivate all API tokens for this user
      await database.run(`
        UPDATE api_tokens 
        SET is_active = 0 
        WHERE user_id = ?
      `, [userId]);

      res.json({ message: 'Logged out successfully' });

    } catch (error) {
      console.error('Error during logout:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new AuthController();