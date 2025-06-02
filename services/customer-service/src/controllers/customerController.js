const Customer = require('../models/Customer');
const { paginate, buildFilterQuery } = require('../../../../shared/utils/database');
const { messageQueue, MessageTypes } = require('../../../../shared/utils/messageQueue');

/**
 * Customer Controller
 * Handles all customer-related operations
 */
class CustomerController {
  
  /**
   * Create a new customer
   * POST /customers
   */
  async createCustomer(req, res) {
    try {
      const customerData = {
        ...req.body,
        created_by: req.user?.id || 'system'
      };

      // Check if customer with email already exists
      const existingCustomer = await Customer.findByEmail(customerData.email);
      if (existingCustomer) {
        return res.status(409).json({
          error: 'Customer with this email already exists',
          code: 'CUSTOMER_EXISTS',
          existing_customer_id: existingCustomer._id
        });
      }

      const customer = new Customer(customerData);
      await customer.save();

      // Publish customer created event
      try {
        await messageQueue.publish(MessageTypes.CUSTOMER_CREATED, {
          customer_id: customer._id,
          email: customer.email,
          name: customer.name,
          tier: customer.tier
        });
      } catch (error) {
        console.error('Failed to publish customer created event:', error);
        // Don't fail the request if event publishing fails
      }

      res.status(201).json({
        message: 'Customer created successfully',
        customer: customer.toPublic()
      });

    } catch (error) {
      console.error('Error creating customer:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: Object.values(error.errors).map(err => ({
            field: err.path,
            message: err.message
          }))
        });
      }

      if (error.code === 11000) {
        return res.status(409).json({
          error: 'Customer with this email already exists',
          code: 'DUPLICATE_EMAIL'
        });
      }

      res.status(500).json({
        error: 'Failed to create customer',
        code: 'CREATION_FAILED'
      });
    }
  }

  /**
   * Get customer by ID
   * GET /customers/:id
   */
  async getCustomer(req, res) {
    try {
      const { id } = req.params;
      
      const customer = await Customer.findById(id);
      
      if (!customer) {
        return res.status(404).json({
          error: 'Customer not found',
          code: 'CUSTOMER_NOT_FOUND'
        });
      }

      res.json({
        customer: customer.toPublic()
      });

    } catch (error) {
      console.error('Error getting customer:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          error: 'Invalid customer ID format',
          code: 'INVALID_ID'
        });
      }

      res.status(500).json({
        error: 'Failed to retrieve customer',
        code: 'RETRIEVAL_FAILED'
      });
    }
  }

  /**
   * Get all customers with filtering and pagination
   * GET /customers
   */
  async getCustomers(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status,
        tier,
        company,
        sort_by = 'created_at',
        sort_order = 'desc',
        ...filters
      } = req.query;

      let query = Customer.find();

      // Apply search if provided
      if (search) {
        query = Customer.searchCustomers(search, { status, tier });
      } else {
        // Apply filters
        const filterQuery = buildFilterQuery({
          status,
          tier,
          company: company ? new RegExp(company, 'i') : undefined,
          ...filters
        });
        query = Customer.find(filterQuery);
      }

      // Apply sorting
      const sortOrder = sort_order === 'desc' ? -1 : 1;
      query = query.sort({ [sort_by]: sortOrder });

      // Get total count for pagination
      const total = await Customer.countDocuments(query.getQuery());

      // Apply pagination
      query = paginate(query, parseInt(page), parseInt(limit));

      const customers = await query.exec();

      res.json({
        customers: customers.map(customer => customer.toPublic()),
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_items: total,
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

  /**
   * Update customer
   * PUT /customers/:id
   */
  async updateCustomer(req, res) {
    try {
      const { id } = req.params;
      const updates = {
        ...req.body,
        updated_by: req.user?.id || 'system'
      };

      // Remove fields that shouldn't be updated directly
      delete updates.created_at;
      delete updates.created_by;
      delete updates._id;

      const customer = await Customer.findById(id);
      
      if (!customer) {
        return res.status(404).json({
          error: 'Customer not found',
          code: 'CUSTOMER_NOT_FOUND'
        });
      }

      // Check if email is being changed and if it conflicts
      if (updates.email && updates.email !== customer.email) {
        const existingCustomer = await Customer.findByEmail(updates.email);
        if (existingCustomer) {
          return res.status(409).json({
            error: 'Email already in use by another customer',
            code: 'EMAIL_CONFLICT'
          });
        }
      }

      // Apply updates
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          customer[key] = updates[key];
        }
      });

      await customer.save();

      // Publish customer updated event
      try {
        await messageQueue.publish(MessageTypes.CUSTOMER_UPDATED, {
          customer_id: customer._id,
          email: customer.email,
          changes: Object.keys(updates)
        });
      } catch (error) {
        console.error('Failed to publish customer updated event:', error);
      }

      res.json({
        message: 'Customer updated successfully',
        customer: customer.toPublic()
      });

    } catch (error) {
      console.error('Error updating customer:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: Object.values(error.errors).map(err => ({
            field: err.path,
            message: err.message
          }))
        });
      }

      if (error.name === 'CastError') {
        return res.status(400).json({
          error: 'Invalid customer ID format',
          code: 'INVALID_ID'
        });
      }

      res.status(500).json({
        error: 'Failed to update customer',
        code: 'UPDATE_FAILED'
      });
    }
  }

  /**
   * Deactivate customer (soft delete)
   * DELETE /customers/:id
   */
  async deleteCustomer(req, res) {
    try {
      const { id } = req.params;
      
      const customer = await Customer.findById(id);
      
      if (!customer) {
        return res.status(404).json({
          error: 'Customer not found',
          code: 'CUSTOMER_NOT_FOUND'
        });
      }

      // Check if customer has active subscriptions
      // This would normally check the subscription service
      // For now, we'll just check a simple flag or metric
      if (customer.metrics.subscription_count > 0) {
        return res.status(400).json({
          error: 'Cannot delete customer with active subscriptions',
          code: 'HAS_ACTIVE_SUBSCRIPTIONS',
          subscription_count: customer.metrics.subscription_count
        });
      }

      // Soft delete the customer
      await customer.softDelete(req.user?.id || 'system');

      // Publish customer deactivated event
      try {
        await messageQueue.publish(MessageTypes.CUSTOMER_DEACTIVATED, {
          customer_id: customer._id,
          email: customer.email,
          deactivated_by: req.user?.id || 'system'
        });
      } catch (error) {
        console.error('Failed to publish customer deactivated event:', error);
      }

      res.json({
        message: 'Customer deactivated successfully'
      });

    } catch (error) {
      console.error('Error deleting customer:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          error: 'Invalid customer ID format',
          code: 'INVALID_ID'
        });
      }

      res.status(500).json({
        error: 'Failed to delete customer',
        code: 'DELETION_FAILED'
      });
    }
  }

  /**
   * Get customer statistics
   * GET /customers/:id/stats
   */
  async getCustomerStats(req, res) {
    try {
      const { id } = req.params;
      
      const customer = await Customer.findById(id);
      
      if (!customer) {
        return res.status(404).json({
          error: 'Customer not found',
          code: 'CUSTOMER_NOT_FOUND'
        });
      }

      // Here you would typically aggregate data from other services
      // For now, return the metrics stored on the customer
      res.json({
        customer_id: customer._id,
        metrics: customer.metrics,
        account_age_days: Math.floor((new Date() - customer.created_at) / (1000 * 60 * 60 * 24)),
        is_active: customer.status === 'active',
        tier: customer.tier
      });

    } catch (error) {
      console.error('Error getting customer stats:', error);
      res.status(500).json({
        error: 'Failed to retrieve customer statistics',
        code: 'STATS_FAILED'
      });
    }
  }

  /**
   * Update customer metrics (for internal service calls)
   * PUT /customers/:id/metrics
   */
  async updateCustomerMetrics(req, res) {
    try {
      const { id } = req.params;
      const { metrics } = req.body;
      
      const customer = await Customer.findById(id);
      
      if (!customer) {
        return res.status(404).json({
          error: 'Customer not found',
          code: 'CUSTOMER_NOT_FOUND'
        });
      }

      await customer.updateMetrics(metrics);

      res.json({
        message: 'Customer metrics updated successfully',
        metrics: customer.metrics
      });

    } catch (error) {
      console.error('Error updating customer metrics:', error);
      res.status(500).json({
        error: 'Failed to update customer metrics',
        code: 'METRICS_UPDATE_FAILED'
      });
    }
  }

  /**
   * Bulk operations
   * POST /customers/bulk
   */
  async bulkOperations(req, res) {
    try {
      const { operation, customer_ids, data } = req.body;

      if (!operation || !customer_ids || !Array.isArray(customer_ids)) {
        return res.status(400).json({
          error: 'Invalid bulk operation request',
          code: 'INVALID_BULK_REQUEST'
        });
      }

      let result;

      switch (operation) {
        case 'update_status':
          result = await Customer.updateMany(
            { _id: { $in: customer_ids } },
            { 
              status: data.status,
              updated_by: req.user?.id || 'system',
              updated_at: new Date()
            }
          );
          break;

        case 'add_tags':
          result = await Customer.updateMany(
            { _id: { $in: customer_ids } },
            { 
              $addToSet: { tags: { $each: data.tags } },
              updated_by: req.user?.id || 'system',
              updated_at: new Date()
            }
          );
          break;

        case 'remove_tags':
          result = await Customer.updateMany(
            { _id: { $in: customer_ids } },
            { 
              $pullAll: { tags: data.tags },
              updated_by: req.user?.id || 'system',
              updated_at: new Date()
            }
          );
          break;

        default:
          return res.status(400).json({
            error: 'Unsupported bulk operation',
            code: 'UNSUPPORTED_OPERATION'
          });
      }

      res.json({
        message: `Bulk ${operation} completed successfully`,
        matched_count: result.matchedCount,
        modified_count: result.modifiedCount
      });

    } catch (error) {
      console.error('Error performing bulk operation:', error);
      res.status(500).json({
        error: 'Bulk operation failed',
        code: 'BULK_OPERATION_FAILED'
      });
    }
  }
}

module.exports = new CustomerController(); 