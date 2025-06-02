# 🧪 **Postman Testing Guide for SaaS Billing System**

## 📋 **Table of Contents**
1. [Prerequisites](#prerequisites)
2. [Setup Steps](#setup-steps) 
3. [Authentication](#authentication)
4. [Testing Workflow](#testing-workflow)
5. [Advanced Testing](#advanced-testing)
6. [Troubleshooting](#troubleshooting)

---

## 🔧 **Prerequisites**

### **1. Install Postman**
- Download and install [Postman Desktop App](https://www.postman.com/downloads/)
- Create a free Postman account (optional but recommended)

### **2. Start the SaaS Billing System**
```bash
# Make sure Docker is running
docker --version

# Start all services
cd api-driven-saas-billing-modernization
docker-compose up -d

# Verify all services are running
docker-compose ps
```

### **3. Verify Services Health**
```bash
# Check all services are healthy
curl http://localhost:3000/health
curl http://localhost:3001/health  # Customer Service
curl http://localhost:3002/health  # Subscription Service
curl http://localhost:3003/health  # Plan Service
curl http://localhost:3004/health  # Invoice Service
curl http://localhost:3005/health  # Auth Service
```

---

## 🚀 **Setup Steps**

### **Step 1: Import Collection and Environment**

1. **Import the API Collection:**
   - Open Postman
   - Click **Import** button
   - Select **File** tab
   - Navigate to `postman/SaaS-Billing-API.postman_collection.json`
   - Click **Import**

2. **Import the Environment:**
   - Click **Import** again
   - Navigate to `postman/SaaS-Billing.postman_environment.json`
   - Click **Import**

3. **Select Environment:**
   - In top-right corner, select **"SaaS Billing Environment"** from dropdown

### **Step 2: Configure Environment Variables**

The environment is pre-configured with:
- `baseUrl`: http://localhost:3000/api (API Gateway)
- `directBaseUrl`: http://localhost (Direct service access)
- `planId`: plan_pro (Default Pro plan)
- `testEmail`: admin@saas-billing.com
- `testPassword`: admin123

---

## 🔐 **Authentication**

### **Step 1: Get Authentication Token**

1. **Navigate to** `Authentication → Login (Mock)`
2. **Body contains:**
   ```json
   {
     "email": "admin@saas-billing.com",
     "password": "admin123"
   }
   ```
3. **Click Send**
4. **✅ Expected Response:**
   ```json
   {
     "message": "Authentication successful",
     "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "user": {...}
   }
   ```
5. **Auto-Magic:** Token is automatically saved to `{{authToken}}` variable

### **Step 2: Verify Token** 
1. **Navigate to** `Authentication → Get Token Info`
2. **Click Send** (uses Bearer token automatically)
3. **✅ Expected Response:** User information

---

## 🧪 **Testing Workflow**

### **🏃‍♂️ Quick Start: Complete Flow Test**

**Run these requests in order:**

#### **1. Health Checks** 🏥
```
✅ Gateway Health Check
✅ Service Discovery  
✅ API Documentation
```

#### **2. Authentication** 🔐
```
✅ Login (Mock) - Gets your JWT token
✅ Get Token Info - Verifies token works
```

#### **3. Customer Management** 👥
```
✅ Create Customer - Creates test customer (saves customerId)
✅ Get All Customers - Lists all customers  
✅ Get Customer by ID - Gets specific customer
✅ Update Customer - Updates customer info
✅ Get Customer Stats - Customer metrics
```

#### **4. Plan Management** 📋
```
✅ Get All Plans - Lists available plans (saves planId)
✅ Get Plan by ID - Gets specific plan details
```

#### **5. Subscription Management** 📝
```
✅ Create Subscription - Creates subscription (saves subscriptionId)
✅ Get Subscription by ID - Gets subscription details
✅ Update Subscription - Modifies subscription
```

#### **6. Invoice Management** 💰
```
✅ Generate Invoice - Creates invoice (saves invoiceId)
✅ Get Invoice by ID - Gets specific invoice
✅ Get Customer Invoices - Lists customer's invoices
✅ Update Invoice Status - Marks invoice as paid
```

---

## 🎯 **Detailed Testing Instructions**

### **🔥 Recommended Testing Sequence**

#### **Phase 1: Basic Setup (5 minutes)**
1. **Login** → Get authentication token
2. **Get All Plans** → See available subscription plans
3. **Create Customer** → Create your test customer

#### **Phase 2: Core Business Logic (10 minutes)**
4. **Create Subscription** → Subscribe customer to Pro plan
5. **Generate Invoice** → Create invoice for subscription  
6. **Get Customer Invoices** → Verify invoice was created
7. **Update Invoice Status** → Mark invoice as "paid"

#### **Phase 3: Advanced Features (5 minutes)**
8. **Update Customer** → Change customer tier/info
9. **Get Customer Stats** → View customer metrics
10. **Update Subscription** → Change subscription plan

### **🔍 What to Look For**

#### **✅ Success Indicators:**
- All requests return 2xx status codes
- Response times under 500ms
- Proper JSON responses
- Automatic variable population (customerId, subscriptionId, etc.)
- Consistent data relationships

#### **❌ Error Indicators:**
- 4xx/5xx status codes
- Connection timeouts
- Empty responses
- Missing authentication tokens
- Data inconsistencies

---

## 🚨 **Advanced Testing**

### **🔄 Test Automation**

#### **1. Collection Runner:**
1. **Click** Collections → SaaS Billing System API → **▶️ Run**
2. **Select** all folders or specific folder 
3. **Set** iterations: 1 (for single run)
4. **Click** "Run SaaS Billing System API"
5. **View** results in test runner

#### **2. Test Scripts (Already Included):**
```javascript
// Automatic variable extraction
if (pm.response.code === 201) {
    const responseJson = pm.response.json();
    pm.environment.set('customerId', responseJson.customer._id);
}

// Response validation
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});
```

### **🎛️ Environment Management**

#### **Multiple Environments:**
1. **Development** (localhost:3000)
2. **Staging** (staging.yourapp.com)
3. **Production** (api.yourapp.com)

**To Create New Environment:**
1. **Click** Environments → **➕ Create Environment**
2. **Add variables:**
   - `baseUrl`: https://staging.yourapp.com/api
   - `authToken`: (empty initially)
3. **Switch environments** using dropdown

---

## 🛠️ **Troubleshooting**

### **🚨 Common Issues**

#### **1. Authentication Failures**
```
❌ Error: 401 Unauthorized
🔧 Solution: 
   - Run "Login (Mock)" request first
   - Check if authToken variable is set
   - Verify JWT token hasn't expired
```

#### **2. Service Connection Issues**
```
❌ Error: Connection refused / ECONNREFUSED
🔧 Solution:
   - Check Docker containers: docker-compose ps
   - Restart services: docker-compose restart
   - Verify ports: netstat -tulpn | grep :300
```

#### **3. Variable Not Set Errors**
```
❌ Error: Could not get any response 
🔧 Solution:
   - Check environment is selected (top-right dropdown)
   - Run prerequisite requests to populate variables
   - Manually set variables in Environment tab
```

#### **4. CORS Errors**
```
❌ Error: CORS policy error
🔧 Solution:
   - Use Postman Desktop app (not web version)
   - Check API Gateway CORS configuration
   - Verify request headers
```

### **🔧 Debug Steps**

#### **1. Check Service Health:**
```bash
# Test each service individually
curl http://localhost:3000/health  # API Gateway
curl http://localhost:3001/health  # Customer Service  
curl http://localhost:3002/health  # Subscription Service
curl http://localhost:3003/health  # Plan Service
curl http://localhost:3004/health  # Invoice Service
curl http://localhost:3005/health  # Auth Service
```

#### **2. Check Docker Logs:**
```bash
# View logs for specific service
docker-compose logs auth-service
docker-compose logs customer-service  
docker-compose logs subscription-service
docker-compose logs invoice-service
```

#### **3. Reset Environment:**
```bash
# Stop and remove containers
docker-compose down

# Rebuild and restart
docker-compose up --build -d

# Wait for services to be ready
sleep 30
```

---

## 📈 **Performance Testing**

### **Load Testing with Postman**

1. **Collection Runner Settings:**
   - Iterations: 100
   - Delay: 100ms
   - Keep variable values: ✅

2. **Monitor Response Times:**
   - Average response time < 200ms
   - 95th percentile < 500ms
   - No failed requests

3. **Resource Monitoring:**
```bash
# Monitor Docker resource usage
docker stats

# Monitor system resources
htop  # or Activity Monitor on Mac
```

---

## 🎯 **Success Metrics**

### **✅ Complete Test Suite Results:**
- **Total Requests:** 15-20
- **Success Rate:** 100%
- **Average Response Time:** < 200ms
- **Authentication:** ✅ Working
- **CRUD Operations:** ✅ All functional
- **Business Logic:** ✅ Enforced
- **Data Relationships:** ✅ Consistent

### **🎉 You'll Know It's Working When:**
1. All health checks return ✅ healthy
2. Authentication provides valid JWT token
3. Customer creation works with auto-ID generation
4. Subscription enforces business rules (one active per customer)
5. Invoice generation works with proper amounts
6. Status updates reflect across services
7. All responses are properly formatted JSON

---

## 📚 **Next Steps**

1. **🔧 Customize** requests for your specific use cases
2. **📝 Add** more test scenarios and edge cases  
3. **🤖 Automate** testing with CI/CD integration
4. **📊 Monitor** API performance and reliability
5. **🔍 Explore** advanced Postman features (Mock servers, API monitoring)

---

## 🆘 **Need Help?**

**📧 Common Solutions:**
- **Can't connect?** → Check Docker services are running
- **Authentication fails?** → Use the Login request first  
- **Variables empty?** → Run prerequisite requests in order
- **Slow responses?** → Check system resources and Docker logs

**🔗 Useful Commands:**
```bash
# Quick health check all services
curl -s http://localhost:3000/health && echo " ✅ Gateway OK"
curl -s http://localhost:3001/health && echo " ✅ Customer OK" 
curl -s http://localhost:3002/health && echo " ✅ Subscription OK"
curl -s http://localhost:3003/health && echo " ✅ Plan OK"
curl -s http://localhost:3004/health && echo " ✅ Invoice OK"
curl -s http://localhost:3005/health && echo " ✅ Auth OK"
```

---

**🚀 Happy Testing! Your SaaS billing system is ready for comprehensive API testing with Postman!** 