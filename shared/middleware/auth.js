const jwt = require('jsonwebtoken');
const axios = require('axios');

/**
 * JWT Authentication Middleware
 * Validates JWT tokens and extracts user information
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }

    // For Auth0 integration, we might need to verify with Auth0
    // For now, we'll use local JWT verification
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user information to request
    req.user = {
      id: decoded.sub || decoded.userId,
      email: decoded.email,
      scope: decoded.scope || [],
      ...decoded
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * OAuth2 Client Credentials Authentication
 * For service-to-service communication
 */
const authenticateClientCredentials = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }

    // Verify with Auth0 introspection endpoint
    const auth0Domain = process.env.AUTH0_DOMAIN;
    if (auth0Domain) {
      const response = await axios.post(`https://${auth0Domain}/oauth/token/introspect`, {
        token: token,
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET
      });

      if (!response.data.active) {
        return res.status(401).json({
          error: 'Invalid or inactive token',
          code: 'TOKEN_INVALID'
        });
      }

      req.client = {
        id: response.data.client_id,
        scope: response.data.scope ? response.data.scope.split(' ') : []
      };
    } else {
      // Fallback to local JWT verification for development
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.client = {
        id: decoded.client_id,
        scope: decoded.scope || []
      };
    }

    next();
  } catch (error) {
    console.error('Client credentials authentication error:', error);
    return res.status(401).json({
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
};

/**
 * Scope-based authorization middleware
 */
const requireScope = (requiredScopes) => {
  return (req, res, next) => {
    const userScopes = req.user?.scope || req.client?.scope || [];
    
    const hasRequiredScope = requiredScopes.some(scope => 
      userScopes.includes(scope)
    );

    if (!hasRequiredScope) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_SCOPE',
        required: requiredScopes,
        provided: userScopes
      });
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = {
        id: decoded.sub || decoded.userId,
        email: decoded.email,
        scope: decoded.scope || [],
        ...decoded
      };
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  authenticateToken,
  authenticateClientCredentials,
  requireScope,
  optionalAuth
}; 