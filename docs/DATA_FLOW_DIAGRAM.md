# Data Flow Diagram - SaaS Billing System

## Table of Contents
- [End-to-End Request Flow](#end-to-end-request-flow)
- [Service Integration Patterns](#service-integration-patterns)
- [Database Operations Flow](#database-operations-flow)
- [Event-Driven Flows](#event-driven-flows)
- [Authentication Data Flow](#authentication-data-flow)
- [Business Process Flows](#business-process-flows)

## End-to-End Request Flow

### Complete Request Lifecycle
1. **Client Request** → API Gateway (Port 3000)
2. **Authentication** → Auth Service (Port 3005)
3. **Request Routing** → Target Service
4. **Business Logic** → Service Processing
5. **Data Operations** → MongoDB Database
6. **Response** → Client via API Gateway

## Service Integration Patterns

### Synchronous Communication
- Customer Service ↔ Auth Service (user validation)
- Subscription Service ↔ Customer Service (customer data)
- Subscription Service ↔ Plan Service (plan details)
- Invoice Service ↔ Subscription Service (billing data)

### Asynchronous Communication
- Customer Created → Subscription Service
- Subscription Changed → Invoice Service
- Invoice Generated → Notification Service
- Payment Processed → Subscription Service

## Database Operations Flow

### CRUD Operations Pattern
1. **Request Validation** → Input sanitization and validation
2. **Authorization Check** → Verify user permissions
3. **Database Query** → MongoDB operations
4. **Data Transformation** → Format response data
5. **Audit Logging** → Record data changes
6. **Cache Update** → Update Redis cache if needed

## Event-Driven Flows

### Message Queue Processing
- **Event Publishing** → Redis pub/sub channels
- **Event Consumption** → Service subscribers
- **Retry Mechanism** → Failed message handling
- **Dead Letter Queue** → Unprocessable messages

### Key Event Types
- customer.created, customer.updated, customer.deleted
- subscription.created, subscription.updated, subscription.cancelled
- invoice.generated, invoice.paid, invoice.failed
- plan.created, plan.updated, plan.deprecated

## Authentication Data Flow

### JWT Token Lifecycle
1. **Login Request** → Auth Service validates credentials
2. **Token Generation** → JWT token with user claims and scopes
3. **Token Response** → Return token to client
4. **API Request** → Client includes token in Authorization header
5. **Token Validation** → API Gateway validates token signature
6. **Request Forwarding** → Forward to target service with user context

## Business Process Flows

### Customer Onboarding Flow
1. Customer registration → Customer Service
2. Email verification → Auth Service
3. Plan selection → Plan Service
4. Subscription creation → Subscription Service
5. Initial invoice → Invoice Service

### Monthly Billing Flow
1. Billing cycle trigger → Subscription Service
2. Usage calculation → Plan Service
3. Invoice generation → Invoice Service
4. Payment processing → Payment Gateway
5. Status updates → All relevant services
