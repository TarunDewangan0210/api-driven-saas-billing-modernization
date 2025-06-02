const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to handle validation results
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

/**
 * Common validation rules
 */
const commonValidations = {
  // ID validation (MongoDB ObjectId)
  mongoId: (field = 'id') => [
    param(field)
      .isMongoId()
      .withMessage(`${field} must be a valid MongoDB ObjectId`)
  ],

  // Email validation
  email: (field = 'email') => [
    body(field)
      .isEmail()
      .normalizeEmail()
      .withMessage('Must be a valid email address')
  ],

  // Required string validation
  requiredString: (field, min = 1, max = 255) => [
    body(field)
      .trim()
      .isLength({ min, max })
      .withMessage(`${field} must be between ${min} and ${max} characters`)
      .notEmpty()
      .withMessage(`${field} is required`)
  ],

  // Optional string validation
  optionalString: (field, min = 0, max = 255) => [
    body(field)
      .optional()
      .trim()
      .isLength({ min, max })
      .withMessage(`${field} must be between ${min} and ${max} characters`)
  ],

  // Date validation
  date: (field) => [
    body(field)
      .optional()
      .isISO8601()
      .withMessage(`${field} must be a valid ISO 8601 date`)
  ],

  // Positive number validation
  positiveNumber: (field) => [
    body(field)
      .isFloat({ min: 0 })
      .withMessage(`${field} must be a positive number`)
  ],

  // Status validation
  status: (field, allowedValues) => [
    body(field)
      .isIn(allowedValues)
      .withMessage(`${field} must be one of: ${allowedValues.join(', ')}`)
  ],

  // Pagination validation
  pagination: () => [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ]
};

/**
 * Customer-specific validations
 */
const customerValidations = {
  create: [
    ...commonValidations.requiredString('name', 2, 100),
    ...commonValidations.email('email'),
    ...commonValidations.optionalString('phone', 0, 20),
    ...commonValidations.optionalString('company', 0, 100),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be an object')
  ],

  update: [
    ...commonValidations.mongoId('id'),
    ...commonValidations.optionalString('name', 2, 100),
    ...commonValidations.email('email').map(rule => rule.optional()),
    ...commonValidations.optionalString('phone', 0, 20),
    ...commonValidations.optionalString('company', 0, 100),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be an object')
  ]
};

/**
 * Subscription-specific validations
 */
const subscriptionValidations = {
  create: [
    body('customer_id')
      .isMongoId()
      .withMessage('customer_id must be a valid MongoDB ObjectId'),
    body('plan_id')
      .isMongoId()
      .withMessage('plan_id must be a valid MongoDB ObjectId'),
    ...commonValidations.date('start_date'),
    ...commonValidations.date('end_date')
  ],

  update: [
    ...commonValidations.mongoId('id'),
    body('plan_id')
      .optional()
      .isMongoId()
      .withMessage('plan_id must be a valid MongoDB ObjectId'),
    ...commonValidations.status('status', ['active', 'cancelled', 'expired']),
    ...commonValidations.date('end_date')
  ]
};

/**
 * Plan-specific validations
 */
const planValidations = {
  create: [
    ...commonValidations.requiredString('name', 2, 50),
    ...commonValidations.requiredString('description', 0, 500),
    ...commonValidations.positiveNumber('monthly_price_usd'),
    body('features')
      .isArray()
      .withMessage('Features must be an array'),
    body('features.*')
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Each feature must be a string between 1 and 100 characters'),
    ...commonValidations.status('billing_cycle', ['monthly', 'yearly'])
  ]
};

/**
 * Invoice-specific validations
 */
const invoiceValidations = {
  create: [
    body('customer_id')
      .isMongoId()
      .withMessage('customer_id must be a valid MongoDB ObjectId'),
    body('subscription_id')
      .isMongoId()
      .withMessage('subscription_id must be a valid MongoDB ObjectId'),
    ...commonValidations.date('billing_period_start'),
    ...commonValidations.date('billing_period_end'),
    ...commonValidations.positiveNumber('amount_due_usd')
  ],

  updateStatus: [
    ...commonValidations.mongoId('id'),
    ...commonValidations.status('status', ['issued', 'paid', 'overdue', 'cancelled'])
  ]
};

module.exports = {
  handleValidationErrors,
  commonValidations,
  customerValidations,
  subscriptionValidations,
  planValidations,
  invoiceValidations
}; 