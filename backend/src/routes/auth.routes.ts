import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { AuditService } from '../services/audit.service';
import { validateSchema, sanitizeInput } from '../middleware/validation.middleware';
import { registrationLimiter, loginLimiter } from '../middleware/rateLimiter.middleware';
import { registrationSchema, loginSchema, RegistrationData, LoginData } from '../schemas/auth.schema';

const router = Router();

// Helper function to get client IP and User Agent
const getClientInfo = (req: Request) => {
  const clientIP = (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown'
  );
  const userAgent = req.headers['user-agent'] || 'unknown';
  return { clientIP, userAgent };
};

/**
 * POST /api/v1/auth/register
 * Register a new user with KYC data
 */
router.post('/register', 
  registrationLimiter,
  sanitizeInput,
  validateSchema(registrationSchema),
  async (req: Request, res: Response) => {
    try {
      const userData = req.body as RegistrationData;
      const { clientIP, userAgent } = getClientInfo(req);

      // Register user
      const result = await AuthService.registerUser(userData);

      // Log successful registration
      await AuditService.logRegistration(
        result.user.id,
        result.user.email,
        result.user.riskTolerance,
        clientIP,
        userAgent
      );

      // Return success response
      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          token: result.tokens.accessToken,
          expiresIn: result.tokens.expiresIn
        }
      });
      return;

    } catch (error) {
      const { clientIP, userAgent } = getClientInfo(req);

      if (error instanceof Error) {
        // Handle specific errors
        if (error.message === 'EMAIL_EXISTS') {
          // Log failed registration attempt
          await AuditService.log({
            eventType: 'authentication',
            eventAction: 'registration_failed',
            eventData: {
              email: req.body.email,
              reason: 'email_exists',
              timestamp: new Date().toISOString()
            },
            ipAddress: clientIP,
            userAgent
          });

          return res.status(400).json({
            success: false,
            error: {
              code: 'EMAIL_EXISTS',
              message: 'An account with this email already exists'
            }
          });
        }
      }

      // Log general registration failure
      await AuditService.log({
        eventType: 'authentication',
        eventAction: 'registration_failed',
        eventData: {
          email: req.body.email || 'unknown',
          reason: 'internal_error',
          timestamp: new Date().toISOString()
        },
        ipAddress: clientIP,
        userAgent
      });

      // Return generic error
      res.status(500).json({
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: 'Registration failed. Please try again.'
        }
      });
      return;
    }
  }
);

/**
 * POST /api/v1/auth/login
 * Enhanced user login with refresh tokens and security features
 */
router.post('/login',
  loginLimiter,
  sanitizeInput,
  validateSchema(loginSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password, rememberMe } = req.body as LoginData;
      const { clientIP, userAgent } = getClientInfo(req);

      // Use enhanced login with security features
      const result = await AuthService.enhancedLogin(email, password, clientIP, userAgent, rememberMe);

      // Set secure HTTP-only cookie for refresh token if available
      if (result.tokens.refreshToken) {
        res.cookie('refresh_token', result.tokens.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000 // 30 days or 7 days
        });
      }

      // Log successful login
      await AuditService.logLogin(
        result.user.id,
        result.user.email,
        clientIP,
        userAgent
      );

      // Return success response
      res.status(200).json({
        success: true,
        data: {
          user: result.user,
          token: result.tokens.accessToken,
          expiresIn: result.tokens.expiresIn
        }
      });
      return;

    } catch (error) {
      const { clientIP, userAgent } = getClientInfo(req);

      if (error instanceof Error) {
        if (error.message === 'INVALID_CREDENTIALS') {
          // Log failed login attempt
          await AuditService.logFailedLogin(
            req.body.email || 'unknown',
            'invalid_credentials',
            clientIP,
            userAgent
          );

          return res.status(401).json({
            success: false,
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Invalid email or password'
            }
          });
        }

        if (error.message.startsWith('ACCOUNT_LOCKED:')) {
          const remainingTime = error.message.split(':')[1];
          
          await AuditService.logFailedLogin(
            req.body.email || 'unknown',
            'account_locked',
            clientIP,
            userAgent
          );

          return res.status(423).json({
            success: false,
            error: {
              code: 'ACCOUNT_LOCKED',
              message: `Account temporarily locked. Try again in ${remainingTime} minutes.`
            }
          });
        }
      }

      // Log general login failure
      await AuditService.logFailedLogin(
        req.body.email || 'unknown',
        'internal_error',
        clientIP,
        userAgent
      );

      // Return generic error
      res.status(500).json({
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: 'Login failed. Please try again.'
        }
      });
      return;
    }
  }
);

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'REFRESH_TOKEN_REQUIRED',
          message: 'Refresh token is required'
        }
      });
    }

    // Validate refresh token
    const tokenData = await AuthService.validateRefreshToken(refreshToken);
    if (!tokenData) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token'
        }
      });
    }

    // Get user data
    const user = await AuthService.getUserById(tokenData.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Generate new access token
    const tokens = AuthService.generateToken(tokenData.userId);

    // Generate new refresh token (rotation)
    const newRefreshToken = await AuthService.generateRefreshToken(tokenData.userId, tokenData.rememberMe);

    // Revoke old refresh token
    await AuthService.revokeRefreshToken(refreshToken);

    // Set new refresh token cookie
    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: tokenData.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      data: {
        token: tokens.accessToken,
        expiresIn: tokens.expiresIn
      }
    });
    return;

  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        code: 'REFRESH_FAILED',
        message: 'Token refresh failed'
      }
    });
    return;
  }
});

/**
 * POST /api/v1/auth/logout
 * Logout user and revoke refresh token
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refresh_token;

    if (refreshToken) {
      // Revoke refresh token
      await AuthService.revokeRefreshToken(refreshToken);
    }

    // Clear refresh token cookie
    res.clearCookie('refresh_token');

    // Log logout
    const { clientIP, userAgent } = getClientInfo(req);
    await AuditService.log({
      eventType: 'authentication',
      eventAction: 'user_logout',
      eventData: {
        timestamp: new Date().toISOString()
      },
      ipAddress: clientIP,
      userAgent
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
    return;

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGOUT_FAILED',
        message: 'Logout failed'
      }
    });
    return;
  }
});

/**
 * GET /api/v1/auth/me
 * Get current user profile (requires authentication)
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization token is required'
        }
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = AuthService.verifyToken(token);
    
    // Get user data
    const user = await AuthService.getUserById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Return user data
    res.status(200).json({
      success: true,
      data: { user }
    });
    return;

  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching user data'
      }
    });
    return;
  }
});

export default router;
