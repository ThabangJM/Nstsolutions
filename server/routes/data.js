const express = require('express');
const router = express.Router();
const ChatSession = require('../models/ChatSession');
const Document = require('../models/Document');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

/**
 * GET /api/data
 * Info endpoint
 */
router.get('/', (req, res) => {
  res.json({
    message: 'Data API',
    endpoints: {
      'GET /api/data/sessions': 'Get user chat sessions',
      'GET /api/data/sessions/:id/messages': 'Get messages for a session',
      'GET /api/data/documents': 'Get user documents',
      'GET /api/data/documents/:id/chunks': 'Get document chunks',
      'DELETE /api/data/sessions/:id': 'Delete a chat session',
      'GET /api/data/logs': 'Get audit logs'
    }
  });
});

/**
 * GET /api/data/sessions
 * Get all chat sessions for a user
 */
router.get('/sessions', async (req, res) => {
  try {
    const userId = req.query.userId || 'guest';
    const limit = parseInt(req.query.limit) || 50;

    const user = await User.findByUid(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: `User with UID '${userId}' not found`
      });
    }

    const sessions = await ChatSession.findByUserId(user.id, limit);

    res.json({
      userId: userId,
      sessionsCount: sessions.length,
      sessions: sessions
    });
  } catch (error) {
    console.error('[Data] Get sessions error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve chat sessions'
    });
  }
});

/**
 * GET /api/data/sessions/:id/messages
 * Get messages for a specific session
 */
router.get('/sessions/:id/messages', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit) || 100;

    const session = await ChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: `Session with ID '${sessionId}' not found`
      });
    }

    const messages = await ChatSession.getMessages(sessionId, limit);

    res.json({
      sessionId: sessionId,
      sessionName: session.session_name,
      messageCount: messages.length,
      messages: messages
    });
  } catch (error) {
    console.error('[Data] Get messages error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve messages'
    });
  }
});

/**
 * DELETE /api/data/sessions/:id
 * Delete a chat session
 */
router.delete('/sessions/:id', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const userId = req.body.userId || req.query.userId || 'guest';

    const user = await User.findByUid(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: `User with UID '${userId}' not found`
      });
    }

    const session = await ChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: `Session with ID '${sessionId}' not found`
      });
    }

    // Verify ownership
    if (session.user_id !== user.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to delete this session'
      });
    }

    await ChatSession.delete(sessionId);
    await AuditLog.log(user.id, 'session_deleted', `Deleted session ${sessionId}`, req.ip, req.headers['user-agent']);

    res.json({
      message: 'Session deleted successfully',
      sessionId: sessionId
    });
  } catch (error) {
    console.error('[Data] Delete session error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete session'
    });
  }
});

/**
 * GET /api/data/documents
 * Get all documents for a user
 */
router.get('/documents', async (req, res) => {
  try {
    const userId = req.query.userId || 'guest';
    const fileType = req.query.fileType; // Optional: 'APP', 'APR', or 'OTHER'

    const user = await User.findByUid(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: `User with UID '${userId}' not found`
      });
    }

    const documents = await Document.findByUserId(user.id, fileType);

    res.json({
      userId: userId,
      documentsCount: documents.length,
      documents: documents
    });
  } catch (error) {
    console.error('[Data] Get documents error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve documents'
    });
  }
});

/**
 * GET /api/data/documents/:id/chunks
 * Get chunks for a specific document
 */
router.get('/documents/:id/chunks', async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({
        error: 'Document not found',
        message: `Document with ID '${documentId}' not found`
      });
    }

    const chunks = await Document.getChunks(documentId);

    res.json({
      documentId: documentId,
      filename: document.original_filename,
      chunkCount: chunks.length,
      chunks: chunks.map(chunk => ({
        id: chunk.id,
        chunk_index: chunk.chunk_index,
        content: chunk.content,
        metadata: chunk.metadata ? JSON.parse(chunk.metadata) : null
      }))
    });
  } catch (error) {
    console.error('[Data] Get chunks error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve document chunks'
    });
  }
});

/**
 * DELETE /api/data/documents/:id
 * Delete a document
 */
router.delete('/documents/:id', async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    const userId = req.body.userId || req.query.userId || 'guest';

    const user = await User.findByUid(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: `User with UID '${userId}' not found`
      });
    }

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({
        error: 'Document not found',
        message: `Document with ID '${documentId}' not found`
      });
    }

    // Verify ownership
    if (document.user_id !== user.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to delete this document'
      });
    }

    await Document.delete(documentId);
    await AuditLog.log(user.id, 'document_deleted', `Deleted document ${document.original_filename}`, req.ip, req.headers['user-agent']);

    res.json({
      message: 'Document deleted successfully',
      documentId: documentId
    });
  } catch (error) {
    console.error('[Data] Delete document error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete document'
    });
  }
});

/**
 * GET /api/data/logs
 * Get audit logs
 */
router.get('/logs', async (req, res) => {
  try {
    const userId = req.query.userId;
    const action = req.query.action;
    const limit = parseInt(req.query.limit) || 50;

    let logs;
    if (userId) {
      const user = await User.findByUid(userId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: `User with UID '${userId}' not found`
        });
      }
      logs = await AuditLog.findByUserId(user.id, limit);
    } else if (action) {
      logs = await AuditLog.findByAction(action, limit);
    } else {
      logs = await AuditLog.getRecent(limit);
    }

    res.json({
      logsCount: logs.length,
      logs: logs
    });
  } catch (error) {
    console.error('[Data] Get logs error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve logs'
    });
  }
});

/**
 * POST /api/data/search
 * Search document chunks
 */
router.post('/search', async (req, res) => {
  try {
    const { query, userId = 'guest', fileType, limit = 10 } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Query is required and must be a string'
      });
    }

    const user = await User.findByUid(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: `User with UID '${userId}' not found`
      });
    }

    const results = await Document.searchChunks(user.id, query, fileType, limit);

    res.json({
      query: query,
      resultsCount: results.length,
      results: results.map(result => ({
        documentId: result.document_id,
        filename: result.original_filename,
        fileType: result.file_type,
        chunkId: result.id,
        chunkIndex: result.chunk_index,
        content: result.content,
        metadata: result.metadata ? JSON.parse(result.metadata) : null
      }))
    });
  } catch (error) {
    console.error('[Data] Search error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to search documents'
    });
  }
});

module.exports = router;
