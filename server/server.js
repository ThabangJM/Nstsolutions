require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Database imports
const { testConnection, initializeDatabase, closeDatabase } = require('./config/database');

// Route imports
const chatRoutes = require('./routes/chat');
const embeddingsRoutes = require('./routes/embeddings');
const fileRoutes = require('./routes/files');
const healthRoutes = require('./routes/health');
const dataRoutes = require('./routes/data');
const databaseRoutes = require('./routes/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Validate required environment variables
const requiredEnvVars = ['OPENAI_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please check your .env file');
  process.exit(1);
}

// Logging helper
const logger = {
  info: (msg, meta = {}) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, meta),
  error: (msg, meta = {}) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, meta),
  warn: (msg, meta = {}) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, meta),
  debug: (msg, meta = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${msg}`, meta);
    }
  }
};

// Export logger for use in routes
app.locals.logger = logger;

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In production, allow all origins if ALLOWED_ORIGINS includes '*' or is not set
    if (process.env.NODE_ENV === 'production' && (!process.env.ALLOWED_ORIGINS || allowedOrigins.includes('*'))) {
      callback(null, true);
    } else if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request from origin:', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      logger.error('Invalid JSON in request body', { error: e.message });
      throw new Error('Invalid JSON');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware - skip for streaming endpoints
app.use(compression({
  filter: (req, res) => {
    // Don't compress responses for streaming endpoints
    if (req.path.includes('/chat/completions') && req.body?.stream !== false) {
      return false;
    }
    // Use default compression filter for other requests
    return compression.filter(req, res);
  }
}));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });
  
  next();
});

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/embeddings', embeddingsRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/db', databaseRoutes);

// AI-Generated PDF Export endpoint
app.post('/api/export-pdf', async (req, res) => {
  try {
    const { messages, reportType = 'general', reportTitle = 'Chat Export' } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    logger.info('Generating PDF for', { 
      messageCount: messages.length,
      reportType,
      reportTitle
    });

    // Use the pre-built Python template
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const timestamp = Date.now();
    const scriptPath = path.join(__dirname, '..', 'python', 'pdf_generator.py');

    // Check if Python script exists
    if (!fs.existsSync(scriptPath)) {
      throw new Error('PDF generator script not found. Please ensure python/pdf_generator.py exists.');
    }

    logger.info('Using Python script:', { scriptPath });

    // Execute the Python script with JSON input
    const pythonProcess = spawn('python', [scriptPath], {
      cwd: tempDir,
      timeout: 30000 // 30 second timeout
    });

    let stdout = '';
    let stderr = '';

    // Send messages and metadata as JSON to stdin
    const inputData = {
      messages,
      reportType,
      reportTitle
    };
    pythonProcess.stdin.write(JSON.stringify(inputData));
    pythonProcess.stdin.end();

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      logger.debug('Python stdout:', { output: data.toString() });
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      logger.error('Python stderr:', { output: data.toString() });
    });

    pythonProcess.on('close', (code) => {
      logger.info('Python process exited', { code, stdout, stderr });

      if (code !== 0) {
        logger.error('Python execution error:', { stderr });
        return res.status(500).json({ 
          error: 'Failed to generate PDF', 
          details: stderr.substring(0, 300)
        });
      }

      // Check if PDF was created
      const pdfPath = path.join(tempDir, 'output.pdf');
      if (!fs.existsSync(pdfPath)) {
        logger.error('PDF file not found at:', { pdfPath });
        return res.status(500).json({ error: 'PDF file was not created' });
      }

      logger.info('PDF created successfully at:', { pdfPath });

      // Send the PDF file
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=chat-export.pdf');

      const fileStream = fs.createReadStream(pdfPath);
      fileStream.pipe(res);

      fileStream.on('end', () => {
        // Clean up PDF file after sending
        try {
          fs.unlinkSync(pdfPath);
          logger.info('Cleaned up temporary PDF file');
        } catch (err) {
          logger.error('Failed to delete PDF:', { error: err.message });
        }
      });

      fileStream.on('error', (err) => {
        logger.error('File stream error:', { error: err.message });
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to send PDF file' });
        }
      });
    });

    pythonProcess.on('error', (err) => {
      logger.error('Failed to start Python process:', { error: err.message });
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Failed to start PDF generation', 
          details: 'Python may not be installed or not in PATH'
        });
      }
    });

  } catch (error) {
    logger.error('PDF export error:', { 
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Failed to export PDF', 
      message: error.message,
      details: error.stack ? error.stack.substring(0, 300) : 'No stack trace'
    });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'NST Solutions Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      chat: '/api/chat',
      embeddings: '/api/embeddings',
      files: '/api/files',
      exportPdf: '/api/export-pdf'
    }
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn('Route not found', { path: req.path, method: req.method });
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.url} not found`,
    availableEndpoints: ['/api/health', '/api/chat', '/api/embeddings', '/api/files', '/api/export-pdf']
  });
});

// Global error handler
app.use((err, req, res, next) => {
  // Log error details
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body
  });
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: err.details || {}
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing authentication'
    });
  }
  
  if (err.message === 'Invalid JSON') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid JSON in request body'
    });
  }
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'CORS policy does not allow access from this origin'
    });
  }
  
  // Default error response
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err.details 
    })
  });
});

// Start server
const server = app.listen(PORT, async () => {
  // Initialize database
  logger.info('Initializing database connection...');
  const dbConnected = await testConnection();
  
  if (dbConnected) {
    await initializeDatabase();
    logger.info('Database ready');
  } else {
    logger.warn('Database connection failed - app will run without database features');
  }
  
  logger.info('Server started successfully', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    database: dbConnected ? 'Connected' : 'Not connected',
    openAIConfigured: !!process.env.OPENAI_API_KEY,
    allowedOrigins: allowedOrigins.length
  });
  
  console.log(`
╔═══════════════════════════════════════════════════════╗
║     NST Solutions Backend Server                      ║
║                                                       ║
║     Environment: ${process.env.NODE_ENV || 'development'}                           ║
║     Port: ${PORT}                                          ║
║     Database: ${dbConnected ? '✓ Connected (nstdb)' : '✗ Not connected'}            ║
║     OpenAI: ${process.env.OPENAI_API_KEY ? '✓ Configured' : '✗ Not configured'}                   ║
║                                                       ║
║     API Endpoints:                                    ║
║     - Health: http://localhost:${PORT}/api/health      ║
║     - Chat: http://localhost:${PORT}/api/chat          ║
║     - Embeddings: http://localhost:${PORT}/api/embeddings ║
║     - Files: http://localhost:${PORT}/api/files        ║
║     - Export PDF: http://localhost:${PORT}/api/export-pdf ║
╚═══════════════════════════════════════════════════════╝
  `);
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    logger.error('Server error', { error: error.message });
    throw error;
  }
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} signal received: closing HTTP server`);
  server.close(async () => {
    logger.info('HTTP server closed');
    await closeDatabase();
    logger.info('Database connection closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forcing server close after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
