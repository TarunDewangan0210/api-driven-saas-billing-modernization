# SaaS Billing System - Deployment Guide

Welcome to the comprehensive deployment guide for the SaaS Billing Modernization Platform. This guide will walk you through setting up, configuring, and deploying the complete microservices-based billing system.

## 🏗️ Architecture Overview

The system consists of:

- **API Gateway** (Port 3000) - Single entry point for all requests
- **Customer Service** (Port 3001) - Customer management and lifecycle
- **Subscription Service** (Port 3002) - Subscription lifecycle management
- **Plan Service** (Port 3003) - Subscription plan management
- **Invoice Service** (Port 3004) - Invoice generation and management
- **Auth Service** (Port 3005) - Authentication and authorization
- **MongoDB** (Port 27017) - Primary database
- **Redis** (Port 6379) - Message queue and caching

## 📋 Prerequisites

### System Requirements

- **Node.js** 18+ 
- **Docker** 20+
- **Docker Compose** 2.0+
- **Git**
- **4GB+ RAM** (recommended)
- **10GB+ free disk space**

### Development Tools (Optional)

- **Postman** - API testing
- **MongoDB Compass** - Database management
- **Redis CLI** - Redis management

## 🚀 Quick Start (Automated Deployment)

The easiest way to get started is using our automated deployment script:

```bash
# Navigate to the project directory
cd api-driven-saas-billing-modernization

# Make the deployment script executable
chmod +x scripts/deploy.sh

# Run full deployment
./scripts/deploy.sh deploy
```

This will:
1. Check prerequisites
2. Set up environment variables
3. Install dependencies
4. Build Docker images
5. Start all services
6. Initialize the database
7. Run health checks

## 📖 Manual Deployment Steps

If you prefer manual control or need to customize the deployment:

### Step 1: Environment Setup

1. **Clone the repository** (if not already done):
```bash
git clone <repository-url>
cd api-driven-saas-billing-modernization
```

2. **Create environment file**:
```bash
cp env.example .env
```

3. **Edit environment variables**:
```bash
# Required configurations
MONGODB_URI=mongodb://admin:password@localhost:27017/saas_billing?authSource=admin
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
AUTH0_DOMAIN=your-domain.auth0.com  # Optional for OAuth2 integration
AUTH0_CLIENT_ID=your-client-id      # Optional for OAuth2 integration
AUTH0_CLIENT_SECRET=your-secret     # Optional for OAuth2 integration

# Service URLs (for Docker deployment)
CUSTOMER_SERVICE_URL=http://customer-service:3001
SUBSCRIPTION_SERVICE_URL=http://subscription-service:3002
PLAN_SERVICE_URL=http://plan-service:3003
INVOICE_SERVICE_URL=http://invoice-service:3004
AUTH_SERVICE_URL=http://auth-service:3005
```

### Step 2: Install Dependencies

```bash
# Install root dependencies
npm install

# Install service dependencies
npm run install:services
```

### Step 3: Database Setup

Start MongoDB and Redis:

```bash
# Start infrastructure services
docker-compose up -d mongodb redis

# Wait for services to be ready
sleep 10

# The database will be automatically initialized with default data
```

### Step 4: Build and Start Services

```bash
# Build Docker images
docker-compose build

# Start all services
docker-compose up -d

# Check service status
docker-compose ps
```

### Step 5: Verify Deployment

```bash
# Check API Gateway health
curl http://localhost:3000/health

# Check individual service health
curl http://localhost:3001/health  # Customer Service
curl http://localhost:3002/health  # Subscription Service
curl http://localhost:3003/health  # Plan Service
curl http://localhost:3004/health  # Invoice Service
curl http://localhost:3005/health  # Auth Service
```

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/saas_billing` | Yes |
| `REDIS_HOST` | Redis host | `localhost` | Yes |
| `REDIS_PORT` | Redis port | `6379` | Yes |
| `JWT_SECRET` | JWT signing secret | - | Yes |
| `AUTH0_DOMAIN` | Auth0 domain for OAuth2 | - | No |
| `AUTH0_CLIENT_ID` | Auth0 client ID | - | No |
| `AUTH0_CLIENT_SECRET` | Auth0 client secret | - | No |
| `NODE_ENV` | Environment mode | `development` | No |
| `LOG_LEVEL` | Logging level | `info` | No |

### Service Ports

| Service | Port | Purpose |
|---------|------|---------|
| API Gateway | 3000 | Main entry point |
| Customer Service | 3001 | Customer management |
| Subscription Service | 3002 | Subscription management |
| Plan Service | 3003 | Plan management |
| Invoice Service | 3004 | Invoice management |
| Auth Service | 3005 | Authentication |
| MongoDB | 27017 | Database |
| Redis | 6379 | Message queue/cache |

## 🧪 Testing the API

### Using Postman

1. **Import the Postman collection**:
   - File: `postman/SaaS-Billing-API.postman_collection.json`
   - Import into Postman

2. **Set up environment variables**:
   - `baseUrl`: `http://localhost:3000/api`
   - `authToken`: Will be auto-generated

3. **Run the requests** in order:
   - Health Checks → Authentication → Customer Management → Plans → Subscriptions → Invoices

### Manual API Testing

```bash
# Get API documentation
curl http://localhost:3000/api-docs

# Test authentication (mock)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@saas-billing.com", "password": "admin123"}'

# Create a customer
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Customer",
    "email": "test@example.com",
    "company": "Test Corp"
  }'

# Get all plans
curl http://localhost:3000/api/plans \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🎯 Production Deployment

### Security Considerations

1. **Change default credentials**:
   - Update `JWT_SECRET` with a strong secret
   - Change MongoDB admin password
   - Update default admin user credentials

2. **Enable HTTPS**:
   - Use a reverse proxy (nginx, Apache)
   - Configure SSL certificates
   - Update CORS settings

3. **Environment variables**:
   - Use a secure secrets management system
   - Never commit secrets to version control

### Docker Production Setup

1. **Create production Docker Compose file**:
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  # ... same services but with:
  # - Environment variables from secrets
  # - Resource limits
  # - Health checks
  # - Logging configuration
  # - Network security
```

2. **Deploy with production configuration**:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes Deployment

For Kubernetes deployment, see the `k8s/` directory (if available) for:
- Deployment manifests
- Service definitions
- ConfigMaps and Secrets
- Ingress configuration

## 📊 Monitoring and Logs

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f customer-service

# Last 100 lines
docker-compose logs --tail=100 api-gateway
```

### Health Monitoring

```bash
# Overall system health
curl http://localhost:3000/health

# Service discovery
curl http://localhost:3000/api/services \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Database Monitoring

```bash
# Connect to MongoDB
docker exec -it saas-billing-mongodb mongosh

# Use the billing database
use saas_billing

# Check collections
show collections

# Check document counts
db.customers.countDocuments()
db.plans.countDocuments()
```

## 🔄 Common Operations

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart customer-service
```

### Update Configuration

```bash
# Update environment variables
vim .env

# Restart affected services
docker-compose restart
```

### Backup Database

```bash
# Create backup
docker exec saas-billing-mongodb mongodump --out /backup

# Copy backup from container
docker cp saas-billing-mongodb:/backup ./mongodb-backup
```

### Scale Services

```bash
# Scale customer service to 3 replicas
docker-compose up -d --scale customer-service=3
```

## 🛠️ Troubleshooting

### Common Issues

1. **Services not starting**:
   ```bash
   # Check logs
   docker-compose logs
   
   # Check service status
   docker-compose ps
   
   # Restart services
   docker-compose restart
   ```

2. **Database connection issues**:
   ```bash
   # Check MongoDB status
   docker exec -it saas-billing-mongodb mongosh
   
   # Verify connection string
   echo $MONGODB_URI
   ```

3. **Port conflicts**:
   ```bash
   # Check what's using ports
   lsof -i :3000
   
   # Stop conflicting services
   sudo systemctl stop service-name
   ```

4. **Out of memory**:
   ```bash
   # Check Docker memory usage
   docker stats
   
   # Increase Docker memory limits
   # Update docker-compose.yml with memory limits
   ```

### Log Analysis

```bash
# Search for errors
docker-compose logs | grep ERROR

# Filter by service
docker-compose logs customer-service | grep ERROR

# Monitor in real-time
docker-compose logs -f | grep -E "(ERROR|WARN)"
```

## 📈 Performance Optimization

### Database Optimization

1. **Indexes**: Already configured in init script
2. **Connection pooling**: Configured in database utility
3. **Query optimization**: Use MongoDB Compass to analyze queries

### Service Optimization

1. **Enable compression**: Already configured
2. **Connection pooling**: Configure in production
3. **Caching**: Redis is set up for caching

### Load Balancing

For high availability, consider:
- Multiple instances of each service
- Load balancer (nginx, HAProxy)
- Database clustering
- Redis clustering

## 🔐 Security Checklist

- [ ] Change default passwords
- [ ] Update JWT secret
- [ ] Enable HTTPS
- [ ] Configure firewalls
- [ ] Set up monitoring
- [ ] Regular security updates
- [ ] Backup strategy
- [ ] Access control review

## 📞 Support

For issues or questions:

1. Check this deployment guide
2. Review service logs
3. Check the main README.md
4. Create an issue in the repository

## 🎉 Success!

If you've followed this guide, you should now have a fully functional SaaS billing system running with:

- ✅ All microservices operational
- ✅ Database initialized with sample data
- ✅ API Gateway routing requests
- ✅ Authentication and authorization working
- ✅ Message queue system active
- ✅ Health monitoring in place

### Quick Access URLs

- **API Gateway**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health
- **Service Discovery**: http://localhost:3000/api/services

### Default Credentials

- **Email**: admin@saas-billing.com
- **Password**: admin123

Happy billing! 🚀 