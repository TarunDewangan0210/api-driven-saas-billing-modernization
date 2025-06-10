# System Design - SaaS Billing System

## Table of Contents
- [Component Architecture](#component-architecture)
- [Database Design](#database-design)
- [API Design](#api-design)
- [Security Design](#security-design)
- [Performance & Scalability](#performance--scalability)
- [Deployment Design](#deployment-design)

## Component Architecture

### Service Components

#### API Gateway (Port 3000)
- **Purpose**: Single entry point and request routing
- **Key Features**: Authentication, rate limiting, load balancing
- **Dependencies**: Auth Service for token validation

#### Auth Service (Port 3005)
- **Purpose**: Authentication and authorization management
- **Key Features**: JWT tokens, OAuth2, scope-based access
- **Dependencies**: MongoDB for user data

#### Customer Service (Port 3001)
- **Purpose**: Customer data and profile management
- **Key Features**: CRUD operations, data validation, audit trails
- **Dependencies**: Auth Service for authentication

#### Plan Service (Port 3003)
- **Purpose**: Pricing plans and feature management
- **Key Features**: Plan definitions, pricing rules, feature toggles
- **Dependencies**: None (standalone service)

#### Subscription Service (Port 3002)
- **Purpose**: Subscription lifecycle management
- **Key Features**: State management, plan changes, billing logic
- **Dependencies**: Customer Service, Plan Service

#### Invoice Service (Port 3004)
- **Purpose**: Billing and invoice generation
- **Key Features**: Automated billing, payment tracking, invoice history
- **Dependencies**: Subscription Service, Customer Service

## Database Design

### MongoDB Collections

#### customers Collection
- _id, name, email, phone, address
- billing_address, preferences, status
- created_at, updated_at, deleted_at

#### plans Collection
- _id, name, description, price, billing_cycle
- features, limits, status, tier
- created_at, updated_at

#### subscriptions Collection
- _id, customer_id, plan_id, status
- start_date, end_date, next_billing_date
- created_at, updated_at, cancelled_at

#### invoices Collection
- _id, customer_id, subscription_id, amount
- status, due_date, paid_date, line_items
- created_at, updated_at

## API Design

### RESTful Endpoints

#### Authentication Endpoints
- POST /auth/login - User authentication
- POST /auth/refresh - Token refresh
- POST /auth/logout - User logout

#### Customer Endpoints
- GET /customers - List customers (paginated)
- POST /customers - Create customer
- GET /customers/:id - Get customer details
- PUT /customers/:id - Update customer
- DELETE /customers/:id - Delete customer (soft delete)

#### Plan Endpoints
- GET /plans - List all plans
- POST /plans - Create new plan
- GET /plans/:id - Get plan details
- PUT /plans/:id - Update plan

#### Subscription Endpoints
- GET /subscriptions - List subscriptions
- POST /subscriptions - Create subscription
- GET /subscriptions/:id - Get subscription details
- PUT /subscriptions/:id - Update subscription
- DELETE /subscriptions/:id - Cancel subscription

#### Invoice Endpoints
- GET /invoices - List invoices
- POST /invoices - Generate invoice
- GET /invoices/:id - Get invoice details
- PUT /invoices/:id/pay - Mark invoice as paid

## Security Design

### JWT Token Structure
- **Header**: Algorithm and token type
- **Payload**: User ID, scopes, expiration
- **Signature**: HMAC SHA256 signature

### Authorization Scopes
- read:customers, write:customers
- read:plans, write:plans
- read:subscriptions, write:subscriptions
- read:invoices, write:invoices

## Performance & Scalability

### Performance Targets
- **Response Time**: < 200ms (P95)
- **Throughput**: 1000+ requests/second
- **Availability**: 99.9% uptime
- **Concurrent Users**: 500+ simultaneous

### Scalability Strategies
- **Horizontal Scaling**: Multiple service instances
- **Database Scaling**: MongoDB replica sets
- **Caching**: Redis for session and data caching
- **Load Balancing**: Distribute traffic across instances

## Deployment Design

### Container Specifications
- **Base Image**: Node.js 18 Alpine
- **Health Checks**: HTTP endpoint monitoring
- **Resource Limits**: CPU and memory constraints
- **Environment Variables**: Configuration management

### Production Deployment
- **Container Orchestration**: Kubernetes or Docker Swarm
- **Service Discovery**: Automatic service registration
- **Load Balancing**: Ingress controllers
- **Monitoring**: Health checks and metrics collection
- **Logging**: Centralized log aggregation

This system design provides a comprehensive foundation for building a scalable, secure, and maintainable SaaS billing system.
