const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const User = require('../models/User');
const ChatSession = require('../models/ChatSession');
const AuditLog = require('../models/AuditLog');

// Validation helper
const validateMessages = (messages) => {
  if (!messages || !Array.isArray(messages)) {
    throw new Error('Messages must be an array');
  }
  
  if (messages.length === 0) {
    throw new Error('Messages array cannot be empty');
  }
  
  messages.forEach((msg, index) => {
    if (!msg.role || !msg.content) {
      throw new Error(`Message at index ${index} must have 'role' and 'content' properties`);
    }
    
    if (!['system', 'user', 'assistant', 'function'].includes(msg.role)) {
      throw new Error(`Invalid role '${msg.role}' at index ${index}`);
    }
    
    if (typeof msg.content !== 'string') {
      throw new Error(`Message content at index ${index} must be a string`);
    }
  });
};

const validateModel = (model) => {
  const allowedModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-4', 'gpt-3.5-turbo'];
  if (model && !allowedModels.includes(model)) {
    throw new Error(`Model '${model}' is not supported. Allowed models: ${allowedModels.join(', ')}`);
  }
};

// Initialize OpenAI client with error handling
let openai;
try {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
} catch (error) {
  console.error('Failed to initialize OpenAI client:', error.message);
  process.exit(1);
}

/**
 * GET /api/chat
 * Info endpoint
 */
router.get('/', (req, res) => {
  res.json({
    message: 'Chat API',
    endpoints: {
      'POST /api/chat/completions': 'Stream chat completions',
      'POST /api/chat/completions/non-stream': 'Non-streaming chat with function calling',
      'POST /api/chat/context': 'Chat with embeddings-based context'
    }
  });
});

/**
 * POST /api/chat/completions
 * Stream chat completions from OpenAI
 */
router.post('/completions', async (req, res) => {
  const startTime = Date.now();
  
  // Disable buffering for streaming responses
  if (req.body?.stream !== false) {
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.socket.setNoDelay(true); // Disable Nagle's algorithm
  }
  
  try {
    const { messages, model = 'gpt-4o-mini', temperature = 0.2, stream = true, tools, userId = 'guest', sessionId } = req.body;

    // Get or create user
    let user;
    try {
      user = await User.findOrCreate(userId);
    } catch (dbError) {
      console.warn('Database user lookup failed, continuing without persistence:', dbError.message);
    }

    // Input validation
    validateMessages(messages);
    validateModel(model);
    
    if (typeof temperature !== 'number' || temperature < 0 || temperature > 2) {
      return res.status(400).json({ 
        error: 'Validation Error',
        message: 'Temperature must be a number between 0 and 2' 
      });
    }
    
    if (typeof stream !== 'boolean') {
      return res.status(400).json({ 
        error: 'Validation Error',
        message: 'Stream must be a boolean' 
      });
    }
    
    if (tools && !Array.isArray(tools)) {
      return res.status(400).json({ 
        error: 'Validation Error',
        message: 'Tools must be an array' 
      });
    }

    console.log(`[Chat] Starting ${stream ? 'streaming' : 'non-streaming'} completion`, {
      model,
      messageCount: messages.length,
      hasTools: !!tools
    });

    // Set headers for streaming
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
      res.setHeader('Transfer-Encoding', 'chunked'); // Enable chunked transfer
      
      // Disable socket buffering for immediate data transmission
      if (res.socket) {
        res.socket.setNoDelay(true); // Disable Nagle's algorithm
        res.socket.setTimeout(0); // No timeout
      }
      
      res.flushHeaders(); // Send headers immediately
    }

    const chatParams = {
      model,
      messages,
      temperature,
      stream
    };

    if (tools && Array.isArray(tools)) {
      chatParams.tools = tools;
    }

    const completion = await openai.chat.completions.create(chatParams);

    if (stream) {
      let chunkCount = 0;
      let fullResponse = '';
      
      // Stream the response
      for await (const chunk of completion) {
        chunkCount++;
        const data = JSON.stringify(chunk);
        res.write(`data: ${data}\n\n`);
        
        // Force flush to ensure immediate delivery
        // Use the underlying socket's uncork method to flush data
        if (res.socket && res.socket.writable) {
          res.socket.uncork();
        }
        
        // Collect response for database storage
        if (chunk.choices?.[0]?.delta?.content) {
          fullResponse += chunk.choices[0].delta.content;
        }
      }
      
      res.write('data: [DONE]\n\n');
      if (res.socket && res.socket.writable) {
        res.socket.uncork();
      }
      res.end();
      
      // Save to database after streaming completes
      if (user && fullResponse) {
        try {
          let session;
          if (sessionId) {
            session = await ChatSession.findById(sessionId);
          }
          if (!session) {
            session = await ChatSession.create(user.id, 'Chat Session');
          }
          
          // Save user message
          const userMessage = messages[messages.length - 1];
          if (userMessage && userMessage.role === 'user') {
            await ChatSession.addMessage(session.id, 'user', userMessage.content, 0, model);
          }
          
          // Save assistant response
          await ChatSession.addMessage(session.id, 'assistant', fullResponse, 0, model);
          
          // Log activity
          await AuditLog.log(user.id, 'chat_completion', `Model: ${model}`, req.ip, req.headers['user-agent']);
        } catch (dbError) {
          console.warn('Failed to save chat to database:', dbError.message);
        }
      }
      
      const duration = Date.now() - startTime;
      console.log(`[Chat] Streaming completed`, { chunkCount, duration: `${duration}ms` });
    } else {
      // Non-streaming response
      res.json(completion);
      
      // Save to database
      if (user && completion.choices?.[0]?.message) {
        try {
          let session;
          if (sessionId) {
            session = await ChatSession.findById(sessionId);
          }
          if (!session) {
            session = await ChatSession.create(user.id, 'Chat Session');
          }
          
          const userMessage = messages[messages.length - 1];
          if (userMessage && userMessage.role === 'user') {
            await ChatSession.addMessage(session.id, 'user', userMessage.content, 0, model);
          }
          
          await ChatSession.addMessage(
            session.id, 
            'assistant', 
            completion.choices[0].message.content,
            completion.usage?.total_tokens || 0,
            model
          );
          
          await AuditLog.log(user.id, 'chat_completion', `Model: ${model}`, req.ip, req.headers['user-agent']);
        } catch (dbError) {
          console.warn('Failed to save chat to database:', dbError.message);
        }
      }
      
      const duration = Date.now() - startTime;
      console.log(`[Chat] Completion generated`, { 
        duration: `${duration}ms`,
        tokens: completion.usage?.total_tokens 
      });
    }

  } catch (error) {
    console.error('[Chat] Error:', {
      message: error.message,
      type: error.type,
      code: error.code,
      status: error.status
    });
    
    if (res.headersSent) {
      res.end();
    } else {
      const statusCode = error.status || (error.type === 'invalid_request_error' ? 400 : 500);
      res.status(statusCode).json({
        error: error.type || 'completion_error',
        message: error.message || 'Failed to generate completion',
        ...(error.code && { code: error.code })
      });
    }
  }
});

/**
 * POST /api/chat/completions/non-stream
 * Non-streaming chat completions (for function calling)
 */
router.post('/completions/non-stream', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { messages, model = 'gpt-4o-mini', temperature = 0.2, tools } = req.body;

    // Input validation
    validateMessages(messages);
    validateModel(model);
    
    if (typeof temperature !== 'number' || temperature < 0 || temperature > 2) {
      return res.status(400).json({ 
        error: 'Validation Error',
        message: 'Temperature must be a number between 0 and 2' 
      });
    }
    
    if (tools && !Array.isArray(tools)) {
      return res.status(400).json({ 
        error: 'Validation Error',
        message: 'Tools must be an array' 
      });
    }

    console.log('[Chat Non-Stream] Starting completion', {
      model,
      messageCount: messages.length,
      hasTools: !!tools
    });

    const chatParams = {
      model,
      messages,
      temperature,
      stream: false
    };

    if (tools && Array.isArray(tools)) {
      chatParams.tools = tools;
    }

    const completion = await openai.chat.completions.create(chatParams);
    
    const duration = Date.now() - startTime;
    console.log('[Chat Non-Stream] Completion generated', { 
      duration: `${duration}ms`,
      tokens: completion.usage?.total_tokens,
      finishReason: completion.choices[0]?.finish_reason
    });
    
    res.json(completion);

  } catch (error) {
    console.error('[Chat Non-Stream] Error:', {
      message: error.message,
      type: error.type,
      code: error.code,
      status: error.status
    });
    
    const statusCode = error.status || (error.type === 'invalid_request_error' ? 400 : 500);
    res.status(statusCode).json({
      error: error.type || 'completion_error',
      message: error.message || 'Failed to generate completion',
      ...(error.code && { code: error.code })
    });
  }
});

/**
 * POST /api/chat/context
 * Get contextual response with embeddings similarity search
 */
router.post('/context', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { query, context, model = 'gpt-4o-mini', temperature = 0.2 } = req.body;

    // Input validation
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ 
        error: 'Validation Error',
        message: 'Query is required and must be a string' 
      });
    }
    
    if (query.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Validation Error',
        message: 'Query cannot be empty' 
      });
    }
    
    if (context && !Array.isArray(context)) {
      return res.status(400).json({ 
        error: 'Validation Error',
        message: 'Context must be an array of strings' 
      });
    }
    
    validateModel(model);
    
    if (typeof temperature !== 'number' || temperature < 0 || temperature > 2) {
      return res.status(400).json({ 
        error: 'Validation Error',
        message: 'Temperature must be a number between 0 and 2' 
      });
    }

    console.log('[Chat Context] Processing query', {
      queryLength: query.length,
      contextItems: context?.length || 0,
      model
    });

    const messages = [
      {
        role: 'system',
        content: 'You are a helpful assistant. Use the context below to answer the user. Render your reply in GitHub-flavored Markdown.'
      }
    ];

    if (context && Array.isArray(context) && context.length > 0) {
      messages.push({
        role: 'system',
        content: 'Context:\n\n' + context.join('\n\n')
      });
    }

    messages.push({
      role: 'user',
      content: query
    });

    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      stream: false
    });

    const duration = Date.now() - startTime;
    console.log('[Chat Context] Response generated', {
      duration: `${duration}ms`,
      tokens: completion.usage?.total_tokens
    });

    res.json({
      response: completion.choices[0].message.content,
      usage: completion.usage,
      model: completion.model
    });

  } catch (error) {
    console.error('[Chat Context] Error:', {
      message: error.message,
      type: error.type,
      code: error.code,
      status: error.status
    });
    
    const statusCode = error.status || (error.type === 'invalid_request_error' ? 400 : 500);
    res.status(statusCode).json({
      error: error.type || 'context_error',
      message: error.message || 'Failed to generate response',
      ...(error.code && { code: error.code })
    });
  }
});

module.exports = router;
