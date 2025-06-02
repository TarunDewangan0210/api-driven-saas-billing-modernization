#!/bin/bash

echo "🧪 Postman Workflow Demonstration"
echo "================================="
echo "This script demonstrates the same API calls you'll make in Postman"
echo

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to make API calls with better formatting
make_request() {
    local method=$1
    local url=$2
    local data=$3
    local description=$4
    
    echo -e "${BLUE}📡 ${description}${NC}"
    echo "   ${method} ${url}"
    
    if [ -n "$data" ]; then
        echo "   Data: ${data}"
    fi
    
    if [ "$method" = "GET" ]; then
        if [ -n "$TOKEN" ]; then
            response=$(curl -s -H "Authorization: Bearer $TOKEN" "$url")
        else
            response=$(curl -s "$url")
        fi
    elif [ "$method" = "POST" ]; then
        if [ -n "$TOKEN" ]; then
            response=$(curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d "$data" "$url")
        else
            response=$(curl -s -X POST -H "Content-Type: application/json" -d "$data" "$url")
        fi
    fi
    
    echo "   Response: $response" | jq '.' 2>/dev/null || echo "   Response: $response"
    echo
    
    # Extract values for chaining requests
    if [[ "$description" == *"Login"* ]]; then
        TOKEN=$(echo "$response" | jq -r '.access_token' 2>/dev/null)
        echo -e "${GREEN}   ✅ Token extracted: ${TOKEN:0:20}...${NC}"
    elif [[ "$description" == *"Create Customer"* ]]; then
        CUSTOMER_ID=$(echo "$response" | jq -r '.customer._id' 2>/dev/null)
        echo -e "${GREEN}   ✅ Customer ID extracted: $CUSTOMER_ID${NC}"
    elif [[ "$description" == *"Create Subscription"* ]]; then
        SUBSCRIPTION_ID=$(echo "$response" | jq -r '.subscription._id' 2>/dev/null)
        echo -e "${GREEN}   ✅ Subscription ID extracted: $SUBSCRIPTION_ID${NC}"
    elif [[ "$description" == *"Generate Invoice"* ]]; then
        INVOICE_ID=$(echo "$response" | jq -r '.invoice._id' 2>/dev/null)
        echo -e "${GREEN}   ✅ Invoice ID extracted: $INVOICE_ID${NC}"
    fi
    
    echo "----------------------------------------"
    sleep 1
}

echo -e "${YELLOW}Phase 1: Authentication & Setup${NC}"
echo

# 1. Login to get token
make_request "POST" "http://localhost:3005/login" '{"email":"admin@saas-billing.com","password":"admin123"}' "🔐 Login (Get JWT Token)"

# 2. Get available plans
make_request "GET" "http://localhost:3003/plans" "" "📋 Get Available Plans"

echo -e "${YELLOW}Phase 2: Customer Management${NC}"
echo

# 3. Create a customer
make_request "POST" "http://localhost:3001/customers" '{"name":"Postman Test Corp","email":"test@postman.com","company":"Postman Testing Inc","status":"active"}' "👥 Create Customer"

# 4. Get all customers
make_request "GET" "http://localhost:3001/customers" "" "👥 Get All Customers"

echo -e "${YELLOW}Phase 3: Subscription & Billing${NC}"
echo

# 5. Create subscription (if customer ID was extracted)
if [ -n "$CUSTOMER_ID" ]; then
    make_request "POST" "http://localhost:3002/subscriptions" "{\"customer_id\":\"$CUSTOMER_ID\",\"plan_id\":\"plan_pro\",\"billing_cycle\":\"monthly\"}" "📝 Create Subscription"
else
    echo -e "${RED}❌ Skipping subscription creation - no customer ID${NC}"
fi

# 6. Generate invoice (if subscription ID was extracted)
if [ -n "$SUBSCRIPTION_ID" ]; then
    make_request "POST" "http://localhost:3004/invoices" "{\"subscription_id\":\"$SUBSCRIPTION_ID\",\"billing_period_start\":\"2025-05-01\",\"billing_period_end\":\"2025-06-01\"}" "💰 Generate Invoice"
else
    echo -e "${RED}❌ Skipping invoice creation - no subscription ID${NC}"
fi

# 7. Get customer invoices
if [ -n "$CUSTOMER_ID" ]; then
    make_request "GET" "http://localhost:3004/customers/$CUSTOMER_ID/invoices" "" "💰 Get Customer Invoices"
fi

echo -e "${GREEN}🎉 Postman Workflow Demo Complete!${NC}"
echo
echo -e "${BLUE}📚 What You Just Saw:${NC}"
echo "1. ✅ Authentication with JWT token"
echo "2. ✅ Customer creation and management"
echo "3. ✅ Subscription creation with business rules"
echo "4. ✅ Invoice generation and retrieval"
echo "5. ✅ Cross-service data relationships"
echo
echo -e "${YELLOW}🚀 Now try the same workflow in Postman!${NC}"
echo "   1. Import the collection: postman/SaaS-Billing-API.postman_collection.json"
echo "   2. Import the environment: postman/SaaS-Billing.postman_environment.json"
echo "   3. Follow the POSTMAN_TESTING_GUIDE.md"
echo
echo -e "${BLUE}🔗 Quick Start in Postman:${NC}"
echo "   • Run 'Authentication → Login (Mock)' first"
echo "   • Then run requests in any order you want"
echo "   • Variables are auto-populated between requests"
echo "   • Use Collection Runner for automated testing" 