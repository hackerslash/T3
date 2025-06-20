const AuthUtils = require('../utils/auth');
const database = require('../models/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = AuthUtils.verifyJWT(token);
    
    // Get user from database
    const user = await database.get(
      'SELECT id, uuid, email, first_name, last_name, is_active, role FROM users WHERE id = ? AND is_active = 1',
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid token or user not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const authenticateApiToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'API token required' });
  }

  try {
    const tokenHash = AuthUtils.hashApiToken(token);
    
    // Check if token exists and is valid
    const tokenRecord = await database.get(`
      SELECT at.*, u.id, u.uuid, u.email, u.first_name, u.last_name, u.is_active, u.role
      FROM api_tokens at
      JOIN users u ON at.user_id = u.id
      WHERE at.token_hash = ? AND at.is_active = 1 AND at.expires_at > datetime('now') AND u.is_active = 1
    `, [tokenHash]);

    if (!tokenRecord) {
      return res.status(401).json({ error: 'Invalid or expired API token' });
    }

    req.user = {
      id: tokenRecord.id,
      uuid: tokenRecord.uuid,
      email: tokenRecord.email,
      first_name: tokenRecord.first_name,
      last_name: tokenRecord.last_name,
      is_active: tokenRecord.is_active,
      role: tokenRecord.role
    };
    
    next();
  } catch (error) {
    console.error('API token verification error:', error);
    return res.status(403).json({ error: 'Invalid API token' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    const hasRole = requiredRoles.some(role => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Alias for JWT authentication
const authenticateJWT = authenticateToken;

// Admin role requirement
const requireAdmin = requireRole('admin');

module.exports = {
  authenticateToken,
  authenticateJWT,
  authenticateApiToken,
  requireRole,
  requireAdmin
};