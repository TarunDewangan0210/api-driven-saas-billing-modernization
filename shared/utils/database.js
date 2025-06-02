const mongoose = require('mongoose');

/**
 * Database connection utility
 */
class Database {
  constructor() {
    this.connection = null;
  }

  /**
   * Connect to MongoDB
   */
  async connect(uri = process.env.MONGODB_URI) {
    try {
      if (this.connection) {
        return this.connection;
      }

      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4 // Use IPv4, skip trying IPv6
      };

      this.connection = await mongoose.connect(uri, options);
      
      console.log(`📦 Connected to MongoDB: ${uri.replace(/\/\/.*@/, '//***:***@')}`);
      
      // Handle connection events
      mongoose.connection.on('error', (error) => {
        console.error('❌ MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('🔄 MongoDB reconnected');
      });

      return this.connection;
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        this.connection = null;
        console.log('📦 Disconnected from MongoDB');
      }
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  /**
   * Get connection status
   */
  isConnected() {
    return mongoose.connection.readyState === 1;
  }

  /**
   * Drop database (for testing)
   */
  async dropDatabase() {
    try {
      if (process.env.NODE_ENV !== 'test') {
        throw new Error('Database can only be dropped in test environment');
      }
      await mongoose.connection.dropDatabase();
      console.log('🗑️ Database dropped');
    } catch (error) {
      console.error('❌ Error dropping database:', error);
      throw error;
    }
  }
}

/**
 * Pagination helper
 */
const paginate = (query, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  return query.skip(skip).limit(limit);
};

/**
 * Build filter query from request parameters
 */
const buildFilterQuery = (filters = {}) => {
  const query = {};
  
  Object.keys(filters).forEach(key => {
    const value = filters[key];
    
    if (value !== undefined && value !== null && value !== '') {
      // Handle different filter types
      if (key.endsWith('_start') || key.endsWith('_end')) {
        // Date range filters
        const baseField = key.replace(/_start|_end/, '');
        if (!query[baseField]) query[baseField] = {};
        
        if (key.endsWith('_start')) {
          query[baseField].$gte = new Date(value);
        } else {
          query[baseField].$lte = new Date(value);
        }
      } else if (key.endsWith('_contains')) {
        // Text search
        const baseField = key.replace('_contains', '');
        query[baseField] = { $regex: value, $options: 'i' };
      } else if (key.endsWith('_in')) {
        // Array contains
        const baseField = key.replace('_in', '');
        query[baseField] = { $in: Array.isArray(value) ? value : [value] };
      } else {
        // Exact match
        query[key] = value;
      }
    }
  });
  
  return query;
};

/**
 * Common database schemas for reuse
 */
const commonSchemas = {
  // Audit fields that can be added to any schema
  auditFields: {
    created_at: {
      type: Date,
      default: Date.now,
      index: true
    },
    updated_at: {
      type: Date,
      default: Date.now
    },
    created_by: {
      type: String,
      required: false
    },
    updated_by: {
      type: String,
      required: false
    }
  },

  // Soft delete fields
  softDeleteFields: {
    deleted_at: {
      type: Date,
      default: null
    },
    deleted_by: {
      type: String,
      required: false
    },
    is_deleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },

  // Metadata field for flexible data storage
  metadataField: {
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }
};

/**
 * Pre-save middleware to update timestamps
 */
const addTimestampMiddleware = (schema) => {
  schema.pre('save', function(next) {
    this.updated_at = new Date();
    next();
  });

  schema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function(next) {
    this.set({ updated_at: new Date() });
    next();
  });
};

/**
 * Add soft delete functionality to schema
 */
const addSoftDeleteMiddleware = (schema) => {
  // Add method to soft delete
  schema.methods.softDelete = function(deletedBy = null) {
    this.is_deleted = true;
    this.deleted_at = new Date();
    if (deletedBy) this.deleted_by = deletedBy;
    return this.save();
  };

  // Add method to restore
  schema.methods.restore = function() {
    this.is_deleted = false;
    this.deleted_at = null;
    this.deleted_by = null;
    return this.save();
  };

  // Modify find queries to exclude deleted documents by default
  schema.pre(/^find/, function() {
    if (!this.getQuery().is_deleted) {
      this.where({ is_deleted: { $ne: true } });
    }
  });
};

// Create singleton instance
const database = new Database();

module.exports = {
  database,
  Database,
  paginate,
  buildFilterQuery,
  commonSchemas,
  addTimestampMiddleware,
  addSoftDeleteMiddleware,
  mongoose
}; 