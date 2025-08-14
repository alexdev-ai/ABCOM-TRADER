import { Router } from 'express';
import { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { portfolioOptimizationService } from '../services/portfolioOptimization.service';
import { riskAnalysisService } from '../services/riskAnalysis.service';
import { taxOptimizationService } from '../services/taxOptimization.service';
import { rebalancingEngineService } from '../services/rebalancingEngine.service';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * GET /api/portfolio-optimization/analysis
 * Get current portfolio analysis with optimization recommendations
 */
router.get('/analysis', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get comprehensive portfolio analysis
    const [
      riskMetrics,
      correlationMatrix,
      riskDecomposition,
      efficientFrontier,
      harvestingOpportunities
    ] = await Promise.all([
      riskAnalysisService.calculatePortfolioRiskMetrics(userId),
      riskAnalysisService.calculateCorrelationMatrix(userId),
      riskAnalysisService.performRiskDecomposition(userId),
      portfolioOptimizationService.generateEfficientFrontier(userId, 25),
      taxOptimizationService.identifyTaxLossHarvesting(userId)
    ]);

    const analysis = {
      riskMetrics,
      correlationMatrix,
      riskDecomposition,
      efficientFrontier,
      taxOptimization: {
        harvestingOpportunities: harvestingOpportunities.slice(0, 10), // Top 10 opportunities
        totalPotentialBenefit: harvestingOpportunities.reduce((sum, opp) => sum + opp.taxBenefit, 0)
      },
      lastUpdated: new Date()
    };

    res.json(analysis);
  } catch (error) {
    console.error('Portfolio analysis error:', error);
    return res.status(500).json({ error: 'Failed to generate portfolio analysis' });
  }
});

/**
 * GET /api/portfolio-optimization/targets
 * Get user's target allocations
 */
router.get('/targets', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Mock implementation - get user's target allocations from database
    const targets: any[] = []; // TODO: Implement getUserTargetAllocations
    
    res.json({
      targets,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Get targets error:', error);
    return res.status(500).json({ error: 'Failed to retrieve target allocations' });
  }
});

/**
 * POST /api/portfolio-optimization/targets
 * Set user's target allocations
 */
router.post('/targets', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { targets } = req.body;
    
    if (!targets || !Array.isArray(targets)) {
      return res.status(400).json({ error: 'Invalid targets format' });
    }

    // Validate targets sum to 100%
    const totalAllocation = targets.reduce((sum, target) => sum + target.percentage, 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
      return res.status(400).json({ error: 'Target allocations must sum to 100%' });
    }

    // Mock implementation - save target allocations
    // TODO: Implement setUserTargetAllocations
    console.log(`Setting target allocations for user ${userId}:`, targets);
    
    res.json({
      success: true,
      message: 'Target allocations updated successfully',
      targets
    });
  } catch (error) {
    console.error('Set targets error:', error);
    return res.status(500).json({ error: 'Failed to set target allocations' });
  }
});

/**
 * GET /api/portfolio-optimization/recommendations
 * Get rebalancing recommendations
 */
router.get('/recommendations', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { 
      method = 'tax_optimized',
      maxTaxImpact,
      minTradeSize,
      maxTradeSize
    } = req.query;

    // Mock implementation - get user's target allocations
    const targets: any[] = []; // TODO: Implement getUserTargetAllocations
    if (!targets.length) {
      return res.status(400).json({ error: 'No target allocations set. Please set targets first.' });
    }

    // Convert targets to allocation map
    const targetAllocations = targets.reduce((acc: { [symbol: string]: number }, target: any) => {
      acc[target.symbol] = target.percentage / 100;
      return acc;
    }, {} as { [symbol: string]: number });

    // Generate rebalancing plan
    const rebalancingRequest: any = {
      userId,
      targetAllocations,
      rebalancingMethod: method as 'immediate' | 'staged' | 'tax_optimized',
      constraints: {
        ...(minTradeSize && { minTradeSize: parseFloat(minTradeSize as string) }),
        ...(maxTradeSize && { maxTradeSize: parseFloat(maxTradeSize as string) }),
        allowPartialRebalancing: true,
        prioritizeTaxLossHarvesting: method === 'tax_optimized'
      }
    };

    if (maxTaxImpact) {
      rebalancingRequest.maxTaxImpact = parseFloat(maxTaxImpact as string);
    }

    const rebalancingPlan = await rebalancingEngineService.generateRebalancingPlan(rebalancingRequest);

    res.json(rebalancingPlan);
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ error: 'Failed to generate rebalancing recommendations' });
  }
});

/**
 * POST /api/portfolio-optimization/optimize
 * Run optimization analysis with specific parameters
 */
router.post('/optimize', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { 
      method = 'mpt',
      targetReturn,
      targetRisk,
      investorViews
    } = req.body;

    let optimizationResult;

    switch (method) {
      case 'mpt':
        optimizationResult = await portfolioOptimizationService.optimizePortfolioMPT(
          userId,
          targetReturn,
          targetRisk
        );
        break;
      case 'risk_parity':
        optimizationResult = await portfolioOptimizationService.optimizePortfolioRiskParity(userId);
        break;
      case 'black_litterman':
        optimizationResult = await portfolioOptimizationService.optimizePortfolioBlackLitterman(
          userId,
          investorViews
        );
        break;
      default:
        return res.status(400).json({ error: 'Invalid optimization method' });
    }

    res.json({
      method,
      result: optimizationResult,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Optimization error:', error);
    res.status(500).json({ error: 'Failed to run portfolio optimization' });
  }
});

/**
 * GET /api/portfolio-optimization/scenarios
 * Get scenario analysis results
 */
router.get('/scenarios', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const {
      scenarios = 1000,
      timeHorizon = 252,
      stressTest = true
    } = req.query;

    const results = await Promise.all([
      // Monte Carlo simulation
      riskAnalysisService.runMonteCarloSimulation(
        userId,
        parseInt(scenarios as string),
        parseInt(timeHorizon as string)
      ),
      // Stress testing (if requested)
      stressTest === 'true' 
        ? riskAnalysisService.runStressTests(userId)
        : Promise.resolve([]),
      // VaR calculations
      riskAnalysisService.calculateVaRMethods(userId)
    ]);

    const [monteCarloResults, stressTestResults, varCalculations] = results;

    res.json({
      monteCarlo: monteCarloResults,
      stressTests: stressTestResults,
      valueAtRisk: varCalculations,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Scenario analysis error:', error);
    res.status(500).json({ error: 'Failed to run scenario analysis' });
  }
});

/**
 * POST /api/portfolio-optimization/execute
 * Execute rebalancing plan
 */
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { planId, executionMethod = 'manual_approval' } = req.body;

    if (!planId) {
      return res.status(400).json({ error: 'Plan ID is required' });
    }

    const executionResult = await rebalancingEngineService.executeRebalancingPlan(
      planId,
      executionMethod
    );

    res.json(executionResult);
  } catch (error) {
    console.error('Execution error:', error);
    res.status(500).json({ error: 'Failed to execute rebalancing plan' });
  }
});

/**
 * GET /api/portfolio-optimization/execution/:executionId
 * Get execution progress
 */
router.get('/execution/:executionId', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { executionId } = req.params;
    
    if (!executionId) {
      return res.status(400).json({ error: 'Execution ID is required' });
    }
    
    const progress = await rebalancingEngineService.getRebalancingProgress(executionId);

    res.json(progress);
  } catch (error) {
    console.error('Execution progress error:', error);
    res.status(500).json({ error: 'Failed to get execution progress' });
  }
});

/**
 * GET /api/portfolio-optimization/tax-analysis
 * Get comprehensive tax analysis
 */
router.get('/tax-analysis', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const harvestingOpportunities = await taxOptimizationService.identifyTaxLossHarvesting(userId);
    const washSaleViolations = await taxOptimizationService.checkWashSaleViolations(userId);
    
    // Get guidance for largest position (example)
    const washSaleGuidance = harvestingOpportunities.length > 0 && harvestingOpportunities[0]
      ? await taxOptimizationService.getWashSalePreventionGuidance(userId, harvestingOpportunities[0].symbol)
      : null;

    res.json({
      harvestingOpportunities,
      washSaleViolations,
      washSaleGuidance,
      summary: {
        totalHarvestingBenefit: harvestingOpportunities.reduce((sum: number, opp: any) => sum + opp.taxBenefit, 0),
        violationsCount: washSaleViolations.length,
        totalLossDisallowed: washSaleViolations.reduce((sum: number, v: any) => sum + v.lossDisallowed, 0)
      },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Tax analysis error:', error);
    res.status(500).json({ error: 'Failed to generate tax analysis' });
  }
});

/**
 * POST /api/portfolio-optimization/tax-impact
 * Calculate tax impact of proposed trades
 */
router.post('/tax-impact', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { recommendations, userTaxRates } = req.body;

    if (!recommendations || !Array.isArray(recommendations)) {
      return res.status(400).json({ error: 'Recommendations array is required' });
    }

    const taxImpact = await taxOptimizationService.calculateTaxImpact(
      userId,
      recommendations,
      userTaxRates
    );

    res.json(taxImpact);
  } catch (error) {
    console.error('Tax impact calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate tax impact' });
  }
});

/**
 * GET /api/portfolio-optimization/history
 * Get optimization history and results
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { limit = 10, offset = 0 } = req.query;

    // Mock implementation - get optimization history from database
    const history: any[] = []; // TODO: Implement getOptimizationHistory

    res.json({
      history,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: history.length
      }
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to retrieve optimization history' });
  }
});

export default router;
