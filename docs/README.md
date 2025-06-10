# Documentation Index - SaaS Billing System

This directory contains comprehensive technical documentation for the SaaS Billing System.

## Document Index

### 1. Architecture Overview (ARCHITECTURE_OVERVIEW.md)
- Microservices architecture
- Technology stack
- Security design
- Scalability patterns

### 2. Data Flow Diagram (DATA_FLOW_DIAGRAM.md)
- End-to-end request flows
- Service integration patterns
- Database operations
- Event-driven flows

### 3. System Design (SYSTEM_DESIGN.md)
- Component architecture
- Database schema
- API specifications
- Performance targets

## System Components

### Microservices (6 Services)
- API Gateway (Port 3000) - Entry point & routing
- Auth Service (Port 3005) - Authentication & authorization
- Customer Service (Port 3001) - Customer management
- Plan Service (Port 3003) - Pricing & plan management
- Subscription Service (Port 3002) - Subscription lifecycle
- Invoice Service (Port 3004) - Billing & invoicing

### Data Stores
- MongoDB (Port 27017) - Primary database
- Redis (Port 6379) - Cache & message queue

### Key Technologies
- Node.js & Express.js - Runtime & framework
- Docker & Compose - Containerization
- JWT & OAuth2 - Authentication
- Mongoose ODM - Database ORM
- Redis & IORedis - Caching & messaging

## System Capabilities
- Unlimited customers with pagination
- 3-tier plans (Starter, Pro, Enterprise)
- 1 active subscription per customer
- Automated monthly billing
- Sub-200ms response times
- JWT + scope-based authorization

Complete technical blueprint for understanding, implementing, and scaling the SaaS Billing System.
