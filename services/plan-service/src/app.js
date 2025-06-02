require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: 'Too many requests from this IP',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

// Compression
app.use(compression());

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static plan data
const plans = [
  {
    _id: 'plan_starter',
    name: 'Starter Plan',
    description: 'Perfect for individuals and small teams getting started',
    monthly_price_usd: 9.00,
    yearly_price_usd: 99.00, // 1+ months free
    features: [
      '10GB storage',
      'Basic support',
      'Up to 5 team members',
      'Basic analytics',
      'API access'
    ],
    billing_cycle: 'monthly',
    max_users: 5,
    storage_gb: 10,
    api_calls_per_month: 10000,
    support_level: 'basic',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    _id: 'plan_pro',
    name: 'Pro Plan',
    description: 'For growing businesses that need more power and flexibility',
    monthly_price_usd: 29.00,
    yearly_price_usd: 300.00, // 2+ months free
    features: [
      '100GB storage',
      'Priority support',
      'Up to 25 team members',
      'Advanced analytics',
      'API access',
      'Custom integrations',
      'Advanced reporting'
    ],
    billing_cycle: 'monthly',
    max_users: 25,
    storage_gb: 100,
    api_calls_per_month: 100000,
    support_level: 'priority',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    _id: 'plan_enterprise',
    name: 'Enterprise Plan',
    description: 'For large organizations with advanced needs and dedicated support',
    monthly_price_usd: 299.00,
    yearly_price_usd: 2990.00, // 2 months free
    features: [
      'Unlimited storage',
      'Dedicated support',
      'Unlimited team members',
      'Enterprise analytics',
      'API access',
      'Custom integrations',
      'Advanced reporting',
      'SSO integration',
      'Custom contracts',
      'SLA guarantee'
    ],
    billing_cycle: 'monthly',
    max_users: -1, // unlimited
    storage_gb: -1, // unlimited
    api_calls_per_month: -1, // unlimited
    support_level: 'dedicated',
    is_active: true,
    created_at: new Date().toISOString()
  }
];

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'plan-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    plans_available: plans.length
  });
});

/**
 * GET /plans - List available plans
 */
app.get('/plans', (req, res) => {
  try {
    const { active_only = 'true' } = req.query;
    
    let filteredPlans = plans;
    if (active_only === 'true') {
      filteredPlans = plans.filter(plan => plan.is_active);
    }
    
    res.json({
      plans: filteredPlans,
      total: filteredPlans.length
    });
  } catch (error) {
    console.error('Error getting plans:', error);
    res.status(500).json({
      error: 'Failed to retrieve plans',
      code: 'RETRIEVAL_FAILED'
    });
  }
});

/**
 * GET /plans/:id - Retrieve plan details
 */
app.get('/plans/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const plan = plans.find(p => p._id === id);
    
    if (!plan) {
      return res.status(404).json({
        error: 'Plan not found',
        code: 'PLAN_NOT_FOUND'
      });
    }
    
    if (!plan.is_active) {
      return res.status(410).json({
        error: 'Plan is no longer available',
        code: 'PLAN_INACTIVE'
      });
    }
    
    res.json({ plan });
  } catch (error) {
    console.error('Error getting plan:', error);
    res.status(500).json({
      error: 'Failed to retrieve plan',
      code: 'RETRIEVAL_FAILED'
    });
  }
});

/**
 * GET /plans/:id/pricing - Get pricing information for a plan
 */
app.get('/plans/:id/pricing', (req, res) => {
  try {
    const { id } = req.params;
    const { billing_cycle = 'monthly' } = req.query;
    
    const plan = plans.find(p => p._id === id);
    
    if (!plan) {
      return res.status(404).json({
        error: 'Plan not found',
        code: 'PLAN_NOT_FOUND'
      });
    }
    
    const pricing = {
      plan_id: plan._id,
      plan_name: plan.name,
      billing_cycle,
      price_usd: billing_cycle === 'yearly' ? plan.yearly_price_usd : plan.monthly_price_usd,
      currency: 'USD'
    };
    
    if (billing_cycle === 'yearly') {
      pricing.savings_usd = (plan.monthly_price_usd * 12) - plan.yearly_price_usd;
      pricing.savings_percentage = Math.round((pricing.savings_usd / (plan.monthly_price_usd * 12)) * 100);
    }
    
    res.json({ pricing });
  } catch (error) {
    console.error('Error getting plan pricing:', error);
    res.status(500).json({
      error: 'Failed to retrieve plan pricing',
      code: 'PRICING_FAILED'
    });
  }
});

// API documentation
app.get('/api-docs', (req, res) => {
  res.json({
    service: 'Plan Service',
    version: '1.0.0',
    description: 'Plan management service for SaaS billing system',
    endpoints: {
      'GET /plans': 'List available plans',
      'GET /plans/:id': 'Retrieve plan details',
      'GET /plans/:id/pricing': 'Get pricing information for a plan'
    },
    available_plans: plans.map(p => ({ id: p._id, name: p.name, price: p.monthly_price_usd }))
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
  console.error('Plan service error:', error);
  
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Start server
async function startServer() {
  try {
    const PORT = process.env.PORT || 3003;
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Plan Service running on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`📋 Available Plans: ${plans.length}`);
    });

    server.on('error', (error) => {
      console.error('❌ Plan server error:', error);
      process.exit(1);
    });

    return server;
  } catch (error) {
    console.error('❌ Failed to start plan server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app; 