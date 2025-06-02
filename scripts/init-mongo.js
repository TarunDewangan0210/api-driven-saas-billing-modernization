// MongoDB initialization script
// This script will run when the MongoDB container starts for the first time

print('🚀 Initializing SaaS Billing Database...');

// Switch to the application database
db = db.getSiblingDB('saas_billing');

// Create collections with validation
print('📋 Creating collections with validation...');

// Plans collection with validation
db.createCollection('plans', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'monthly_price_usd', 'billing_cycle'],
      properties: {
        name: { bsonType: 'string', minLength: 2, maxLength: 50 },
        monthly_price_usd: { bsonType: 'number', minimum: 0 },
        billing_cycle: { enum: ['monthly', 'yearly'] },
        features: { bsonType: 'array' },
        is_active: { bsonType: 'bool' }
      }
    }
  }
});

// Insert default subscription plans
print('💼 Inserting default subscription plans...');

const defaultPlans = [
  {
    _id: ObjectId(),
    id: 'plan_starter',
    name: 'Starter Plan',
    description: 'Perfect for individuals and small teams getting started',
    monthly_price_usd: 29.00,
    yearly_price_usd: 290.00, // 2 months free
    features: [
      '10GB storage',
      'Basic support',
      'Up to 5 team members',
      'Basic analytics',
      'API access'
    ],
    billing_cycle: 'monthly',
    is_active: true,
    max_users: 5,
    storage_gb: 10,
    api_calls_per_month: 10000,
    support_level: 'basic',
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: ObjectId(),
    id: 'plan_pro',
    name: 'Pro Plan',
    description: 'For growing businesses that need more power and flexibility',
    monthly_price_usd: 99.00,
    yearly_price_usd: 990.00, // 2 months free
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
    is_active: true,
    max_users: 25,
    storage_gb: 100,
    api_calls_per_month: 100000,
    support_level: 'priority',
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: ObjectId(),
    id: 'plan_enterprise',
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
    is_active: true,
    max_users: -1, // unlimited
    storage_gb: -1, // unlimited
    api_calls_per_month: -1, // unlimited
    support_level: 'dedicated',
    created_at: new Date(),
    updated_at: new Date()
  }
];

db.plans.insertMany(defaultPlans);
print(`✅ Inserted ${defaultPlans.length} default plans`);

// Create indexes for better performance
print('🔍 Creating database indexes...');

// Plans indexes
db.plans.createIndex({ id: 1 }, { unique: true });
db.plans.createIndex({ name: 1 });
db.plans.createIndex({ monthly_price_usd: 1 });
db.plans.createIndex({ is_active: 1 });

// Customers indexes
db.customers.createIndex({ email: 1 }, { unique: true });
db.customers.createIndex({ status: 1, created_at: -1 });
db.customers.createIndex({ company: 1 });
db.customers.createIndex({ 'preferences.currency': 1 });
db.customers.createIndex({ tags: 1 });
db.customers.createIndex({ 'external_ids.stripe_customer_id': 1 });
db.customers.createIndex({ is_deleted: 1 });

// Subscriptions indexes
db.subscriptions.createIndex({ customer_id: 1 });
db.subscriptions.createIndex({ plan_id: 1 });
db.subscriptions.createIndex({ status: 1, next_billing_date: 1 });
db.subscriptions.createIndex({ start_date: 1 });
db.subscriptions.createIndex({ end_date: 1 });
db.subscriptions.createIndex({ is_deleted: 1 });

// Invoices indexes
db.invoices.createIndex({ customer_id: 1, created_at: -1 });
db.invoices.createIndex({ subscription_id: 1 });
db.invoices.createIndex({ status: 1 });
db.invoices.createIndex({ billing_period_start: 1, billing_period_end: 1 });
db.invoices.createIndex({ issued_at: 1 });
db.invoices.createIndex({ due_date: 1 });

print('✅ Database indexes created successfully');

// Create a default admin user (for testing)
print('👤 Creating default admin user...');

const adminUser = {
  _id: ObjectId(),
  id: 'user_admin',
  email: 'admin@saas-billing.com',
  password_hash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/BK5uC/rgy', // password: admin123
  role: 'admin',
  scopes: [
    'admin',
    'read:customers',
    'write:customers',
    'delete:customers',
    'read:subscriptions',
    'write:subscriptions',
    'read:plans',
    'write:plans',
    'read:invoices',
    'write:invoices',
    'write:metrics'
  ],
  is_active: true,
  created_at: new Date(),
  updated_at: new Date()
};

// Note: In production, this should be created through proper registration
db.users.insertOne(adminUser);
print('✅ Default admin user created (email: admin@saas-billing.com, password: admin123)');

// Create sample customer data (for development/testing)
if (process.env.NODE_ENV !== 'production') {
  print('🧪 Creating sample data for development...');
  
  const sampleCustomer = {
    _id: ObjectId(),
    id: 'cust_123',
    name: 'Acme Corp',
    email: 'billing@acme.com',
    company: 'Acme Corporation',
    status: 'active',
    tier: 'business',
    billing_address: {
      street: '123 Business Ave',
      city: 'San Francisco',
      state: 'CA',
      postal_code: '94102',
      country: 'US'
    },
    preferences: {
      currency: 'USD',
      timezone: 'America/Los_Angeles',
      communication: {
        email_notifications: true,
        sms_notifications: false,
        marketing_emails: true
      }
    },
    metrics: {
      total_spent: 0,
      lifetime_value: 0,
      subscription_count: 0,
      invoice_count: 0
    },
    tags: ['enterprise', 'trial'],
    metadata: {
      lead_source: 'website',
      sales_rep: 'john.doe@company.com'
    },
    created_at: new Date(),
    updated_at: new Date(),
    is_deleted: false
  };
  
  db.customers.insertOne(sampleCustomer);
  print('✅ Sample customer created');
}

print('🎉 Database initialization completed successfully!');

// Display summary
print('\n📊 Database Summary:');
print(`Plans: ${db.plans.countDocuments()}`);
print(`Customers: ${db.customers.countDocuments()}`);
print(`Users: ${db.users.countDocuments()}`);
print('\n🔗 Connection string: mongodb://admin:password@localhost:27017/saas_billing?authSource=admin');
print('🌐 Admin Panel: http://localhost:3000/api-docs');
print('🏥 Health Check: http://localhost:3000/health');

print('\n✨ SaaS Billing System is ready to go! ✨'); 