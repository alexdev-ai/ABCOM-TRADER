import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import TradingSessionService from '../services/tradingSession.service';
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
    
    // Simplified check - can create if no active session
    const activeSession = await TradingSessionService.getActiveSession(userId);
    const canCreate = !activeSession;
    
    res.json({
      success: true,
      data: { canCreate }
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
      
      const session = await TradingSessionService.createSession(userId);
      
      res.status(201).json({
        success: true,
        data: {
          session: {
            id: session.id,
            durationMinutes: session.durationMinutes,
            lossLimitAmount: parseFloat(session.lossLimitAmount.toString()),
            lossLimitPercentage: parseFloat(session.lossLimitPercent?.toString() || '0'),
            status: session.status,
            createdAt: session.createdAt
          }
        }
      });
    } catch (error: any) {
      console.error('Create session error:', error);
      
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
    
    // Return basic session info
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
          lossLimitPercentage: parseFloat(session.lossLimitPercent.toString()),
          realizedPnl: parseFloat(session.realizedPnl.toString()),
          createdAt: session.createdAt
        }
      }
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
 * Get session by ID
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
      
      // Get session directly from service
      const session = await TradingSessionService.getActiveSession(userId);
      
      if (!session || session.id !== sessionId) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found'
          }
        });
      }
      
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
            lossLimitPercentage: parseFloat(session.lossLimitPercent.toString()),
            realizedPnl: parseFloat(session.realizedPnl.toString()),
            createdAt: session.createdAt
          }
        }
      });
    } catch (error: any) {
      console.error('Get session error:', error);
      
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
            tradeCount: session.tradeCount || 0
          }
        },
        message: 'Trading session stopped successfully'
      });
    } catch (error: any) {
      console.error('Stop session error:', error);
      
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
      
      const sessions = await TradingSessionService.getSessionHistory(userId, limit);
      
      // Transform sessions for response
      const sessionHistory = sessions.map(session => ({
        id: session.id,
        durationMinutes: session.durationMinutes,
        actualDurationMinutes: session.actualDurationMinutes,
        lossLimitAmount: parseFloat(session.lossLimitAmount.toString()),
        lossLimitPercentage: parseFloat(session.lossLimitPercent.toString()),
        status: session.status,
        startTime: session.startTime,
        endTime: session.endTime,
        terminationReason: session.terminationReason,
        realizedPnl: parseFloat(session.realizedPnl.toString()),
        tradeCount: session.tradeCount || 0,
        sessionPerformancePercentage: parseFloat(session.sessionPerformancePercentage?.toString() || '0'),
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

export default router;
