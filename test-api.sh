#!/bin/bash

echo "🚀 Testing SaaS Billing API"
echo "=========================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}1. Testing API Gateway Health${NC}"
curl -s http://localhost:3000/health | jq '.'

echo -e "\n${BLUE}2. Testing Auth Service (Direct)${NC}"
echo "Getting JWT token..."
TOKEN=$(curl -s -X POST http://localhost:3005/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@saas-billing.com","password":"admin123"}' | jq -r '.access_token')

echo -e "${GREEN}Token received: ${TOKEN:0:50}...${NC}"

echo -e "\n${BLUE}3. Testing Customer Service (Direct)${NC}"
echo "Getting customers..."
curl -s http://localhost:3001/customers \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n${BLUE}4. Creating a new customer${NC}"
curl -s -X POST http://localhost:3001/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com",
    "company": "Tech Corp",
    "phone": "+1-555-0199"
  }' | jq '.'

echo -e "\n${BLUE}5. Getting updated customer list${NC}"
curl -s http://localhost:3001/customers \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n${GREEN}✅ API Testing Complete!${NC}"
echo ""
echo "🔗 Available Endpoints:"
echo "  - API Gateway: http://localhost:3000"
echo "  - Auth Service: http://localhost:3005"
echo "  - Customer Service: http://localhost:3001"
echo ""
echo "📚 API Documentation:"
echo "  - Gateway: http://localhost:3000/api-docs"
echo "  - Auth: http://localhost:3005/api-docs"
echo "  - Customer: http://localhost:3001/api-docs" 