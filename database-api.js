// Database API Client for NST Solutions AI Auditor
// Provides easy access to database functionality from the frontend

const DB_API_BASE = 'http://localhost:3000/api/db';

const DatabaseAPI = {
  // User Management
  async getCurrentUser() {
    try {
      const response = await fetch(`${DB_API_BASE}/user/current`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get current user error:', error);
      return { success: false, error: error.message };
    }
  },

  // Chat Sessions
  async getChatSessions(limit = 50) {
    try {
      const response = await fetch(`${DB_API_BASE}/chat/sessions?limit=${limit}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get chat sessions error:', error);
      return { success: false, error: error.message };
    }
  },

  async createChatSession(sessionName) {
    try {
      const response = await fetch(`${DB_API_BASE}/chat/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionName })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Create chat session error:', error);
      return { success: false, error: error.message };
    }
  },

  async getSessionMessages(sessionId, limit = 100) {
    try {
      const response = await fetch(`${DB_API_BASE}/chat/sessions/${sessionId}/messages?limit=${limit}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get session messages error:', error);
      return { success: false, error: error.message };
    }
  },

  async saveChatMessage(sessionId, role, content, tokensUsed = 0, model = 'gpt-4o') {
    try {
      const response = await fetch(`${DB_API_BASE}/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, role, content, tokensUsed, model })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Save chat message error:', error);
      return { success: false, error: error.message };
    }
  },

  // Documents
  async getDocuments(fileType = null) {
    try {
      const url = fileType 
        ? `${DB_API_BASE}/documents?type=${fileType}`
        : `${DB_API_BASE}/documents`;
      const response = await fetch(url);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get documents error:', error);
      return { success: false, error: error.message };
    }
  },

  async getDocumentById(documentId) {
    try {
      const response = await fetch(`${DB_API_BASE}/documents/${documentId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get document error:', error);
      return { success: false, error: error.message };
    }
  },

  async searchDocuments(query, fileType = null, limit = 10) {
    try {
      const params = new URLSearchParams({ q: query, limit });
      if (fileType) params.append('type', fileType);
      
      const response = await fetch(`${DB_API_BASE}/documents/search?${params}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Search documents error:', error);
      return { success: false, error: error.message };
    }
  },

  // Audit Logs
  async getAuditLogs(limit = 100) {
    try {
      const response = await fetch(`${DB_API_BASE}/logs?limit=${limit}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get audit logs error:', error);
      return { success: false, error: error.message };
    }
  },

  // User Preferences
  async getPreferences() {
    try {
      const response = await fetch(`${DB_API_BASE}/preferences`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get preferences error:', error);
      return { success: false, error: error.message };
    }
  },

  async updatePreferences(darkMode, defaultModel, settings) {
    try {
      const response = await fetch(`${DB_API_BASE}/preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ darkMode, defaultModel, settings })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Update preferences error:', error);
      return { success: false, error: error.message };
    }
  },

  // Statistics
  async getStats() {
    try {
      const response = await fetch(`${DB_API_BASE}/stats`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get stats error:', error);
      return { success: false, error: error.message };
    }
  }
};

// Make it available globally
if (typeof window !== 'undefined') {
  window.DatabaseAPI = DatabaseAPI;
}
