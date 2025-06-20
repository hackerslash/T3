const database = require('../models/database');

class FraudDetection {
  
  // Check for suspicious time tracking patterns
  static async analyzeTimeTrackingSession(userId, sessionData) {
    const suspiciousFlags = [];
    
    try {
      // 1. Check for rapid location changes (different IPs within short time)
      if (sessionData.ip_address) {
        const recentSessions = await database.all(`
          SELECT ip_address, start_time 
          FROM time_logs 
          WHERE user_id = ? AND start_time > datetime('now', '-2 hours')
          ORDER BY start_time DESC
          LIMIT 5
        `, [userId]);
        
        const uniqueIPs = new Set(recentSessions.map(s => s.ip_address).filter(Boolean));
        if (uniqueIPs.size > 2) {
          suspiciousFlags.push({
            type: 'RAPID_LOCATION_CHANGE',
            severity: 'HIGH',
            details: `Multiple IPs (${uniqueIPs.size}) in 2 hours: ${Array.from(uniqueIPs).join(', ')}`
          });
        }
      }
      
      // 2. Check for MAC address changes (device switching)
      if (sessionData.mac_address) {
        const recentMACs = await database.all(`
          SELECT DISTINCT mac_address 
          FROM time_logs 
          WHERE user_id = ? AND start_time > datetime('now', '-24 hours')
          AND mac_address IS NOT NULL
        `, [userId]);
        
        const uniqueMACs = recentMACs.map(r => r.mac_address).filter(Boolean);
        if (uniqueMACs.length > 2) {
          suspiciousFlags.push({
            type: 'MULTIPLE_DEVICES',
            severity: 'MEDIUM',
            details: `${uniqueMACs.length} different devices in 24 hours`
          });
        }
      }
      
      // 3. Check for unusual working hours (outside 6 AM - 11 PM)
      const hour = new Date().getHours();
      if (hour < 6 || hour > 23) {
        suspiciousFlags.push({
          type: 'UNUSUAL_HOURS',
          severity: 'LOW',
          details: `Working at ${hour}:00 (outside normal hours)`
        });
      }
      
      // 4. Check for excessive daily hours (>12 hours)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const todayHours = await database.get(`
        SELECT SUM(duration) as total_seconds
        FROM time_logs 
        WHERE user_id = ? AND start_time >= ? AND end_time IS NOT NULL
      `, [userId, todayStart.toISOString()]);
      
      const hoursWorked = (todayHours?.total_seconds || 0) / 3600;
      if (hoursWorked > 12) {
        suspiciousFlags.push({
          type: 'EXCESSIVE_HOURS',
          severity: 'HIGH',
          details: `${hoursWorked.toFixed(1)} hours worked today`
        });
      }
      
      return suspiciousFlags;
      
    } catch (error) {
      console.error('Error in fraud detection analysis:', error);
      return [];
    }
  }
  
  // Check for screenshot-related fraud indicators
  static async analyzeScreenshotPatterns(userId, timeLogId) {
    const suspiciousFlags = [];
    
    try {
      // Check for missing screenshots (permission denied too often)
      const recentScreenshots = await database.all(`
        SELECT permission_denied, taken_at
        FROM screenshots 
        WHERE user_id = ? AND taken_at > datetime('now', '-4 hours')
        ORDER BY taken_at DESC
        LIMIT 20
      `, [userId]);
      
      if (recentScreenshots.length > 0) {
        const deniedCount = recentScreenshots.filter(s => s.permission_denied).length;
        const deniedPercentage = (deniedCount / recentScreenshots.length) * 100;
        
        if (deniedPercentage > 50) {
          suspiciousFlags.push({
            type: 'FREQUENT_SCREENSHOT_DENIAL',
            severity: 'HIGH',
            details: `${deniedPercentage.toFixed(1)}% of screenshots denied in last 4 hours`
          });
        }
      }
      
      // Check for very small screenshot files (potential blank screens)
      const smallScreenshots = await database.all(`
        SELECT file_size, taken_at
        FROM screenshots 
        WHERE user_id = ? AND time_log_id = ? AND file_size < 10000
      `, [userId, timeLogId]);
      
      if (smallScreenshots.length > 2) {
        suspiciousFlags.push({
          type: 'SUSPICIOUS_SCREENSHOT_SIZE',
          severity: 'MEDIUM',
          details: `${smallScreenshots.length} unusually small screenshots`
        });
      }
      
      return suspiciousFlags;
      
    } catch (error) {
      console.error('Error in screenshot fraud analysis:', error);
      return [];
    }
  }
  
  // Check for concurrent sessions (same user, different devices)
  static async checkConcurrentSessions(userId, currentSessionData) {
    try {
      const activeSessions = await database.all(`
        SELECT uuid, ip_address, mac_address, hostname, start_time
        FROM time_logs 
        WHERE user_id = ? AND is_active = 1
      `, [userId]);
      
      if (activeSessions.length > 1) {
        // Check if sessions are from different devices
        const devices = new Set();
        activeSessions.forEach(session => {
          const deviceId = session.mac_address || session.ip_address || session.hostname;
          if (deviceId) devices.add(deviceId);
        });
        
        if (devices.size > 1) {
          return {
            type: 'CONCURRENT_SESSIONS',
            severity: 'CRITICAL',
            details: `${activeSessions.length} active sessions from ${devices.size} different devices`,
            sessions: activeSessions
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error checking concurrent sessions:', error);
      return null;
    }
  }
  
  // Generate fraud risk score (0-100)
  static calculateRiskScore(suspiciousFlags) {
    let score = 0;
    
    suspiciousFlags.forEach(flag => {
      switch (flag.severity) {
        case 'CRITICAL': score += 40; break;
        case 'HIGH': score += 25; break;
        case 'MEDIUM': score += 15; break;
        case 'LOW': score += 5; break;
      }
    });
    
    return Math.min(score, 100);
  }
  
  // Log suspicious activity
  static async logSuspiciousActivity(userId, flags, sessionData) {
    if (flags.length === 0) return;
    
    try {
      const riskScore = this.calculateRiskScore(flags);
      
      await database.run(`
        INSERT INTO fraud_alerts (
          user_id, risk_score, flags, session_data, created_at
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        userId,
        riskScore,
        JSON.stringify(flags),
        JSON.stringify(sessionData)
      ]);
      
      // Log to console for immediate attention
      console.warn(`🚨 FRAUD ALERT - User ${userId} - Risk Score: ${riskScore}%`);
      flags.forEach(flag => {
        console.warn(`  - ${flag.type} (${flag.severity}): ${flag.details}`);
      });
      
    } catch (error) {
      console.error('Error logging suspicious activity:', error);
    }
  }
}

module.exports = FraudDetection;