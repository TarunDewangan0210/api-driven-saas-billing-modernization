const express = require('express');
const router = express.Router();

// Simple customer data for testing (in production, this would use a database)
let customers = [
  {
    _id: '507f1f77bcf86cd799439011',
    name: 'John Doe',
    email: 'john@example.com',
    company: 'Example Corp',
    status: 'active',
    created_at: new Date().toISOString()
  }
];

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

  // For testing, accept any token that looks like a JWT
  if (token.includes('.')) {
    req.user = { id: 'user_admin', email: 'admin@example.com' };
    next();
  } else {
    return res.status(401).json({
      error: 'Invalid token',
      code: 'TOKEN_INVALID'
    });
  }
};

/**
 * @route   POST /customers
 * @desc    Create a new customer
 * @access  Private
 */
router.post('/',
  authenticateToken,
  (req, res) => {
    try {
      const { name, email, company, phone } = req.body;

      if (!name || !email) {
        return res.status(400).json({
          error: 'Name and email are required',
          code: 'VALIDATION_ERROR'
        });
      }

      // Check if customer already exists
      const existingCustomer = customers.find(c => c.email === email);
      if (existingCustomer) {
        return res.status(409).json({
          error: 'Customer with this email already exists',
          code: 'CUSTOMER_EXISTS'
        });
      }

      const newCustomer = {
        _id: Math.random().toString(36).substr(2, 24),
        name,
        email,
        company: company || '',
        phone: phone || '',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      customers.push(newCustomer);

      res.status(201).json({
        message: 'Customer created successfully',
        customer: newCustomer
      });
    } catch (error) {
      console.error('Error creating customer:', error);
      res.status(500).json({
        error: 'Failed to create customer',
        code: 'CREATION_FAILED'
      });
    }
  }
);

/**
 * @route   GET /customers
 * @desc    Get all customers
 * @access  Private
 */
router.get('/',
  authenticateToken,
  (req, res) => {
    try {
      const { page = 1, limit = 10, status } = req.query;

      let filteredCustomers = customers;
      
      if (status) {
        filteredCustomers = customers.filter(c => c.status === status);
      }

      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

      res.json({
        customers: paginatedCustomers,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(filteredCustomers.length / limit),
          total_items: filteredCustomers.length,
          items_per_page: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error getting customers:', error);
      res.status(500).json({
        error: 'Failed to retrieve customers',
        code: 'RETRIEVAL_FAILED'
      });
    }
  }
);

/**
 * @route   GET /customers/:id
 * @desc    Get customer by ID
 * @access  Private
 */
router.get('/:id',
  authenticateToken,
  (req, res) => {
    try {
      const { id } = req.params;
      
      const customer = customers.find(c => c._id === id);
      
      if (!customer) {
        return res.status(404).json({
          error: 'Customer not found',
          code: 'CUSTOMER_NOT_FOUND'
        });
      }

      res.json({ customer });
    } catch (error) {
      console.error('Error getting customer:', error);
      res.status(500).json({
        error: 'Failed to retrieve customer',
        code: 'RETRIEVAL_FAILED'
      });
    }
  }
);

/**
 * @route   PUT /customers/:id
 * @desc    Update customer
 * @access  Private
 */
router.put('/:id',
  authenticateToken,
  (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const customerIndex = customers.findIndex(c => c._id === id);
      
      if (customerIndex === -1) {
        return res.status(404).json({
          error: 'Customer not found',
          code: 'CUSTOMER_NOT_FOUND'
        });
      }

      // Update customer
      customers[customerIndex] = {
        ...customers[customerIndex],
        ...updates,
        updated_at: new Date().toISOString()
      };

      res.json({
        message: 'Customer updated successfully',
        customer: customers[customerIndex]
      });
    } catch (error) {
      console.error('Error updating customer:', error);
      res.status(500).json({
        error: 'Failed to update customer',
        code: 'UPDATE_FAILED'
      });
    }
  }
);

/**
 * @route   DELETE /customers/:id
 * @desc    Delete customer
 * @access  Private
 */
router.delete('/:id',
  authenticateToken,
  (req, res) => {
    try {
      const { id } = req.params;
      
      const customerIndex = customers.findIndex(c => c._id === id);
      
      if (customerIndex === -1) {
        return res.status(404).json({
          error: 'Customer not found',
          code: 'CUSTOMER_NOT_FOUND'
        });
      }

      // Mark as inactive instead of deleting
      customers[customerIndex].status = 'inactive';
      customers[customerIndex].updated_at = new Date().toISOString();

      res.json({
        message: 'Customer deactivated successfully'
      });
    } catch (error) {
      console.error('Error deleting customer:', error);
      res.status(500).json({
        error: 'Failed to delete customer',
        code: 'DELETION_FAILED'
      });
    }
  }
);

module.exports = router; 