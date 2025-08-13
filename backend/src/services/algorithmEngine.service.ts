import { PrismaClient, Prisma } from '@prisma/client';
import { Decimal } from 'decimal.js';

const prisma = new PrismaClient();

// Algorithm decision interfaces
export interface AlgorithmInput {
  userId: string;
  sessionId?: string | undefined;
  symbol: string;
  currentPrice: number;
  marketCondition: MarketConditionData;
  userRiskProfile: UserRiskProfile;
  portfolioContext: PortfolioContext;
  technicalIndicators: TechnicalIndicators;
  fundamentalData?: FundamentalData;
}

export interface MarketConditionData {
  overallCondition: 'bull' | 'bear' | 'sideways' | 'volatile';
  trendStrength: number; // 0-100
  volatilityIndex: number;
  marketSentiment: 'positive' | 'negative' | 'neutral';
  spyPrice: number;
  spyChangePercent: number;
  volume: number;
  rsi: number;
  macd: number;
  sma20: number;
  sma50: number;
  sma200: number;
}

export interface UserRiskProfile {
  riskTolerance: string;
  riskScore: number; // 0-100
  dailyLossLimit: number;
  accountBalance: number;
  maxPositionSize: number; // Percentage of portfolio
}

export interface PortfolioContext {
  totalValue: number;
  cashBalance: number;
  currentPosition?: {
    symbol: string;
    quantity: number;
    averageCost: number;
    currentValue: number;
    unrealizedPnl: number;
  } | undefined;
  diversification: {
    numberOfPositions: number;
    sectorConcentration: Record<string, number>;
  };
}

export interface TechnicalIndicators {
  rsi: number;
  macd: number;
  sma20: number;
  sma50: number;
  sma200: number;
  bollBandUpper: number;
  bollBandLower: number;
  volume: number;
  priceChange24h: number;
  support: number;
  resistance: number;
}

export interface FundamentalData {
  pe: number;
  marketCap: number;
  sector: string;
  industry: string;
  earnings?: {
    eps: number;
    growth: number;
    nextEarningsDate?: Date;
  };
}

export interface AlgorithmDecision {
  decisionType: 'buy' | 'sell' | 'hold' | 'stop';
  confidence: number; // 0-100
  reasoning: string;
  positionSize: number; // Recommended position size
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskScore: number;
  expectedReturn: number;
  timeHorizon: number; // Expected holding time in minutes
}

export class AlgorithmEngine {
  private static instance: AlgorithmEngine;
  private algorithmConfig: any;

  private constructor() {
    this.loadAlgorithmConfig();
  }

  public static getInstance(): AlgorithmEngine {
    if (!AlgorithmEngine.instance) {
      AlgorithmEngine.instance = new AlgorithmEngine();
    }
    return AlgorithmEngine.instance;
  }

  /**
   * Load algorithm configuration from database
   */
  private async loadAlgorithmConfig() {
    try {
      const config = await prisma.algorithmConfig.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      });

      if (config) {
        this.algorithmConfig = {
          ...config,
          parameters: JSON.parse(config.parameters),
          riskParameters: JSON.parse(config.riskParameters),
          marketConditionWeights: JSON.parse(config.marketConditionWeights)
        };
      } else {
        // Create default configuration
        await this.createDefaultConfig();
      }
    } catch (error) {
      console.error('Failed to load algorithm configuration:', error);
      throw new Error('Algorithm configuration initialization failed');
    }
  }

  /**
   * Create default algorithm configuration
   */
  private async createDefaultConfig() {
    const defaultConfig = {
      name: 'SmartTrade-AI-v1.0',
      version: '1.0.0',
      isActive: true,
      parameters: JSON.stringify({
        technicalWeight: 0.4,
        fundamentalWeight: 0.3,
        sentimentWeight: 0.2,
        riskWeight: 0.1,
        confidenceThreshold: 70,
        maxHoldingPeriod: 1440, // 24 hours in minutes
        rebalanceThreshold: 0.05 // 5% deviation
      }),
      riskParameters: JSON.stringify({
        maxPositionSize: 0.1, // 10% of portfolio
        stopLossDefault: 0.05, // 5%
        takeProfitDefault: 0.1, // 10%
        volatilityMultiplier: 1.5,
        correlationLimit: 0.7
      }),
      marketConditionWeights: JSON.stringify({
        bull: { technical: 0.5, fundamental: 0.3, sentiment: 0.2 },
        bear: { technical: 0.3, fundamental: 0.4, sentiment: 0.3 },
        sideways: { technical: 0.6, fundamental: 0.25, sentiment: 0.15 },
        volatile: { technical: 0.7, fundamental: 0.2, sentiment: 0.1 }
      }),
      minConfidenceThreshold: new Decimal(50),
      maxPositionSize: new Decimal(0.1),
      stopLossPercent: new Decimal(5),
      takeProfitPercent: new Decimal(10)
    };

    const created = await prisma.algorithmConfig.create({
      data: defaultConfig
    });

    this.algorithmConfig = {
      ...created,
      parameters: JSON.parse(created.parameters),
      riskParameters: JSON.parse(created.riskParameters),
      marketConditionWeights: JSON.parse(created.marketConditionWeights)
    };
  }

  /**
   * Main algorithm decision engine
   */
  async makeDecision(input: AlgorithmInput): Promise<AlgorithmDecision> {
    try {
      // Pre-flight checks
      this.validateInput(input);
      
      // Get market condition weights
      const weights = this.algorithmConfig.marketConditionWeights[input.marketCondition.overallCondition];
      
      // Calculate individual scores
      const technicalScore = this.calculateTechnicalScore(input.technicalIndicators, input.marketCondition);
      const fundamentalScore = input.fundamentalData ? 
        this.calculateFundamentalScore(input.fundamentalData, input.marketCondition) : 50;
      const sentimentScore = this.calculateSentimentScore(input.marketCondition);
      const riskScore = this.calculateRiskScore(input.userRiskProfile, input.portfolioContext);

      // Calculate weighted composite score
      const compositeScore = (
        (technicalScore * weights.technical) +
        (fundamentalScore * weights.fundamental) +
        (sentimentScore * weights.sentiment)
      ) * (1 - (riskScore / 100 * 0.3)); // Risk penalty

      // Determine decision type
      const decision = this.determineDecisionType(compositeScore, input);
      
      // Calculate position sizing
      const positionSize = this.calculatePositionSize(decision, input.userRiskProfile, input.portfolioContext);
      
      // Calculate stop loss and take profit
      const { stopLoss, takeProfit } = this.calculateExitLevels(
        input.currentPrice, 
        decision, 
        input.technicalIndicators,
        input.marketCondition.volatilityIndex
      );

      // Generate reasoning
      const reasoning = this.generateReasoning(decision, {
        technicalScore,
        fundamentalScore,
        sentimentScore,
        riskScore,
        compositeScore,
        marketCondition: input.marketCondition.overallCondition
      });

      const algorithmDecision: AlgorithmDecision = {
        decisionType: decision,
        confidence: Math.round(compositeScore),
        reasoning,
        positionSize,
        entryPrice: input.currentPrice,
        stopLoss,
        takeProfit,
        riskScore,
        expectedReturn: this.calculateExpectedReturn(decision, compositeScore),
        timeHorizon: this.calculateTimeHorizon(decision, input.marketCondition)
      };

      // Store decision in database
      await this.storeDecision(input, algorithmDecision);

      return algorithmDecision;

    } catch (error) {
      console.error('Algorithm decision error:', error);
      throw new Error(`Algorithm decision failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate technical analysis score (0-100)
   */
  private calculateTechnicalScore(indicators: TechnicalIndicators, market: MarketConditionData): number {
    let score = 50; // Neutral starting point

    // RSI analysis
    if (indicators.rsi < 30) score += 20; // Oversold - bullish
    else if (indicators.rsi > 70) score -= 20; // Overbought - bearish
    else if (indicators.rsi >= 40 && indicators.rsi <= 60) score += 5; // Neutral zone

    // Moving average analysis
    const price = market.spyPrice;
    if (price > indicators.sma20 && indicators.sma20 > indicators.sma50 && indicators.sma50 > indicators.sma200) {
      score += 15; // Strong uptrend
    } else if (price < indicators.sma20 && indicators.sma20 < indicators.sma50 && indicators.sma50 < indicators.sma200) {
      score -= 15; // Strong downtrend
    }

    // MACD analysis
    if (indicators.macd > 0) score += 8;
    else score -= 8;

    // Bollinger Bands analysis
    if (price <= indicators.bollBandLower) score += 10; // Oversold
    else if (price >= indicators.bollBandUpper) score -= 10; // Overbought

    // Volume confirmation
    const avgVolume = indicators.volume;
    if (market.volume > avgVolume * 1.5) {
      score += indicators.priceChange24h > 0 ? 5 : -5; // Volume confirms direction
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate fundamental analysis score (0-100)
   */
  private calculateFundamentalScore(fundamental: FundamentalData, market: MarketConditionData): number {
    let score = 50;

    // P/E ratio analysis
    if (fundamental.pe < 15) score += 10; // Undervalued
    else if (fundamental.pe > 25) score -= 10; // Overvalued

    // Market cap consideration
    if (fundamental.marketCap > 10000000000) score += 5; // Large cap stability

    // Sector rotation analysis
    const sectorPerformance = this.getSectorPerformance(fundamental.sector);
    score += sectorPerformance * 0.2;

    // Earnings growth
    if (fundamental.earnings?.growth && fundamental.earnings.growth > 15) score += 15;
    else if (fundamental.earnings?.growth && fundamental.earnings.growth < -10) score -= 15;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate market sentiment score (0-100)
   */
  private calculateSentimentScore(market: MarketConditionData): number {
    let score = 50;

    // Market sentiment
    switch (market.marketSentiment) {
      case 'positive': score += 15; break;
      case 'negative': score -= 15; break;
      case 'neutral': break;
    }

    // Volatility analysis
    if (market.volatilityIndex < 20) score += 10; // Low volatility
    else if (market.volatilityIndex > 30) score -= 10; // High volatility

    // Trend strength
    score += (market.trendStrength - 50) * 0.3;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate risk score (0-100, higher is riskier)
   */
  private calculateRiskScore(riskProfile: UserRiskProfile, portfolio: PortfolioContext): number {
    let riskScore = 0;

    // Account utilization
    const utilization = (portfolio.totalValue - portfolio.cashBalance) / portfolio.totalValue;
    if (utilization > 0.8) riskScore += 20;
    else if (utilization < 0.3) riskScore -= 10;

    // Diversification
    if (portfolio.diversification.numberOfPositions < 3) riskScore += 15;
    else if (portfolio.diversification.numberOfPositions > 10) riskScore -= 5;

    // Sector concentration
    const maxSectorConcentration = Math.max(...Object.values(portfolio.diversification.sectorConcentration));
    if (maxSectorConcentration > 0.5) riskScore += 20;

    // User risk tolerance
    switch (riskProfile.riskTolerance) {
      case 'conservative': riskScore += 10; break;
      case 'moderate': break;
      case 'aggressive': riskScore -= 10; break;
    }

    return Math.max(0, Math.min(100, riskScore));
  }

  /**
   * Determine decision type based on composite score
   */
  private determineDecisionType(score: number, input: AlgorithmInput): 'buy' | 'sell' | 'hold' | 'stop' {
    const threshold = this.algorithmConfig.minConfidenceThreshold;

    // Check for stop loss conditions first
    if (input.portfolioContext.currentPosition) {
      const position = input.portfolioContext.currentPosition;
      const unrealizedLossPercent = (position.unrealizedPnl / position.currentValue) * 100;
      
      if (unrealizedLossPercent < -this.algorithmConfig.stopLossPercent) {
        return 'stop';
      }
    }

    // Decision logic based on score
    if (score >= 75) return 'buy';
    else if (score <= 25) return 'sell';
    else if (score >= threshold) return input.portfolioContext.currentPosition ? 'hold' : 'buy';
    else if (score <= (100 - threshold)) return input.portfolioContext.currentPosition ? 'sell' : 'hold';
    else return 'hold';
  }

  /**
   * Calculate optimal position size
   */
  private calculatePositionSize(
    decision: 'buy' | 'sell' | 'hold' | 'stop',
    riskProfile: UserRiskProfile,
    portfolio: PortfolioContext
  ): number {
    if (decision === 'hold' || decision === 'stop') return 0;

    const maxPositionSize = Math.min(
      riskProfile.maxPositionSize,
      this.algorithmConfig.maxPositionSize
    );

    const availableCash = portfolio.cashBalance;
    const maxInvestment = portfolio.totalValue * maxPositionSize;
    
    return Math.min(availableCash * 0.9, maxInvestment);
  }

  /**
   * Calculate stop loss and take profit levels
   */
  private calculateExitLevels(
    entryPrice: number,
    decision: 'buy' | 'sell' | 'hold' | 'stop',
    technicals: TechnicalIndicators,
    volatility: number
  ): { stopLoss: number; takeProfit: number } {
    if (decision === 'hold') {
      return { stopLoss: 0, takeProfit: 0 };
    }

    const volatilityMultiplier = Math.max(1, volatility / 20);
    const baseStopLoss = this.algorithmConfig.stopLossPercent / 100;
    const baseTakeProfit = this.algorithmConfig.takeProfitPercent / 100;

    const adjustedStopLoss = baseStopLoss * volatilityMultiplier;
    const adjustedTakeProfit = baseTakeProfit * volatilityMultiplier;

    if (decision === 'buy') {
      return {
        stopLoss: entryPrice * (1 - adjustedStopLoss),
        takeProfit: entryPrice * (1 + adjustedTakeProfit)
      };
    } else { // sell
      return {
        stopLoss: entryPrice * (1 + adjustedStopLoss),
        takeProfit: entryPrice * (1 - adjustedTakeProfit)
      };
    }
  }

  /**
   * Generate human-readable reasoning for the decision
   */
  private generateReasoning(
    decision: 'buy' | 'sell' | 'hold' | 'stop',
    scores: {
      technicalScore: number;
      fundamentalScore: number;
      sentimentScore: number;
      riskScore: number;
      compositeScore: number;
      marketCondition: string;
    }
  ): string {
    const { technicalScore, fundamentalScore, sentimentScore, riskScore, compositeScore, marketCondition } = scores;

    let reasoning = `Decision: ${decision.toUpperCase()} (Confidence: ${Math.round(compositeScore)}%)\n\n`;
    reasoning += `Market Environment: ${marketCondition} market conditions\n\n`;
    reasoning += `Analysis Breakdown:\n`;
    reasoning += `• Technical Analysis: ${Math.round(technicalScore)}% ${this.getScoreDescription(technicalScore)}\n`;
    reasoning += `• Fundamental Analysis: ${Math.round(fundamentalScore)}% ${this.getScoreDescription(fundamentalScore)}\n`;
    reasoning += `• Market Sentiment: ${Math.round(sentimentScore)}% ${this.getScoreDescription(sentimentScore)}\n`;
    reasoning += `• Risk Assessment: ${Math.round(riskScore)}% risk level\n\n`;

    // Add specific reasoning based on decision
    switch (decision) {
      case 'buy':
        reasoning += `Recommendation: Strong buy signal with favorable technical indicators and positive market sentiment.`;
        break;
      case 'sell':
        reasoning += `Recommendation: Sell signal due to weakening technical indicators or risk management concerns.`;
        break;
      case 'hold':
        reasoning += `Recommendation: Hold position as market conditions suggest sideways movement.`;
        break;
      case 'stop':
        reasoning += `Recommendation: Stop loss triggered to protect capital from further losses.`;
        break;
    }

    return reasoning;
  }

  /**
   * Get description for score ranges
   */
  private getScoreDescription(score: number): string {
    if (score >= 75) return '(Very Bullish)';
    else if (score >= 60) return '(Bullish)';
    else if (score >= 40) return '(Neutral)';
    else if (score >= 25) return '(Bearish)';
    else return '(Very Bearish)';
  }

  /**
   * Calculate expected return based on decision and confidence
   */
  private calculateExpectedReturn(decision: 'buy' | 'sell' | 'hold' | 'stop', confidence: number): number {
    if (decision === 'hold' || decision === 'stop') return 0;

    const baseReturn = (confidence - 50) / 500; // Convert confidence to return expectation
    return decision === 'buy' ? baseReturn : -baseReturn;
  }

  /**
   * Calculate expected time horizon for the position
   */
  private calculateTimeHorizon(decision: 'buy' | 'sell' | 'hold' | 'stop', market: MarketConditionData): number {
    if (decision === 'hold' || decision === 'stop') return 0;

    let baseTime = 240; // 4 hours default

    // Adjust based on market conditions
    switch (market.overallCondition) {
      case 'volatile': baseTime *= 0.5; break;
      case 'bull': baseTime *= 1.5; break;
      case 'bear': baseTime *= 0.8; break;
      case 'sideways': baseTime *= 2; break;
    }

    return Math.round(baseTime);
  }

  /**
   * Get sector performance (placeholder - would integrate with real data)
   */
  private getSectorPerformance(sector: string): number {
    // This would integrate with real sector performance data
    const sectorPerformance: Record<string, number> = {
      'Technology': 15,
      'Healthcare': 10,
      'Financial': 5,
      'Energy': -5,
      'Utilities': 0
    };

    return sectorPerformance[sector] || 0;
  }

  /**
   * Validate algorithm input
   */
  private validateInput(input: AlgorithmInput): void {
    if (!input.userId) throw new Error('User ID is required');
    if (!input.symbol) throw new Error('Symbol is required');
    if (!input.currentPrice || input.currentPrice <= 0) throw new Error('Valid current price is required');
    if (!input.marketCondition) throw new Error('Market condition data is required');
    if (!input.userRiskProfile) throw new Error('User risk profile is required');
    if (!input.portfolioContext) throw new Error('Portfolio context is required');
    if (!input.technicalIndicators) throw new Error('Technical indicators are required');
  }

  /**
   * Store algorithm decision in database
   */
  private async storeDecision(input: AlgorithmInput, decision: AlgorithmDecision): Promise<void> {
    try {
      await prisma.algorithmDecision.create({
        data: {
          userId: input.userId,
          sessionId: input.sessionId || null,
          symbol: input.symbol,
          decisionType: decision.decisionType,
          confidence: new Decimal(decision.confidence),
          reasoning: decision.reasoning,
          marketCondition: input.marketCondition.overallCondition,
          volatilityIndex: new Decimal(input.marketCondition.volatilityIndex),
          riskScore: new Decimal(decision.riskScore),
          positionSize: new Decimal(decision.positionSize),
          entryPrice: new Decimal(decision.entryPrice),
          stopLoss: new Decimal(decision.stopLoss),
          takeProfit: new Decimal(decision.takeProfit),
          technicalIndicators: JSON.stringify(input.technicalIndicators),
          fundamentalData: input.fundamentalData ? JSON.stringify(input.fundamentalData) : null
        }
      });
    } catch (error) {
      console.error('Failed to store algorithm decision:', error);
      // Don't throw error here to avoid breaking the decision process
    }
  }

  /**
   * Update decision outcome after execution
   */
  async updateDecisionOutcome(
    decisionId: string,
    outcome: 'win' | 'loss' | 'breakeven',
    profitLoss: number,
    holdingDuration: number,
    executionPrice?: number
  ): Promise<void> {
    try {
      const profitLossPercent = profitLoss; // Assuming this is already in percentage

      await prisma.algorithmDecision.update({
        where: { id: decisionId },
        data: {
          outcome,
          profitLoss: new Decimal(profitLoss),
          profitLossPercent: new Decimal(profitLossPercent),
          holdingDuration,
          executionPrice: executionPrice ? new Decimal(executionPrice) : null,
          isExecuted: true,
          executedAt: new Date(),
          updatedAt: new Date()
        }
      });

      console.log(`Updated algorithm decision ${decisionId} with outcome: ${outcome}`);
    } catch (error) {
      console.error('Failed to update decision outcome:', error);
      throw error;
    }
  }
}

export default AlgorithmEngine.getInstance();
