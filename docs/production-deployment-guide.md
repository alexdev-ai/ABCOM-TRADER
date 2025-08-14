# SmartTrade AI Production Deployment Guide

**Target Domain**: forkcast.net  
**Backend**: Railway (api.forkcast.net)  
**Frontend**: Vercel (forkcast.net)  
**Database**: Railway PostgreSQL  
**Cache/Jobs**: Railway Redis  

---

## 🚀 Quick Start

Run the automated deployment script:
```bash
./scripts/deploy-production.sh
```

Or follow the manual steps below for detailed control.

---

## 📋 Prerequisites

### Required Tools
```bash
# Install Railway CLI
npm install -g @railway/cli

# Install Vercel CLI
npm install -g vercel

# Login to both platforms
railway login
vercel login
```

### Domain Requirements
- **forkcast.net** DNS access
- **api.forkcast.net** subdomain configuration

---

## 🔧 Step 1: Environment Variables Setup

### Railway Backend Variables
Set these in Railway dashboard or via CLI:

```bash
railway variables set NODE_ENV=production
railway variables set PORT=8000
railway variables set JWT_SECRET="your-super-secure-256-bit-jwt-secret"
railway variables set JWT_EXPIRES_IN="24h"
railway variables set JWT_REFRESH_EXPIRES_IN="7d"

# Alpaca Trading API
railway variables set ALPACA_API_KEY="your-alpaca-production-key"
railway variables set ALPACA_SECRET_KEY="your-alpaca-production-secret"
railway variables set ALPACA_BASE_URL="https://paper-api.alpaca.markets"
railway variables set ALPACA_DATA_URL="https://data.alpaca.markets"

# CORS and Security
railway variables set FRONTEND_URL="https://forkcast.net"
railway variables set CORS_ORIGINS="https://forkcast.net,https://www.forkcast.net"

# Rate Limiting
railway variables set RATE_LIMIT_WINDOW=900000
railway variables set RATE_LIMIT_MAX=100
railway variables set TRADING_RATE_LIMIT_MAX=10

# Security
railway variables set HELMET_CSP_ENABLED=true
railway variables set SESSION_COOKIE_SECURE=true

# Audit Trail
railway variables set AUDIT_SECRET_KEY="your-audit-trail-secret-key"

# Logging
railway variables set LOG_LEVEL="info"
```

### Vercel Frontend Variables
Set these in Vercel dashboard:

```bash
vercel env add VITE_API_URL production
# Enter: https://api.forkcast.net

vercel env add VITE_WS_URL production
# Enter: wss://api.forkcast.net

vercel env add VITE_APP_NAME production
# Enter: SmartTrade AI

vercel env add VITE_APP_VERSION production
# Enter: 1.0.0

vercel env add VITE_ENVIRONMENT production
# Enter: production
```

---

## 🚂 Step 2: Backend Deployment (Railway)

### Deploy Backend
```bash
# Navigate to project root
cd /path/to/forkcast

# Link to Railway project (first time only)
railway link

# Add services (first time only)
railway add --service postgresql
railway add --service redis

# Build and deploy
cd backend
npm ci --only=production
npm run build
cd ..

# Deploy to Railway
railway up --detach
```

### Database Migration
```bash
# Run Prisma migrations
railway run npx prisma migrate deploy
railway run npx prisma generate
```

### Custom Domain Configuration
1. Go to Railway dashboard
2. Select your backend service
3. Go to "Settings" > "Domains"
4. Add custom domain: `api.forkcast.net`
5. Update DNS records as instructed

---

## 🚀 Step 3: Frontend Deployment (Vercel)

### Deploy Frontend
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm ci

# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

### Custom Domain Configuration
1. Go to Vercel dashboard
2. Select your project
3. Go to "Settings" > "Domains"
4. Add custom domain: `forkcast.net`
5. Update DNS records as instructed

---

## 🌐 Step 4: DNS Configuration

Configure the following DNS records:

### Main Domain (forkcast.net)
```
Type: CNAME
Name: @
Target: cname.vercel-dns.com
```

### API Subdomain (api.forkcast.net)
```
Type: CNAME
Name: api
Target: [Railway provided CNAME]
```

### WWW Redirect (optional)
```
Type: CNAME
Name: www
Target: cname.vercel-dns.com
```

---

## 🏥 Step 5: Health Checks

### Backend Health Check
```bash
curl https://api.forkcast.net/api/v1/health
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

### Comprehensive System Check
```bash
curl https://api.forkcast.net/api/v1/health/system
```

### Frontend Check
```bash
curl https://forkcast.net
```

---

## 📊 Step 6: Monitoring Setup

### Railway Monitoring
1. Access Railway dashboard
2. Go to your backend service
3. Check "Metrics" tab for:
   - CPU usage
   - Memory usage
   - Request volume
   - Response times
   - Error rates

### Vercel Monitoring
1. Access Vercel dashboard
2. Go to your project
3. Check "Analytics" tab for:
   - Page views
   - Load times
   - Core Web Vitals
   - Error tracking

---

## 🔍 Step 7: Verification Checklist

### Backend Verification
- [ ] Health check endpoint responds (200 OK)
- [ ] Database connectivity confirmed
- [ ] Redis connectivity confirmed
- [ ] Trading system configured
- [ ] All API endpoints accessible
- [ ] WebSocket connections working
- [ ] Rate limiting active
- [ ] CORS configured properly

### Frontend Verification
- [ ] Main page loads successfully
- [ ] User registration works
- [ ] Login/logout functions
- [ ] Trading session creation
- [ ] Portfolio displays correctly
- [ ] Real-time updates via WebSocket
- [ ] Responsive design on mobile
- [ ] SSL certificate active

### End-to-End Testing
- [ ] Complete user registration flow
- [ ] Email verification (if implemented)
- [ ] Trading session lifecycle
- [ ] Portfolio updates
- [ ] Emergency stop functionality
- [ ] Risk management alerts
- [ ] Performance analytics

---

## 🚨 Troubleshooting

### Common Issues

#### Backend Issues
**Issue**: Database connection failed
```bash
# Check database status
railway status

# View logs
railway logs
```

**Issue**: Redis connection failed
```bash
# Check Redis service
railway redis status

# Test connection
railway run redis-cli ping
```

#### Frontend Issues
**Issue**: API calls failing
- Verify CORS configuration
- Check environment variables
- Confirm SSL certificates

**Issue**: WebSocket connection failed
- Check WSS protocol
- Verify Railway WebSocket support
- Test connection manually

#### Domain Issues
**Issue**: Domain not resolving
- Verify DNS propagation (can take 24-48 hours)
- Check DNS records configuration
- Use DNS propagation checker tools

### Rollback Procedure
If deployment fails:

```bash
# Backend rollback
railway rollback

# Frontend rollback
vercel rollback
```

---

## 📈 Performance Optimization

### Backend Optimization
- Monitor Railway metrics
- Optimize database queries
- Configure Redis caching
- Enable compression
- Set up CDN for static assets

### Frontend Optimization
- Verify Vercel edge caching
- Check bundle size
- Optimize images
- Enable service worker
- Monitor Core Web Vitals

---

## 🔒 Security Checklist

### Backend Security
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Rate limiting active
- [ ] Input validation enabled
- [ ] JWT tokens secure
- [ ] Database connections encrypted
- [ ] Audit logging active

### Frontend Security
- [ ] Content Security Policy set
- [ ] XSS protection enabled
- [ ] HTTPS enforced
- [ ] Secure cookie settings
- [ ] No sensitive data in client
- [ ] API keys not exposed

---

## 📝 Post-Deployment Tasks

### Immediate (Day 1)
1. Monitor error rates and performance
2. Test all critical user flows
3. Verify monitoring and alerting
4. Document any issues found
5. Update status page (if applicable)

### Short-term (Week 1)
1. Performance optimization
2. User feedback collection
3. Security audit
4. Backup verification
5. Disaster recovery testing

### Long-term (Month 1)
1. Usage analytics review
2. Scaling assessment
3. Cost optimization
4. Feature planning
5. Documentation updates

---

## 📞 Support Contacts

### Platform Support
- **Railway**: https://railway.app/help
- **Vercel**: https://vercel.com/support
- **Domain Provider**: Contact DNS provider support

### Emergency Procedures
1. Monitor Railway/Vercel status pages
2. Check error logs immediately
3. Implement rollback if necessary
4. Document incidents for review

---

## 🎯 Success Metrics

### Technical Metrics
- **Uptime**: 99.9% target
- **API Response Time**: <100ms 95th percentile
- **Frontend Load Time**: <2s initial load
- **WebSocket Latency**: <50ms
- **Error Rate**: <0.1%

### Business Metrics
- **User Registration**: Track conversion rates
- **Trading Sessions**: Monitor usage patterns
- **Revenue**: Track subscription/trading fees
- **Support Tickets**: Monitor user issues

---

**Deployment Complete! 🎉**

SmartTrade AI is now live at:
- **Frontend**: https://forkcast.net
- **Backend API**: https://api.forkcast.net
- **Health Check**: https://api.forkcast.net/api/v1/health

Remember to monitor the platform closely for the first 24-48 hours post-deployment.
