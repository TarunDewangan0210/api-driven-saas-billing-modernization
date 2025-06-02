require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const NodeCache = require('node-cache');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Create Express app
const app = express();

// Cache for service discovery and health checks
const serviceCache = new NodeCache({ stdTTL: 60 }); // 1 minute TTL

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

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(globalLimiter);

// Compression
app.use(compression());

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Simple authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-here');
    
    req.user = {
      id: decoded.sub || decoded.userId,
      email: decoded.email,
      scope: decoded.scope || []
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(401).json({
      error: 'Invalid token',
      code: 'TOKEN_INVALID'
    });
  }
};

// Service configuration
const services = {
  auth: {
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3005',
    healthPath: '/health'
  },
  customers: {
    url: process.env.CUSTOMER_SERVICE_URL || 'http://localhost:3001',
    healthPath: '/health'
  },
  subscriptions: {
    url: process.env.SUBSCRIPTION_SERVICE_URL || 'http://localhost:3002',
    healthPath: '/health'
  },
  plans: {
    url: process.env.PLAN_SERVICE_URL || 'http://localhost:3003',
    healthPath: '/health'
  },
  invoices: {
    url: process.env.INVOICE_SERVICE_URL || 'http://localhost:3004',
    healthPath: '/health'
  }
};

// Health check for services
async function checkServiceHealth(serviceName, serviceConfig) {
  try {
    const response = await axios.get(`${serviceConfig.url}${serviceConfig.healthPath}`, {
      timeout: 5000
    });
    
    const isHealthy = response.status === 200 && response.data.status === 'healthy';
    serviceCache.set(`health:${serviceName}`, isHealthy);
    return isHealthy;
  } catch (error) {
    console.error(`Health check failed for ${serviceName}:`, error.message);
    serviceCache.set(`health:${serviceName}`, false);
    return false;
  }
}

// Middleware to check service availability
const serviceAvailabilityCheck = (serviceName) => {
  return async (req, res, next) => {
    const cachedHealth = serviceCache.get(`health:${serviceName}`);
    
    if (cachedHealth === false) {
      return res.status(503).json({
        error: `${serviceName} service is currently unavailable`,
        code: 'SERVICE_UNAVAILABLE',
        service: serviceName
      });
    }
    
    next();
  };
};

// Custom proxy middleware with error handling
const createServiceProxy = (serviceName, serviceConfig, options = {}) => {
  return createProxyMiddleware({
    target: serviceConfig.url,
    changeOrigin: true,
    pathRewrite: options.pathRewrite || {},
    timeout: 30000,
    proxyTimeout: 30000,
    onError: (err, req, res) => {
      console.error(`Proxy error for ${serviceName}:`, err.message);
      res.status(502).json({
        error: `Failed to connect to ${serviceName} service`,
        code: 'BAD_GATEWAY',
        service: serviceName
      });
    },
    onProxyRes: (proxyRes, req, res) => {
      // Add service identification header
      res.setHeader('X-Served-By', serviceName);
      res.setHeader('X-Gateway-Version', '1.0.0');
    },
    onProxyReq: (proxyReq, req, res) => {
      // Forward user information if available
      if (req.user) {
        proxyReq.setHeader('X-User-ID', req.user.id);
        proxyReq.setHeader('X-User-Email', req.user.email);
        proxyReq.setHeader('X-User-Scope', JSON.stringify(req.user.scope || []));
      }
    }
  });
};

// API Gateway health check
app.get('/health', async (req, res) => {
  try {
    const serviceHealths = {};
    
    // Check all services
    for (const [serviceName, serviceConfig] of Object.entries(services)) {
      serviceHealths[serviceName] = await checkServiceHealth(serviceName, serviceConfig);
    }
    
    const allHealthy = Object.values(serviceHealths).every(health => health);
    
    const health = {
      service: 'api-gateway',
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: serviceHealths
    };
    
    res.status(allHealthy ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      service: 'api-gateway',
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API documentation
app.get('/api-docs', (req, res) => {
  res.json({
    service: 'API Gateway',
    version: '1.0.0',
    description: 'Central gateway for SaaS billing microservices',
    endpoints: {
      '/api/auth/*': 'Authentication service routes',
      '/api/customers/*': 'Customer management routes',
      '/api/subscriptions/*': 'Subscription management routes',
      '/api/plans/*': 'Plan information routes',
      '/api/invoices/*': 'Invoice management routes'
    },
    services: Object.keys(services),
    authentication: 'Bearer token required for most endpoints',
    rateLimit: '1000 requests per 15 minutes per IP'
  });
});

// Authentication routes (no auth required for login/register)
app.use('/api/auth', 
  serviceAvailabilityCheck('auth'),
  createServiceProxy('auth', services.auth, {
    pathRewrite: {
      '^/api/auth': ''
    }
  })
);

// Protected routes - require authentication

// Customer routes
app.use('/api/customers',
  authenticateToken,
  serviceAvailabilityCheck('customers'),
  createServiceProxy('customers', services.customers, {
    pathRewrite: {
      '^/api/customers': '/customers'
    }
  })
);

// Subscription routes
app.use('/api/subscriptions',
  authenticateToken,
  serviceAvailabilityCheck('subscriptions'),
  createServiceProxy('subscriptions', services.subscriptions, {
    pathRewrite: {
      '^/api/subscriptions': ''
    }
  })
);

// Plan routes (no auth required for viewing plans)
app.use('/api/plans',
  serviceAvailabilityCheck('plans'),
  createServiceProxy('plans', services.plans, {
    pathRewrite: {
      '^/api/plans': ''
    }
  })
);

// Invoice routes
app.use('/api/invoices',
  authenticateToken,
  serviceAvailabilityCheck('invoices'),
  createServiceProxy('invoices', services.invoices, {
    pathRewrite: {
      '^/api/invoices': ''
    }
  })
);

// Service discovery endpoint
app.get('/api/services', authenticateToken, (req, res) => {
  const serviceStatuses = {};
  
  Object.keys(services).forEach(serviceName => {
    serviceStatuses[serviceName] = {
      url: services[serviceName].url,
      healthy: serviceCache.get(`health:${serviceName}`) !== false
    };
  });
  
  res.json({
    services: serviceStatuses,
    gateway_version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method,
    available_endpoints: [
      '/api/auth/*',
      '/api/customers/*',
      '/api/subscriptions/*',
      '/api/plans/*',
      '/api/invoices/*'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Gateway error:', error);
  
  res.status(error.status || 500).json({
    error: error.message || 'Internal gateway error',
    code: 'GATEWAY_ERROR',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Initialize health checks for all services
async function initializeHealthChecks() {
  console.log('🔍 Initializing service health checks...');
  
  for (const [serviceName, serviceConfig] of Object.entries(services)) {
    await checkServiceHealth(serviceName, serviceConfig);
  }
  
  // Set up periodic health checks
  setInterval(async () => {
    for (const [serviceName, serviceConfig] of Object.entries(services)) {
      await checkServiceHealth(serviceName, serviceConfig);
    }
  }, 30000); // Check every 30 seconds
}

// Start server
async function startServer() {
  try {
    await initializeHealthChecks();
    
    const PORT = process.env.PORT || 3000;
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 API Gateway running on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`🔍 Service Discovery: http://localhost:${PORT}/api/services`);
    });
    
    server.on('error', (error) => {
      console.error('❌ Gateway server error:', error);
      process.exit(1);
    });
    
    return server;
  } catch (error) {
    console.error('❌ Failed to start API Gateway:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app; 