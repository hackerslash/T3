const database = require('../models/database');
const FraudDetection = require('../utils/fraudDetection');

class FraudController {
  
  // Get all fraud alerts (admin only)
  async getFraudAlerts(req, res) {
    try {
      const { page = 1, limit = 50, severity, resolved } = req.query;
      const offset = (page - 1) * limit;
      
      let whereClause = '';
      let params = [];
      
      if (severity) {
        whereClause += ' WHERE JSON_EXTRACT(flags, "$[*].severity") LIKE ?';
        params.push(`%${severity}%`);
      }
      
      if (resolved !== undefined) {
        whereClause += whereClause ? ' AND' : ' WHERE';
        whereClause += ' resolved = ?';
        params.push(resolved === 'true' ? 1 : 0);
      }
      
      const alerts = await database.all(`
        SELECT 
          fa.id, fa.user_id, fa.risk_score, fa.flags, fa.session_data,
          fa.resolved, fa.resolved_by, fa.resolved_at, fa.created_at,
          u.email as user_email, u.first_name, u.last_name,
          resolver.email as resolved_by_email
        FROM fraud_alerts fa
        JOIN users u ON fa.user_id = u.id
        LEFT JOIN users resolver ON fa.resolved_by = resolver.id
        ${whereClause}
        ORDER BY fa.created_at DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);
      
      // Parse JSON fields
      const parsedAlerts = alerts.map(alert => ({
        ...alert,
        flags: JSON.parse(alert.flags),
        session_data: alert.session_data ? JSON.parse(alert.session_data) : null
      }));
      
      // Get total count
      const countResult = await database.get(`
        SELECT COUNT(*) as total FROM fraud_alerts fa ${whereClause}
      `, params);
      
      res.json({
        alerts: parsedAlerts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.total,
          pages: Math.ceil(countResult.total / limit)
        }
      });
      
    } catch (error) {
      console.error('Error fetching fraud alerts:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // Get fraud alert details
  async getFraudAlert(req, res) {
    try {
      const { id } = req.params;
      
      const alert = await database.get(`
        SELECT 
          fa.id, fa.user_id, fa.risk_score, fa.flags, fa.session_data,
          fa.resolved, fa.resolved_by, fa.resolved_at, fa.created_at,
          u.email as user_email, u.first_name, u.last_name,
          resolver.email as resolved_by_email
        FROM fraud_alerts fa
        JOIN users u ON fa.user_id = u.id
        LEFT JOIN users resolver ON fa.resolved_by = resolver.id
        WHERE fa.id = ?
      `, [id]);
      
      if (!alert) {
        return res.status(404).json({ error: 'Fraud alert not found' });
      }
      
      // Parse JSON fields
      alert.flags = JSON.parse(alert.flags);
      alert.session_data = alert.session_data ? JSON.parse(alert.session_data) : null;
      
      // Get related time logs and screenshots
      const relatedData = await this.getRelatedData(alert.user_id, alert.created_at);
      
      res.json({
        alert,
        related_data: relatedData
      });
      
    } catch (error) {
      console.error('Error fetching fraud alert:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // Resolve fraud alert
  async resolveFraudAlert(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const resolvedBy = req.user.id;
      
      const alert = await database.get('SELECT id FROM fraud_alerts WHERE id = ?', [id]);
      if (!alert) {
        return res.status(404).json({ error: 'Fraud alert not found' });
      }
      
      await database.run(`
        UPDATE fraud_alerts 
        SET resolved = 1, resolved_by = ?, resolved_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [resolvedBy, id]);
      
      res.json({ message: 'Fraud alert resolved successfully' });
      
    } catch (error) {
      console.error('Error resolving fraud alert:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // Get fraud statistics
  async getFraudStats(req, res) {
    try {
      const { days = 30 } = req.query;
      
      const stats = await database.all(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as total_alerts,
          AVG(risk_score) as avg_risk_score,
          COUNT(CASE WHEN resolved = 1 THEN 1 END) as resolved_alerts,
          COUNT(CASE WHEN risk_score >= 75 THEN 1 END) as high_risk_alerts
        FROM fraud_alerts 
        WHERE created_at >= datetime('now', '-${days} days')
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `);
      
      const summary = await database.get(`
        SELECT 
          COUNT(*) as total_alerts,
          COUNT(CASE WHEN resolved = 1 THEN 1 END) as resolved_alerts,
          COUNT(CASE WHEN risk_score >= 75 THEN 1 END) as high_risk_alerts,
          COUNT(CASE WHEN risk_score >= 50 AND risk_score < 75 THEN 1 END) as medium_risk_alerts,
          COUNT(CASE WHEN risk_score < 50 THEN 1 END) as low_risk_alerts,
          AVG(risk_score) as avg_risk_score
        FROM fraud_alerts 
        WHERE created_at >= datetime('now', '-${days} days')
      `);
      
      res.json({
        summary,
        daily_stats: stats
      });
      
    } catch (error) {
      console.error('Error fetching fraud stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // Helper method to get related data for an alert
  async getRelatedData(userId, alertTime) {
    try {
      // Get time logs around the alert time (±2 hours)
      const timeLogs = await database.all(`
        SELECT uuid, project_id, start_time, end_time, duration, 
               ip_address, mac_address, hostname, os_info
        FROM time_logs 
        WHERE user_id = ? 
        AND start_time BETWEEN datetime(?, '-2 hours') AND datetime(?, '+2 hours')
        ORDER BY start_time DESC
      `, [userId, alertTime, alertTime]);
      
      // Get screenshots around the alert time
      const screenshots = await database.all(`
        SELECT uuid, time_log_id, file_size, taken_at, permission_denied
        FROM screenshots 
        WHERE user_id = ? 
        AND taken_at BETWEEN datetime(?, '-2 hours') AND datetime(?, '+2 hours')
        ORDER BY taken_at DESC
      `, [userId, alertTime, alertTime]);
      
      return {
        time_logs: timeLogs,
        screenshots: screenshots
      };
      
    } catch (error) {
      console.error('Error fetching related data:', error);
      return { time_logs: [], screenshots: [] };
    }
  }
}

module.exports = new FraudController();