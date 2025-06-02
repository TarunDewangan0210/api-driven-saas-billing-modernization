require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const jwt = require('jsonwebtoken');

// Create Express app
const app = express();

// Trust proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression
app.use(compression());

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const health = {
      service: 'auth-service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    res.json(health);
  } catch (error) {
    res.status(503).json({
      service: 'auth-service',
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Mock authentication endpoints for testing
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  // Mock authentication - in production, validate against database
  if (email === 'admin@saas-billing.com' && password === 'admin123') {
    // Generate a JWT token
    const payload = {
      sub: 'user_admin',
      email: 'admin@saas-billing.com',
      scope: ['admin', 'read:customers', 'write:customers', 'delete:customers'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };
    
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'your-super-secret-jwt-key-here');
    
    res.json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: 86400,
      user: {
        id: 'user_admin',
        email: 'admin@saas-billing.com',
        role: 'admin'
      }
    });
  } else {
    res.status(401).json({
      error: 'Invalid credentials',
      code: 'INVALID_CREDENTIALS'
    });
  }
});

// Get user info
app.get('/me', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Access token required',
      code: 'TOKEN_MISSING'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-here');
    
    res.json({
      user: {
        id: decoded.sub,
        email: decoded.email,
        role: 'admin',
        scopes: decoded.scope || []
      }
    });
  } catch (error) {
    res.status(401).json({
      error: 'Invalid token',
      code: 'TOKEN_INVALID'
    });
  }
});

// API documentation
app.get('/api-docs', (req, res) => {
  res.json({
    service: 'Auth Service',
    version: '1.0.0',
    description: 'Authentication and authorization service',
    endpoints: {
      'POST /login': 'Authenticate user and get token',
      'GET /me': 'Get current user information'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Auth service error:', error);
  
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Start server
async function startServer() {
  try {
    const PORT = process.env.PORT || 3005;
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Auth Service running on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    });

    server.on('error', (error) => {
      console.error('❌ Auth server error:', error);
      process.exit(1);
    });

    return server;
  } catch (error) {
    console.error('❌ Failed to start auth server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app; 