import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import sessionAnalyticsService from '../services/sessionAnalytics.service';

const router = Router();

// Validation middleware
const handleValidationErrors = (req: Request, res: Response, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

/**
 * GET /api/v1/analytics/real-time/:userId
 * Get real-time metrics for active sessions
 */
router.get('/real-time/:userId',
  [
    param('userId').isString().notEmpty().withMessage('User ID is required'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const metrics = await sessionAnalyticsService.getRealTimeMetrics(userId);
      
      res.json({
        success: true,
        data: {
          metrics,
          timestamp: new Date(),
          count: metrics.length
        }
      });

    } catch (error) {
      console.error('Failed to get real-time metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve real-time metrics'
      });
    }
  }
);

/**
 * POST /api/v1/analytics/real-time/:sessionId
 * Update real-time metrics for a session
 */
router.post('/real-time/:sessionId',
  [
    param('sessionId').isString().notEmpty().withMessage('Session ID is required'),
    body('currentPnL').optional().isNumeric(),
    body('totalTrades').optional().isInt({ min: 0 }),
    body('tradingVelocity').optional().isNumeric(),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const metrics = req.body;
      
      await sessionAnalyticsService.updateRealTimeMetrics(sessionId, metrics);
      
      res.json({
        success: true,
        message: 'Real-time metrics updated successfully'
      });

    } catch (error) {
      console.error('Failed to update real-time metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update real-time metrics'
      });
    }
  }
);

/**
 * GET /api/v1/analytics/session/:userId
 * Get session analytics for a specific period
 */
router.get('/session/:userId',
  [
    param('userId').isString().notEmpty().withMessage('User ID is required'),
    query('periodType').isIn(['daily', 'weekly', 'monthly', 'yearly']).withMessage('Invalid period type'),
    query('startDate').isISO8601().withMessage('Invalid start date format'),
    query('endDate').isISO8601().withMessage('Invalid end date format'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { periodType, startDate, endDate } = req.query;
      
      const analytics = await sessionAnalyticsService.getSessionAnalytics(
        userId,
        periodType as any,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      console.error('Failed to get session analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve session analytics'
      });
    }
  }
);

/**
 * GET /api/v1/analytics/comparison/:userId
 * Compare performance against different baselines
 */
router.get('/comparison/:userId',
  [
    param('userId').isString().notEmpty().withMessage('User ID is required'),
    query('comparisonType').isIn(['self_historical', 'market_benchmark', 'peer_group']).withMessage('Invalid comparison type'),
    query('timeframe').isString().notEmpty().withMessage('Timeframe is required'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { comparisonType, timeframe } = req.query;
      
      const comparison = await sessionAnalyticsService.comparePerformance(
        userId,
        comparisonType as any,
        timeframe as string
      );
      
      res.json({
        success: true,
        data: comparison
      });

    } catch (error) {
      console.error('Failed to get performance comparison:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve performance comparison'
      });
    }
  }
);

/**
 * GET /api/v1/analytics/timing/:userId
 * Get optimal session timing recommendations
 */
router.get('/timing/:userId',
  [
    param('userId').isString().notEmpty().withMessage('User ID is required'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      const timing = await sessionAnalyticsService.getOptimalSessionTiming(userId);
      
      res.json({
        success: true,
        data: timing
      });

    } catch (error) {
      console.error('Failed to get optimal timing:', error);
      
      if ((error as Error).message === 'Insufficient data for timing analysis') {
        return res.status(400).json({
          success: false,
          error: 'Insufficient historical data for timing analysis. At least 10 completed sessions are required.'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve optimal timing recommendations'
      });
    }
  }
);

/**
 * POST /api/v1/analytics/prediction
 * Predict session outcome based on parameters
 */
router.post('/prediction',
  [
    body('userId').isString().notEmpty().withMessage('User ID is required'),
    body('durationMinutes').isInt({ min: 1 }).withMessage('Duration must be a positive integer'),
    body('lossLimitAmount').isFloat({ min: 0.01 }).withMessage('Loss limit must be a positive number'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const sessionParams = req.body;
      
      const prediction = await sessionAnalyticsService.predictSessionOutcome(sessionParams);
      
      res.json({
        success: true,
        data: prediction
      });

    } catch (error) {
      console.error('Failed to predict session outcome:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate session outcome prediction'
      });
    }
  }
);

/**
 * POST /api/v1/analytics/aggregate/:userId
 * Aggregate session data for analytics
 */
router.post('/aggregate/:userId',
  [
    param('userId').isString().notEmpty().withMessage('User ID is required'),
    body('aggregationType').isIn(['daily', 'weekly', 'monthly']).withMessage('Invalid aggregation type'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { aggregationType } = req.body;
      
      await sessionAnalyticsService.aggregateSessionData(userId, aggregationType);
      
      res.json({
        success: true,
        message: `${aggregationType} data aggregated successfully for user ${userId}`
      });

    } catch (error) {
      console.error('Failed to aggregate session data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to aggregate session data'
      });
    }
  }
);

/**
 * POST /api/v1/analytics/cache/refresh
 * Refresh analytics cache
 */
router.post('/cache/refresh',
  [
    query('userId').optional().isString().withMessage('User ID must be a string'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;
      
      await sessionAnalyticsService.refreshAnalyticsCache(userId as string | undefined);
      
      res.json({
        success: true,
        message: `Analytics cache refreshed${userId ? ` for user ${userId}` : ''}`
      });

    } catch (error) {
      console.error('Failed to refresh analytics cache:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to refresh analytics cache'
      });
    }
  }
);

/**
 * GET /api/v1/analytics/dashboard/:userId
 * Get comprehensive dashboard data
 */
router.get('/dashboard/:userId',
  [
    param('userId').isString().notEmpty().withMessage('User ID is required'),
    query('period').optional().isIn(['daily', 'weekly', 'monthly', 'yearly']).withMessage('Invalid period'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const period = (req.query.period as string) || 'monthly';
      
      // Get current period data
      const now = new Date();
      const startDate = new Date();
      
      switch (period) {
        case 'daily':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'weekly':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'monthly':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'yearly':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      // Fetch all dashboard data in parallel
      const [
        realTimeMetrics,
        sessionAnalytics,
        performanceComparison,
        optimalTiming
      ] = await Promise.allSettled([
        sessionAnalyticsService.getRealTimeMetrics(userId),
        sessionAnalyticsService.getSessionAnalytics(userId, period as any, startDate, now),
        sessionAnalyticsService.comparePerformance(userId, 'self_historical', period).catch(() => null),
        sessionAnalyticsService.getOptimalSessionTiming(userId).catch(() => null)
      ]);
      
      const dashboardData = {
        realTimeMetrics: realTimeMetrics.status === 'fulfilled' ? realTimeMetrics.value : [],
        sessionAnalytics: sessionAnalytics.status === 'fulfilled' ? sessionAnalytics.value : null,
        performanceComparison: performanceComparison.status === 'fulfilled' ? performanceComparison.value : null,
        optimalTiming: optimalTiming.status === 'fulfilled' ? optimalTiming.value : null,
        period,
        generatedAt: now
      };
      
      res.json({
        success: true,
        data: dashboardData
      });

    } catch (error) {
      console.error('Failed to get dashboard data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboard data'
      });
    }
  }
);

export default router;
