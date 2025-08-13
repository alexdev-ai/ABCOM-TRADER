import { Router } from 'express';
import SmartTradeAlgorithmService from '../services/algorithm.service';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const algorithmService = new SmartTradeAlgorithmService();

/**
 * Initialize algorithm service
 * POST /api/algorithm/initialize
 */
router.post('/initialize', authenticateToken, async (req, res): Promise<void> => {
  try {
    await algorithmService.initialize();
    
    res.json({
      success: true,
      message: 'SmartTrade AI Algorithm Service initialized successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error initializing algorithm service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize algorithm service',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Generate trading decision for a symbol
 * POST /api/algorithm/decision
 */
router.post('/decision', authenticateToken, async (req, res): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { symbol, sessionId } = req.body;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }
    
    if (!symbol) {
      res.status(400).json({
        success: false,
        error: 'Symbol is required'
      });
      return;
    }
    
    if (!sessionId) {
      res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
      return;
    }
    
    const decision = await algorithmService.generateTradingDecision(symbol, userId, sessionId);
    
    res.json({
      success: true,
      data: decision,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error generating trading decision:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate trading decision',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get algorithm queue statistics
 * GET /api/algorithm/queue/stats
 */
router.get('/queue/stats', authenticateToken, async (req, res): Promise<void> => {
  try {
    const stats = await algorithmService.getQueueStats();
    
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
 * Algorithm service health check
 * GET /api/algorithm/health
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'SmartTrade AI Algorithm Service',
    status: 'operational',
    features: [
      'Multi-strategy regime detection (VOLATILITY_HUNTER, MOMENTUM_FOLLOW, MEAN_REVERSION, EARNINGS_EXPLOIT)',
      'Aggressive risk management (2-3% risk per trade)',
      'Market open domination specialization (9:30-10:00 EST)',
      'Bull Queue background processing',
      'Real-time market data integration',
      'Options flow analysis integration',
      'Earnings exploitation system',
      'Technical analysis engine (RSI, MACD, volume analysis)',
      'Circuit breaker and emergency liquidation',
      'Performance monitoring and audit trail'
    ],
    strategies: {
      'VOLATILITY_HUNTER': 'High volatility markets (VIX > 25)',
      'MOMENTUM_FOLLOW': 'Strong trending markets during market open',
      'EARNINGS_EXPLOIT': 'Options flow unusual activity detection',
      'MEAN_REVERSION': 'Default strategy for ranging markets'
    },
    riskManagement: {
      riskPerTrade: '2-3% of account balance',
      maxDrawdown: '25% tolerance',
      circuitBreakers: 'Real-time risk monitoring',
      emergencyLiquidation: 'Automated safety protocols'
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
