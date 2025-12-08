const { pool } = require('../config/database');

class User {
  // Create or get user
  static async findOrCreate(uid, email = null, displayName = null) {
    try {
      const connection = await pool.getConnection();
      
      // Check if user exists
      const [rows] = await connection.query(
        'SELECT * FROM users WHERE uid = ?',
        [uid]
      );
      
      if (rows.length > 0) {
        // Update last login
        await connection.query(
          'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
          [rows[0].id]
        );
        connection.release();
        return rows[0];
      }
      
      // Create new user
      const [result] = await connection.query(
        'INSERT INTO users (uid, email, display_name) VALUES (?, ?, ?)',
        [uid, email, displayName]
      );
      
      const [newUser] = await connection.query(
        'SELECT * FROM users WHERE id = ?',
        [result.insertId]
      );
      
      connection.release();
      return newUser[0];
    } catch (error) {
      console.error('User.findOrCreate error:', error);
      throw error;
    }
  }

  // Get user by ID
  static async findById(userId) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('User.findById error:', error);
      throw error;
    }
  }

  // Get user by UID
  static async findByUid(uid) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM users WHERE uid = ?',
        [uid]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('User.findByUid error:', error);
      throw error;
    }
  }

  // Update user preferences
  static async updatePreferences(userId, preferences) {
    try {
      const connection = await pool.getConnection();
      
      const [existing] = await connection.query(
        'SELECT * FROM user_preferences WHERE user_id = ?',
        [userId]
      );
      
      if (existing.length > 0) {
        await connection.query(
          'UPDATE user_preferences SET dark_mode = ?, default_model = ?, settings = ? WHERE user_id = ?',
          [preferences.darkMode, preferences.defaultModel, JSON.stringify(preferences.settings), userId]
        );
      } else {
        await connection.query(
          'INSERT INTO user_preferences (user_id, dark_mode, default_model, settings) VALUES (?, ?, ?, ?)',
          [userId, preferences.darkMode, preferences.defaultModel, JSON.stringify(preferences.settings)]
        );
      }
      
      connection.release();
      return true;
    } catch (error) {
      console.error('User.updatePreferences error:', error);
      throw error;
    }
  }

  // Get user preferences
  static async getPreferences(userId) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM user_preferences WHERE user_id = ?',
        [userId]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('User.getPreferences error:', error);
      throw error;
    }
  }
}

module.exports = User;
