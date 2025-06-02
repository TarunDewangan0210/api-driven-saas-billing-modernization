require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const axios = require('axios');

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

// Simple authentication middleware
const authenticateToken = (req, res, next) => {
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
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid token',
      code: 'TOKEN_INVALID'
    });
  }
};

// In-memory subscription storage (in production, this would be a database)
let subscriptions = [];

// Helper function to validate customer exists
const validateCustomer = async (customerId, authHeader) => {
  try {
    const customerServiceUrl = process.env.CUSTOMER_SERVICE_URL || 'http://localhost:3001';
    const headers = {};
    if (authHeader) {
      headers.Authorization = authHeader;
    }
    const response = await axios.get(`${customerServiceUrl}/customers/${customerId}`, { headers });
    return response.data.customer;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

// Helper function to validate plan exists
const validatePlan = async (planId, authHeader) => {
  try {
    const planServiceUrl = process.env.PLAN_SERVICE_URL || 'http://localhost:3003';
    const headers = {};
    if (authHeader) {
      headers.Authorization = authHeader;
    }
    const response = await axios.get(`${planServiceUrl}/plans/${planId}`, { headers });
    return response.data.plan;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

// Helper function to check for active subscriptions
const hasActiveSubscription = (customerId) => {
  return subscriptions.some(sub => 
    sub.customer_id === customerId && 
    sub.status === 'active' && 
    (!sub.end_date || new Date(sub.end_date) > new Date())
  );
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'subscription-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    active_subscriptions: subscriptions.filter(s => s.status === 'active').length
  });
});

/**
 * POST /subscriptions - Create a new subscription
 * Business Rule: A customer may have only one active subscription
 */
app.post('/subscriptions', authenticateToken, async (req, res) => {
  try {
    const { customer_id, plan_id, start_date, billing_cycle = 'monthly' } = req.body;

    // Validation
    if (!customer_id || !plan_id) {
      return res.status(400).json({
        error: 'customer_id and plan_id are required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Check if customer exists
    const customer = await validateCustomer(customer_id, req.headers['authorization']);
    if (!customer) {
      return res.status(404).json({
        error: 'Customer not found',
        code: 'CUSTOMER_NOT_FOUND'
      });
    }

    // Check if plan exists
    const plan = await validatePlan(plan_id, req.headers['authorization']);
    if (!plan) {
      return res.status(404).json({
        error: 'Plan not found',
        code: 'PLAN_NOT_FOUND'
      });
    }

    // Business Rule: Check if customer already has an active subscription
    if (hasActiveSubscription(customer_id)) {
      return res.status(409).json({
        error: 'Customer already has an active subscription',
        code: 'ACTIVE_SUBSCRIPTION_EXISTS'
      });
    }

    const subscription = {
      _id: Math.random().toString(36).substr(2, 24),
      customer_id,
      plan_id,
      plan_name: plan.name,
      billing_cycle,
      monthly_price_usd: plan.monthly_price_usd,
      yearly_price_usd: plan.yearly_price_usd,
      current_price_usd: billing_cycle === 'yearly' ? plan.yearly_price_usd : plan.monthly_price_usd,
      status: 'active',
      start_date: start_date || new Date().toISOString(),
      end_date: null,
      next_billing_date: calculateNextBillingDate(start_date || new Date().toISOString(), billing_cycle),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    subscriptions.push(subscription);

    res.status(201).json({
      message: 'Subscription created successfully',
      subscription
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({
      error: 'Failed to create subscription',
      code: 'CREATION_FAILED'
    });
  }
});

/**
 * GET /subscriptions/:id - Get subscription details
 */
app.get('/subscriptions/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    
    const subscription = subscriptions.find(s => s._id === id);
    
    if (!subscription) {
      return res.status(404).json({
        error: 'Subscription not found',
        code: 'SUBSCRIPTION_NOT_FOUND'
      });
    }

    res.json({ subscription });
  } catch (error) {
    console.error('Error getting subscription:', error);
    res.status(500).json({
      error: 'Failed to retrieve subscription',
      code: 'RETRIEVAL_FAILED'
    });
  }
});

/**
 * PUT /subscriptions/:id - Change subscription (upgrade/downgrade)
 */
app.put('/subscriptions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { plan_id, billing_cycle, status } = req.body;

    const subscriptionIndex = subscriptions.findIndex(s => s._id === id);
    
    if (subscriptionIndex === -1) {
      return res.status(404).json({
        error: 'Subscription not found',
        code: 'SUBSCRIPTION_NOT_FOUND'
      });
    }

    const subscription = subscriptions[subscriptionIndex];

    // If changing plan, validate new plan
    if (plan_id && plan_id !== subscription.plan_id) {
      const plan = await validatePlan(plan_id, req.headers['authorization']);
      if (!plan) {
        return res.status(404).json({
          error: 'Plan not found',
          code: 'PLAN_NOT_FOUND'
        });
      }

      subscription.plan_id = plan_id;
      subscription.plan_name = plan.name;
      subscription.monthly_price_usd = plan.monthly_price_usd;
      subscription.yearly_price_usd = plan.yearly_price_usd;
      subscription.current_price_usd = (billing_cycle || subscription.billing_cycle) === 'yearly' 
        ? plan.yearly_price_usd : plan.monthly_price_usd;
    }

    // Update billing cycle if provided
    if (billing_cycle && billing_cycle !== subscription.billing_cycle) {
      subscription.billing_cycle = billing_cycle;
      subscription.current_price_usd = billing_cycle === 'yearly' 
        ? subscription.yearly_price_usd : subscription.monthly_price_usd;
      subscription.next_billing_date = calculateNextBillingDate(new Date().toISOString(), billing_cycle);
    }

    // Update status if provided
    if (status) {
      subscription.status = status;
      if (status === 'cancelled') {
        subscription.end_date = new Date().toISOString();
      }
    }

    subscription.updated_at = new Date().toISOString();
    subscriptions[subscriptionIndex] = subscription;

    res.json({
      message: 'Subscription updated successfully',
      subscription
    });

  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({
      error: 'Failed to update subscription',
      code: 'UPDATE_FAILED'
    });
  }
});

/**
 * DELETE /subscriptions/:id - Cancel subscription
 */
app.delete('/subscriptions/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    
    const subscriptionIndex = subscriptions.findIndex(s => s._id === id);
    
    if (subscriptionIndex === -1) {
      return res.status(404).json({
        error: 'Subscription not found',
        code: 'SUBSCRIPTION_NOT_FOUND'
      });
    }

    // Cancel the subscription (don't actually delete)
    subscriptions[subscriptionIndex].status = 'cancelled';
    subscriptions[subscriptionIndex].end_date = new Date().toISOString();
    subscriptions[subscriptionIndex].updated_at = new Date().toISOString();

    res.json({
      message: 'Subscription cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      error: 'Failed to cancel subscription',
      code: 'CANCELLATION_FAILED'
    });
  }
});

/**
 * GET /customers/:customer_id/subscriptions - Get customer's subscriptions
 */
app.get('/customers/:customer_id/subscriptions', authenticateToken, (req, res) => {
  try {
    const { customer_id } = req.params;
    const { status } = req.query;

    let customerSubscriptions = subscriptions.filter(s => s.customer_id === customer_id);

    if (status) {
      customerSubscriptions = customerSubscriptions.filter(s => s.status === status);
    }

    res.json({
      subscriptions: customerSubscriptions,
      total: customerSubscriptions.length
    });

  } catch (error) {
    console.error('Error getting customer subscriptions:', error);
    res.status(500).json({
      error: 'Failed to retrieve customer subscriptions',
      code: 'RETRIEVAL_FAILED'
    });
  }
});

// Helper function to calculate next billing date
function calculateNextBillingDate(startDate, billingCycle) {
  const start = new Date(startDate);
  const nextBilling = new Date(start);
  
  if (billingCycle === 'yearly') {
    nextBilling.setFullYear(start.getFullYear() + 1);
  } else {
    nextBilling.setMonth(start.getMonth() + 1);
  }
  
  return nextBilling.toISOString();
}

// API documentation
app.get('/api-docs', (req, res) => {
  res.json({
    service: 'Subscription Service',
    version: '1.0.0',
    description: 'Subscription management service with business rules',
    endpoints: {
      'POST /subscriptions': 'Create a new subscription (one active per customer)',
      'GET /subscriptions/:id': 'Get subscription details',
      'PUT /subscriptions/:id': 'Change subscription (upgrade/downgrade)',
      'DELETE /subscriptions/:id': 'Cancel subscription',
      'GET /customers/:customer_id/subscriptions': 'Get customer subscriptions'
    },
    business_rules: [
      'A customer may have only one active subscription',
      'Subscriptions have a start date and optionally an end date',
      'Cancelled subscriptions set end_date to cancellation time'
    ]
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
  console.error('Subscription service error:', error);
  
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Start server
async function startServer() {
  try {
    const PORT = process.env.PORT || 3002;
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Subscription Service running on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    });

    server.on('error', (error) => {
      console.error('❌ Subscription server error:', error);
      process.exit(1);
    });

    return server;
  } catch (error) {
    console.error('❌ Failed to start subscription server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app; 