import express from 'express';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import AlgorithmEngine from '../services/algorithmEngine.service';
import AlgorithmQueueService from '../services/algorithmQueue.service';
import MarketDataIngestionService from '../services/marketDataIngestion.service';
import { authenticateToken } from '../middleware/auth.middleware';
import { z } from 'zod';

const router = express.Router();
const prisma = new PrismaClient();

// Request validation schemas
const algorithmDecisionSchema = z.object({
  symbol: z.string().min(1).max(10),
  sessionId: z.string().optional(),
  priority: z.number().min(1).max(10).default(5)
});

const algorithmPerformanceSchema = z.object({
  timeframe: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

const updateDecisionOutcomeSchema = z.object({
  outcome: z.enum(['win', 'loss', 'breakeven']),
  profitLoss: z.number(),
  holdingDuration: z.number().min(0),
  executionPrice: z.number().optional()
});

/**
 * POST /api/algorithm/decision
 * Request algorithm decision for a symbol
 */
router.post('/decision', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate request body
    const validation = algorithmDecisionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: validation.error.errors
      });
    }

    const { symbol, sessionId, priority } = validation.data;

    // Get current market price
    const marketData = await MarketDataIngestionService.getCurrentMarketData(symbol);
    if (!marketData) {
      return res.status(400).json({
        error: 'Unable to get market data for symbol',
        symbol
      });
    }

    // Add algorithm job to queue
    const jobId = `${userId}-${symbol}-${Date.now()}`;
    const algorithmJobData = {
      userId,
      sessionId: sessionId || undefined,
      symbol,
      currentPrice: marketData.price,
      jobId,
      priority,
      requestedAt: new Date()
    };

    const queueJobId = await AlgorithmQueueService.addAlgorithmJob(algorithmJobData);

    return res.json({
      success: true,
      message: 'Algorithm decision requested',
      jobId: queueJobId,
      symbol,
      currentPrice: marketData.price,
      estimatedProcessingTime: '2-5 seconds'
    });

  } catch (error) {
    console.error('Algorithm decision request failed:', error);
    return res.status(500).json({
      error: 'Algorithm decision request failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/algorithm/decisions
 * Get algorithm decisions for user
 */
router.get('/decisions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { 
      symbol, 
      sessionId, 
      limit = '50', 
      offset = '0',
      outcome,
      decisionType
    } = req.query;

    const whereClause: any = { userId };
    
    if (symbol) whereClause.symbol = symbol as string;
    if (sessionId) whereClause.sessionId = sessionId as string;
    if (outcome) whereClause.outcome = outcome as string;
    if (decisionType) whereClause.decisionType = decisionType as string;

    const decisions = await prisma.algorithmDecision.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      select: {
        id: true,
        symbol: true,
        decisionType: true,
        confidence: true,
        reasoning: true,
        marketCondition: true,
        volatilityIndex: true,
        riskScore: true,
        positionSize: true,
        entryPrice: true,
        stopLoss: true,
        takeProfit: true,
        isExecuted: true,
        executedAt: true,
        executionPrice: true,
        actualQuantity: true,
        outcome: true,
        profitLoss: true,
        profitLossPercent: true,
        holdingDuration: true,
        createdAt: true,
        updatedAt: true,
        sessionId: true
      }
    });

    const total = await prisma.algorithmDecision.count({
      where: whereClause
    });

    return res.json({
      success: true,
      data: decisions,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: total > parseInt(offset as string) + parseInt(limit as string)
      }
    });

  } catch (error) {
    console.error('Failed to get algorithm decisions:', error);
    return res.status(500).json({
      error: 'Failed to get algorithm decisions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/algorithm/decisions/:id
 * Get specific algorithm decision
 */
router.get('/decisions/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId || !id) {
      return res.status(401).json({ error: 'User not authenticated or invalid ID' });
    }

    const decision = await prisma.algorithmDecision.findFirst({
      where: {
        id,
        userId
      },
      include: {
        tradingSession: {
          select: {
            id: true,
            durationMinutes: true,
            lossLimitAmount: true,
            status: true,
            startTime: true,
            endTime: true
          }
        }
      }
    });

    if (!decision) {
      return res.status(404).json({
        error: 'Algorithm decision not found'
      });
    }

    // Parse JSON fields
    const response = {
      ...decision,
      technicalIndicators: decision.technicalIndicators ? 
        JSON.parse(decision.technicalIndicators) : null,
      fundamentalData: decision.fundamentalData ? 
        JSON.parse(decision.fundamentalData) : null
    };

    return res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Failed to get algorithm decision:', error);
    return res.status(500).json({
      error: 'Failed to get algorithm decision',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/algorithm/decisions/:id/outcome
 * Update algorithm decision outcome
 */
router.put('/decisions/:id/outcome', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId || !id) {
      return res.status(401).json({ error: 'User not authenticated or invalid ID' });
    }

    // Validate request body
    const validation = updateDecisionOutcomeSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: validation.error.errors
      });
    }

    const { outcome, profitLoss, holdingDuration, executionPrice } = validation.data;

    // Verify decision belongs to user
    const decision = await prisma.algorithmDecision.findFirst({
      where: { id, userId }
    });

    if (!decision) {
      return res.status(404).json({
        error: 'Algorithm decision not found'
      });
    }

    // Update decision outcome
    await AlgorithmEngine.updateDecisionOutcome(
      id,
      outcome,
      profitLoss,
      holdingDuration,
      executionPrice
    );

    // Trigger performance recalculation
    await AlgorithmQueueService.addPerformanceJob(userId, 'daily');

    return res.json({
      success: true,
      message: 'Decision outcome updated successfully'
    });

  } catch (error) {
    console.error('Failed to update decision outcome:', error);
    return res.status(500).json({
      error: 'Failed to update decision outcome',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/algorithm/performance
 * Get algorithm performance metrics
 */
router.get('/performance', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate query parameters
    const validation = algorithmPerformanceSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: validation.error.errors
      });
    }

    const { timeframe, startDate, endDate } = validation.data;

    // Build date filter
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const whereClause: any = { userId };
    if (Object.keys(dateFilter).length > 0) {
      whereClause.date = dateFilter;
    }

    // Get performance data
    const performance = await prisma.algorithmPerformance.findMany({
      where: {
        ...whereClause,
        timeframe
      },
      orderBy: { date: 'desc' },
      take: 30 // Last 30 periods
    });

    // Calculate summary statistics
    const totalDecisions = performance.reduce((sum, p) => sum + p.totalDecisions, 0);
    const totalExecutedDecisions = performance.reduce((sum, p) => sum + p.executedDecisions, 0);
    const totalWins = performance.reduce((sum, p) => sum + p.winCount, 0);
    const totalLosses = performance.reduce((sum, p) => sum + p.lossCount, 0);
    
    const overallWinRate = totalExecutedDecisions > 0 ? 
      (totalWins / totalExecutedDecisions) * 100 : 0;
    
    const totalPnL = performance.reduce((sum, p) => 
      sum + (p.totalProfitLoss?.toNumber() || 0), 0);
    
    const avgConfidence = performance.length > 0 ?
      performance.reduce((sum, p) => sum + (p.avgConfidence?.toNumber() || 0), 0) / performance.length : 0;

    return res.json({
      success: true,
      data: {
        performance,
        summary: {
          totalDecisions,
          totalExecutedDecisions,
          overallWinRate: Math.round(overallWinRate * 100) / 100,
          totalProfitLoss: Math.round(totalPnL * 100) / 100,
          avgConfidence: Math.round(avgConfidence * 100) / 100,
          periodsAnalyzed: performance.length
        },
        timeframe
      }
    });

  } catch (error) {
    console.error('Failed to get algorithm performance:', error);
    return res.status(500).json({
      error: 'Failed to get algorithm performance',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/algorithm/market-condition
 * Get current market condition analysis
 */
router.get('/market-condition', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Get current market condition
    const marketCondition = await MarketDataIngestionService.getMarketCondition();
    
    if (!marketCondition) {
      return res.status(503).json({
        error: 'Market condition data unavailable',
        message: 'Unable to analyze current market conditions'
      });
    }

    // Get market data service stats
    const serviceStats = MarketDataIngestionService.getServiceStats();

    return res.json({
      success: true,
      data: {
        marketCondition,
        marketOpen: serviceStats.marketOpen,
        tradingSession: serviceStats.tradingSession,
        lastUpdated: marketCondition.timestamp
      }
    });

  } catch (error) {
    console.error('Failed to get market condition:', error);
    return res.status(500).json({
      error: 'Failed to get market condition',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/algorithm/market-data/:symbol
 * Get market data for specific symbol
 */
router.get('/market-data/:symbol', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    if (!symbol || symbol.length > 10) {
      return res.status(400).json({
        error: 'Invalid symbol parameter'
      });
    }

    // Get market data
    const marketData = await MarketDataIngestionService.getCurrentMarketData(symbol.toUpperCase());
    
    if (!marketData) {
      return res.status(404).json({
        error: 'Market data not available for symbol',
        symbol: symbol.toUpperCase()
      });
    }

    // Get technical indicators
    const technicalIndicators = await MarketDataIngestionService.getTechnicalIndicators(symbol.toUpperCase());

    return res.json({
      success: true,
      data: {
        marketData,
        technicalIndicators,
        lastUpdated: marketData.timestamp
      }
    });

  } catch (error) {
    console.error('Failed to get market data:', error);
    return res.status(500).json({
      error: 'Failed to get market data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/algorithm/config
 * Get current algorithm configuration
 */
router.get('/config', authenticateToken, async (req: Request, res: Response) => {
  try {
    const config = await prisma.algorithmConfig.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    if (!config) {
      return res.status(404).json({
        error: 'No active algorithm configuration found'
      });
    }

    // Parse JSON fields for response
    const response = {
      ...config,
      parameters: JSON.parse(config.parameters),
      riskParameters: JSON.parse(config.riskParameters),
      marketConditionWeights: JSON.parse(config.marketConditionWeights)
    };

    return res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Failed to get algorithm config:', error);
    return res.status(500).json({
      error: 'Failed to get algorithm configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/algorithm/status
 * Get algorithm service status and health
 */
router.get('/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Get queue statistics
    const queueStats = await AlgorithmQueueService.getQueueStats();
    
    // Get market data service stats
    const marketDataStats = MarketDataIngestionService.getServiceStats();

    // Get recent performance
    const recentPerformance = await prisma.algorithmPerformance.findFirst({
      where: { userId: null }, // System-wide performance
      orderBy: { date: 'desc' }
    });

    // Get algorithm decision count for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDecisions = await prisma.algorithmDecision.count({
      where: {
        createdAt: { gte: today }
      }
    });

    return res.json({
      success: true,
      data: {
        systemHealth: {
          algorithm: queueStats.health.isHealthy,
          marketData: marketDataStats.isInitialized,
          overall: queueStats.health.isHealthy && marketDataStats.isInitialized
        },
        queueStats,
        marketDataStats,
        activity: {
          decisionsToday: todayDecisions,
          recentPerformance: recentPerformance ? {
            winRate: recentPerformance.winRate?.toNumber(),
            totalDecisions: recentPerformance.totalDecisions,
            avgConfidence: recentPerformance.avgConfidence?.toNumber()
          } : null
        },
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Failed to get algorithm status:', error);
    return res.status(500).json({
      error: 'Failed to get algorithm status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/algorithm/performance/calculate
 * Trigger performance calculation
 */
router.post('/performance/calculate', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { timeframe = 'daily' } = req.body;

    if (!['daily', 'weekly', 'monthly'].includes(timeframe)) {
      return res.status(400).json({
        error: 'Invalid timeframe. Must be daily, weekly, or monthly'
      });
    }

    // Add performance calculation job to queue
    await AlgorithmQueueService.addPerformanceJob(userId, timeframe);

    return res.json({
      success: true,
      message: 'Performance calculation requested',
      timeframe
    });

  } catch (error) {
    console.error('Failed to trigger performance calculation:', error);
    return res.status(500).json({
      error: 'Failed to trigger performance calculation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
