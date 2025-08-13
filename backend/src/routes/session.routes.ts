import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateSchema } from '../middleware/validation.middleware';
import { generalLimiter } from '../middleware/rateLimiter.middleware';
import rateLimit from 'express-rate-limit';
import { tradingSessionService } from '../services/tradingSession.service';
import {
  CreateSessionSchema,
  SessionIdSchema,
  SessionHistoryQuerySchema,
  UpdateSessionStatusSchema,
  type SessionConfig,
  type SessionHistoryQuery,
  type ActiveSessionResponse,
  type SessionHistoryResponse,
  type SessionValidationResponse
} from '../schemas/session.schema';

const router = Router();

// Apply authentication to all session routes
router.use(authenticateToken);

/**
 * @route POST /api/v1/sessions
 * @desc Create a new trading session
 * @access Private
 */
router.post(
  '/',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), // 10 requests per 15 minutes
  validateSchema(CreateSessionSchema.shape.body),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const config: SessionConfig = req.body;

      // Validate session configuration
      const validation = await tradingSessionService.validateSessionConfig(userId, config);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Session validation failed',
          errors: validation.errors,
          warnings: validation.warnings
        });
      }

      // Check if user can create a session
      const canCreate = await tradingSessionService.canCreateSession(userId);
      if (!canCreate) {
        return res.status(409).json({
          success: false,
          message: 'You already have an active session. Complete or stop the current session before creating a new one.'
        });
      }

      // Create the session
      const session = await tradingSessionService.createSession(userId, config);

      // Calculate estimated end time
      const estimatedEndTime = new Date(Date.now() + config.durationMinutes * 60 * 1000);

      res.status(201).json({
        success: true,
        message: 'Trading session created successfully',
        data: {
          sessionId: session.id,
          durationMinutes: session.durationMinutes,
          lossLimitAmount: Number(session.lossLimitAmount),
          lossLimitPercentage: Number(session.lossLimitPercentage),
          estimatedEndTime: estimatedEndTime.toISOString(),
          status: session.status
        },
        warnings: validation.warnings
      });

    } catch (error) {
      console.error('Session creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create trading session',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route GET /api/v1/sessions/active
 * @desc Get current active session with real-time data
 * @access Private
 */
router.get(
  '/active',
  rateLimit({ windowMs: 1 * 60 * 1000, max: 60 }), // 60 requests per minute
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const sessionData = await tradingSessionService.getActiveSessionData(userId);
      
      if (!sessionData) {
        return res.status(404).json({
          success: false,
          message: 'No active session found'
        });
      }

      res.json({
        success: true,
        data: sessionData
      });

    } catch (error) {
      console.error('Get active session error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve active session',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route POST /api/v1/sessions/:sessionId/start
 * @desc Start a pending session
 * @access Private
 */
router.post(
  '/:sessionId/start',
  rateLimit({ windowMs: 5 * 60 * 1000, max: 5 }), // 5 requests per 5 minutes
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      const { sessionId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Check if user already has an active session
      const existingActive = await tradingSessionService.getActiveSession(userId);
      if (existingActive) {
        return res.status(409).json({
          success: false,
          message: 'Cannot start session: You already have an active session'
        });
      }

      const session = await tradingSessionService.startSession(sessionId, userId);

      res.json({
        success: true,
        message: 'Trading session started successfully',
        data: {
          sessionId: session.id,
          status: session.status,
          startTime: session.startTime,
          endTime: session.endTime,
          durationMinutes: session.durationMinutes
        }
      });

    } catch (error) {
      console.error('Start session error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start trading session',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route POST /api/v1/sessions/:sessionId/stop
 * @desc Stop an active session
 * @access Private
 */
router.post(
  '/:sessionId/stop',
  rateLimiter({ windowMs: 5 * 60 * 1000, max: 10 }), // 10 requests per 5 minutes
  validateRequest(SessionIdSchema),
  validateRequest(UpdateSessionStatusSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { sessionId } = req.params;
      const { reason = 'manual_stop' } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const session = await tradingSessionService.stopSession(sessionId, userId, reason);

      res.json({
        success: true,
        message: 'Trading session stopped successfully',
        data: {
          sessionId: session.id,
          status: session.status,
          endTime: session.endTime,
          actualDurationMinutes: session.actualDurationMinutes,
          totalTrades: session.totalTrades,
          realizedPnl: Number(session.realizedPnl),
          terminationReason: session.terminationReason
        }
      });

    } catch (error) {
      console.error('Stop session error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to stop trading session',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route GET /api/v1/sessions/history
 * @desc Get session history with filtering and pagination
 * @access Private
 */
router.get(
  '/history',
  rateLimiter({ windowMs: 1 * 60 * 1000, max: 30 }), // 30 requests per minute
  validateRequest(SessionHistoryQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const {
        limit = 50,
        offset = 0,
        dateFrom,
        dateTo,
        status,
        performanceFilter = 'all'
      } = req.query as any;

      // Build filters object
      const filters: any = {};
      if (dateFrom) filters.dateFrom = new Date(dateFrom);
      if (dateTo) filters.dateTo = new Date(dateTo);
      if (status) filters.status = status;
      if (performanceFilter && performanceFilter !== 'all') {
        filters.performanceFilter = performanceFilter;
      }

      const result = await tradingSessionService.getSessionHistory(
        userId,
        Number(limit),
        Number(offset),
        filters
      );

      // Transform sessions for response
      const transformedSessions = result.sessions.map(session => ({
        sessionId: session.id,
        durationMinutes: session.durationMinutes,
        lossLimitAmount: Number(session.lossLimitAmount),
        lossLimitPercentage: Number(session.lossLimitPercentage),
        status: session.status,
        startTime: session.startTime,
        endTime: session.endTime,
        actualDurationMinutes: session.actualDurationMinutes,
        totalTrades: session.totalTrades,
        realizedPnl: Number(session.realizedPnl),
        sessionPerformancePercentage: Number(session.sessionPerformancePercentage),
        terminationReason: session.terminationReason,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      }));

      res.json({
        success: true,
        data: {
          sessions: transformedSessions,
          pagination: result.pagination
        }
      });

    } catch (error) {
      console.error('Get session history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve session history',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route GET /api/v1/sessions/:sessionId
 * @desc Get specific session details
 * @access Private
 */
router.get(
  '/:sessionId',
  rateLimiter({ windowMs: 1 * 60 * 1000, max: 60 }), // 60 requests per minute
  validateRequest(SessionIdSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { sessionId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const session = await tradingSessionService.getSessionById(sessionId, userId);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      res.json({
        success: true,
        data: {
          sessionId: session.id,
          durationMinutes: session.durationMinutes,
          lossLimitAmount: Number(session.lossLimitAmount),
          lossLimitPercentage: Number(session.lossLimitPercentage),
          status: session.status,
          startTime: session.startTime,
          endTime: session.endTime,
          actualDurationMinutes: session.actualDurationMinutes,
          totalTrades: session.totalTrades,
          realizedPnl: Number(session.realizedPnl),
          sessionPerformancePercentage: Number(session.sessionPerformancePercentage),
          terminationReason: session.terminationReason,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt
        }
      });

    } catch (error) {
      console.error('Get session error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve session',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route POST /api/v1/sessions/validate
 * @desc Validate session configuration without creating
 * @access Private
 */
router.post(
  '/validate',
  rateLimiter({ windowMs: 1 * 60 * 1000, max: 30 }), // 30 requests per minute
  validateRequest(CreateSessionSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const config: SessionConfig = req.body;
      const validation = await tradingSessionService.validateSessionConfig(userId, config);

      res.json({
        success: true,
        data: validation
      });

    } catch (error) {
      console.error('Validate session error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate session configuration',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;
