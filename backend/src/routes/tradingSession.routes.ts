import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import TradingSessionService, { CreateSessionRequest } from '../services/tradingSession.service';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validation middleware
const validateRequest = (req: Request, res: Response, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request parameters',
        details: errors.array()
      }
    });
  }
  next();
};

/**
 * GET /api/v1/trading/sessions/can-create
 * Check if user can create a new session
 */
router.get('/can-create', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    
    const canCreate = await TradingSessionService.canCreateSession(userId);
    
    res.json({
      success: true,
      data: canCreate
    });
  } catch (error) {
    console.error('Can create session check error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to check session creation eligibility'
      }
    });
  }
});

/**
 * POST /api/v1/trading/sessions
 * Create a new trading session
 */
router.post('/',
  [
    body('durationMinutes')
      .isInt({ min: 60, max: 10080 })
      .withMessage('Duration must be between 60 and 10080 minutes'),
    body('lossLimitAmount')
      .optional()
      .isFloat({ min: 1 })
      .withMessage('Loss limit amount must be greater than 0'),
    body('lossLimitPercentage')
      .optional()
      .isFloat({ min: 1, max: 50 })
      .withMessage('Loss limit percentage must be between 1 and 50'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const sessionData: CreateSessionRequest = req.body;
      
      const session = await TradingSessionService.createSession(userId, sessionData);
      
      res.status(201).json({
        success: true,
        data: {
          session: {
            id: session.id,
            durationMinutes: session.durationMinutes,
            lossLimitAmount: parseFloat(session.lossLimitAmount.toString()),
            lossLimitPercentage: parseFloat(session.lossLimitPercentage.toString()),
            status: session.status,
            createdAt: session.createdAt
          }
        }
      });
    } catch (error: any) {
      console.error('Create session error:', error);
      
      const errorResponses: { [key: string]: { code: string; message: string; status: number } } = {
        'USER_HAS_ACTIVE_SESSION': {
          code: 'ACTIVE_SESSION_EXISTS',
          message: 'You already have an active trading session. Please complete or stop your current session before creating a new one.',
          status: 409
        },
        'USER_NOT_FOUND': {
          code: 'USER_NOT_FOUND',
          message: 'User account not found',
          status: 404
        },
        'INVALID_DURATION': {
          code: 'INVALID_DURATION',
          message: 'Invalid session duration. Please select 1 hour, 4 hours, 24 hours, or 7 days.',
          status: 400
        },
        'LOSS_LIMIT_REQUIRED': {
          code: 'LOSS_LIMIT_REQUIRED',
          message: 'Loss limit is required. Please specify either loss amount or percentage.',
          status: 400
        },
        'LOSS_LIMIT_TOO_HIGH': {
          code: 'LOSS_LIMIT_TOO_HIGH',
          message: 'Loss limit cannot exceed 50% of your account balance.',
          status: 400
        },
        'LOSS_PERCENTAGE_TOO_HIGH': {
          code: 'LOSS_PERCENTAGE_TOO_HIGH',
          message: 'Loss limit percentage cannot exceed 50%.',
          status: 400
        }
      };
      
      const errorResponse = errorResponses[error.message];
      if (errorResponse) {
        return res.status(errorResponse.status).json({
          success: false,
          error: {
            code: errorResponse.code,
            message: errorResponse.message
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'SESSION_CREATION_FAILED',
          message: 'Failed to create trading session. Please try again.'
        }
      });
    }
  }
);

/**
 * POST /api/v1/trading/sessions/:sessionId/activate
 * Activate a pending session
 */
router.post('/:sessionId/activate',
  [
    param('sessionId').isString().notEmpty().withMessage('Session ID is required'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const sessionId = req.params.sessionId!;
      
      const session = await TradingSessionService.activateSession(sessionId, userId);
      
      res.json({
        success: true,
        data: {
          session: {
            id: session.id,
            status: session.status,
            startTime: session.startTime,
            endTime: session.endTime,
            durationMinutes: session.durationMinutes,
            lossLimitAmount: parseFloat(session.lossLimitAmount.toString()),
            lossLimitPercentage: parseFloat(session.lossLimitPercentage.toString())
          }
        }
      });
    } catch (error: any) {
      console.error('Activate session error:', error);
      
      if (error.message === 'SESSION_NOT_FOUND_OR_NOT_PENDING') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found or not in pending status'
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'SESSION_ACTIVATION_FAILED',
          message: 'Failed to activate trading session'
        }
      });
    }
  }
);

/**
 * GET /api/v1/trading/sessions/active
 * Get active session for user
 */
router.get('/active', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    
    const session = await TradingSessionService.getActiveSession(userId);
    
    if (!session) {
      return res.json({
        success: true,
        data: { session: null }
      });
    }
    
    const summary = await TradingSessionService.getSessionSummary(session.id, userId);
    
    res.json({
      success: true,
      data: { session: summary }
    });
  } catch (error) {
    console.error('Get active session error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve active session'
      }
    });
  }
});

/**
 * GET /api/v1/trading/sessions/:sessionId
 * Get session summary with real-time data
 */
router.get('/:sessionId',
  [
    param('sessionId').isString().notEmpty().withMessage('Session ID is required'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const sessionId = req.params.sessionId!;
      
      const summary = await TradingSessionService.getSessionSummary(sessionId, userId);
      
      res.json({
        success: true,
        data: { session: summary }
      });
    } catch (error: any) {
      console.error('Get session summary error:', error);
      
      if (error.message === 'SESSION_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found'
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve session data'
        }
      });
    }
  }
);

/**
 * POST /api/v1/trading/sessions/:sessionId/stop
 * Stop an active session manually
 */
router.post('/:sessionId/stop',
  [
    param('sessionId').isString().notEmpty().withMessage('Session ID is required'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const sessionId = req.params.sessionId!;
      
      const session = await TradingSessionService.stopSession(sessionId, userId);
      
      res.json({
        success: true,
        data: {
          session: {
            id: session.id,
            status: session.status,
            endTime: session.endTime,
            actualDurationMinutes: session.actualDurationMinutes,
            terminationReason: session.terminationReason,
            realizedPnl: parseFloat(session.realizedPnl.toString()),
            totalTrades: session.totalTrades
          }
        },
        message: 'Trading session stopped successfully'
      });
    } catch (error: any) {
      console.error('Stop session error:', error);
      
      if (error.message === 'SESSION_NOT_FOUND_OR_NOT_ACTIVE') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found or not in active status'
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'SESSION_STOP_FAILED',
          message: 'Failed to stop trading session'
        }
      });
    }
  }
);

/**
 * GET /api/v1/trading/sessions/history
 * Get session history for user
 */
router.get('/history',
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be non-negative'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      const sessions = await TradingSessionService.getSessionHistory(userId, limit, offset);
      
      // Transform sessions for response
      const sessionHistory = sessions.map(session => ({
        id: session.id,
        durationMinutes: session.durationMinutes,
        actualDurationMinutes: session.actualDurationMinutes,
        lossLimitAmount: parseFloat(session.lossLimitAmount.toString()),
        lossLimitPercentage: parseFloat(session.lossLimitPercentage.toString()),
        status: session.status,
        startTime: session.startTime,
        endTime: session.endTime,
        terminationReason: session.terminationReason,
        realizedPnl: parseFloat(session.realizedPnl.toString()),
        totalTrades: session.totalTrades,
        sessionPerformancePercentage: parseFloat(session.sessionPerformancePercentage.toString()),
        createdAt: session.createdAt
      }));
      
      res.json({
        success: true,
        data: {
          sessions: sessionHistory,
          pagination: {
            limit,
            offset,
            hasMore: sessions.length === limit
          }
        }
      });
    } catch (error) {
      console.error('Get session history error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve session history'
        }
      });
    }
  }
);

/**
 * PUT /api/v1/trading/sessions/:sessionId/performance
 * Update session performance (internal use for trade updates)
 */
router.put('/:sessionId/performance',
  [
    param('sessionId').isString().notEmpty().withMessage('Session ID is required'),
    body('pnlChange').isNumeric().withMessage('P&L change must be a number'),
    body('tradeCount').optional().isInt({ min: 1 }).withMessage('Trade count must be positive'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.sessionId!;
      const { pnlChange, tradeCount = 1 } = req.body;
      
      await TradingSessionService.updateSessionPerformance(sessionId, pnlChange, tradeCount);
      
      res.json({
        success: true,
        message: 'Session performance updated'
      });
    } catch (error) {
      console.error('Update session performance error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PERFORMANCE_UPDATE_FAILED',
          message: 'Failed to update session performance'
        }
      });
    }
  }
);

export default router;
