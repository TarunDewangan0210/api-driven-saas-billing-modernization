const mongoose = require('mongoose');
const { 
  commonSchemas, 
  addTimestampMiddleware, 
  addSoftDeleteMiddleware 
} = require('../../../../shared/utils/database');

/**
 * Customer Schema
 */
const customerSchema = new mongoose.Schema({
  // Basic customer information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    index: true
  },
  
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  
  phone: {
    type: String,
    trim: true,
    maxlength: 20
  },
  
  company: {
    type: String,
    trim: true,
    maxlength: 100
  },
  
  // Customer status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
    index: true
  },
  
  // Billing information
  billing_address: {
    street: String,
    city: String,
    state: String,
    postal_code: String,
    country: String
  },
  
  // Customer tier for business logic
  tier: {
    type: String,
    enum: ['individual', 'business', 'enterprise'],
    default: 'individual'
  },
  
  // External system identifiers
  external_ids: {
    stripe_customer_id: String,
    auth0_user_id: String,
    crm_id: String
  },
  
  // Customer preferences
  preferences: {
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'CAD']
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    communication: {
      email_notifications: { type: Boolean, default: true },
      sms_notifications: { type: Boolean, default: false },
      marketing_emails: { type: Boolean, default: false }
    }
  },
  
  // Business metrics
  metrics: {
    total_spent: { type: Number, default: 0 },
    lifetime_value: { type: Number, default: 0 },
    subscription_count: { type: Number, default: 0 },
    invoice_count: { type: Number, default: 0 },
    last_payment_date: Date,
    first_subscription_date: Date
  },
  
  // Tags for categorization and marketing
  tags: [{
    type: String,
    trim: true
  }],
  
  // Additional metadata for extensibility
  ...commonSchemas.metadataField,
  
  // Audit fields
  ...commonSchemas.auditFields,
  
  // Soft delete fields
  ...commonSchemas.softDeleteFields
}, {
  timestamps: false, // We're using custom audit fields
  collection: 'customers'
});

// Add indexes for common queries
customerSchema.index({ status: 1, created_at: -1 });
customerSchema.index({ company: 1 });
customerSchema.index({ 'preferences.currency': 1 });
customerSchema.index({ tags: 1 });
customerSchema.index({ 'external_ids.stripe_customer_id': 1 });

// Add middleware
addTimestampMiddleware(customerSchema);
addSoftDeleteMiddleware(customerSchema);

// Instance methods
customerSchema.methods.toPublic = function() {
  const customer = this.toObject();
  
  // Remove sensitive or internal fields
  delete customer.__v;
  delete customer.deleted_at;
  delete customer.deleted_by;
  delete customer.is_deleted;
  
  return customer;
};

customerSchema.methods.updateMetrics = function(updates) {
  Object.keys(updates).forEach(key => {
    if (this.metrics[key] !== undefined) {
      this.metrics[key] = updates[key];
    }
  });
  return this.save();
};

customerSchema.methods.addTag = function(tag) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
    return this.save();
  }
  return Promise.resolve(this);
};

customerSchema.methods.removeTag = function(tag) {
  this.tags = this.tags.filter(t => t !== tag);
  return this.save();
};

customerSchema.methods.activate = function() {
  this.status = 'active';
  return this.save();
};

customerSchema.methods.deactivate = function() {
  this.status = 'inactive';
  return this.save();
};

customerSchema.methods.suspend = function() {
  this.status = 'suspended';
  return this.save();
};

// Static methods
customerSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

customerSchema.statics.findActiveCustomers = function() {
  return this.find({ status: 'active' });
};

customerSchema.statics.findByCompany = function(company) {
  return this.find({ company: new RegExp(company, 'i') });
};

customerSchema.statics.findByTier = function(tier) {
  return this.find({ tier });
};

customerSchema.statics.searchCustomers = function(searchTerm, filters = {}) {
  const query = {
    $or: [
      { name: new RegExp(searchTerm, 'i') },
      { email: new RegExp(searchTerm, 'i') },
      { company: new RegExp(searchTerm, 'i') }
    ]
  };
  
  // Apply additional filters
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      query[key] = filters[key];
    }
  });
  
  return this.find(query);
};

// Virtual fields
customerSchema.virtual('full_name').get(function() {
  if (this.company) {
    return `${this.name} (${this.company})`;
  }
  return this.name;
});

customerSchema.virtual('is_business').get(function() {
  return this.tier === 'business' || this.tier === 'enterprise';
});

// Pre-save hooks
customerSchema.pre('save', function(next) {
  // Ensure email is lowercase
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  
  // Auto-detect tier based on company
  if (this.company && this.tier === 'individual') {
    this.tier = 'business';
  }
  
  next();
});

// Post-save hooks for event publishing
customerSchema.post('save', async function(doc, next) {
  try {
    // Publish customer events (will be implemented with message queue)
    const eventType = doc.isNew ? 'customer.created' : 'customer.updated';
    
    // For now, just log the event
    console.log(`📝 Customer event: ${eventType}`, {
      customer_id: doc._id,
      email: doc.email,
      status: doc.status
    });
    
    next();
  } catch (error) {
    next(error);
  }
});

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer; 