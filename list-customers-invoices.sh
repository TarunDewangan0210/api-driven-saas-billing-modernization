#!/bin/bash

echo "📋 Customer & Invoice Management Guide"
echo "====================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get JWT token
echo -e "${BLUE}🔐 Getting authentication token...${NC}"
TOKEN=$(curl -s -X POST http://localhost:3005/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@saas-billing.com","password":"admin123"}' | jq -r '.access_token')

echo -e "${GREEN}✓ Token obtained${NC}"

echo -e "\n${BLUE}👥 Listing all customers...${NC}"
CUSTOMERS=$(curl -s "http://localhost:3001/customers" -H "Authorization: Bearer $TOKEN")

echo "$CUSTOMERS" | jq '.'

echo -e "\n${BLUE}📊 Customer Invoice Summary${NC}"
echo "=============================="

# Extract customer IDs and names
CUSTOMER_IDS=$(echo "$CUSTOMERS" | jq -r '.customers[] | ."\(._id)|\(.name)"')

while IFS='|' read -r customer_id customer_name; do
    echo -e "\n${YELLOW}Customer: $customer_name (ID: $customer_id)${NC}"
    echo "----------------------------------------"
    
    # Get invoices for this customer
    INVOICES=$(curl -s "http://localhost:3004/customers/$customer_id/invoices" \
        -H "Authorization: Bearer $TOKEN")
    
    # Display invoice summary
    TOTAL_INVOICES=$(echo "$INVOICES" | jq -r '.pagination.total_items')
    TOTAL_AMOUNT=$(echo "$INVOICES" | jq -r '.summary.total_amount')
    PAID_AMOUNT=$(echo "$INVOICES" | jq -r '.summary.paid_amount')
    OUTSTANDING=$(echo "$INVOICES" | jq -r '.summary.outstanding_amount')
    
    echo "📄 Total Invoices: $TOTAL_INVOICES"
    echo "💰 Total Amount: \$$TOTAL_AMOUNT"
    echo "✅ Paid Amount: \$$PAID_AMOUNT"
    echo "⏳ Outstanding: \$$OUTSTANDING"
    
    # If there are invoices, show them
    if [ "$TOTAL_INVOICES" -gt 0 ]; then
        echo -e "\n📋 Detailed Invoices:"
        echo "$INVOICES" | jq -r '.invoices[] | "  • Invoice #\(.invoice_number) - \(.status) - $\(.total_amount) - \(.issued_date | split("T")[0])"'
    else
        echo "  No invoices found"
    fi
    
done <<< "$CUSTOMER_IDS"

echo -e "\n${GREEN}✅ Customer and Invoice listing complete!${NC}"

echo -e "\n${BLUE}📚 API Reference:${NC}"
echo "=================="
echo "List all customers:"
echo "  GET /customers"
echo ""
echo "Get customer invoices:"
echo "  GET /customers/{customer_id}/invoices"
echo ""
echo "Additional query parameters for invoices:"
echo "  ?status=paid|issued|overdue|cancelled"
echo "  ?page=1&limit=10"
echo ""
echo "Example usage:"
echo "  curl -H \"Authorization: Bearer \$TOKEN\" http://localhost:3001/customers"
echo "  curl -H \"Authorization: Bearer \$TOKEN\" http://localhost:3004/customers/{id}/invoices" 