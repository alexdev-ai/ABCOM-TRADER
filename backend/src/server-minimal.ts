import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

console.log('🚀 SmartTrade AI Backend - ULTRA MINIMAL MODE');
console.log('📊 Environment Variables Check:');
console.log('  DATABASE_URL:', process.env.DATABASE_URL ? 'SET (length: ' + process.env.DATABASE_URL.length + ')' : 'MISSING');
console.log('  REDIS_URL:', process.env.REDIS_URL ? 'SET (length: ' + process.env.REDIS_URL.length + ')' : 'MISSING');
console.log('  NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('  PORT:', process.env.PORT || 'default');

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

// Basic health check endpoint (Railway compatibility)
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SmartTrade AI Backend is running - MINIMAL MODE',
    timestamp: new Date().toISOString(),
    version: '1.0.0-minimal',
    environment: process.env.NODE_ENV || 'development',
    database: process.env.DATABASE_URL ? 'configured' : 'missing',
    redis: process.env.REDIS_URL ? 'configured' : 'missing'
  });
});

// API health check
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SmartTrade AI Backend API - MINIMAL MODE',
    timestamp: new Date().toISOString(),
    version: '1.0.0-minimal',
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: process.env.DATABASE_URL ? 'configured' : 'missing',
      redis: process.env.REDIS_URL ? 'configured' : 'missing',
      alpaca: {
        api_key: process.env.ALPACA_API_KEY ? 'configured' : 'missing',
        secret_key: process.env.ALPACA_SECRET_KEY ? 'configured' : 'missing',
        base_url: process.env.ALPACA_BASE_URL || 'not-set'
      }
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found - MINIMAL MODE ACTIVE'
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

// Start server
server.listen(PORT, () => {
  console.log(`🚀 SmartTrade AI Backend running on port ${PORT} - MINIMAL MODE`);
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`📊 Health check (API): http://0.0.0.0:${PORT}/api/v1/health`);
  console.log('✅ Server is ready to accept connections - MINIMAL MODE');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
