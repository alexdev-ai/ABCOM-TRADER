import { Router } from 'express';
import DecisionEngineService from '../services/decisionEngine.service';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const decisionEngine = new DecisionEngineService();

/**
 * Initialize decision engine
 * POST /api/decision-engine/initialize
 */
router.post('/initialize', authenticateToken, async (req, res): Promise<void> => {
  try {
    await decisionEngine.initialize();
    
    res.json({
      success: true,
      message: 'Decision Engine initialized successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error initializing decision engine:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize decision engine',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get portfolio summary
 * GET /api/decision-engine/portfolio/:sessionId
 */
router.get('/portfolio/:sessionId', authenticateToken, async (req, res): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { sessionId } = req.params;
    
    if (!userId || !sessionId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated or invalid session'
      });
      return;
    }
    
    const portfolio = await decisionEngine.getPortfolioSummary(userId, sessionId);
    
    res.json({
      success: true,
      data: portfolio,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting portfolio summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get portfolio summary',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Schedule decision execution
 * POST /api/decision-engine/execute
 */
router.post('/execute', authenticateToken, async (req, res): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { decision, sessionId } = req.body;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }
    
    if (!decision || !sessionId) {
      res.status(400).json({
        success: false,
        error: 'Decision and session ID are required'
      });
      return;
    }
    
    // Schedule decision execution
    await decisionEngine.scheduleDecisionExecution(decision, userId, sessionId);
    
    res.json({
      success: true,
      message: 'Decision execution scheduled',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error scheduling decision execution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to schedule decision execution',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Emergency liquidation
 * POST /api/decision-engine/emergency-liquidation/:sessionId
 */
router.post('/emergency-liquidation/:sessionId', authenticateToken, async (req, res): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { sessionId } = req.params;
    
    if (!userId || !sessionId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated or invalid session'
      });
      return;
    }
    
    console.log(`🚨 Emergency liquidation requested for session ${sessionId} by user ${userId}`);
    
    await decisionEngine.emergencyLiquidation(userId, sessionId);
    
    res.json({
      success: true,
      message: 'Emergency liquidation initiated',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error executing emergency liquidation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute emergency liquidation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get decision queue statistics
 * GET /api/decision-engine/queue/stats
 */
router.get('/queue/stats', authenticateToken, async (req, res): Promise<void> => {
  try {
    const stats = await decisionEngine.getQueueStats();
    
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
 * Decision engine health check
 * GET /api/decision-engine/health
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'SmartTrade AI Decision Engine',
    status: 'operational',
    features: [
      'Alpaca API integration for live trading',
      'Real-time order execution and management',
      'Position tracking and P&L calculation',
      'Risk management and limit validation',
      'Stop-loss and take-profit automation',
      'Emergency liquidation protocols',
      'Bull Queue background processing',
      'Portfolio performance monitoring',
      'Session-based trade isolation',
      'Multi-strategy order routing'
    ],
    orderTypes: ['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT'],
    riskManagement: {
      sessionLossLimits: 'Enforced per session',
      positionConcentration: 'Max 25% per position',
      buyingPowerValidation: 'Real-time verification',
      circuitBreakers: 'Emergency liquidation'
    },
    positionMonitoring: {
      frequency: 'Every 10 seconds during market hours',
      stopLossAutomation: 'Real-time price monitoring',
      takeProfitAutomation: 'Automated profit taking',
      pnlTracking: 'Real-time unrealized/realized P&L'
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
