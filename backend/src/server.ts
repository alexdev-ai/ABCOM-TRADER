import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { generalLimiter } from '@/middleware/rateLimiter.middleware';
import { websocketService } from '@/services/websocket.service';
import authRoutes from '@/routes/auth.routes';
import fundingRoutes from '@/routes/funding.routes';
import portfolioRoutes from './routes/portfolio.routes';
import tradingRoutes from '@/routes/trading.routes';
import sessionRoutes from '@/routes/session.routes';
import { profileRoutes } from '@/routes/profile.routes';
import onboardingRoutes from '@/routes/onboarding.routes';
import marketDataRoutes from '@/routes/marketData.routes';
import algorithmRoutes from '@/routes/algorithm.routes';
import decisionEngineRoutes from '@/routes/decisionEngine.routes';
import performanceMonitoringRoutes from '@/routes/performanceMonitoring.routes';
import performanceAnalyticsRoutes from './routes/performanceAnalytics.routes';
import tradeHistoryRoutes from './routes/tradeHistory.routes';
import sessionAnalyticsRoutes from './routes/sessionAnalytics.routes';
import portfolioOptimizationRoutes from './routes/portfolioOptimization.routes';
import tradingSessionRoutes from './routes/tradingSession.routes';
import riskRoutes from '@/routes/risk.routes';
import healthRoutes from '@/routes/health.routes';
import { sessionMonitorService } from '@/services/sessionMonitor.service';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply general rate limiting
app.use(generalLimiter);

// Health check endpoints
app.use('/api/v1/health', healthRoutes);

// Basic health check endpoint (Railway compatibility)
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SmartTrade AI Backend is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/funding', fundingRoutes);
app.use('/api/v1/portfolio', portfolioRoutes);
app.use('/api/v1/trading', tradingRoutes);
app.use('/api/v1/sessions', sessionRoutes);
app.use('/api/v1/onboarding', onboardingRoutes);
app.use('/api/v1/market-data', marketDataRoutes);
app.use('/api/v1/algorithm', algorithmRoutes);
app.use('/api/v1/decision-engine', decisionEngineRoutes);
app.use('/api/v1/performance', performanceMonitoringRoutes);
app.use('/api/v1/performance-analytics', performanceAnalyticsRoutes);
app.use('/api/v1/trade-history', tradeHistoryRoutes);
app.use('/api/v1/analytics', sessionAnalyticsRoutes);
app.use('/api/v1/portfolio-optimization', portfolioOptimizationRoutes);
app.use('/api/v1/trading/sessions', tradingSessionRoutes);
app.use('/api/v1/risk', riskRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    }
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  });
});

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket server with error handling
try {
  websocketService.initialize(server);
  console.log('✅ WebSocket service initialized successfully');
} catch (error) {
  console.error('⚠️ WebSocket service initialization failed:', error);
  console.log('📡 Server will continue without WebSocket support');
}

// Start server
server.listen(PORT, () => {
  console.log(`🚀 SmartTrade AI Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`📊 Health check (API): http://0.0.0.0:${PORT}/api/v1/health`);
  console.log(`🔐 Auth API: http://0.0.0.0:${PORT}/api/v1/auth`);
  console.log(`💰 Funding API: http://0.0.0.0:${PORT}/api/v1/funding`);
  console.log(`📈 Portfolio API: http://0.0.0.0:${PORT}/api/v1/portfolio`);
  console.log(`🔧 Portfolio Optimization API: http://0.0.0.0:${PORT}/api/v1/portfolio-optimization`);
  console.log(`📊 Trading API: http://0.0.0.0:${PORT}/api/v1/trading`);
  console.log(`🌐 WebSocket API: ws://0.0.0.0:${PORT}/ws`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('✅ Server is ready to accept connections');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  websocketService.shutdown();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  websocketService.shutdown();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
