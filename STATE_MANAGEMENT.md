# State Management System Documentation

## Overview

The NST Solutions app now includes a comprehensive state management system that prevents data loss during page refreshes and maintains UI state across sessions. The system uses localStorage for client-side persistence and synchronizes with the MySQL database when online.

## Features

✅ **Automatic State Persistence**: All chat messages, UI state, and user preferences are automatically saved to localStorage  
✅ **Session Restoration**: Chat history is automatically restored when you refresh the page  
✅ **Database Synchronization**: State syncs with MySQL database when online  
✅ **Offline Support**: Works offline with localStorage, syncs when connection restored  
✅ **Multi-tab Sync**: State changes in one tab sync to other open tabs  
✅ **Auto-save**: Continuously saves state every 30 seconds and on page unload  
✅ **Session Management**: Create, load, and delete chat sessions  
✅ **Export/Import**: Export state as JSON for backup or migration  

## Architecture

### Core Modules

1. **StateManager** (`state-manager.js`)
   - Central state store with localStorage persistence
   - Pub/sub system for state change notifications
   - Database synchronization
   - Auto-save functionality

2. **UIStateManager** (`ui-state-manager.js`)
   - Restores UI elements (tabs, sidebar, scroll position)
   - Tracks UI interactions
   - Dark mode persistence

3. **ChatSessionManager** (`chat-session-manager.js`)
   - Manages chat sessions and messages
   - Auto-restores previous conversations
   - Database integration for message persistence

4. **StateIntegration** (`state-integration.js`)
   - Connects existing app functions with state system
   - Adds session management UI
   - Keyboard shortcuts
   - Status indicator

## State Structure

```javascript
{
  ui: {
    activeTab: 'home',
    sidebarOpen: true,
    activeModal: null,
    scrollPosition: 0,
    darkMode: false,
    selectedProgramme: null,
    selectedIndicator: null
  },
  chat: {
    currentSessionId: 123,
    sessionName: 'My Chat',
    messages: [
      {
        id: 1234567890,
        role: 'user',
        content: 'Hello',
        tokens: 10,
        timestamp: '2025-12-05T00:00:00.000Z'
      }
    ],
    inputText: '',
    isTyping: false,
    lastMessageTime: 1234567890
  },
  upload: {
    uploadedFiles: [],
    processingStatus: {},
    lastUploadTime: null
  },
  user: {
    uid: 'guest',
    displayName: 'Guest User',
    preferences: {}
  },
  app: {
    version: '1.0.0',
    lastSyncTime: 1234567890,
    isOnline: true
  }
}
```

## Usage

### Access State

```javascript
// Get state value
const activeTab = window.getState('ui.activeTab');
const messages = window.getState('chat.messages');

// Or using StateManager directly
const sessionId = window.StateManager.get('chat.currentSessionId');
```

### Update State

```javascript
// Set single value
window.setState('ui.darkMode', true);

// Update multiple values
window.StateManager.update({
  'ui.activeTab': 'chat',
  'ui.sidebarOpen': false
});
```

### Subscribe to Changes

```javascript
// Subscribe to specific path
const unsubscribe = window.subscribeState('chat.messages', (newMessages, oldMessages) => {
  console.log('Messages changed:', newMessages);
});

// Unsubscribe when done
unsubscribe();

// Subscribe to all changes
window.subscribeState('*', (newValue, oldValue, path) => {
  console.log(`State changed at ${path}:`, newValue);
});
```

### Session Management

```javascript
// Create new session
await window.ChatSessionManager.startNewSession('My Session');

// Load existing session
await window.ChatSessionManager.loadSession(sessionId);

// Add message to current session
await window.StateManager.addMessage('user', 'Hello');
await window.StateManager.addMessage('assistant', 'Hi there!', 100);

// Get session statistics
const stats = window.ChatSessionManager.getSessionStats();
console.log(stats);
// {
//   totalMessages: 10,
//   userMessages: 5,
//   assistantMessages: 5,
//   totalTokens: 500,
//   sessionId: 123,
//   sessionName: 'My Session'
// }

// Export session
const json = window.ChatSessionManager.exportSession();

// Import session
window.ChatSessionManager.importSession(json);
```

### Database Synchronization

```javascript
// Manual sync with server
await window.StateManager.syncWithServer();

// Save current session to database
await window.StateManager.saveChatSession();
```

### UI Session Management

The app includes a built-in session management UI:

- **📋 Sessions Button**: Click to open session menu
- **+ New Session**: Create a new chat session
- **Session List**: View and load previous sessions
- **Delete Sessions**: Remove unwanted sessions
- **💾 Export**: Export all state as JSON
- **🗑️ Clear All**: Clear all state (with confirmation)

### Status Indicator

Bottom-left corner shows:
- **Online/Offline status**: Green dot = online, red dot = offline
- **Last sync time**: Shows when data was last synced
- **Message count**: Current session message count

### Keyboard Shortcuts

- **Ctrl/Cmd + K**: Start new session
- **Ctrl/Cmd + Shift + S**: Toggle session menu
- **Ctrl/Cmd + Shift + D**: Toggle debug panel

## Automatic Behaviors

### On Page Load
1. ✅ State loaded from localStorage
2. ✅ UI elements restored (scroll, tabs, sidebar)
3. ✅ Chat messages restored to UI
4. ✅ Database sync attempted if online
5. ✅ Notification shown if session restored

### On Message Send
1. ✅ Message added to state
2. ✅ State saved to localStorage
3. ✅ Message saved to database (if online)
4. ✅ UI updated automatically

### On Page Unload
1. ✅ Current state saved to localStorage
2. ✅ Scroll position saved
3. ✅ Input text saved

### Every 30 Seconds
1. ✅ State automatically saved to localStorage

### On Online/Offline
1. ✅ Status indicator updated
2. ✅ Database sync attempted when going online
3. ✅ Local-only mode when offline

## Integration Examples

### Save Assistant Response

```javascript
// After getting response from API
async function handleAssistantResponse(content) {
  // Add to state (auto-saves to database)
  await window.StateManager.addMessage('assistant', content, tokenCount);
  
  // Or use helper
  await window.addAssistantMessage(content, tokenCount);
}
```

### Track File Upload

```javascript
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  const fileInfo = window.StateManager.addUploadedFile(file);
  
  // Later, update processing status
  window.StateManager.setProcessingStatus(fileInfo.id, 'processing');
  
  // After processing
  window.StateManager.setProcessingStatus(fileInfo.id, 'completed');
});
```

### Custom State Values

```javascript
// Add your own state paths
window.setState('myApp.customValue', 'my data');

// Subscribe to your custom state
window.subscribeState('myApp.customValue', (value) => {
  console.log('Custom value changed:', value);
});
```

## Debugging

### View State Summary

```javascript
// Get state summary
const summary = window.StateManager.getSummary();
console.log(summary);
```

### Debug Panel

Press **Ctrl/Cmd + Shift + D** to open debug panel showing:
- Current session ID
- Message count
- Uploaded files count
- Active tab
- Dark mode status
- Online status
- Last sync time

### Export State

```javascript
// Export for debugging
const stateJson = window.StateManager.exportState();
console.log(stateJson);

// Or download via UI
// Click "📋 Sessions" → "💾 Export"
```

### Clear State

```javascript
// Programmatically clear all state
window.StateManager.clearAll();

// Or via UI
// Click "📋 Sessions" → "🗑️ Clear All"
```

## Performance

- **localStorage writes**: Debounced (500ms) to prevent excessive writes
- **Auto-save interval**: 30 seconds
- **Database sync**: Only when online, doesn't block UI
- **Multi-tab sync**: Efficient storage events
- **Memory footprint**: ~1-5 KB for typical session

## Browser Support

- ✅ Chrome/Edge (modern)
- ✅ Firefox (modern)
- ✅ Safari (modern)
- ✅ Requires: localStorage, Promises, async/await

## Security Considerations

- State stored in localStorage (client-side only)
- No sensitive data should be stored in state
- Database credentials handled server-side
- Session data cleared on explicit user action
- No state transmitted to server except via database API

## Troubleshooting

### State Not Restoring

1. Check browser console for errors
2. Verify localStorage is enabled
3. Check if localStorage quota exceeded
4. Try clearing state and starting fresh

### Database Sync Issues

1. Verify server is running
2. Check network connectivity
3. Look for database connection errors in console
4. Verify DatabaseAPI is loaded

### Session Not Saving

1. Ensure session ID exists in state
2. Check browser console for save errors
3. Verify database connection
4. Try manual sync: `await window.StateManager.syncWithServer()`

### Performance Issues

1. Check state size: `console.log(window.StateManager.exportState().length)`
2. Limit message history if needed
3. Clear old sessions
4. Consider implementing message pagination

## API Reference

### StateManager Methods

| Method | Description |
|--------|-------------|
| `get(path)` | Get state value by path |
| `set(path, value, notify)` | Set state value |
| `update(updates)` | Update multiple values |
| `subscribe(path, callback)` | Subscribe to changes |
| `saveState()` | Manually save to localStorage |
| `syncWithServer()` | Sync with database |
| `addMessage(role, content, tokens)` | Add chat message |
| `clearAll()` | Clear all state |
| `exportState()` | Export as JSON |
| `importState(json)` | Import from JSON |
| `getSummary()` | Get state summary |

### ChatSessionManager Methods

| Method | Description |
|--------|-------------|
| `init()` | Initialize and restore session |
| `startNewSession(name)` | Create new session |
| `loadSession(id)` | Load existing session |
| `getAllSessions()` | Get all sessions |
| `deleteSession(id)` | Delete session |
| `exportSession()` | Export current session |
| `importSession(json)` | Import session |
| `getSessionStats()` | Get session statistics |

### UIStateManager Methods

| Method | Description |
|--------|-------------|
| `init()` | Initialize UI restoration |
| `restoreUIState()` | Restore all UI state |
| `restoreScrollPosition()` | Restore scroll |
| `restoreDarkMode()` | Restore dark mode |
| `restoreSidebar()` | Restore sidebar state |
| `restoreActiveTab()` | Restore active tab |

## Future Enhancements

- [ ] Implement message pagination for large sessions
- [ ] Add session search and filtering
- [ ] Support session tagging
- [ ] Implement session sharing
- [ ] Add state compression for large sessions
- [ ] Support IndexedDB for larger data storage
- [ ] Add state migration for version updates
- [ ] Implement collaborative sessions

## License

Part of NST Solutions application - All rights reserved.
