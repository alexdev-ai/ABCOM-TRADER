import { Router, Request, Response } from 'express';
import { AuthService } from '@/services/auth.service';
import { AuditService } from '@/services/audit.service';
import { validateSchema, sanitizeInput } from '@/middleware/validation.middleware';
import { registrationLimiter, loginLimiter } from '@/middleware/rateLimiter.middleware';
import { registrationSchema, loginSchema, RegistrationData, LoginData } from '@/schemas/auth.schema';

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
    }
  }
);

/**
 * POST /api/v1/auth/login
 * Authenticate user login
 */
router.post('/login',
  loginLimiter,
  sanitizeInput,
  validateSchema(loginSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body as LoginData;
      const { clientIP, userAgent } = getClientInfo(req);

      // Authenticate user
      const result = await AuthService.loginUser(email, password);

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

    } catch (error) {
      const { clientIP, userAgent } = getClientInfo(req);

      if (error instanceof Error && error.message === 'INVALID_CREDENTIALS') {
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
    }
  }
);

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
  }
});

export default router;
