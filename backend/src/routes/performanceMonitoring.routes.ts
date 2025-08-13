import { Router } from 'express';
import PerformanceMonitoringService from '../services/performanceMonitoring.service';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const performanceMonitoring = new PerformanceMonitoringService();

/**
 * Initialize performance monitoring
 * POST /api/performance/initialize
 */
router.post('/initialize', authenticateToken, async (req, res): Promise<void> => {
  try {
    await performanceMonitoring.initialize();
    
    res.json({
      success: true,
      message: 'Performance Monitoring initialized successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error initializing performance monitoring:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize performance monitoring',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get performance metrics
 * GET /api/performance/metrics/:sessionId?
 */
router.get('/metrics/:sessionId?', authenticateToken, async (req, res): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { sessionId } = req.params;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }
    
    const metrics = await performanceMonitoring.getPerformanceMetrics(userId, sessionId);
    
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get performance metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get risk metrics
 * GET /api/performance/risk/:sessionId?
 */
router.get('/risk/:sessionId?', authenticateToken, async (req, res): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { sessionId } = req.params;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }
    
    const riskMetrics = await performanceMonitoring.getRiskMetrics(userId, sessionId);
    
    res.json({
      success: true,
      data: riskMetrics,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting risk metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get risk metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get strategy performance
 * GET /api/performance/strategies
 */
router.get('/strategies', authenticateToken, async (req, res): Promise<void> => {
  try {
    const strategies = await performanceMonitoring.getStrategyPerformance();
    
    res.json({
      success: true,
      data: strategies,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting strategy performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get strategy performance',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get market regime performance
 * GET /api/performance/regimes
 */
router.get('/regimes', authenticateToken, async (req, res): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }
    
    const regimes = await performanceMonitoring.getMarketRegimePerformance(userId);
    
    res.json({
      success: true,
      data: regimes,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting market regime performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get market regime performance',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Generate performance report
 * POST /api/performance/report
 */
router.post('/report', authenticateToken, async (req, res): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { reportType, timeframe } = req.body;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }
    
    const report = await performanceMonitoring.generatePerformanceReport(
      userId,
      reportType || 'COMPREHENSIVE',
      timeframe
    );
    
    res.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error generating performance report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate performance report',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get performance monitoring queue statistics
 * GET /api/performance/queue/stats
 */
router.get('/queue/stats', authenticateToken, async (req, res): Promise<void> => {
  try {
    const stats = await performanceMonitoring.getQueueStats();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting queue stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get queue statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Performance monitoring health check
 * GET /api/performance/health
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'SmartTrade AI Performance Monitoring',
    status: 'operational',
    features: [
      'Real-time performance tracking (win rate, returns, drawdown)',
      'Aggressive risk monitoring with 65% win rate targets',
      'Strategy performance analysis (4 strategies)',
      'Market regime performance breakdown',
      'Continuous learning and optimization',
      'Performance alerting system',
      'Comprehensive reporting (daily, weekly, monthly)',
      'Bull Queue background processing',
      'Risk score calculation (0-100 scale)',
      'Trade outcome correlation analysis'
    ],
    targets: {
      winRate: '65% minimum target',
      monthlyReturn: '5-12% adaptive returns',
      maxDrawdown: '25% aggressive tolerance',
      dailyRisk: 'Up to 10% exposure monitoring',
      riskPerTrade: '2-3% validation'
    },
    alerts: {
      drawdownWarning: '15% threshold',
      drawdownCritical: '20% threshold',
      winRateDegradation: 'Below 60% warning',
      consecutiveLosses: '5+ losses alert',
      riskScore: '80+ critical alert'
    },
    strategies: [
      'VOLATILITY_HUNTER - High volatility markets (VIX > 25)',
      'MOMENTUM_FOLLOW - Strong trending during market open',
      'EARNINGS_EXPLOIT - Options flow unusual activity',
      'MEAN_REVERSION - Default strategy for ranging markets'
    ],
    marketRegimes: [
      'HIGH_VOLATILITY - Aggressive volatility exploitation',
      'TRENDING - Momentum following strategies',
      'RANGING - Mean reversion and range trading'
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;
