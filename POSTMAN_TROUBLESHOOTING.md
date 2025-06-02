# 🔧 **Postman Troubleshooting Guide**

## 🚨 **Common Errors & Solutions**

### **Error 1: "Missing initializer in const declaration"**

#### **❌ Problem:**
```
There was an error in evaluating the Pre-request Script:
SyntaxError: Missing initializer in const declaration
```

#### **✅ Solution:**
This error was caused by a malformed JavaScript in the collection's Pre-request Script. **Fixed in latest version!**

**What we fixed:**
1. **Removed problematic const declaration** from pre-request script
2. **Simplified authentication approach** - now just run Login request manually
3. **Fixed login URL** to use direct auth service: `http://localhost:3005/login`

**How to avoid:**
- Always re-import the latest collection files
- Use the Login request to get your token (it auto-saves to `{{authToken}}`)

---

### **Error 2: Authentication Failures**

#### **❌ Problem:**
```
401 Unauthorized
Authentication required
```

#### **✅ Solution:**
**Step 1:** Run the Login request first
1. Go to `Authentication → Login (Mock)`
2. Click **Send**
3. Verify you get `access_token` in response
4. Token is automatically saved to `{{authToken}}`

**Step 2:** Verify token is set
1. Click **Environment** tab (top right)
2. Check `authToken` has a value
3. If empty, re-run Login request

---

### **Error 3: Connection Refused**

#### **❌ Problem:**
```
Error: connect ECONNREFUSED 127.0.0.1:3000
Could not get any response
```

#### **✅ Solution:**
**Check services are running:**
```bash
# Check Docker containers
docker-compose ps

# Should show all services as "running"
```

**Restart if needed:**
```bash
# Restart all services
docker-compose restart

# Or rebuild if there are issues
docker-compose down
docker-compose up --build -d
```

---

### **Error 4: Variables Not Working**

#### **❌ Problem:**
```
{{customerId}} shows as raw text
Variables not being replaced
```

#### **✅ Solution:**
1. **Check environment is selected:**
   - Top-right dropdown should show "SaaS Billing Environment"
   
2. **Run prerequisite requests:**
   - Login → Gets `{{authToken}}`
   - Create Customer → Gets `{{customerId}}`
   - Create Subscription → Gets `{{subscriptionId}}`

3. **Manually set variables if needed:**
   - Click Environment tab
   - Edit variables directly

---

### **Error 5: CORS Policy Error**

#### **❌ Problem:**
```
Access to fetch blocked by CORS policy
```

#### **✅ Solution:**
- **Use Postman Desktop App** (not web version)
- Web version has CORS restrictions that desktop doesn't

---

## 🔍 **Debugging Steps**

### **Step 1: Health Check**
```bash
# Test each service
curl http://localhost:3000/health  # API Gateway
curl http://localhost:3001/health  # Customer Service
curl http://localhost:3002/health  # Subscription Service
curl http://localhost:3003/health  # Plan Service
curl http://localhost:3004/health  # Invoice Service
curl http://localhost:3005/health  # Auth Service
```

### **Step 2: Test Authentication**
```bash
# Get token manually
TOKEN=$(curl -s -X POST "http://localhost:3005/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@saas-billing.com","password":"admin123"}' | \
  jq -r '.access_token')

echo "Token: $TOKEN"
```

### **Step 3: Test API Endpoints**
```bash
# Test customer endpoint
curl -s "http://localhost:3001/customers" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

---

## 🛠️ **Quick Fixes**

### **Reset Everything:**
```bash
# Stop services
docker-compose down

# Clear Postman variables
# Go to Environment → Clear all values

# Restart services
docker-compose up -d

# Wait for startup
sleep 30

# Re-import collection (if needed)
```

### **Manual Token Setup:**
If automatic token saving isn't working:

1. **Run Login request**
2. **Copy the access_token from response**
3. **Go to Environment tab**
4. **Paste token into authToken variable**

---

## ✅ **Working Examples**

### **1. Successful Login Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 86400,
  "user": {
    "id": "user_admin",
    "email": "admin@saas-billing.com",
    "role": "admin"
  }
}
```

### **2. Environment Variables Should Look Like:**
```
authToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
customerId: zic96oee8ki
subscriptionId: selvf96pop
planId: plan_pro
invoiceId: 9mxmo34j0el
```

### **3. Successful API Call:**
```
Status: 200 OK
Response Time: < 500ms
Headers: Content-Type: application/json
Body: Valid JSON with expected data
```

---

## 📞 **Still Having Issues?**

### **Check These Files:**
- ✅ **Collection:** `postman/SaaS-Billing-API.postman_collection.json`
- ✅ **Environment:** `postman/SaaS-Billing.postman_environment.json`
- ✅ **Guide:** `POSTMAN_TESTING_GUIDE.md`

### **Test Script to Verify Everything:**
```bash
# Run this to verify your setup
./test-postman-workflow.sh
```

### **Common Working Sequence:**
1. **Import** both collection and environment
2. **Select** "SaaS Billing Environment"
3. **Run** "Authentication → Login (Mock)"
4. **Verify** token is saved automatically
5. **Run** any other requests (they'll use the token)

---

**🎉 The syntax error has been fixed! Re-import the collection and try again.** 