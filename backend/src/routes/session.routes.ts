import express from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateSchema } from '../middleware/validation.middleware';
import { tradingSessionService } from '../services/tradingSession.service';

const router = express.Router();

// Validation schemas
const createSessionSchema = z.object({
  body: z.object({
    durationMinutes: z.number().refine(val => [60, 240, 1440, 10080].includes(val), {
      message: 'Duration must be 60, 240, 1440, or 10080 minutes'
    }), // 1h, 4h, 24h, 7d
    lossLimitAmount: z.number().min(0.01).max(100000) // Reasonable limits
  })
});

const sessionIdSchema = z.object({
  params: z.object({
    sessionId: z.string().min(1)
  })
});

const updateSessionSchema = z.object({
  body: z.object({
    currentPnL: z.number().optional(),
    tradeCount: z.number().min(0).optional()
  })
});

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/sessions
 * @desc    Create a new trading session
 * @access  Private
 */
router.post('/', validateSchema(createSessionSchema.shape.body), async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { durationMinutes, lossLimitAmount } = req.body;

    const session = await tradingSessionService.createSession({
      userId,
      durationMinutes,
      lossLimitAmount
    });

    res.status(201).json({
      success: true,
      data: {
        session: {
          id: session.id,
          durationMinutes: session.durationMinutes,
          lossLimitAmount: session.lossLimitAmount.toNumber(),
          lossLimitPercentage: session.lossLimitPercentage?.toNumber(),
          status: session.status,
          endTime: session.endTime,
          createdAt: session.createdAt
        }
      }
    });

  } catch (error: any) {
    console.error('Create session error:', error);
    
    // Handle specific business logic errors
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'User not found' });
    }
    if (error.message === 'ACTIVE_SESSION_EXISTS') {
      return res.status(409).json({ error: 'An active trading session already exists' });
    }
    if (error.message === 'INVALID_DURATION') {
      return res.status(400).json({ error: 'Invalid session duration' });
    }
    if (error.message === 'INSUFFICIENT_BALANCE') {
      return res.status(400).json({ error: 'Insufficient account balance' });
    }
    if (error.message.startsWith('LOSS_LIMIT_TOO_HIGH')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to create trading session' });
  }
});

/**
 * @route   POST /api/sessions/:sessionId/start
 * @desc    Start a pending trading session
 * @access  Private
 */
router.post('/:sessionId/start', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { sessionId } = req.params;

    const session = await tradingSessionService.startSession(sessionId, userId);

    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          status: session.status,
          startTime: session.startTime,
          endTime: session.endTime
        }
      }
    });

  } catch (error: any) {
    console.error('Start session error:', error);
    
    if (error.message === 'SESSION_NOT_FOUND') {
      return res.status(404).json({ error: 'Session not found or not in pending state' });
    }

    res.status(500).json({ error: 'Failed to start trading session' });
  }
});

/**
 * @route   POST /api/sessions/:sessionId/stop
 * @desc    Stop an active trading session
 * @access  Private
 */
router.post('/:sessionId/stop', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { sessionId } = req.params;

    const session = await tradingSessionService.stopSession(sessionId, userId, 'manual_stop');

    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          status: session.status,
          terminationReason: session.terminationReason
        }
      }
    });

  } catch (error: any) {
    console.error('Stop session error:', error);
    
    if (error.message === 'SESSION_NOT_FOUND') {
      return res.status(404).json({ error: 'Session not found or cannot be stopped' });
    }

    res.status(500).json({ error: 'Failed to stop trading session' });
  }
});

/**
 * @route   POST /api/sessions/:sessionId/emergency-stop
 * @desc    Emergency stop a trading session
 * @access  Private
 */
router.post('/:sessionId/emergency-stop', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { sessionId } = req.params;

    const session = await tradingSessionService.emergencyStopSession(sessionId, userId);

    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          status: session.status,
          terminationReason: session.terminationReason
        }
      }
    });

  } catch (error: any) {
    console.error('Emergency stop session error:', error);
    
    if (error.message === 'SESSION_NOT_FOUND') {
      return res.status(404).json({ error: 'Session not found or cannot be stopped' });
    }

    res.status(500).json({ error: 'Failed to emergency stop trading session' });
  }
});

/**
 * @route   GET /api/sessions/active
 * @desc    Get active trading session for user
 * @access  Private
 */
router.get('/active', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const session = await tradingSessionService.getActiveSession(userId);

    if (!session) {
      return res.json({
        success: true,
        data: { session: null }
      });
    }

    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          durationMinutes: session.durationMinutes,
          lossLimitAmount: session.lossLimitAmount.toNumber(),
          lossLimitPercentage: session.lossLimitPercentage?.toNumber(),
          status: session.status,
          startTime: session.startTime,
          endTime: session.endTime,
          realizedPnl: session.realizedPnl?.toNumber() || 0,
          totalTrades: session.totalTrades || 0,
          terminationReason: session.terminationReason,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Get active session error:', error);
    res.status(500).json({ error: 'Failed to get active session' });
  }
});

/**
 * @route   PUT /api/sessions/:sessionId/performance
 * @desc    Update session performance data
 * @access  Private
 */
router.put('/:sessionId/performance', async (req, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { sessionId } = req.params;
      const { currentPnL, tradeCount } = req.body;

      await tradingSessionService.updateSessionPerformance(sessionId, {
        currentPnL,
        tradeCount
      });

      res.json({
        success: true,
        message: 'Session performance updated successfully'
      });

    } catch (error) {
      console.error('Update session performance error:', error);
      res.status(500).json({ error: 'Failed to update session performance' });
    }
  }
);

/**
 * @route   GET /api/sessions/history
 * @desc    Get session history for user
 * @access  Private
 */
router.get('/history', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const sessions = await tradingSessionService.getSessionHistory(userId, limit, offset);

    const formattedSessions = sessions.map(session => ({
      id: session.id,
      durationMinutes: session.durationMinutes,
      lossLimitAmount: session.lossLimitAmount.toNumber(),
      lossLimitPercentage: session.lossLimitPercentage?.toNumber(),
      status: session.status,
      startTime: session.startTime,
      endTime: session.endTime,
      realizedPnl: session.realizedPnl?.toNumber() || 0,
      totalTrades: session.totalTrades || 0,
      terminationReason: session.terminationReason,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    }));

    res.json({
      success: true,
      data: {
        sessions: formattedSessions,
        pagination: {
          limit,
          offset,
          hasMore: sessions.length === limit
        }
      }
    });

  } catch (error) {
    console.error('Get session history error:', error);
    res.status(500).json({ error: 'Failed to get session history' });
  }
});

/**
 * @route   GET /api/sessions/stats
 * @desc    Get session statistics for user
 * @access  Private
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const stats = await tradingSessionService.getSessionStats(userId);

    res.json({
      success: true,
      data: { stats }
    });

  } catch (error) {
    console.error('Get session stats error:', error);
    res.status(500).json({ error: 'Failed to get session statistics' });
  }
});

/**
 * @route   GET /api/sessions/:sessionId
 * @desc    Get specific session details
 * @access  Private
 */
router.get('/:sessionId', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { sessionId } = req.params;

    // For now, we'll get it by checking if it's the user's active session
    // In a full implementation, we'd have a getSessionById method
    const session = await tradingSessionService.getActiveSession(userId);

    if (!session || session.id !== sessionId) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          durationMinutes: session.durationMinutes,
          lossLimitAmount: session.lossLimitAmount.toNumber(),
          lossLimitPercentage: session.lossLimitPercentage?.toNumber(),
          status: session.status,
          startTime: session.startTime,
          endTime: session.endTime,
          realizedPnl: session.realizedPnl?.toNumber() || 0,
          totalTrades: session.totalTrades || 0,
          terminationReason: session.terminationReason,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

export default router;
