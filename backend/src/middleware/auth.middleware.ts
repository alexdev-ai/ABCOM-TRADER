import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@/services/auth.service';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

/**
 * Authentication middleware to protect routes
 * Validates JWT token and adds user info to request
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization token is required'
        }
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = AuthService.verifyToken(token);
    
    // Add user info to request
    req.user = {
      userId: decoded.userId,
      email: (decoded as any).email || ''
    };

    next();
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed'
      }
    });
    return;
  }
};

/**
 * Optional authentication middleware
 * Adds user info to request if token is valid, but doesn't block request
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = AuthService.verifyToken(token);
        req.user = {
          userId: decoded.userId,
          email: (decoded as any).email || ''
        };
      } catch (error) {
        // Token invalid but we don't block the request
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};
