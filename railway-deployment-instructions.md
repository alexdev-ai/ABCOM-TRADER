# Railway Deployment Instructions for forkcast-api

## 🎯 Current Status
✅ Railway project `forkcast-api` created  
✅ PostgreSQL database running  
✅ Redis cache running  
❌ ABCOM-TRADER app (needs environment variables)  

## 🔧 Next Steps: Configure Environment Variables

### Step 1: Access ABCOM-TRADER Service
1. In Railway dashboard, click on the **ABCOM-TRADER** service (the one that failed)
2. Click on the **"Variables"** tab

### Step 2: Add Environment Variables
Copy each variable from `railway-env-variables.txt` and add them one by one:

**Quick Reference - Add these variables:**
```
NODE_ENV=production
PORT=8000
JWT_SECRET=38ee2fcf5ff1bd0ae2a6e4ceee854144aa8bbe81324b9cdadc15a89c08985fd5
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=https://forkcast.net
CORS_ORIGINS=https://forkcast.net,https://www.forkcast.net
ALPACA_API_KEY=PKKKBYLMQC2N95BTGDLA
ALPACA_SECRET_KEY=F9ewT1QSw92BK0FaycvRUa4D3300b5Ue6zSvzlCf
ALPACA_BASE_URL=https://paper-api.alpaca.markets
ALPACA_DATA_URL=https://data.alpaca.markets
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
TRADING_RATE_LIMIT_MAX=10
HELMET_CSP_ENABLED=true
SESSION_COOKIE_SECURE=true
AUDIT_SECRET_KEY=ab224595f20d10db4e8b45c150aedbb18312de1013c5e4319f26941ebf82fa45
LOG_LEVEL=info
WS_HEARTBEAT_INTERVAL=30000
WS_MAX_CONNECTIONS_PER_USER=3
JOB_CONCURRENCY=5
JOB_ATTEMPTS=3
```

### Step 3: How to Add Each Variable
For each variable above:
1. Click **"New Variable"** in Railway
2. Enter the **variable name** (e.g., `NODE_ENV`)
3. Enter the **value** (e.g., `production`)
4. Click **"Add"**
5. Repeat for all variables

### Step 4: Automatic Redeploy
After adding all variables, Railway will automatically redeploy your application.

### Step 5: Monitor Deployment
1. Watch the deployment logs in Railway
2. Wait for successful deployment (should take 2-3 minutes)
3. Check that all services show green status

## 🏥 Step 6: Verify Deployment

### Test Basic Health Check
Once deployed, Railway will provide a URL like:
`https://abcom-trader-production-xxxx.up.railway.app`

Test the health endpoint:
```
https://your-railway-url/api/v1/health
```

Expected response:
```json
{
  "success": true,
  "message": "SmartTrade AI Backend is running",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "environment": "production"
}
```

### Test System Health Check
```
https://your-railway-url/api/v1/health/system
```

This should show all systems (database, redis, trading) as healthy.

## 🚨 If Deployment Fails

### Common Issues:
1. **Missing environment variables**: Double-check all variables are added
2. **Database migration needed**: Run `railway run npx prisma migrate deploy`
3. **Build errors**: Check the deployment logs for specific errors
4. **Monorepo build issues**: Ensure Railway is configured for backend folder only

### ✅ FIXED: Monorepo Configuration Issue
I've updated your configuration files to fix the build failure:
- **Updated `railway.toml`**: Now properly targets backend folder
- **Created `backend/nixpacks.toml`**: Explicit build instructions for Railway
- **Fixed build process**: Railway will now build only the backend application

### Debug Commands:
```bash
# View logs
railway logs

# Run database migrations
railway run npx prisma migrate deploy

# Test database connection  
railway run npx prisma db ping
```

## 🎯 Next Steps After Successful Deployment

1. **Custom Domain**: Add `api.forkcast.net` to Railway
2. **Database Migration**: Run Prisma migrations
3. **Frontend Deployment**: Deploy to Vercel
4. **End-to-End Testing**: Test complete user flows

## ✅ Success Indicators

Your deployment is successful when:
- ✅ ABCOM-TRADER service shows "Running" status
- ✅ Health check endpoint returns 200 OK
- ✅ System health check shows all services healthy
- ✅ No errors in deployment logs

**Ready to configure Railway environment variables!** 🚀
