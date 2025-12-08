# NST Solutions Database Setup

## Overview
MySQL database implementation for the NST Solutions AI Auditor application.

## Database Configuration
- **Connection Name:** nstdb
- **Host:** localhost
- **User:** root
- **Password:** (empty)
- **Port:** 3306 (default)

## Database Schema

### Tables Created:

1. **users** - User accounts and authentication
   - Stores user information (uid, email, display_name)
   - Tracks login timestamps

2. **chat_sessions** - Conversation tracking
   - Links to users
   - Tracks active chat sessions

3. **chat_messages** - Message history
   - Stores all chat interactions
   - Tracks tokens used and AI model

4. **documents** - Uploaded files
   - Annual Performance Plans (APP)
   - Annual Performance Reports (APR)
   - File metadata and processing status

5. **document_chunks** - Document embeddings
   - Chunked document content
   - Vector embeddings for semantic search
   - Metadata for RAG implementation

6. **programmes** - Government programmes
   - Programme information being audited

7. **indicators** - Performance indicators
   - KPIs and targets
   - Actual achievements and variances
   - Assessment results

8. **audit_reports** - Generated reports
   - Consistency, measurability, relevance, presentation checks
   - PDF storage paths

9. **audit_logs** - System activity tracking
   - User actions logging
   - IP addresses and user agents

10. **user_preferences** - User settings
    - Dark mode preference
    - Default AI model selection

## Setup Instructions

### 1. Install MySQL
Ensure MySQL Server is installed and running on your system.

### 2. Create Database
Run the schema file to create the database and tables:

```bash
mysql -u root < server/database/schema.sql
```

Or manually in MySQL:
```sql
CREATE DATABASE IF NOT EXISTS nstdb DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Install Dependencies
```bash
cd server
npm install
```

This will install the `mysql2` package for database connectivity.

### 4. Start Server
```bash
npm start
```

The server will automatically:
- Connect to the database
- Initialize tables if they don't exist
- Log connection status

## Usage Examples

### Using Models in Routes

```javascript
const User = require('../models/User');
const ChatSession = require('../models/ChatSession');
const Document = require('../models/Document');
const AuditLog = require('../models/AuditLog');

// Create or get user
const user = await User.findOrCreate('guest', null, 'Guest User');

// Create chat session
const session = await ChatSession.create(user.id, 'Consistency Check');

// Add message
await ChatSession.addMessage(session.id, 'user', 'Check consistency', 0, 'gpt-4o');

// Log action
await AuditLog.log(user.id, 'document_upload', 'Uploaded APR file', req.ip, req.headers['user-agent']);

// Create document record
const doc = await Document.create(user.id, 'file123.pdf', 'report.pdf', 'APR', '/uploads/file123.pdf', 1024000);
```

## Database Features

### Automatic Initialization
- Database tables are created automatically on server start
- Default guest user is inserted
- Safe to run multiple times (IF NOT EXISTS)

### Connection Pooling
- Efficient connection management
- Configurable pool size (default: 10 connections)
- Automatic reconnection handling

### Graceful Shutdown
- Database connections properly closed on server shutdown
- No hanging connections

### Error Handling
- Server runs even if database connection fails
- Graceful degradation of database features
- Comprehensive error logging

## Model Methods

### User Model
- `findOrCreate(uid, email, displayName)` - Get or create user
- `findById(userId)` - Get user by ID
- `findByUid(uid)` - Get user by UID
- `updatePreferences(userId, preferences)` - Update settings
- `getPreferences(userId)` - Get user settings

### ChatSession Model
- `create(userId, sessionName)` - New chat session
- `findById(sessionId)` - Get session
- `findByUserId(userId, limit)` - Get user's sessions
- `addMessage(sessionId, role, content, tokens, model)` - Add message
- `getMessages(sessionId, limit)` - Get session messages
- `delete(sessionId)` - Delete session
- `updateName(sessionId, name)` - Rename session

### Document Model
- `create(userId, filename, originalFilename, fileType, filePath, fileSize)` - Create document
- `findById(documentId)` - Get document
- `findByUserId(userId, fileType)` - Get user's documents
- `markProcessed(documentId)` - Mark as processed
- `addChunk(documentId, chunkIndex, content, embedding, metadata)` - Add chunk
- `getChunks(documentId)` - Get document chunks
- `delete(documentId)` - Delete document
- `searchChunks(userId, searchText, fileType, limit)` - Search content

### AuditLog Model
- `log(userId, action, details, ipAddress, userAgent)` - Log action
- `findByUserId(userId, limit)` - Get user logs
- `findByAction(action, limit)` - Get logs by action type
- `getRecent(limit)` - Get recent logs
- `cleanOldLogs(daysToKeep)` - Clean old records

## Future Enhancements

1. **Implement chat history persistence**
   - Store all conversations in database
   - Load previous sessions

2. **Document management**
   - Track uploaded files
   - Store embeddings for RAG

3. **Audit trail**
   - Complete user action logging
   - Export audit reports

4. **User preferences**
   - Dark mode persistence
   - Model selection

5. **Programme and indicator tracking**
   - Store extracted KPIs
   - Historical comparisons

## Troubleshooting

### Connection Errors
If database connection fails:
1. Verify MySQL is running
2. Check credentials (root with no password)
3. Ensure database 'nstdb' exists
4. Check firewall settings

### Schema Issues
To reset database:
```sql
DROP DATABASE nstdb;
```
Then restart the server to recreate tables.

### Performance
For large document uploads:
- Increase `max_allowed_packet` in MySQL config
- Adjust connection pool size in `database.js`

## Security Notes

⚠️ **Production Deployment:**
- Change database password from empty
- Use environment variables for credentials
- Enable SSL/TLS for database connections
- Implement proper user authentication
- Regular backups recommended
