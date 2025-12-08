const { pool } = require('../config/database');

class AuditLog {
  // Log user action
  static async log(userId, action, details = null, ipAddress = null, userAgent = null) {
    try {
      const [result] = await pool.query(
        'INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
        [userId, action, details, ipAddress, userAgent]
      );
      return result.insertId;
    } catch (error) {
      console.error('AuditLog.log error:', error);
      // Don't throw - logging failures shouldn't break the app
      return null;
    }
  }

  // Get logs for a user
  static async findByUserId(userId, limit = 100) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
        [userId, limit]
      );
      return rows;
    } catch (error) {
      console.error('AuditLog.findByUserId error:', error);
      throw error;
    }
  }

  // Get logs by action
  static async findByAction(action, limit = 100) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM audit_logs WHERE action = ? ORDER BY created_at DESC LIMIT ?',
        [action, limit]
      );
      return rows;
    } catch (error) {
      console.error('AuditLog.findByAction error:', error);
      throw error;
    }
  }

  // Get recent logs
  static async getRecent(limit = 50) {
    try {
      const [rows] = await pool.query(
        'SELECT al.*, u.display_name FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id ORDER BY al.created_at DESC LIMIT ?',
        [limit]
      );
      return rows;
    } catch (error) {
      console.error('AuditLog.getRecent error:', error);
      throw error;
    }
  }

  // Clean old logs (older than specified days)
  static async cleanOldLogs(daysToKeep = 90) {
    try {
      const [result] = await pool.query(
        'DELETE FROM audit_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
        [daysToKeep]
      );
      return result.affectedRows;
    } catch (error) {
      console.error('AuditLog.cleanOldLogs error:', error);
      throw error;
    }
  }
}

module.exports = AuditLog;
