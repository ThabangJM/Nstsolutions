const { pool } = require('../config/database');

class ChatSession {
  // Create new chat session
  static async create(userId, sessionName = null) {
    try {
      const [result] = await pool.query(
        'INSERT INTO chat_sessions (user_id, session_name) VALUES (?, ?)',
        [userId, sessionName]
      );
      
      const [session] = await pool.query(
        'SELECT * FROM chat_sessions WHERE id = ?',
        [result.insertId]
      );
      
      return session[0];
    } catch (error) {
      console.error('ChatSession.create error:', error);
      throw error;
    }
  }

  // Get session by ID
  static async findById(sessionId) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM chat_sessions WHERE id = ?',
        [sessionId]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('ChatSession.findById error:', error);
      throw error;
    }
  }

  // Get all sessions for a user
  static async findByUserId(userId, limit = 50) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?',
        [userId, limit]
      );
      return rows;
    } catch (error) {
      console.error('ChatSession.findByUserId error:', error);
      throw error;
    }
  }

  // Add message to session
  static async addMessage(sessionId, role, content, tokensUsed = 0, model = null) {
    try {
      const [result] = await pool.query(
        'INSERT INTO chat_messages (session_id, role, content, tokens_used, model) VALUES (?, ?, ?, ?, ?)',
        [sessionId, role, content, tokensUsed, model]
      );
      
      // Update session's updated_at
      await pool.query(
        'UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [sessionId]
      );
      
      return result.insertId;
    } catch (error) {
      console.error('ChatSession.addMessage error:', error);
      throw error;
    }
  }

  // Get messages for a session
  static async getMessages(sessionId, limit = 100) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC LIMIT ?',
        [sessionId, limit]
      );
      return rows;
    } catch (error) {
      console.error('ChatSession.getMessages error:', error);
      throw error;
    }
  }

  // Delete session
  static async delete(sessionId) {
    try {
      await pool.query('DELETE FROM chat_sessions WHERE id = ?', [sessionId]);
      return true;
    } catch (error) {
      console.error('ChatSession.delete error:', error);
      throw error;
    }
  }

  // Update session name
  static async updateName(sessionId, sessionName) {
    try {
      await pool.query(
        'UPDATE chat_sessions SET session_name = ? WHERE id = ?',
        [sessionName, sessionId]
      );
      return true;
    } catch (error) {
      console.error('ChatSession.updateName error:', error);
      throw error;
    }
  }
}

module.exports = ChatSession;
