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

// In-memory invoice storage (in production, this would be a database)
let invoices = [];

// Helper function to get customer details
const getCustomer = async (customerId, authHeader) => {
  try {
    const customerServiceUrl = process.env.CUSTOMER_SERVICE_URL || 'http://localhost:3001';
    const headers = {};
    if (authHeader) {
      headers.Authorization = authHeader;
    }
    const response = await axios.get(`${customerServiceUrl}/customers/${customerId}`, { headers });
    return response.data.customer;
  } catch (error) {
    return null;
  }
};

// Helper function to get subscription details
const getSubscription = async (subscriptionId, authHeader) => {
  try {
    const subscriptionServiceUrl = process.env.SUBSCRIPTION_SERVICE_URL || 'http://localhost:3002';
    const headers = {};
    if (authHeader) {
      headers.Authorization = authHeader;
    }
    const response = await axios.get(`${subscriptionServiceUrl}/subscriptions/${subscriptionId}`, { headers });
    return response.data.subscription;
  } catch (error) {
    return null;
  }
};

// Generate invoice number
const generateInvoiceNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `INV-${timestamp}-${random}`;
};

// Calculate billing period
const calculateBillingPeriod = (subscription) => {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  
  if (subscription.billing_cycle === 'yearly') {
    end.setFullYear(start.getFullYear() + 1);
  } else {
    end.setMonth(start.getMonth() + 1);
  }
  
  return {
    start_date: start.toISOString(),
    end_date: end.toISOString()
  };
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'invoice-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    total_invoices: invoices.length
  });
});

/**
 * POST /invoices - Generate an invoice for a subscription
 */
app.post('/invoices', authenticateToken, async (req, res) => {
  try {
    const { subscription_id, billing_period_start, billing_period_end } = req.body;

    if (!subscription_id) {
      return res.status(400).json({
        error: 'subscription_id is required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Get subscription details
    const subscription = await getSubscription(subscription_id, req.headers.authorization);
    if (!subscription) {
      return res.status(404).json({
        error: 'Subscription not found',
        code: 'SUBSCRIPTION_NOT_FOUND'
      });
    }

    // Get customer details
    const customer = await getCustomer(subscription.customer_id, req.headers.authorization);
    if (!customer) {
      return res.status(404).json({
        error: 'Customer not found',
        code: 'CUSTOMER_NOT_FOUND'
      });
    }

    // Calculate billing period
    const billingPeriod = billing_period_start && billing_period_end 
      ? { start_date: billing_period_start, end_date: billing_period_end }
      : calculateBillingPeriod(subscription);

    const invoice = {
      _id: Math.random().toString(36).substr(2, 24),
      invoice_number: generateInvoiceNumber(),
      customer_id: subscription.customer_id,
      customer_name: customer.name,
      customer_email: customer.email,
      subscription_id: subscription_id,
      subscription_plan: subscription.plan_name,
      billing_period: {
        start_date: billingPeriod.start_date,
        end_date: billingPeriod.end_date
      },
      amount_due: subscription.current_price_usd,
      currency: 'USD',
      status: 'issued',
      line_items: [
        {
          description: `${subscription.plan_name} - ${subscription.billing_cycle} subscription`,
          quantity: 1,
          unit_price: subscription.current_price_usd,
          total_price: subscription.current_price_usd
        }
      ],
      subtotal: subscription.current_price_usd,
      tax_amount: 0,
      total_amount: subscription.current_price_usd,
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      issued_date: new Date().toISOString(),
      paid_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    invoices.push(invoice);

    res.status(201).json({
      message: 'Invoice generated successfully',
      invoice
    });

  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({
      error: 'Failed to generate invoice',
      code: 'GENERATION_FAILED'
    });
  }
});

/**
 * GET /invoices/:id - Retrieve invoice
 */
app.get('/invoices/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    
    const invoice = invoices.find(inv => inv._id === id || inv.invoice_number === id);
    
    if (!invoice) {
      return res.status(404).json({
        error: 'Invoice not found',
        code: 'INVOICE_NOT_FOUND'
      });
    }

    res.json({ invoice });
  } catch (error) {
    console.error('Error getting invoice:', error);
    res.status(500).json({
      error: 'Failed to retrieve invoice',
      code: 'RETRIEVAL_FAILED'
    });
  }
});

/**
 * GET /customers/:id/invoices - List all invoices for a customer
 */
app.get('/customers/:id/invoices', authenticateToken, (req, res) => {
  try {
    const { id: customer_id } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    let customerInvoices = invoices.filter(inv => inv.customer_id === customer_id);

    if (status) {
      customerInvoices = customerInvoices.filter(inv => inv.status === status);
    }

    // Sort by creation date (newest first)
    customerInvoices.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedInvoices = customerInvoices.slice(startIndex, endIndex);

    res.json({
      invoices: paginatedInvoices,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(customerInvoices.length / limit),
        total_items: customerInvoices.length,
        items_per_page: parseInt(limit)
      },
      summary: {
        total_amount: customerInvoices.reduce((sum, inv) => sum + inv.total_amount, 0),
        paid_amount: customerInvoices
          .filter(inv => inv.status === 'paid')
          .reduce((sum, inv) => sum + inv.total_amount, 0),
        outstanding_amount: customerInvoices
          .filter(inv => inv.status === 'issued' || inv.status === 'overdue')
          .reduce((sum, inv) => sum + inv.total_amount, 0)
      }
    });

  } catch (error) {
    console.error('Error getting customer invoices:', error);
    res.status(500).json({
      error: 'Failed to retrieve customer invoices',
      code: 'RETRIEVAL_FAILED'
    });
  }
});

/**
 * PUT /invoices/:id/status - Update invoice status
 */
app.put('/invoices/:id/status', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['issued', 'paid', 'overdue', 'cancelled'].includes(status)) {
      return res.status(400).json({
        error: 'Valid status is required (issued, paid, overdue, cancelled)',
        code: 'VALIDATION_ERROR'
      });
    }

    const invoiceIndex = invoices.findIndex(inv => inv._id === id || inv.invoice_number === id);
    
    if (invoiceIndex === -1) {
      return res.status(404).json({
        error: 'Invoice not found',
        code: 'INVOICE_NOT_FOUND'
      });
    }

    invoices[invoiceIndex].status = status;
    invoices[invoiceIndex].updated_at = new Date().toISOString();

    if (status === 'paid') {
      invoices[invoiceIndex].paid_date = new Date().toISOString();
    }

    res.json({
      message: 'Invoice status updated successfully',
      invoice: invoices[invoiceIndex]
    });

  } catch (error) {
    console.error('Error updating invoice status:', error);
    res.status(500).json({
      error: 'Failed to update invoice status',
      code: 'UPDATE_FAILED'
    });
  }
});

/**
 * GET /invoices - List all invoices (admin endpoint)
 */
app.get('/invoices', authenticateToken, (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let filteredInvoices = invoices;

    if (status) {
      filteredInvoices = invoices.filter(inv => inv.status === status);
    }

    // Sort by creation date (newest first)
    filteredInvoices.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

    res.json({
      invoices: paginatedInvoices,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(filteredInvoices.length / limit),
        total_items: filteredInvoices.length,
        items_per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error getting invoices:', error);
    res.status(500).json({
      error: 'Failed to retrieve invoices',
      code: 'RETRIEVAL_FAILED'
    });
  }
});

// API documentation
app.get('/api-docs', (req, res) => {
  res.json({
    service: 'Invoice Service',
    version: '1.0.0',
    description: 'Invoice management service for SaaS billing system',
    endpoints: {
      'POST /invoices': 'Generate an invoice for a subscription',
      'GET /invoices/:id': 'Retrieve invoice by ID or invoice number',
      'GET /customers/:id/invoices': 'List all invoices for a customer',
      'PUT /invoices/:id/status': 'Update invoice status',
      'GET /invoices': 'List all invoices (admin)'
    },
    invoice_fields: {
      customer_id: 'ID of the customer',
      subscription_id: 'ID of the subscription',
      billing_period: 'start_date and end_date',
      amount_due: 'Amount to be paid',
      status: 'issued, paid, overdue, cancelled'
    },
    invoice_statuses: ['issued', 'paid', 'overdue', 'cancelled']
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
  console.error('Invoice service error:', error);
  
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Start server
async function startServer() {
  try {
    const PORT = process.env.PORT || 3004;
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Invoice Service running on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    });

    server.on('error', (error) => {
      console.error('❌ Invoice server error:', error);
      process.exit(1);
    });

    return server;
  } catch (error) {
    console.error('❌ Failed to start invoice server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app; 