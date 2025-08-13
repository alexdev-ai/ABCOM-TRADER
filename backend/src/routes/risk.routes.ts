import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateSchema } from '../middleware/validation.middleware';
import { riskManagementService } from '../services/riskManagement.service';
import { AuditService } from '../services/audit.service';

const router = Router();

// Risk assessment request schema
const riskAssessmentSchema = z.object({
  userId: z.string().optional() // Optional - will use authenticated user if not provided
});

// Risk limits update schema
const updateRiskLimitsSchema = z.object({
  maxDailyLoss: z.number().min(10).max(10000),
  maxPositionSize: z.number().min(100).max(100000),
  maxPortfolioConcentration: z.number().min(10).max(100),
  maxLeverage: z.number().min(1).max(5)
});

/**
 * GET /api/v1/risk/assessment
 * Get current risk assessment for authenticated user
 */
router.get('/assessment', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if user needs new risk assessment
    const needsAssessment = await riskManagementService.needsRiskAssessment(userId);
    
    let assessment;
    if (needsAssessment) {
      // Calculate new risk assessment
      assessment = await riskManagementService.calculateRiskScore(userId);
    } else {
      // Get existing assessment
      assessment = await riskManagementService.getCurrentRiskAssessment(userId);
    }

    if (!assessment) {
      return res.status(404).json({ error: 'No risk assessment found' });
    }

    // Log risk assessment access
    await AuditService.log({
      userId,
      eventType: 'risk_management',
      eventAction: 'RISK_ASSESSMENT_ACCESSED',
      eventData: {
        riskScore: assessment.riskScore,
        riskLevel: assessment.riskLevel,
        timestamp: new Date().toISOString()
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: assessment
    });
  } catch (error) {
    console.error('Error getting risk assessment:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve risk assessment',
      details: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
    });
  }
});

/**
 * POST /api/v1/risk/assessment/calculate
 * Force recalculation of risk assessment
 */
router.post('/assessment/calculate', 
  authenticateToken, 
  validateSchema(riskAssessmentSchema),
  async (req, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Force recalculation of risk assessment
      const assessment = await riskManagementService.calculateRiskScore(userId);

      // Log forced risk assessment
      await AuditService.log({
        userId,
        eventType: 'risk_management',
        eventAction: 'RISK_ASSESSMENT_FORCED',
        eventData: {
          riskScore: assessment.riskScore,
          riskLevel: assessment.riskLevel,
          previousAssessment: assessment.lastAssessment.toISOString(),
          timestamp: new Date().toISOString()
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Risk assessment recalculated successfully',
        data: assessment
      });
    } catch (error) {
      console.error('Error calculating risk assessment:', error);
      res.status(500).json({ 
        error: 'Failed to calculate risk assessment',
        details: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
      });
    }
  }
);

/**
 * GET /api/v1/risk/status
 * Get risk status summary for dashboard display
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const assessment = await riskManagementService.getCurrentRiskAssessment(userId);
    
    if (!assessment) {
      return res.json({
        success: true,
        data: {
          hasAssessment: false,
          needsAssessment: true,
          riskLevel: 'UNKNOWN',
          message: 'Risk assessment required'
        }
      });
    }

    const needsUpdate = await riskManagementService.needsRiskAssessment(userId);

    res.json({
      success: true,
      data: {
        hasAssessment: true,
        needsAssessment: needsUpdate,
        riskLevel: assessment.riskLevel,
        riskScore: assessment.riskScore,
        lastAssessment: assessment.lastAssessment,
        nextReview: assessment.nextReview,
        riskLimits: assessment.riskLimits,
        message: needsUpdate ? 'Risk assessment update recommended' : 'Risk assessment current'
      }
    });
  } catch (error) {
    console.error('Error getting risk status:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve risk status',
      details: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
    });
  }
});

/**
 * GET /api/v1/risk/limits
 * Get current risk limits for user
 */
router.get('/limits', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const assessment = await riskManagementService.getCurrentRiskAssessment(userId);
    
    if (!assessment) {
      return res.status(404).json({ error: 'No risk assessment found' });
    }

    res.json({
      success: true,
      data: {
        riskLimits: assessment.riskLimits,
        riskLevel: assessment.riskLevel,
        lastUpdated: assessment.lastAssessment
      }
    });
  } catch (error) {
    console.error('Error getting risk limits:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve risk limits',
      details: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
    });
  }
});

/**
 * GET /api/v1/risk/factors
 * Get detailed risk factors breakdown
 */
router.get('/factors', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const assessment = await riskManagementService.getCurrentRiskAssessment(userId);
    
    if (!assessment) {
      return res.status(404).json({ error: 'No risk assessment found' });
    }

    // Calculate factor contributions to overall score
    const factors = assessment.riskFactors;
    const totalScore = assessment.riskScore;

    // Calculate individual factor impacts (simplified weighting)
    const factorImpacts = {
      portfolioVolatility: {
        value: factors.portfolioVolatility,
        impact: (factors.portfolioVolatility * 0.25 / totalScore) * 100,
        description: 'Risk from price volatility of your holdings'
      },
      portfolioConcentration: {
        value: factors.portfolioConcentration,
        impact: (factors.portfolioConcentration * 0.20 / totalScore) * 100,
        description: 'Risk from having too many eggs in one basket'
      },
      accountLeverage: {
        value: factors.accountLeverage,
        impact: (factors.accountLeverage * 0.15 / totalScore) * 100,
        description: 'Risk from borrowing to trade (leverage)'
      },
      marketVolatility: {
        value: factors.marketVolatility,
        impact: (factors.marketVolatility * 0.20 / totalScore) * 100,
        description: 'Risk from overall market conditions'
      },
      liquidityRisk: {
        value: factors.liquidityRisk,
        impact: (factors.liquidityRisk * 0.10 / totalScore) * 100,
        description: 'Risk from difficulty selling your positions'
      },
      drawdownRisk: {
        value: factors.drawdownRisk,
        impact: (factors.drawdownRisk * 0.10 / totalScore) * 100,
        description: 'Risk based on recent trading performance'
      }
    };

    res.json({
      success: true,
      data: {
        overallRiskScore: totalScore,
        riskLevel: assessment.riskLevel,
        factors: factorImpacts,
        lastCalculated: assessment.lastAssessment,
        recommendations: generateRiskRecommendations(assessment)
      }
    });
  } catch (error) {
    console.error('Error getting risk factors:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve risk factors',
      details: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
    });
  }
});

/**
 * GET /api/v1/risk/recommendations
 * Get personalized risk management recommendations
 */
router.get('/recommendations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const assessment = await riskManagementService.getCurrentRiskAssessment(userId);
    
    if (!assessment) {
      return res.status(404).json({ error: 'No risk assessment found' });
    }

    const recommendations = generateRiskRecommendations(assessment);

    res.json({
      success: true,
      data: {
        riskLevel: assessment.riskLevel,
        riskScore: assessment.riskScore,
        recommendations,
        actionItems: generateActionItems(assessment),
        educationalContent: generateEducationalContent(assessment)
      }
    });
  } catch (error) {
    console.error('Error getting risk recommendations:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve risk recommendations',
      details: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
    });
  }
});

/**
 * Generate risk recommendations based on assessment
 */
function generateRiskRecommendations(assessment: any): string[] {
  const recommendations: string[] = [];
  const factors = assessment.riskFactors;
  const riskLevel = assessment.riskLevel;

  // High-level recommendations based on risk level
  if (riskLevel === 'CRITICAL') {
    recommendations.push('🚨 Consider stopping trading until risk factors are addressed');
    recommendations.push('📞 Consider consulting with a financial advisor');
  } else if (riskLevel === 'HIGH') {
    recommendations.push('⚠️ Reduce position sizes to lower overall risk');
    recommendations.push('🎯 Focus on more diversified investments');
  }

  // Specific recommendations based on individual factors
  if (factors.portfolioConcentration > 60) {
    recommendations.push('🔀 Diversify your portfolio - you have too much concentration in few stocks');
  }

  if (factors.portfolioVolatility > 50) {
    recommendations.push('📉 Consider adding some stable, low-volatility investments');
  }

  if (factors.accountLeverage > 40) {
    recommendations.push('💰 Reduce leverage - you\'re borrowing too much to trade');
  }

  if (factors.marketVolatility > 60) {
    recommendations.push('🌪️ Current market conditions are volatile - consider reducing exposure');
  }

  if (factors.drawdownRisk > 40) {
    recommendations.push('📈 Take a break from trading to review your strategy');
  }

  // Default recommendations if risk is low
  if (recommendations.length === 0) {
    recommendations.push('✅ Your risk profile looks good!');
    recommendations.push('📚 Continue learning about risk management');
    recommendations.push('💡 Consider gradually increasing position sizes as you gain experience');
  }

  return recommendations;
}

/**
 * Generate specific action items
 */
function generateActionItems(assessment: any): string[] {
  const actionItems: string[] = [];
  const factors = assessment.riskFactors;

  if (factors.portfolioConcentration > 50) {
    actionItems.push('Sell some of your largest positions to improve diversification');
  }

  if (factors.portfolioVolatility > 40) {
    actionItems.push('Add 20-30% stable investments like SPY or QQQ');
  }

  if (factors.drawdownRisk > 30) {
    actionItems.push('Review your recent losing trades to identify patterns');
  }

  if (actionItems.length === 0) {
    actionItems.push('Continue monitoring your risk levels weekly');
    actionItems.push('Set up automatic stop-losses on all positions');
  }

  return actionItems;
}

/**
 * Generate educational content based on risk profile
 */
function generateEducationalContent(assessment: any): any[] {
  const content: any[] = [];
  const factors = assessment.riskFactors;

  if (factors.portfolioConcentration > 40) {
    content.push({
      title: 'Understanding Portfolio Diversification',
      description: 'Learn why spreading investments reduces risk',
      link: '/education/diversification',
      priority: 'high'
    });
  }

  if (factors.portfolioVolatility > 40) {
    content.push({
      title: 'Managing Volatility Risk',
      description: 'Strategies for handling market swings',
      link: '/education/volatility',
      priority: 'medium'
    });
  }

  // Always include basic content
  content.push({
    title: 'Risk Management Basics',
    description: 'Essential principles every trader should know',
    link: '/education/risk-basics',
    priority: 'low'
  });

  return content;
}

export default router;
