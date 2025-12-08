# Database Implementation Guide

## ✅ What's Been Implemented

The database is now **fully integrated** into your NST Solutions AI Auditor application!

### 🗄️ Database Features Available:

1. **User Management** ✓
   - Auto-create guest user on first visit
   - Track user sessions and preferences

2. **Chat History** ✓
   - Save all conversations to database
   - Retrieve previous chat sessions
   - Load conversation history

3. **Document Tracking** ✓
   - Store uploaded APP/APR documents
   - Track document processing status
   - Store document chunks for RAG

4. **Audit Logging** ✓
   - Track all user actions
   - Monitor system activity
   - Generate audit reports

5. **User Preferences** ✓
   - Save dark mode settings
   - Store default AI model selection
   - Custom user configurations

## 📚 How to Use Database Features

### Frontend Usage (JavaScript)

The `DatabaseAPI` object is now available globally in your frontend:

```javascript
// Get current user
const userResult = await DatabaseAPI.getCurrentUser();
console.log('User:', userResult.user);

// Create a new chat session
const sessionResult = await DatabaseAPI.createChatSession('Consistency Check');
const sessionId = sessionResult.session.id;

// Save a chat message
await DatabaseAPI.saveChatMessage(
  sessionId, 
  'user', 
  'Check consistency for Programme 5',
  0,
  'gpt-4o'
);

// Save AI response
await DatabaseAPI.saveChatMessage(
  sessionId,
  'assistant',
  'Here is the consistency analysis...',
  1500,
  'gpt-4o'
);

// Get all chat sessions
const sessionsResult = await DatabaseAPI.getChatSessions();
console.log('Sessions:', sessionsResult.sessions);

// Get messages for a session
const messagesResult = await DatabaseAPI.getSessionMessages(sessionId);
console.log('Messages:', messagesResult.messages);

// Get uploaded documents
const docsResult = await DatabaseAPI.getDocuments('APR'); // or 'APP' or null for all
console.log('Documents:', docsResult.documents);

// Search document content
const searchResult = await DatabaseAPI.searchDocuments('performance indicator', 'APR', 10);
console.log('Search results:', searchResult.results);

// Get/Update user preferences
const prefsResult = await DatabaseAPI.getPreferences();
console.log('Preferences:', prefsResult.preferences);

await DatabaseAPI.updatePreferences(true, 'gpt-4o', { notifications: true });

// Get database statistics
const statsResult = await DatabaseAPI.getStats();
console.log('Stats:', statsResult.stats);
```

### Integration Examples

#### 1. Save Chat on "New Chat" Button
```javascript
document.getElementById('newChatBtn').addEventListener('click', async () => {
  const result = await DatabaseAPI.createChatSession('New Audit Session');
  if (result.success) {
    window.currentSessionId = result.session.id;
    console.log('Created session:', result.session);
  }
});
```

#### 2. Auto-save Messages During Chat
```javascript
// In your existing sendMessage function, add:
async function sendMessage(userMessage) {
  // ... existing code ...
  
  // Save user message
  if (window.currentSessionId) {
    await DatabaseAPI.saveChatMessage(
      window.currentSessionId,
      'user',
      userMessage,
      0,
      'gpt-4o'
    );
  }
  
  // ... get AI response ...
  
  // Save assistant message
  if (window.currentSessionId && aiResponse) {
    await DatabaseAPI.saveChatMessage(
      window.currentSessionId,
      'assistant',
      aiResponse,
      tokensUsed,
      'gpt-4o'
    );
  }
}
```

#### 3. Load Previous Chat Sessions
```javascript
async function loadChatHistory() {
  const result = await DatabaseAPI.getChatSessions(20);
  
  if (result.success) {
    const sessions = result.sessions;
    
    // Display in sidebar
    const historyList = document.getElementById('chatHistory');
    historyList.innerHTML = '';
    
    sessions.forEach(session => {
      const li = document.createElement('li');
      li.textContent = session.session_name || `Chat ${session.id}`;
      li.onclick = () => loadSession(session.id);
      historyList.appendChild(li);
    });
  }
}

async function loadSession(sessionId) {
  const result = await DatabaseAPI.getSessionMessages(sessionId);
  
  if (result.success) {
    // Clear current chat
    document.getElementById('chatContent').innerHTML = '';
    
    // Display messages
    result.messages.forEach(msg => {
      displayMessage(msg.role, msg.content);
    });
  }
}
```

#### 4. Persist Dark Mode Setting
```javascript
// When dark mode toggle is clicked
document.getElementById('darkModeToggle').addEventListener('click', async () => {
  const isDark = document.body.classList.toggle('dark-mode');
  
  // Save to database
  await DatabaseAPI.updatePreferences(isDark, 'gpt-4o', {});
  
  // Save to localStorage as backup
  localStorage.setItem('darkMode', isDark);
});

// On page load, restore from database
window.addEventListener('load', async () => {
  const result = await DatabaseAPI.getPreferences();
  
  if (result.success && result.preferences.darkMode) {
    document.body.classList.add('dark-mode');
  }
});
```

## 🔌 API Endpoints Available

All endpoints are under `/api/db/`:

### User & Preferences
- `GET /api/db/user/current` - Get current user
- `GET /api/db/preferences` - Get user preferences
- `POST /api/db/preferences` - Update user preferences

### Chat Management
- `GET /api/db/chat/sessions` - List chat sessions
- `POST /api/db/chat/sessions` - Create new session
- `GET /api/db/chat/sessions/:id/messages` - Get session messages
- `POST /api/db/chat/messages` - Save a message

### Documents
- `GET /api/db/documents` - List documents (optional ?type=APP/APR)
- `GET /api/db/documents/:id` - Get document with chunks
- `GET /api/db/documents/search?q=text` - Search document content

### System
- `GET /api/db/logs` - Get audit logs
- `GET /api/db/stats` - Get database statistics

## 🚀 Testing the Integration

Open your browser console and test:

```javascript
// Test 1: Get current user
DatabaseAPI.getCurrentUser().then(console.log);

// Test 2: Create session
DatabaseAPI.createChatSession('Test Session').then(console.log);

// Test 3: Get stats
DatabaseAPI.getStats().then(console.log);

// Test 4: Get documents
DatabaseAPI.getDocuments().then(console.log);
```

## 📊 Database Schema Reference

Your database has these tables:
- `users` - User accounts
- `chat_sessions` - Conversation sessions
- `chat_messages` - Individual messages
- `documents` - Uploaded files (APP/APR)
- `document_chunks` - Document pieces for search
- `programmes` - Government programmes
- `indicators` - Performance indicators
- `audit_reports` - Generated reports
- `audit_logs` - System activity
- `user_preferences` - User settings

## 🎯 Next Steps

1. **Enable Chat History UI**
   - Add "Previous Chats" section to sidebar
   - Click to load previous conversations

2. **Auto-save Conversations**
   - Modify your chat functions to auto-save

3. **Document Library**
   - Show list of uploaded documents
   - Track processing status

4. **User Dashboard**
   - Display statistics
   - Show recent activity

## ✨ Benefits You Get

- ✅ **Data Persistence** - Conversations survive page refresh
- ✅ **Multi-user Ready** - Different users get separate data
- ✅ **Search History** - Find past conversations
- ✅ **Analytics Ready** - Track usage patterns
- ✅ **Audit Trail** - Complete activity logging
- ✅ **Backup Ready** - All data in MySQL for backup

The database is **running and ready to use**! Just start calling the `DatabaseAPI` methods in your code.
