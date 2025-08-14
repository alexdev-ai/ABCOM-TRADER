import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const router = Router();
const prisma = new PrismaClient();

// Initialize Redis client for health check
let redis: Redis | null = null;
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL);
}

// Basic health check
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'SmartTrade AI Backend is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Database health check
router.get('/db', async (req: Request, res: Response) => {
  try {
    // Simple database connectivity test
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      success: true,
      message: 'Database connection healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNHEALTHY',
        message: 'Database connection failed',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Redis health check
router.get('/redis', async (req: Request, res: Response) => {
  try {
    if (!redis) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'REDIS_NOT_CONFIGURED',
          message: 'Redis is not configured',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Simple Redis connectivity test
    await redis.ping();
    
    res.status(200).json({
      success: true,
      message: 'Redis connection healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Redis health check failed:', error);
    res.status(503).json({
      success: false,
      error: {
        code: 'REDIS_UNHEALTHY',
        message: 'Redis connection failed',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Trading system health check
router.get('/trading', async (req: Request, res: Response) => {
  try {
    // Check if required environment variables are set
    const requiredEnvVars = [
      'ALPACA_API_KEY',
      'ALPACA_SECRET_KEY',
      'ALPACA_BASE_URL'
    ];

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length > 0) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'TRADING_CONFIG_INCOMPLETE',
          message: `Missing required environment variables: ${missingEnvVars.join(', ')}`,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check database for active trading sessions
    const activeSessions = await prisma.tradingSession.count({
      where: { status: 'active' }
    });

    res.status(200).json({
      success: true,
      message: 'Trading system healthy',
      data: {
        alpacaConfigured: true,
        activeSessions,
        environment: process.env.ALPACA_BASE_URL?.includes('paper') ? 'paper' : 'live'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Trading system health check failed:', error);
    res.status(503).json({
      success: false,
      error: {
        code: 'TRADING_SYSTEM_UNHEALTHY',
        message: 'Trading system health check failed',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Comprehensive system health check
router.get('/system', async (req: Request, res: Response) => {
  const healthChecks = {
    database: false,
    redis: false,
    trading: false,
    environment: process.env.NODE_ENV || 'development'
  };

  let overallHealthy = true;

  // Database check
  try {
    await prisma.$queryRaw`SELECT 1`;
    healthChecks.database = true;
  } catch (error) {
    console.error('System health - Database check failed:', error);
    overallHealthy = false;
  }

  // Redis check
  try {
    if (redis) {
      await redis.ping();
      healthChecks.redis = true;
    } else {
      overallHealthy = false;
    }
  } catch (error) {
    console.error('System health - Redis check failed:', error);
    overallHealthy = false;
  }

  // Trading system check
  try {
    const requiredEnvVars = ['ALPACA_API_KEY', 'ALPACA_SECRET_KEY', 'ALPACA_BASE_URL'];
    const hasAllEnvVars = requiredEnvVars.every(envVar => process.env[envVar]);
    healthChecks.trading = hasAllEnvVars;
    if (!hasAllEnvVars) {
      overallHealthy = false;
    }
  } catch (error) {
    console.error('System health - Trading check failed:', error);
    overallHealthy = false;
  }

  const statusCode = overallHealthy ? 200 : 503;
  
  res.status(statusCode).json({
    success: overallHealthy,
    message: overallHealthy ? 'All systems healthy' : 'Some systems unhealthy',
    data: healthChecks,
    timestamp: new Date().toISOString()
  });
});

export default router;
