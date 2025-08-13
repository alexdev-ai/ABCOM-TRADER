# SmartTrade AI - API Documentation

## 🚀 **Developer API Reference**

Welcome to the SmartTrade AI API - the most powerful algorithmic trading API designed for simplicity and institutional-grade performance.

---

## 📋 **API Overview**

### **Base URL**
```
Production: https://api.smarttrade.ai/v1
Sandbox:    https://api-sandbox.smarttrade.ai/v1
```

### **Authentication**
All API requests require authentication using JWT Bearer tokens:
```bash
Authorization: Bearer <your-jwt-token>
```

### **Rate Limits**
- **Standard**: 1,000 requests per hour
- **Premium**: 10,000 requests per hour  
- **Enterprise**: Unlimited requests

### **Response Format**
All responses are JSON formatted with consistent structure:
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Success message",
  "timestamp": "2025-01-13T20:30:00.000Z"
}
```

### **Error Handling**
Error responses follow standard HTTP status codes:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": { /* validation details */ }
  },
  "timestamp": "2025-01-13T20:30:00.000Z"
}
```

---

## 🔐 **Authentication Endpoints**

### **POST /auth/register**
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_1234567890",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "verified": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_string"
  }
}
```

### **POST /auth/login**
Authenticate user and receive access tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_1234567890",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_string",
    "expiresIn": 3600
  }
}
```

### **POST /auth/refresh**
Refresh expired access token.

**Request Body:**
```json
{
  "refreshToken": "refresh_token_string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "new_jwt_token",
    "expiresIn": 3600
  }
}
```

---

## 👤 **User Profile Endpoints**

### **GET /profile**
Get current user profile information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "usr_1234567890",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+1234567890",
    "verified": true,
    "accountBalance": 5000.00,
    "riskTolerance": "MODERATE",
    "tradingExperience": "INTERMEDIATE",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-13T20:30:00.000Z"
  }
}
```

### **PUT /profile**
Update user profile information.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "phoneNumber": "+1234567890",
  "riskTolerance": "AGGRESSIVE",
  "tradingExperience": "ADVANCED"
}
```

### **GET /profile/onboarding-status**
Get user onboarding completion status.

**Response:**
```json
{
  "success": true,
  "data": {
    "completed": true,
    "steps": {
      "basicInfo": true,
      "riskAssessment": true,
      "tradingExperience": true,
      "complianceAgreement": true
    },
    "completionPercentage": 100
  }
}
```

---

## 💼 **Portfolio Management Endpoints**

### **GET /portfolio**
Get user's current portfolio.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalValue": 50000.00,
    "cashBalance": 5000.00,
    "investedAmount": 45000.00,
    "dayChange": 250.00,
    "dayChangePercentage": 0.5,
    "totalReturn": 2500.00,
    "totalReturnPercentage": 5.56,
    "positions": [
      {
        "symbol": "AAPL",
        "quantity": 100,
        "averagePrice": 175.50,
        "currentPrice": 180.25,
        "marketValue": 18025.00,
        "unrealizedGain": 475.00,
        "unrealizedGainPercentage": 2.71
      }
    ]
  }
}
```

### **POST /portfolio/optimize**
Run portfolio optimization algorithm.

**Request Body:**
```json
{
  "algorithm": "MODERN_PORTFOLIO_THEORY", // MPT, RISK_PARITY, BLACK_LITTERMAN
  "riskTolerance": "MODERATE", // CONSERVATIVE, MODERATE, AGGRESSIVE
  "timeHorizon": "LONG_TERM", // SHORT_TERM, MEDIUM_TERM, LONG_TERM
  "constraints": {
    "maxPositionSize": 0.15,
    "minPositionSize": 0.02,
    "sectors": {
      "technology": {"max": 0.30, "min": 0.10},
      "healthcare": {"max": 0.20, "min": 0.05}
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "optimizationId": "opt_1234567890",
    "algorithm": "MODERN_PORTFOLIO_THEORY",
    "recommendations": [
      {
        "symbol": "AAPL",
        "currentWeight": 0.25,
        "recommendedWeight": 0.20,
        "action": "REDUCE",
        "amount": 2250.00
      }
    ],
    "expectedReturn": 0.08,
    "expectedRisk": 0.12,
    "sharpeRatio": 0.67,
    "efficientFrontier": [
      {"risk": 0.10, "return": 0.06},
      {"risk": 0.12, "return": 0.08},
      {"risk": 0.15, "return": 0.10}
    ]
  }
}
```

### **GET /portfolio/performance**
Get portfolio performance analytics.

**Query Parameters:**
- `period`: TIME_PERIOD (1D, 1W, 1M, 3M, 6M, 1Y, ALL)
- `metrics`: Comma-separated list (RETURNS, VOLATILITY, SHARPE, DRAWDOWN)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "1M",
    "totalReturn": 0.05,
    "annualizedReturn": 0.08,
    "volatility": 0.15,
    "sharpeRatio": 0.53,
    "maxDrawdown": 0.08,
    "winRate": 0.65,
    "profitFactor": 1.35,
    "grade": "B+",
    "gradeScore": 87,
    "benchmark": {
      "symbol": "SPY",
      "return": 0.04,
      "alpha": 0.01,
      "beta": 1.05
    },
    "timeSeries": [
      {"date": "2025-01-01", "value": 50000.00, "return": 0.00},
      {"date": "2025-01-02", "value": 50250.00, "return": 0.005}
    ]
  }
}
```

---

## 🎯 **Trading Session Endpoints**

### **POST /trading-sessions**
Create a new trading session.

**Request Body:**
```json
{
  "timeLimit": 120, // minutes
  "lossLimit": 500.00, // dollars
  "algorithm": "BALANCED", // CONSERVATIVE, BALANCED, AGGRESSIVE
  "initialBalance": 10000.00,
  "stopLoss": 0.05, // 5% stop loss
  "takeProfit": 0.10 // 10% take profit
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "ses_1234567890",
    "status": "ACTIVE",
    "timeLimit": 120,
    "lossLimit": 500.00,
    "algorithm": "BALANCED",
    "initialBalance": 10000.00,
    "currentBalance": 10000.00,
    "startTime": "2025-01-13T20:30:00.000Z",
    "endTime": "2025-01-13T22:30:00.000Z",
    "timeRemaining": 7200 // seconds
  }
}
```

### **GET /trading-sessions/{sessionId}**
Get trading session details.

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "ses_1234567890",
    "status": "ACTIVE",
    "timeLimit": 120,
    "lossLimit": 500.00,
    "currentBalance": 10150.00,
    "unrealizedPnL": 75.00,
    "realizedPnL": 150.00,
    "tradesExecuted": 5,
    "winRate": 0.80,
    "timeRemaining": 3600,
    "riskLevel": "LOW",
    "trades": [
      {
        "tradeId": "trd_1234567890",
        "symbol": "AAPL",
        "side": "BUY",
        "quantity": 10,
        "price": 180.25,
        "timestamp": "2025-01-13T20:35:00.000Z",
        "pnl": 25.00
      }
    ]
  }
}
```

### **POST /trading-sessions/{sessionId}/stop**
Stop an active trading session.

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "ses_1234567890",
    "status": "COMPLETED",
    "finalBalance": 10250.00,
    "totalPnL": 250.00,
    "totalReturn": 0.025,
    "tradesExecuted": 8,
    "winRate": 0.75,
    "grade": "A-",
    "gradeScore": 88
  }
}
```

### **GET /trading-sessions**
Get user's trading session history.

**Query Parameters:**
- `status`: SESSION_STATUS (ACTIVE, COMPLETED, EXPIRED, STOPPED)
- `limit`: Number of sessions to return (default: 20, max: 100)
- `offset`: Number of sessions to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "sessionId": "ses_1234567890",
        "status": "COMPLETED",
        "startTime": "2025-01-13T18:30:00.000Z",
        "endTime": "2025-01-13T20:30:00.000Z",
        "finalPnL": 250.00,
        "grade": "A-"
      }
    ],
    "pagination": {
      "total": 45,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

## 📊 **Analytics Endpoints**

### **GET /analytics/performance**
Get comprehensive performance analytics.

**Query Parameters:**
- `period`: TIME_PERIOD (1D, 1W, 1M, 3M, 6M, 1Y, ALL)
- `includeComparison`: Boolean (default: false)

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalSessions": 25,
      "successfulSessions": 18,
      "successRate": 0.72,
      "totalPnL": 1250.00,
      "averageSessionPnL": 50.00,
      "bestSession": 350.00,
      "worstSession": -125.00,
      "grade": "B+",
      "gradeHistory": ["B", "B+", "A-", "B+"]
    },
    "timing": {
      "bestHour": "10:00-11:00",
      "worstHour": "15:00-16:00",
      "bestDay": "Tuesday",
      "worstDay": "Friday",
      "recommendations": [
        "Trade more during Tuesday mornings for 34% better performance",
        "Avoid Friday afternoons - 23% lower success rate"
      ]
    },
    "predictions": {
      "nextSessionSuccessProbability": 0.76,
      "recommendedSessionLength": 90,
      "optimalLossLimit": 45.00
    }
  }
}
```

### **GET /analytics/comparison**
Compare performance against benchmarks.

**Response:**
```json
{
  "success": true,
  "data": {
    "userPerformance": {
      "return": 0.08,
      "volatility": 0.15,
      "sharpeRatio": 0.53,
      "maxDrawdown": 0.08
    },
    "benchmarks": {
      "spy": {
        "return": 0.06,
        "volatility": 0.18,
        "sharpeRatio": 0.33
      },
      "smartTradeAIAverage": {
        "return": 0.07,
        "volatility": 0.16,
        "sharpeRatio": 0.44
      }
    },
    "ranking": {
      "percentile": 75,
      "totalUsers": 5000,
      "yourRank": 1250
    }
  }
}
```

---

## 🔄 **WebSocket Real-Time API**

### **Connection**
```javascript
const ws = new WebSocket('wss://api.smarttrade.ai/v1/ws');

// Authentication after connection
ws.send(JSON.stringify({
  type: 'auth',
  token: 'your-jwt-token'
}));
```

### **Subscribe to Session Updates**
```javascript
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'session',
  sessionId: 'ses_1234567890'
}));
```

### **Real-Time Messages**
```javascript
// Session updates
{
  "type": "session_update",
  "sessionId": "ses_1234567890",
  "data": {
    "currentBalance": 10150.00,
    "unrealizedPnL": 75.00,
    "timeRemaining": 3540,
    "riskLevel": "LOW"
  }
}

// Trade execution
{
  "type": "trade_executed",
  "sessionId": "ses_1234567890",
  "data": {
    "tradeId": "trd_1234567890",
    "symbol": "AAPL",
    "side": "BUY",
    "quantity": 10,
    "price": 180.25,
    "pnl": 25.00
  }
}

// Risk alerts
{
  "type": "risk_alert",
  "sessionId": "ses_1234567890",
  "data": {
    "level": "WARNING",
    "message": "Loss limit 80% reached - consider reducing position size",
    "lossLimitUsed": 0.80
  }
}
```

---

## 💰 **Funding Endpoints**

### **GET /funding/accounts**
Get connected funding accounts.

**Response:**
```json
{
  "success": true,
  "data": {
    "accounts": [
      {
        "accountId": "acc_1234567890",
        "institutionName": "Chase Bank",
        "accountType": "CHECKING",
        "accountNumber": "****1234",
        "isVerified": true,
        "balance": 25000.00
      }
    ]
  }
}
```

### **POST /funding/deposit**
Initiate a deposit transaction.

**Request Body:**
```json
{
  "accountId": "acc_1234567890",
  "amount": 1000.00,
  "description": "Portfolio funding"
}
```

### **POST /funding/withdraw**
Initiate a withdrawal transaction.

**Request Body:**
```json
{
  "accountId": "acc_1234567890",
  "amount": 500.00,
  "description": "Profit withdrawal"
}
```

---

## 🤖 **Algorithm Endpoints**

### **GET /algorithms**
Get available trading algorithms.

**Response:**
```json
{
  "success": true,
  "data": {
    "algorithms": [
      {
        "id": "conservative",
        "name": "Conservative Growth",
        "description": "Low-risk algorithm focusing on capital preservation",
        "riskLevel": "LOW",
        "expectedReturn": 0.06,
        "maxDrawdown": 0.05
      },
      {
        "id": "balanced",
        "name": "Balanced Strategy",
        "description": "Moderate risk with balanced growth potential",
        "riskLevel": "MODERATE",
        "expectedReturn": 0.08,
        "maxDrawdown": 0.08
      },
      {
        "id": "aggressive",
        "name": "Growth Focused",
        "description": "Higher risk for maximum growth potential",
        "riskLevel": "HIGH",
        "expectedReturn": 0.12,
        "maxDrawdown": 0.15
      }
    ]
  }
}
```

### **GET /algorithms/{algorithmId}/performance**
Get historical performance of specific algorithm.

**Response:**
```json
{
  "success": true,
  "data": {
    "algorithmId": "balanced",
    "performance": {
      "totalReturn": 0.08,
      "annualizedReturn": 0.09,
      "volatility": 0.14,
      "sharpeRatio": 0.64,
      "maxDrawdown": 0.07,
      "winRate": 0.68
    },
    "monthlyReturns": [
      {"month": "2024-12", "return": 0.012},
      {"month": "2025-01", "return": 0.008}
    ]
  }
}
```

---

## 📈 **Market Data Endpoints**

### **GET /market-data/quote/{symbol}**
Get real-time quote for a symbol.

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "price": 180.25,
    "change": 2.50,
    "changePercent": 1.41,
    "volume": 45678900,
    "bid": 180.24,
    "ask": 180.26,
    "high": 182.50,
    "low": 178.00,
    "open": 179.50,
    "previousClose": 177.75,
    "timestamp": "2025-01-13T20:30:00.000Z"
  }
}
```

### **GET /market-data/history/{symbol}**
Get historical price data.

**Query Parameters:**
- `period`: TIME_PERIOD (1D, 1W, 1M, 3M, 6M, 1Y, 5Y)
- `interval`: INTERVAL (1m, 5m, 15m, 1h, 1d)

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "period": "1M",
    "interval": "1d",
    "prices": [
      {
        "date": "2025-01-01",
        "open": 175.00,
        "high": 178.50,
        "low": 174.25,
        "close": 177.75,
        "volume": 52345678
      }
    ]
  }
}
```

---

## 📊 **Risk Management Endpoints**

### **GET /risk/assessment**
Get current risk assessment.

**Response:**
```json
{
  "success": true,
  "data": {
    "riskScore": 65,
    "riskLevel": "MODERATE",
    "factors": {
      "portfolioConcentration": "MEDIUM",
      "volatility": "MODERATE",
      "correlations": "LOW",
      "timeHorizon": "LONG_TERM"
    },
    "recommendations": [
      "Consider diversifying technology holdings",
      "Your risk level is appropriate for your profile"
    ],
    "limits": {
      "maxPositionSize": 0.15,
      "maxSectorExposure": 0.30,
      "maxDrawdown": 0.10
    }
  }
}
```

### **POST /risk/stress-test**
Run stress test scenarios.

**Request Body:**
```json
{
  "scenarios": ["MARKET_CRASH", "INFLATION_SPIKE", "RECESSION"],
  "timeHorizon": "1Y"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "scenarios": [
      {
        "name": "MARKET_CRASH",
        "description": "30% market decline over 6 months",
        "portfolioImpact": -0.25,
        "recoveryTime": "18 months",
        "recommendations": ["Increase cash allocation", "Add defensive positions"]
      }
    ]
  }
}
```

---

## 📝 **Error Codes Reference**

### **Authentication Errors (4xx)**
- `AUTH_REQUIRED` (401): Authentication token required
- `AUTH_INVALID` (401): Invalid or expired token
- `AUTH_INSUFFICIENT` (403): Insufficient permissions
- `RATE_LIMIT_EXCEEDED` (429): Too many requests

### **Validation Errors (4xx)**
- `VALIDATION_ERROR` (400): Invalid input parameters
- `MISSING_REQUIRED_FIELD` (400): Required field missing
- `INVALID_FORMAT` (400): Invalid data format
- `OUT_OF_RANGE` (400): Value outside allowed range

### **Business Logic Errors (4xx)**
- `INSUFFICIENT_BALANCE` (400): Not enough account balance
- `SESSION_NOT_ACTIVE` (400): Trading session not active
- `MAX_SESSIONS_EXCEEDED` (400): Too many active sessions
- `POSITION_LIMIT_EXCEEDED` (400): Position size too large

### **Server Errors (5xx)**
- `INTERNAL_ERROR` (500): Internal server error
- `SERVICE_UNAVAILABLE` (503): Service temporarily unavailable
- `ALGORITHM_ERROR` (500): Algorithm processing error
- `DATA_PROVIDER_ERROR` (502): Market data provider error

---

## 🔗 **SDK Examples**

### **JavaScript/Node.js**
```javascript
const SmartTradeAPI = require('@smarttrade/api-client');

const client = new SmartTradeAPI({
  apiKey: 'your-api-key',
  environment: 'production' // or 'sandbox'
});

// Create trading session
const session = await client.tradingSessions.create({
  timeLimit: 120,
  lossLimit: 500,
  algorithm: 'BALANCED'
});

// Subscribe to real-time updates
client.ws.on('session_update', (data) => {
  console.log('Session update:', data);
});
```

### **Python**
```python
from smarttrade import SmartTradeClient

client = SmartTradeClient(
    api_key='your-api-key',
    environment='production'
)

# Get portfolio
portfolio = client.portfolio.get()
print(f"Total value: ${portfolio.total_value}")

# Run optimization
optimization = client.portfolio.optimize(
    algorithm='MODERN_PORTFOLIO_THEORY',
    risk_tolerance='MODERATE'
)
```

### **cURL Examples**
```bash
# Get user profile
curl -X GET https://api.smarttrade.ai/v1/profile \
  -H "Authorization: Bearer your-jwt-token"

# Create trading session
curl -X POST https://api.smarttrade.ai/v1/trading-sessions \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "timeLimit": 120,
    "lossLimit": 500,
    "algorithm": "BALANCED"
  }'
```

---

## 📚 **Additional Resources**

### **Interactive API Explorer**
- **Sandbox Environment**: https://api-sandbox.smarttrade.ai/docs
- **Postman Collection**: Available for download
- **OpenAPI Specification**: Full schema documentation

### **Developer Support**
- **Documentation**: https://docs.smarttrade.ai
- **Community Forum**: https://community.smarttrade.ai
- **Email Support**: developers@smarttrade.ai
- **Discord**: https://discord.gg/smarttrade-developers

### **Status & Updates**
- **API Status**: https://status.smarttrade.ai
- **Changelog**: https://docs.smarttrade.ai/changelog
- **Breaking Changes**: 30-day advance notice
- **Deprecation Policy**: 12-month sunset period

**API Version**: v1.0.0  
**Last Updated**: January 13, 2025  
**Documentation Status**: ✅ **COMPLETE & PRODUCTION-READY**
