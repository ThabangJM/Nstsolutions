const { pool } = require('../config/database');

class Document {
  // Create document record
  static async create(userId, filename, originalFilename, fileType, filePath, fileSize) {
    try {
      const [result] = await pool.query(
        'INSERT INTO documents (user_id, filename, original_filename, file_type, file_path, file_size) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, filename, originalFilename, fileType, filePath, fileSize]
      );
      
      const [document] = await pool.query(
        'SELECT * FROM documents WHERE id = ?',
        [result.insertId]
      );
      
      return document[0];
    } catch (error) {
      console.error('Document.create error:', error);
      throw error;
    }
  }

  // Get document by ID
  static async findById(documentId) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM documents WHERE id = ?',
        [documentId]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Document.findById error:', error);
      throw error;
    }
  }

  // Get all documents for a user
  static async findByUserId(userId, fileType = null) {
    try {
      let query = 'SELECT * FROM documents WHERE user_id = ?';
      const params = [userId];
      
      if (fileType) {
        query += ' AND file_type = ?';
        params.push(fileType);
      }
      
      query += ' ORDER BY upload_date DESC';
      
      const [rows] = await pool.query(query, params);
      return rows;
    } catch (error) {
      console.error('Document.findByUserId error:', error);
      throw error;
    }
  }

  // Mark document as processed
  static async markProcessed(documentId) {
    try {
      await pool.query(
        'UPDATE documents SET processed = TRUE, processed_date = CURRENT_TIMESTAMP WHERE id = ?',
        [documentId]
      );
      return true;
    } catch (error) {
      console.error('Document.markProcessed error:', error);
      throw error;
    }
  }

  // Add chunk to document
  static async addChunk(documentId, chunkIndex, content, embedding = null, metadata = null) {
    try {
      const [result] = await pool.query(
        'INSERT INTO document_chunks (document_id, chunk_index, content, embedding, metadata) VALUES (?, ?, ?, ?, ?)',
        [documentId, chunkIndex, content, JSON.stringify(embedding), JSON.stringify(metadata)]
      );
      return result.insertId;
    } catch (error) {
      console.error('Document.addChunk error:', error);
      throw error;
    }
  }

  // Get chunks for a document
  static async getChunks(documentId) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM document_chunks WHERE document_id = ? ORDER BY chunk_index ASC',
        [documentId]
      );
      return rows;
    } catch (error) {
      console.error('Document.getChunks error:', error);
      throw error;
    }
  }

  // Delete document and its chunks
  static async delete(documentId) {
    try {
      await pool.query('DELETE FROM documents WHERE id = ?', [documentId]);
      return true;
    } catch (error) {
      console.error('Document.delete error:', error);
      throw error;
    }
  }

  // Search chunks by content
  static async searchChunks(userId, searchText, fileType = null, limit = 10) {
    try {
      let query = `
        SELECT dc.*, d.filename, d.file_type, d.original_filename
        FROM document_chunks dc
        JOIN documents d ON dc.document_id = d.id
        WHERE d.user_id = ? AND dc.content LIKE ?
      `;
      const params = [userId, `%${searchText}%`];
      
      if (fileType) {
        query += ' AND d.file_type = ?';
        params.push(fileType);
      }
      
      query += ' ORDER BY dc.chunk_index ASC LIMIT ?';
      params.push(limit);
      
      const [rows] = await pool.query(query, params);
      return rows;
    } catch (error) {
      console.error('Document.searchChunks error:', error);
      throw error;
    }
  }
}

module.exports = Document;
