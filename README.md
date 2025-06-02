# SaaS Billing Modernization Platform

A modern, microservices-based SaaS billing system built with Node.js, Express, and Docker.

## Architecture Overview

This system follows Domain Driven Design (DDD) principles and is split into the following microservices:

### Core Services
- **Customer Service** - Manages customer lifecycle and information
- **Subscription Service** - Handles subscription management and billing cycles
- **Plan Service** - Manages available subscription plans
- **Invoice Service** - Generates and manages invoices
- **Auth Service** - OAuth2.0 authentication and authorization
- **API Gateway** - Single entry point for all API requests

### Infrastructure
- **Message Queue** - Redis-based async messaging for invoice generation
- **Database** - MongoDB for data persistence
- **Docker** - Containerized deployment

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- MongoDB (or use Docker)
- Redis (or use Docker)

### Installation

1. Clone and navigate to the project:
```bash
cd api-driven-saas-billing-modernization
```

2. Install dependencies for all services:
```bash
npm run install-all
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development environment:
```bash
docker-compose up -d
```

5. Run database migrations:
```bash
npm run migrate
```

6. Start all services:
```bash
npm run dev
```

## API Endpoints

### Authentication
All endpoints require Bearer token authentication except for OAuth endpoints.

### Customer Management
- `POST /api/customers` - Create a customer
- `GET /api/customers/{id}` - Retrieve customer info
- `PUT /api/customers/{id}` - Update customer info
- `DELETE /api/customers/{id}` - Deactivate a customer

### Subscription Management
- `POST /api/subscriptions` - Create a new subscription
- `GET /api/subscriptions/{id}` - Get subscription details
- `PUT /api/subscriptions/{id}` - Change subscription
- `DELETE /api/subscriptions/{id}` - Cancel subscription

### Plans
- `GET /api/plans` - List available plans
- `GET /api/plans/{id}` - Retrieve plan details

### Invoicing
- `POST /api/invoices` - Generate an invoice
- `GET /api/invoices/{id}` - Retrieve invoice
- `GET /api/customers/{id}/invoices` - List customer invoices

## Business Rules

1. A customer may have only one active subscription
2. Subscriptions have a start date and optionally an end date
3. Plans are static entities with defined pricing and features
4. Invoice generation is handled asynchronously via message queues

## Deployment

### Local Development
```bash
npm run dev
```

### Docker Deployment
```bash
docker-compose up --build
```

### Production Deployment
```bash
npm run deploy
```

## Environment Variables

See `.env.example` for required environment variables.

## Contributing

1. Follow the established code structure
2. Add tests for new features
3. Update documentation as needed
4. Follow conventional commit messages

## License

MIT 