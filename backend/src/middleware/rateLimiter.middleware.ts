import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { AuditService } from '../services/audit.service';

// Helper function to get client IP
const getClientIP = (req: Request): string => {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown'
  );
};

// Registration rate limiter - 5 attempts per hour per IP
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 registration attempts per hour
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many registration attempts. Please try again in an hour.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req: Request, res: Response) => {
    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Log rate limit exceeded event
    await AuditService.logRateLimitExceeded('/api/v1/auth/register', clientIP, userAgent);
    
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many registration attempts. Please try again in an hour.'
      }
    });
  }
});

// Login rate limiter - 10 attempts per 15 minutes per IP
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 minutes
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts. Please try again in 15 minutes.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req: Request, res: Response) => {
    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Log rate limit exceeded event
    await AuditService.logRateLimitExceeded('/api/v1/auth/login', clientIP, userAgent);
    
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many login attempts. Please try again in 15 minutes.'
      }
    });
  }
});

// General API rate limiter - 100 requests per 15 minutes per IP
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req: Request, res: Response) => {
    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Log rate limit exceeded event
    await AuditService.logRateLimitExceeded(req.path, clientIP, userAgent);
    
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.'
      }
    });
  }
});
