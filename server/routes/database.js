const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ChatSession = require('../models/ChatSession');
const Document = require('../models/Document');
const AuditLog = require('../models/AuditLog');

// Get current user or create guest user
router.get('/user/current', async (req, res) => {
  try {
    const uid = req.session?.userId || 'guest';
    const user = await User.findOrCreate(uid);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        uid: user.uid,
        displayName: user.display_name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user information'
    });
  }
});

// Get chat history for user
router.get('/chat/sessions', async (req, res) => {
  try {
    const uid = req.session?.userId || 'guest';
    const user = await User.findByUid(uid);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const limit = parseInt(req.query.limit) || 50;
    const sessions = await ChatSession.findByUserId(user.id, limit);
    
    res.json({
      success: true,
      sessions
    });
  } catch (error) {
    console.error('Get chat sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve chat sessions'
    });
  }
});

// Get messages for a specific session
router.get('/chat/sessions/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    
    const messages = await ChatSession.getMessages(sessionId, limit);
    
    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve messages'
    });
  }
});

// Create new chat session
router.post('/chat/sessions', async (req, res) => {
  try {
    const uid = req.session?.userId || 'guest';
    const user = await User.findByUid(uid);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const { sessionName } = req.body;
    const session = await ChatSession.create(user.id, sessionName);
    
    // Log action
    await AuditLog.log(
      user.id,
      'chat_session_created',
      `Created session: ${sessionName || 'Unnamed'}`,
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({
      success: true,
      session
    });
  } catch (error) {
    console.error('Create chat session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create chat session'
    });
  }
});

// Get messages for a specific session
router.get('/chat/sessions/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    
    const messages = await ChatSession.getMessages(sessionId, limit);
    
    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Get session messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get messages'
    });
  }
});

// Delete chat session
router.delete('/chat/sessions/:sessionId', async (req, res) => {
  try {
    const uid = req.session?.userId || 'guest';
    const user = await User.findByUid(uid);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const { sessionId } = req.params;
    await ChatSession.delete(sessionId);
    
    // Log action
    await AuditLog.log(
      user.id,
      'chat_session_deleted',
      `Deleted session ID: ${sessionId}`,
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    console.error('Delete chat session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete session'
    });
  }
});

// Save chat message
router.post('/chat/messages', async (req, res) => {
  try {
    const { sessionId, role, content, tokensUsed, model } = req.body;
    
    if (!sessionId || !role || !content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sessionId, role, content'
      });
    }
    
    const messageId = await ChatSession.addMessage(
      sessionId,
      role,
      content,
      tokensUsed || 0,
      model
    );
    
    res.json({
      success: true,
      messageId
    });
  } catch (error) {
    console.error('Save chat message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save message'
    });
  }
});

// Get user's documents
router.get('/documents', async (req, res) => {
  try {
    const uid = req.session?.userId || 'guest';
    const user = await User.findByUid(uid);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const fileType = req.query.type; // 'APP', 'APR', or null for all
    const documents = await Document.findByUserId(user.id, fileType);
    
    res.json({
      success: true,
      documents
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve documents'
    });
  }
});

// Get document by ID with chunks
router.get('/documents/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }
    
    const chunks = await Document.getChunks(documentId);
    
    res.json({
      success: true,
      document,
      chunks
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve document'
    });
  }
});

// Search document chunks
router.get('/documents/search', async (req, res) => {
  try {
    const uid = req.session?.userId || 'guest';
    const user = await User.findByUid(uid);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const { q, type, limit } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query (q) is required'
      });
    }
    
    const results = await Document.searchChunks(
      user.id,
      q,
      type,
      parseInt(limit) || 10
    );
    
    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Search documents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search documents'
    });
  }
});

// Get audit logs
router.get('/logs', async (req, res) => {
  try {
    const uid = req.session?.userId || 'guest';
    const user = await User.findByUid(uid);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const limit = parseInt(req.query.limit) || 100;
    const logs = await AuditLog.findByUserId(user.id, limit);
    
    res.json({
      success: true,
      logs
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit logs'
    });
  }
});

// Get user preferences
router.get('/preferences', async (req, res) => {
  try {
    const uid = req.session?.userId || 'guest';
    const user = await User.findByUid(uid);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const preferences = await User.getPreferences(user.id);
    
    res.json({
      success: true,
      preferences: preferences || {
        darkMode: false,
        defaultModel: 'gpt-4o',
        settings: {}
      }
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve preferences'
    });
  }
});

// Update user preferences
router.post('/preferences', async (req, res) => {
  try {
    const uid = req.session?.userId || 'guest';
    const user = await User.findByUid(uid);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const { darkMode, defaultModel, settings } = req.body;
    
    await User.updatePreferences(user.id, {
      darkMode,
      defaultModel,
      settings
    });
    
    // Log action
    await AuditLog.log(
      user.id,
      'preferences_updated',
      'User preferences updated',
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({
      success: true,
      message: 'Preferences updated successfully'
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences'
    });
  }
});

// Database statistics endpoint
router.get('/stats', async (req, res) => {
  try {
    const { pool } = require('../config/database');
    
    const [userCount] = await pool.query('SELECT COUNT(*) as count FROM users');
    const [sessionCount] = await pool.query('SELECT COUNT(*) as count FROM chat_sessions');
    const [messageCount] = await pool.query('SELECT COUNT(*) as count FROM chat_messages');
    const [documentCount] = await pool.query('SELECT COUNT(*) as count FROM documents');
    const [chunkCount] = await pool.query('SELECT COUNT(*) as count FROM document_chunks');
    
    res.json({
      success: true,
      stats: {
        users: userCount[0].count,
        sessions: sessionCount[0].count,
        messages: messageCount[0].count,
        documents: documentCount[0].count,
        chunks: chunkCount[0].count
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics'
    });
  }
});

module.exports = router;
