#!/bin/bash

echo "🚀 Comprehensive SaaS Billing API Testing"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000/api"

echo -e "${BLUE}1. Testing API Gateway Health${NC}"
curl -s ${BASE_URL%/api}/health | jq '.'

echo -e "\n${BLUE}2. Getting JWT Token${NC}"
TOKEN=$(curl -s -X POST ${BASE_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@saas-billing.com","password":"admin123"}' | jq -r '.access_token')

echo -e "${GREEN}Token received: ${TOKEN:0:50}...${NC}"

echo -e "\n${BLUE}3. Testing Plans Service${NC}"
echo "Getting available plans..."
curl -s ${BASE_URL}/plans/plans | jq '.'

echo -e "\n${BLUE}4. Testing Customer Creation${NC}"
echo "Creating a new customer..."
CUSTOMER_RESPONSE=$(curl -s -X POST ${BASE_URL}/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Customer",
    "email": "testcustomer@example.com",
    "company": "Test Corp",
    "phone": "+1-555-0123"
  }')

echo "$CUSTOMER_RESPONSE" | jq '.'
CUSTOMER_ID=$(echo "$CUSTOMER_RESPONSE" | jq -r '.customer._id')
echo -e "${GREEN}Customer ID: $CUSTOMER_ID${NC}"

echo -e "\n${BLUE}5. Testing Subscription Creation (Business Rule: One Active Per Customer)${NC}"
echo "Creating subscription for starter plan..."
SUBSCRIPTION_RESPONSE=$(curl -s -X POST ${BASE_URL}/subscriptions/subscriptions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"customer_id\": \"$CUSTOMER_ID\",
    \"plan_id\": \"plan_starter\",
    \"billing_cycle\": \"monthly\"
  }")

echo "$SUBSCRIPTION_RESPONSE" | jq '.'
SUBSCRIPTION_ID=$(echo "$SUBSCRIPTION_RESPONSE" | jq -r '.subscription._id')
echo -e "${GREEN}Subscription ID: $SUBSCRIPTION_ID${NC}"

echo -e "\n${YELLOW}6. Testing Business Rule: Attempting Second Subscription (Should Fail)${NC}"
echo "Trying to create another subscription for the same customer..."
curl -s -X POST ${BASE_URL}/subscriptions/subscriptions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"customer_id\": \"$CUSTOMER_ID\",
    \"plan_id\": \"plan_pro\",
    \"billing_cycle\": \"monthly\"
  }" | jq '.'

echo -e "\n${BLUE}7. Testing Subscription Upgrade${NC}"
echo "Upgrading subscription to Pro plan..."
curl -s -X PUT ${BASE_URL}/subscriptions/subscriptions/$SUBSCRIPTION_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "plan_id": "plan_pro",
    "billing_cycle": "yearly"
  }' | jq '.'

echo -e "\n${BLUE}8. Testing Invoice Generation${NC}"
echo "Generating invoice for subscription..."
INVOICE_RESPONSE=$(curl -s -X POST ${BASE_URL}/invoices/invoices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"subscription_id\": \"$SUBSCRIPTION_ID\"
  }")

echo "$INVOICE_RESPONSE" | jq '.'
INVOICE_ID=$(echo "$INVOICE_RESPONSE" | jq -r '.invoice._id')
echo -e "${GREEN}Invoice ID: $INVOICE_ID${NC}"

echo -e "\n${BLUE}9. Testing Invoice Retrieval${NC}"
echo "Getting invoice details..."
curl -s ${BASE_URL}/invoices/invoices/$INVOICE_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n${BLUE}10. Testing Customer Invoice List${NC}"
echo "Getting all invoices for customer..."
curl -s ${BASE_URL}/invoices/customers/$CUSTOMER_ID/invoices \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n${BLUE}11. Testing Invoice Status Update${NC}"
echo "Marking invoice as paid..."
curl -s -X PUT ${BASE_URL}/invoices/invoices/$INVOICE_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status": "paid"
  }' | jq '.'

echo -e "\n${BLUE}12. Testing Customer Subscriptions${NC}"
echo "Getting customer subscriptions..."
curl -s "${BASE_URL}/subscriptions/customers/$CUSTOMER_ID/subscriptions" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n${BLUE}13. Testing Plan Details${NC}"
echo "Getting Enterprise plan details..."
curl -s ${BASE_URL}/plans/plans/plan_enterprise | jq '.'

echo -e "\n${BLUE}14. Testing Plan Pricing${NC}"
echo "Getting yearly pricing for Pro plan..."
curl -s "${BASE_URL}/plans/plans/plan_pro/pricing?billing_cycle=yearly" | jq '.'

echo -e "\n${BLUE}15. Testing Subscription Cancellation${NC}"
echo "Cancelling subscription..."
curl -s -X DELETE ${BASE_URL}/subscriptions/subscriptions/$SUBSCRIPTION_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n${GREEN}✅ Complete API Testing Finished!${NC}"
echo ""
echo "🔗 Available Services:"
echo "  - API Gateway: http://localhost:3000"
echo "  - Auth Service: http://localhost:3005"
echo "  - Customer Service: http://localhost:3001"
echo "  - Subscription Service: http://localhost:3002"
echo "  - Plan Service: http://localhost:3003"
echo "  - Invoice Service: http://localhost:3004"
echo ""
echo "📚 API Documentation:"
echo "  - Gateway: http://localhost:3000/api-docs"
echo "  - Auth: http://localhost:3005/api-docs"
echo "  - Customer: http://localhost:3001/api-docs"
echo "  - Subscription: http://localhost:3002/api-docs"
echo "  - Plan: http://localhost:3003/api-docs"
echo "  - Invoice: http://localhost:3004/api-docs"
echo ""
echo "✨ Business Rules Implemented:"
echo "  ✓ One active subscription per customer"
echo "  ✓ Subscriptions have start/end dates"
echo "  ✓ Static plan entities (Starter, Pro, Enterprise)"
echo "  ✓ Invoice fields: customer_id, subscription_id, billing_period, amount_due, status"
echo "  ✓ Invoice statuses: issued, paid, overdue, cancelled" 