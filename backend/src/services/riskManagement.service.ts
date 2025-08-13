import { PrismaClient } from '@prisma/client';
import { AuditService } from './audit.service';

const prisma = new PrismaClient();

export interface RiskFactors {
  portfolioVolatility: number;
  portfolioConcentration: number;
  accountLeverage: number;
  marketVolatility: number;
  liquidityRisk: number;
  drawdownRisk: number;
}

export interface RiskAssessment {
  userId: string;
  riskScore: number; // 0-100 scale
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskFactors: RiskFactors;
  riskLimits: {
    maxDailyLoss: number;
    maxPositionSize: number;
    maxPortfolioConcentration: number;
    maxLeverage: number;
  };
  lastAssessment: Date;
  nextReview: Date;
}

export interface MarketConditions {
  vixLevel: number;
  marketTrend: 'BULL' | 'BEAR' | 'SIDEWAYS';
  volatilityRegime: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';
  liquidityConditions: 'NORMAL' | 'STRESSED' | 'CRISIS';
}

class RiskManagementService {
  
  /**
   * Calculate comprehensive risk score for a user
   * Combines portfolio metrics, market conditions, and behavioral factors
   */
  async calculateRiskScore(userId: string): Promise<RiskAssessment> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          portfolioSummary: true,
          portfolioPositions: true,
          tradingSessions: {
            where: { status: 'ACTIVE' }
          }
        }
      });

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // Get current market conditions
      const marketConditions = await this.getCurrentMarketConditions();
      
      // Calculate individual risk factors
      const riskFactors = await this.calculateRiskFactors(userId, marketConditions);
      
      // Calculate composite risk score (0-100)
      const riskScore = this.calculateCompositeRiskScore(riskFactors, marketConditions);
      
      // Determine risk level based on score
      const riskLevel = this.determineRiskLevel(riskScore);
      
      // Calculate dynamic risk limits
      const riskLimits = this.calculateDynamicRiskLimits(
        user, 
        riskScore, 
        marketConditions
      );

      const assessment: RiskAssessment = {
        userId,
        riskScore,
        riskLevel,
        riskFactors,
        riskLimits,
        lastAssessment: new Date(),
        nextReview: this.calculateNextReviewDate(riskLevel)
      };

      // Store assessment in database
      await this.storeRiskAssessment(assessment);
      
      // Log risk assessment for audit
      await AuditService.log({
        userId,
        eventType: 'risk_management',
        eventAction: 'RISK_ASSESSMENT_CALCULATED',
        eventData: {
          riskScore,
          riskLevel,
          riskFactors
        },
        ipAddress: undefined,
        userAgent: 'risk-service'
      });

      return assessment;

    } catch (error) {
      console.error('Error calculating risk score:', error);
      throw new Error('Failed to calculate risk assessment');
    }
  }

  /**
   * Calculate individual risk factors
   */
  private async calculateRiskFactors(
    userId: string, 
    marketConditions: MarketConditions
  ): Promise<RiskFactors> {
    
    // Portfolio Volatility (0-100)
    const portfolioVolatility = await this.calculatePortfolioVolatility(userId);
    
    // Portfolio Concentration (0-100) - higher concentration = higher risk
    const portfolioConcentration = await this.calculatePortfolioConcentration(userId);
    
    // Account Leverage (0-100)
    const accountLeverage = await this.calculateAccountLeverage(userId);
    
    // Market Volatility Impact (0-100)
    const marketVolatility = this.calculateMarketVolatilityRisk(marketConditions);
    
    // Liquidity Risk (0-100)
    const liquidityRisk = await this.calculateLiquidityRisk(userId, marketConditions);
    
    // Drawdown Risk (0-100)
    const drawdownRisk = await this.calculateDrawdownRisk(userId);

    return {
      portfolioVolatility,
      portfolioConcentration,
      accountLeverage,
      marketVolatility,
      liquidityRisk,
      drawdownRisk
    };
  }

  /**
   * Calculate portfolio volatility based on holdings and historical data
   */
  private async calculatePortfolioVolatility(userId: string): Promise<number> {
    const positions = await prisma.portfolioPosition.findMany({
      where: { userId }
    });

    if (positions.length === 0) return 0;

    // Calculate weighted portfolio volatility
    let totalValue = 0;
    let weightedVolatility = 0;

    for (const position of positions) {
      const positionValue = position.marketValue?.toNumber() || 0;
      totalValue += positionValue;

      // Get historical volatility for this symbol (simplified - would use real market data)
      const symbolVolatility = await this.getSymbolVolatility(position.symbol);
      const weight = positionValue / totalValue;
      
      weightedVolatility += weight * symbolVolatility;
    }

    // Normalize to 0-100 scale (assuming max volatility of 100%)
    return Math.min(weightedVolatility * 100, 100);
  }

  /**
   * Calculate portfolio concentration risk
   */
  private async calculatePortfolioConcentration(userId: string): Promise<number> {
    const positions = await prisma.portfolioPosition.findMany({
      where: { userId }
    });

    if (positions.length === 0) return 0;

    const totalValue = positions.reduce((sum, pos) => 
      sum + (pos.marketValue?.toNumber() || 0), 0
    );

    if (totalValue === 0) return 0;

    // Calculate Herfindahl-Hirschman Index for concentration
    let hhi = 0;
    for (const position of positions) {
      const weight = (position.marketValue?.toNumber() || 0) / totalValue;
      hhi += weight * weight;
    }

    // Convert HHI to 0-100 risk score
    // HHI ranges from 1/n (perfectly diversified) to 1 (completely concentrated)
    // Higher HHI = higher concentration risk
    return Math.min(hhi * 100, 100);
  }

  /**
   * Calculate account leverage risk
   */
  private async calculateAccountLeverage(userId: string): Promise<number> {
    const summary = await prisma.portfolioSummary.findUnique({
      where: { userId }
    });

    if (!summary) return 0;

    const totalValue = summary.totalValue.toNumber();
    const cashBalance = summary.cashBalance.toNumber();
    
    // Simple leverage calculation (for day trading, mostly cash-based)
    // Higher utilization of available cash = higher risk
    const utilizationRate = Math.max(0, (totalValue - cashBalance) / totalValue);
    
    return Math.min(utilizationRate * 100, 100);
  }

  /**
   * Calculate market volatility risk impact
   */
  private calculateMarketVolatilityRisk(marketConditions: MarketConditions): number {
    // Map market volatility to risk score
    const volatilityRiskMap = {
      'LOW': 10,
      'NORMAL': 25,
      'HIGH': 60,
      'EXTREME': 90
    };

    return volatilityRiskMap[marketConditions.volatilityRegime];
  }

  /**
   * Calculate liquidity risk based on positions and market conditions
   */
  private async calculateLiquidityRisk(
    userId: string, 
    marketConditions: MarketConditions
  ): Promise<number> {
    const positions = await prisma.portfolioPosition.findMany({
      where: { userId }
    });

    if (positions.length === 0) return 0;

    let totalRisk = 0;
    let totalValue = 0;

    for (const position of positions) {
      const positionValue = position.marketValue?.toNumber() || 0;
      totalValue += positionValue;

      // Get liquidity score for symbol (simplified)
      const liquidityScore = await this.getSymbolLiquidityScore(position.symbol);
      
      // Adjust for market conditions
      const marketAdjustment = marketConditions.liquidityConditions === 'CRISIS' ? 2 : 
                              marketConditions.liquidityConditions === 'STRESSED' ? 1.5 : 1;
      
      const positionRisk = liquidityScore * marketAdjustment;
      totalRisk += (positionValue / totalValue) * positionRisk;
    }

    return Math.min(totalRisk, 100);
  }

  /**
   * Calculate drawdown risk based on recent performance
   */
  private async calculateDrawdownRisk(userId: string): Promise<number> {
    // Get recent trading sessions to analyze drawdown patterns
    const recentSessions = await prisma.tradingSession.findMany({
      where: { 
        userId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    if (recentSessions.length === 0) return 0;

    // Calculate maximum drawdown percentage
    let maxDrawdown = 0;
    let consecutiveLosses = 0;
    let maxConsecutiveLosses = 0;

    for (const session of recentSessions) {
      const sessionPnL = session.realizedPnl?.toNumber() || 0;
      
      if (sessionPnL < 0) {
        consecutiveLosses++;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, consecutiveLosses);
        maxDrawdown = Math.max(maxDrawdown, Math.abs(sessionPnL));
      } else {
        consecutiveLosses = 0;
      }
    }

    // Convert drawdown to risk score (simplified)
    const drawdownRisk = Math.min((maxDrawdown / 100) * 50, 50); // Drawdown component
    const streakRisk = Math.min(maxConsecutiveLosses * 10, 50); // Losing streak component
    
    return drawdownRisk + streakRisk;
  }

  /**
   * Calculate composite risk score from individual factors
   */
  private calculateCompositeRiskScore(
    factors: RiskFactors, 
    marketConditions: MarketConditions
  ): number {
    // Weighted risk score calculation
    const weights = {
      portfolioVolatility: 0.25,
      portfolioConcentration: 0.20,
      accountLeverage: 0.15,
      marketVolatility: 0.20,
      liquidityRisk: 0.10,
      drawdownRisk: 0.10
    };

    let compositeScore = 0;
    
    compositeScore += factors.portfolioVolatility * weights.portfolioVolatility;
    compositeScore += factors.portfolioConcentration * weights.portfolioConcentration;
    compositeScore += factors.accountLeverage * weights.accountLeverage;
    compositeScore += factors.marketVolatility * weights.marketVolatility;
    compositeScore += factors.liquidityRisk * weights.liquidityRisk;
    compositeScore += factors.drawdownRisk * weights.drawdownRisk;

    // Apply market condition multiplier
    const marketMultiplier = marketConditions.volatilityRegime === 'EXTREME' ? 1.3 :
                            marketConditions.volatilityRegime === 'HIGH' ? 1.15 :
                            marketConditions.volatilityRegime === 'LOW' ? 0.9 : 1.0;

    compositeScore *= marketMultiplier;

    return Math.min(Math.max(compositeScore, 0), 100);
  }

  /**
   * Determine risk level based on composite score
   */
  private determineRiskLevel(riskScore: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (riskScore >= 80) return 'CRITICAL';
    if (riskScore >= 60) return 'HIGH';
    if (riskScore >= 35) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Calculate dynamic risk limits based on assessment
   */
  private calculateDynamicRiskLimits(
    user: any,
    riskScore: number,
    marketConditions: MarketConditions
  ) {
    const baseLimits = {
      maxDailyLoss: 100, // Base $100 daily loss limit
      maxPositionSize: 1000, // Base $1000 position size
      maxPortfolioConcentration: 50, // Base 50% max concentration
      maxLeverage: 1.0 // Base no leverage
    };

    // Adjust limits based on risk score (higher risk = tighter limits)
    const riskAdjustment = Math.max(0.3, (100 - riskScore) / 100);
    
    // Adjust limits based on market conditions
    const marketAdjustment = marketConditions.volatilityRegime === 'EXTREME' ? 0.5 :
                            marketConditions.volatilityRegime === 'HIGH' ? 0.7 :
                            marketConditions.volatilityRegime === 'LOW' ? 1.2 : 1.0;

    const totalAdjustment = riskAdjustment * marketAdjustment;

    return {
      maxDailyLoss: Math.round(baseLimits.maxDailyLoss * totalAdjustment),
      maxPositionSize: Math.round(baseLimits.maxPositionSize * totalAdjustment),
      maxPortfolioConcentration: Math.round(baseLimits.maxPortfolioConcentration * totalAdjustment),
      maxLeverage: baseLimits.maxLeverage * totalAdjustment
    };
  }

  /**
   * Calculate next review date based on risk level
   */
  private calculateNextReviewDate(riskLevel: string): Date {
    const now = new Date();
    const hoursToAdd = riskLevel === 'CRITICAL' ? 1 :   // Review every hour
                      riskLevel === 'HIGH' ? 4 :        // Review every 4 hours  
                      riskLevel === 'MEDIUM' ? 24 :     // Review daily
                      72;                               // Review every 3 days

    return new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);
  }

  /**
   * Store risk assessment in database
   */
  private async storeRiskAssessment(assessment: RiskAssessment): Promise<void> {
    await prisma.riskManagement.upsert({
      where: { userId: assessment.userId },
      update: {
        riskScore: assessment.riskScore,
        riskLevel: assessment.riskLevel,
        riskFactors: JSON.stringify(assessment.riskFactors),
        riskLimits: JSON.stringify(assessment.riskLimits),
        lastAssessment: assessment.lastAssessment,
        nextReview: assessment.nextReview,
        dailyLossLimit: assessment.riskLimits.maxDailyLoss,
        weeklyLossLimit: assessment.riskLimits.maxDailyLoss * 5,
        monthlyLossLimit: assessment.riskLimits.maxDailyLoss * 20
      },
      create: {
        userId: assessment.userId,
        riskProfile: assessment.riskLevel,
        riskScore: assessment.riskScore,
        riskLevel: assessment.riskLevel,
        riskFactors: JSON.stringify(assessment.riskFactors),
        riskLimits: JSON.stringify(assessment.riskLimits),
        dailyLossLimit: assessment.riskLimits.maxDailyLoss,
        weeklyLossLimit: assessment.riskLimits.maxDailyLoss * 5,
        monthlyLossLimit: assessment.riskLimits.maxDailyLoss * 20,
        lastAssessment: assessment.lastAssessment,
        nextReview: assessment.nextReview
      }
    });
  }

  /**
   * Get current market conditions (simplified - would integrate with real market data)
   */
  private async getCurrentMarketConditions(): Promise<MarketConditions> {
    // This would integrate with real market data APIs
    // For now, return simulated conditions
    return {
      vixLevel: 20.5, // VIX level
      marketTrend: 'BULL',
      volatilityRegime: 'NORMAL',
      liquidityConditions: 'NORMAL'
    };
  }

  /**
   * Get symbol volatility (simplified - would use real market data)
   */
  private async getSymbolVolatility(symbol: string): Promise<number> {
    // This would calculate or fetch real volatility data
    // For now, return simulated volatility (0-1 scale)
    const volatilityMap: { [key: string]: number } = {
      'AAPL': 0.25,
      'GOOGL': 0.30,
      'TSLA': 0.45,
      'SPY': 0.15,
      'QQQ': 0.20
    };
    
    return volatilityMap[symbol] || 0.25; // Default 25% volatility
  }

  /**
   * Get symbol liquidity score (simplified)
   */
  private async getSymbolLiquidityScore(symbol: string): Promise<number> {
    // This would assess real liquidity metrics
    // For now, return simulated liquidity risk (0-100, higher = more risk)
    const liquidityRiskMap: { [key: string]: number } = {
      'AAPL': 5,   // Very liquid
      'GOOGL': 10, // Liquid
      'TSLA': 25,  // Moderate liquidity
      'SPY': 2,    // Extremely liquid
      'QQQ': 5     // Very liquid
    };
    
    return liquidityRiskMap[symbol] || 30; // Default moderate risk
  }

  /**
   * Get current risk assessment for user
   */
  async getCurrentRiskAssessment(userId: string): Promise<RiskAssessment | null> {
    try {
      const riskRecord = await prisma.riskManagement.findUnique({
        where: { userId }
      });

      if (!riskRecord) return null;

      return {
        userId: riskRecord.userId,
        riskScore: riskRecord.riskScore,
        riskLevel: riskRecord.riskLevel as any,
        riskFactors: JSON.parse(riskRecord.riskFactors),
        riskLimits: JSON.parse(riskRecord.riskLimits),
        lastAssessment: riskRecord.lastAssessment,
        nextReview: riskRecord.nextReview
      };
    } catch (error) {
      console.error('Error getting risk assessment:', error);
      return null;
    }
  }

  /**
   * Check if user needs risk assessment update
   */
  async needsRiskAssessment(userId: string): Promise<boolean> {
    const assessment = await this.getCurrentRiskAssessment(userId);
    
    if (!assessment) return true;
    
    return new Date() >= assessment.nextReview;
  }

  /**
   * Get users requiring risk assessment updates
   */
  async getUsersNeedingAssessment(): Promise<string[]> {
    const riskRecords = await prisma.riskManagement.findMany({
      where: {
        nextReview: {
          lte: new Date()
        }
      },
      select: { userId: true }
    });

    return riskRecords.map(record => record.userId);
  }
}

export const riskManagementService = new RiskManagementService();
