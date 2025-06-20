const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class AuthUtils {
  static async hashPassword(password) {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    return await bcrypt.hash(password, rounds);
  }

  static async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  static generateJWT(payload, expiresIn = '24h') {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
  }

  static verifyJWT(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  static generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  static generateApiToken() {
    return crypto.randomBytes(64).toString('hex');
  }

  static hashApiToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static generateUUID() {
    return crypto.randomUUID();
  }
}

module.exports = AuthUtils;