import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import rateLimit from 'express-rate-limit';
import TradingSessionService from '../services/tradingSession.service';
import { sessionMonitorService } from '../services/sessionMonitor.service';

const router = Router();

// Apply authentication to all session routes
router.use(authenticateToken);

/**
 * @route POST /api/v1/sessions
 * @desc Create a new trading session
 */
router.post(
  '/',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const session = await TradingSessionService.createSession({
        userId,
        durationMinutes: 240, // Default 4 hours
        lossLimitAmount: 1000 // Default $1000 loss limit
      });

      res.status(201).json({
        success: true,
        message: 'Trading session created successfully',
        data: {
          sessionId: session.id,
          durationMinutes: session.durationMinutes,
          lossLimitAmount: Number(session.lossLimitAmount),
          status: session.status
        }
      });
    } catch (error) {
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
 * @desc Get current active session
 */
router.get(
  '/active',
  rateLimit({ windowMs: 60 * 1000, max: 60 }),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const sessionData = await TradingSessionService.getActiveSession(userId);
      
      if (!sessionData) {
        return res.status(404).json({ success: false, message: 'No active session found' });
      }

      res.json({ 
        success: true, 
        data: {
          sessionId: sessionData.id,
          status: sessionData.status,
          durationMinutes: sessionData.durationMinutes,
          lossLimitAmount: Number(sessionData.lossLimitAmount),
          realizedPnl: Number(sessionData.realizedPnl),
          startTime: sessionData.startTime,
          endTime: sessionData.endTime
        }
      });
    } catch (error) {
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
 */
router.post(
  '/:sessionId/start',
  rateLimit({ windowMs: 5 * 60 * 1000, max: 5 }),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      const { sessionId } = req.params;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const session = await TradingSessionService.startSession(sessionId, userId);

      res.json({
        success: true,
        message: 'Trading session started successfully',
        data: {
          sessionId: session.id,
          status: session.status,
          startTime: session.startTime,
          endTime: session.endTime
        }
      });
    } catch (error) {
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
 */
router.post(
  '/:sessionId/stop',
  rateLimit({ windowMs: 5 * 60 * 1000, max: 10 }),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      const { sessionId } = req.params;
      const { reason = 'manual_stop' } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const session = await TradingSessionService.stopSession(sessionId, userId);

      res.json({
        success: true,
        message: 'Trading session stopped successfully',
        data: {
          sessionId: session.id,
          status: session.status,
          endTime: session.endTime,
          actualDurationMinutes: session.actualDurationMinutes,
          tradeCount: session.tradeCount || 0,
          realizedPnl: Number(session.realizedPnl),
          terminationReason: session.terminationReason
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to stop trading session',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route GET /api/v1/sessions/monitor/stats
 * @desc Get monitoring statistics
 */
router.get(
  '/monitor/stats',
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  async (req: Request, res: Response) => {
    try {
      const stats = await sessionMonitorService.getMonitoringStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get monitoring statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route GET /api/v1/sessions/trading/validate/:userId
 * @desc Validate if trading is allowed for user
 */
router.get(
  '/trading/validate/:userId',
  rateLimit({ windowMs: 60 * 1000, max: 120 }),
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const validation = await sessionMonitorService.validateTradingAllowed(userId);
      res.json({ success: true, data: validation });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to validate trading',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;
