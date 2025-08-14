import Queue from 'bull';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { TradingDecision } from './algorithm.service';
import { TradeOrder, Position, ExecutionResult } from './decisionEngine.service';
import { tradingSessionService } from './tradingSession.service';

interface PerformanceMetrics {
  userId: string;
  sessionId?: string;
  timeframe: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALL_TIME';
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalReturn: number;
  averageReturn: number;
  maxDrawdown: number;
  currentDrawdown: number;
  profitFactor: number;
  sharpeRatio: number;
  averageHoldTime: number; // in minutes
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  createdAt: Date;
  updatedAt: Date;
}

interface StrategyPerformance {
  strategy: 'VOLATILITY_HUNTER' | 'MOMENTUM_FOLLOW' | 'MEAN_REVERSION' | 'EARNINGS_EXPLOIT';
  winRate: number;
  totalTrades: number;
  totalReturn: number;
  averageReturn: number;
  bestMarketCondition: string;
  performanceScore: number;
  confidence: number;
  lastUsed: Date;
}

interface MarketRegimePerformance {
  regime: 'HIGH_VOLATILITY' | 'TRENDING' | 'RANGING';
  winRate: number;
  averageReturn: number;
  tradeFrequency: number;
  bestStrategy: string;
  performanceScore: number;
  totalTrades: number;
  period: string;
}

interface RiskMetrics {
  userId: string;
  sessionId?: string;
  currentDrawdown: number;
  maxDrawdown: number;
  dailyRiskExposure: number;
  riskPerTrade: number;
  positionConcentration: number;
  correlationRisk: number;
  volatilityRisk: number;
  marginUtilization: number;
  riskScore: number; // 0-100, 100 being highest risk
  alerts: RiskAlert[];
  timestamp: Date;
}

interface RiskAlert {
  level: 'INFO' | 'WARNING' | 'CRITICAL';
  type: 'DRAWDOWN' | 'EXPOSURE' | 'CONCENTRATION' | 'CORRELATION' | 'PERFORMANCE';
  message: string;
  threshold: number;
  currentValue: number;
  action: string;
  timestamp: Date;
}

interface TradeOutcome {
  decisionId: string;
  orderId: string;
  userId: string;
  sessionId: string;
  symbol: string;
  strategy: string;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  holdTimeMinutes: number;
  outcome: 'WIN' | 'LOSS' | 'BREAKEVEN' | 'OPEN';
  confidence: number;
  actualVsExpected: number;
  marketConditions: string;
  timestamp: Date;
}

interface PerformanceAlert {
  level: 'INFO' | 'WARNING' | 'CRITICAL';
  type: 'WIN_RATE' | 'DRAWDOWN' | 'RETURNS' | 'STRATEGY' | 'SYSTEM';
  message: string;
  metrics: any;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

class PerformanceMonitoringService {
  private monitoringQueue: Queue.Queue;
  private redis: Redis;
  private prisma: PrismaClient;
  private isProcessing: boolean = false;

  // Performance tracking
  private performanceCache: Map<string, PerformanceMetrics> = new Map();
  private strategyPerformance: Map<string, StrategyPerformance> = new Map();
  private riskMetrics: Map<string, RiskMetrics> = new Map();
  private tradeOutcomes: TradeOutcome[] = [];

  // Performance targets
  private readonly TARGET_WIN_RATE = 0.65; // 65%
  private readonly TARGET_MONTHLY_RETURN = 0.08; // 8% average
  private readonly MAX_DRAWDOWN = 0.25; // 25%
  private readonly DRAWDOWN_WARNING = 0.15; // 15%
  private readonly DRAWDOWN_ALERT = 0.20; // 20%

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL + '?family=0' || 'redis://localhost:6379?family=0');
    this.prisma = new PrismaClient();

    // Initialize Bull Queue for performance monitoring
    this.monitoringQueue = new Queue('Performance Monitoring', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
      },
      defaultJobOptions: {
        removeOnComplete: 500,
        removeOnFail: 100,
        attempts: 2,
        backoff: {
          type: 'exponential'
        }
      }
    });

    this.setupJobProcessors();
  }

  /**
   * Initialize performance monitoring service
   */
  async initialize(): Promise<void> {
    try {
      console.log('📊 Initializing SmartTrade AI Performance Monitoring...');

      // Load historical performance data
      await this.loadHistoricalData();

      // Start real-time monitoring
      await this.startRealTimeMonitoring();

      console.log('✅ Performance Monitoring ready for AGGRESSIVE TRACKING!');

    } catch (error) {
      console.error('💥 Failed to initialize performance monitoring:', error);
      throw error;
    }
  }

  /**
   * Setup Bull Queue job processors
   */
  private setupJobProcessors(): void {
    // Update performance metrics processor
    this.monitoringQueue.process('update-performance', 10, async (job) => {
      const { userId, sessionId, tradeOutcome } = job.data;
      return await this.updatePerformanceMetrics(userId, sessionId, tradeOutcome);
    });

    // Risk monitoring processor
    this.monitoringQueue.process('monitor-risk', 5, async (job) => {
      const { userId, sessionId } = job.data;
      return await this.monitorRiskMetrics(userId, sessionId);
    });

    // Strategy analysis processor
    this.monitoringQueue.process('analyze-strategy', 3, async (job) => {
      const { strategy, performance } = job.data;
      return await this.analyzeStrategyPerformance(strategy, performance);
    });

    // Generate reports processor
    this.monitoringQueue.process('generate-report', 1, async (job) => {
      const { userId, reportType, timeframe } = job.data;
      return await this.generatePerformanceReport(userId, reportType, timeframe);
    });

    console.log('📈 Performance monitoring job processors configured');
  }

  /**
   * Record trade outcome for performance tracking
   */
  async recordTradeOutcome(
    decision: TradingDecision,
    order: TradeOrder,
    result: ExecutionResult,
    finalPnL?: number
  ): Promise<void> {
    try {
      if (!result.executedPrice || !result.executedQuantity) return;

      const outcome: TradeOutcome = {
        decisionId: decision.id,
        orderId: order.id,
        userId: order.userId,
        sessionId: order.sessionId,
        symbol: order.symbol,
        strategy: decision.strategy,
        entryPrice: result.executedPrice,
        exitPrice: finalPnL ? result.executedPrice + (finalPnL / result.executedQuantity) : undefined,
        quantity: result.executedQuantity,
        pnl: finalPnL || 0,
        pnlPercent: finalPnL ? (finalPnL / (result.executedPrice * result.executedQuantity)) * 100 : 0,
        holdTimeMinutes: 0, // Will be updated when position is closed
        outcome: finalPnL ? (finalPnL > 0 ? 'WIN' : finalPnL < 0 ? 'LOSS' : 'BREAKEVEN') : 'OPEN',
        confidence: decision.confidence,
        actualVsExpected: 0, // Will be calculated based on expected vs actual returns
        marketConditions: `${decision.strategy} during market conditions`,
        timestamp: new Date()
      };

      // Store trade outcome
      this.tradeOutcomes.push(outcome);

      // Schedule performance update
      await this.schedulePerformanceUpdate(order.userId, order.sessionId, outcome);

      console.log(`📊 Trade outcome recorded: ${outcome.symbol} ${outcome.outcome} P&L: $${outcome.pnl.toFixed(2)}`);

    } catch (error) {
      console.error('Error recording trade outcome:', error);
    }
  }

  /**
   * Update performance metrics for a user/session
   */
  private async updatePerformanceMetrics(
    userId: string,
    sessionId?: string,
    tradeOutcome?: TradeOutcome
  ): Promise<PerformanceMetrics> {
    try {
      const key = sessionId ? `${userId}_${sessionId}` : userId;
      let metrics = this.performanceCache.get(key);

      if (!metrics) {
        metrics = this.createDefaultMetrics(userId, sessionId);
      }

      // Update with new trade outcome
      if (tradeOutcome && tradeOutcome.outcome !== 'OPEN') {
        metrics.totalTrades++;
        
        if (tradeOutcome.outcome === 'WIN') {
          metrics.winningTrades++;
          metrics.averageWin = ((metrics.averageWin * (metrics.winningTrades - 1)) + tradeOutcome.pnl) / metrics.winningTrades;
          metrics.largestWin = Math.max(metrics.largestWin, tradeOutcome.pnl);
          metrics.consecutiveWins++;
          metrics.consecutiveLosses = 0;
          metrics.maxConsecutiveWins = Math.max(metrics.maxConsecutiveWins, metrics.consecutiveWins);
        } else if (tradeOutcome.outcome === 'LOSS') {
          metrics.losingTrades++;
          metrics.averageLoss = ((metrics.averageLoss * (metrics.losingTrades - 1)) + Math.abs(tradeOutcome.pnl)) / metrics.losingTrades;
          metrics.largestLoss = Math.max(metrics.largestLoss, Math.abs(tradeOutcome.pnl));
          metrics.consecutiveLosses++;
          metrics.consecutiveWins = 0;
          metrics.maxConsecutiveLosses = Math.max(metrics.maxConsecutiveLosses, metrics.consecutiveLosses);
        }

        // Update overall metrics
        metrics.totalReturn += tradeOutcome.pnl;
        metrics.averageReturn = metrics.totalReturn / metrics.totalTrades;
        metrics.winRate = metrics.winningTrades / metrics.totalTrades;

        // Update profit factor
        if (metrics.averageLoss > 0) {
          metrics.profitFactor = (metrics.averageWin * metrics.winningTrades) / (metrics.averageLoss * metrics.losingTrades);
        }

        // Update drawdown calculations
        await this.updateDrawdownMetrics(metrics, tradeOutcome);
      }

      // Calculate additional metrics
      await this.calculateAdvancedMetrics(metrics);

      // Update cache and store
      metrics.updatedAt = new Date();
      this.performanceCache.set(key, metrics);

      // Check for performance alerts
      await this.checkPerformanceAlerts(metrics);

      console.log(`📈 Performance updated: ${metrics.winRate.toFixed(3)} win rate, $${metrics.totalReturn.toFixed(2)} total return`);

      return metrics;

    } catch (error) {
      console.error('Error updating performance metrics:', error);
      throw error;
    }
  }

  /**
   * Monitor risk metrics for a user/session
   */
  private async monitorRiskMetrics(userId: string, sessionId?: string): Promise<RiskMetrics> {
    try {
      const key = sessionId ? `${userId}_${sessionId}` : userId;
      const performanceMetrics = this.performanceCache.get(key);
      
      if (!performanceMetrics) {
        throw new Error('Performance metrics not found for risk monitoring');
      }

      const riskMetrics: RiskMetrics = {
        userId,
        sessionId,
        currentDrawdown: performanceMetrics.currentDrawdown,
        maxDrawdown: performanceMetrics.maxDrawdown,
        dailyRiskExposure: 0.05, // Placeholder - would calculate from active positions
        riskPerTrade: 0.025, // 2.5% standard
        positionConcentration: 0.15, // Placeholder - would calculate from portfolio
        correlationRisk: 0.2, // Placeholder - would calculate from positions
        volatilityRisk: 0.3, // Placeholder - would get from market data
        marginUtilization: 0.6, // Placeholder - would get from broker
        riskScore: 0,
        alerts: [],
        timestamp: new Date()
      };

      // Calculate risk score (0-100, higher = more risk)
      riskMetrics.riskScore = this.calculateRiskScore(riskMetrics);

      // Generate risk alerts
      riskMetrics.alerts = await this.generateRiskAlerts(riskMetrics);

      // Cache risk metrics
      this.riskMetrics.set(key, riskMetrics);

      // Log critical alerts
      const criticalAlerts = riskMetrics.alerts.filter(a => a.level === 'CRITICAL');
      if (criticalAlerts.length > 0) {
        console.log(`🚨 CRITICAL RISK ALERTS for ${userId}:`, criticalAlerts.map(a => a.message));
      }

      return riskMetrics;

    } catch (error) {
      console.error('Error monitoring risk metrics:', error);
      throw error;
    }
  }

  /**
   * Analyze strategy performance
   */
  private async analyzeStrategyPerformance(
    strategy: string,
    performance: any
  ): Promise<StrategyPerformance> {
    try {
      const strategyTrades = this.tradeOutcomes.filter(t => 
        t.strategy === strategy && t.outcome !== 'OPEN'
      );

      if (strategyTrades.length === 0) {
        return this.createDefaultStrategyPerformance(strategy as any);
      }

      const winningTrades = strategyTrades.filter(t => t.outcome === 'WIN');
      const totalPnL = strategyTrades.reduce((sum, t) => sum + t.pnl, 0);

      const strategyPerf: StrategyPerformance = {
        strategy: strategy as any,
        winRate: winningTrades.length / strategyTrades.length,
        totalTrades: strategyTrades.length,
        totalReturn: totalPnL,
        averageReturn: totalPnL / strategyTrades.length,
        bestMarketCondition: this.determineBestMarketCondition(strategyTrades),
        performanceScore: this.calculatePerformanceScore(winningTrades.length / strategyTrades.length, totalPnL),
        confidence: strategyTrades.reduce((sum, t) => sum + t.confidence, 0) / strategyTrades.length,
        lastUsed: new Date(Math.max(...strategyTrades.map(t => t.timestamp.getTime())))
      };

      this.strategyPerformance.set(strategy, strategyPerf);

      console.log(`🎯 Strategy analysis: ${strategy} - ${(strategyPerf.winRate * 100).toFixed(1)}% win rate, $${strategyPerf.totalReturn.toFixed(2)} return`);

      return strategyPerf;

    } catch (error) {
      console.error('Error analyzing strategy performance:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive performance report
   */
  async generatePerformanceReport(
    userId: string,
    reportType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'COMPREHENSIVE',
    timeframe?: string
  ): Promise<any> {
    try {
      const performanceMetrics = this.performanceCache.get(userId);
      const riskMetrics = this.riskMetrics.get(userId);
      const strategies = Array.from(this.strategyPerformance.values());

      const report = {
        userId,
        reportType,
        timeframe: timeframe || 'ALL_TIME',
        generatedAt: new Date(),
        
        // Core Performance Metrics
        performance: performanceMetrics || this.createDefaultMetrics(userId),
        
        // Risk Analysis
        risk: riskMetrics || {
          currentDrawdown: 0,
          maxDrawdown: 0,
          riskScore: 0,
          alerts: []
        },
        
        // Strategy Breakdown
        strategies: strategies.map(s => ({
          name: s.strategy,
          winRate: s.winRate,
          totalReturn: s.totalReturn,
          trades: s.totalTrades,
          performanceScore: s.performanceScore
        })),

        // Market Regime Analysis
        regimes: await this.analyzeMarketRegimePerformance(userId),

        // Targets vs Actual
        targets: {
          winRate: {
            target: this.TARGET_WIN_RATE,
            actual: performanceMetrics?.winRate || 0,
            status: (performanceMetrics?.winRate || 0) >= this.TARGET_WIN_RATE ? 'ACHIEVED' : 'BELOW_TARGET'
          },
          monthlyReturn: {
            target: this.TARGET_MONTHLY_RETURN,
            actual: this.calculateMonthlyReturn(performanceMetrics),
            status: this.calculateMonthlyReturn(performanceMetrics) >= this.TARGET_MONTHLY_RETURN ? 'ACHIEVED' : 'BELOW_TARGET'
          },
          maxDrawdown: {
            target: this.MAX_DRAWDOWN,
            actual: performanceMetrics?.maxDrawdown || 0,
            status: (performanceMetrics?.maxDrawdown || 0) <= this.MAX_DRAWDOWN ? 'WITHIN_LIMITS' : 'EXCEEDED'
          }
        },

        // Recent Trades Summary
        recentTrades: this.tradeOutcomes
          .filter(t => t.userId === userId)
          .slice(-10)
          .map(t => ({
            symbol: t.symbol,
            strategy: t.strategy,
            outcome: t.outcome,
            pnl: t.pnl,
            confidence: t.confidence,
            timestamp: t.timestamp
          })),

        // Recommendations
        recommendations: this.generateRecommendations(performanceMetrics, riskMetrics, strategies)
      };

      console.log(`📋 Generated ${reportType} performance report for user ${userId}`);

      return report;

    } catch (error) {
      console.error('Error generating performance report:', error);
      throw error;
    }
  }

  /**
   * Get current performance metrics for a user/session
   */
  async getPerformanceMetrics(userId: string, sessionId?: string): Promise<PerformanceMetrics | null> {
    const key = sessionId ? `${userId}_${sessionId}` : userId;
    return this.performanceCache.get(key) || null;
  }

  /**
   * Get current risk metrics for a user/session
   */
  async getRiskMetrics(userId: string, sessionId?: string): Promise<RiskMetrics | null> {
    const key = sessionId ? `${userId}_${sessionId}` : userId;
    return this.riskMetrics.get(key) || null;
  }

  /**
   * Get strategy performance breakdown
   */
  async getStrategyPerformance(): Promise<StrategyPerformance[]> {
    return Array.from(this.strategyPerformance.values());
  }

  /**
   * Get market regime performance analysis
   */
  async getMarketRegimePerformance(userId: string): Promise<MarketRegimePerformance[]> {
    return await this.analyzeMarketRegimePerformance(userId);
  }

  // Helper methods
  private createDefaultMetrics(userId: string, sessionId?: string): PerformanceMetrics {
    return {
      userId,
      sessionId,
      timeframe: 'ALL_TIME',
      winRate: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalReturn: 0,
      averageReturn: 0,
      maxDrawdown: 0,
      currentDrawdown: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      averageHoldTime: 0,
      averageWin: 0,
      averageLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private createDefaultStrategyPerformance(strategy: any): StrategyPerformance {
    return {
      strategy,
      winRate: 0,
      totalTrades: 0,
      totalReturn: 0,
      averageReturn: 0,
      bestMarketCondition: 'UNKNOWN',
      performanceScore: 0,
      confidence: 0,
      lastUsed: new Date()
    };
  }

  private async updateDrawdownMetrics(metrics: PerformanceMetrics, tradeOutcome: TradeOutcome): Promise<void> {
    // Simplified drawdown calculation - would be more sophisticated in production
    if (tradeOutcome.pnl < 0) {
      metrics.currentDrawdown = Math.min(metrics.currentDrawdown + tradeOutcome.pnl, 0);
      metrics.maxDrawdown = Math.min(metrics.maxDrawdown, metrics.currentDrawdown);
    } else if (tradeOutcome.pnl > 0 && metrics.currentDrawdown < 0) {
      metrics.currentDrawdown = Math.min(0, metrics.currentDrawdown + tradeOutcome.pnl);
    }
  }

  private async calculateAdvancedMetrics(metrics: PerformanceMetrics): Promise<void> {
    // Calculate Sharpe ratio (simplified)
    if (metrics.totalTrades > 10) {
      const returns = this.tradeOutcomes
        .filter(t => t.outcome !== 'OPEN')
        .map(t => t.pnlPercent);
      
      const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
      const stdDev = Math.sqrt(variance);
      
      metrics.sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
    }
  }

  private calculateRiskScore(riskMetrics: RiskMetrics): number {
    let score = 0;
    
    // Drawdown risk (0-40 points)
    score += Math.min(40, Math.abs(riskMetrics.currentDrawdown) * 200);
    
    // Position concentration risk (0-20 points)
    score += Math.min(20, riskMetrics.positionConcentration * 80);
    
    // Daily risk exposure (0-20 points)
    score += Math.min(20, riskMetrics.dailyRiskExposure * 200);
    
    // Volatility risk (0-20 points)
    score += Math.min(20, riskMetrics.volatilityRisk * 67);
    
    return Math.min(100, score);
  }

  private async generateRiskAlerts(riskMetrics: RiskMetrics): Promise<RiskAlert[]> {
    const alerts: RiskAlert[] = [];
    
    // Drawdown alerts
    if (Math.abs(riskMetrics.currentDrawdown) >= this.DRAWDOWN_ALERT) {
      alerts.push({
        level: 'CRITICAL',
        type: 'DRAWDOWN',
        message: `Critical drawdown level reached: ${(Math.abs(riskMetrics.currentDrawdown) * 100).toFixed(1)}%`,
        threshold: this.DRAWDOWN_ALERT,
        currentValue: Math.abs(riskMetrics.currentDrawdown),
        action: 'REDUCE_POSITION_SIZES',
        timestamp: new Date()
      });
    } else if (Math.abs(riskMetrics.currentDrawdown) >= this.DRAWDOWN_WARNING) {
      alerts.push({
        level: 'WARNING',
        type: 'DRAWDOWN',
        message: `Drawdown warning: ${(Math.abs(riskMetrics.currentDrawdown) * 100).toFixed(1)}%`,
        threshold: this.DRAWDOWN_WARNING,
        currentValue: Math.abs(riskMetrics.currentDrawdown),
        action: 'MONITOR_CLOSELY',
        timestamp: new Date()
      });
    }
    
    // High risk score alert
    if (riskMetrics.riskScore >= 80) {
      alerts.push({
        level: 'CRITICAL',
        type: 'EXPOSURE',
        message: `High risk score: ${riskMetrics.riskScore.toFixed(0)}/100`,
        threshold: 80,
        currentValue: riskMetrics.riskScore,
        action: 'REDUCE_EXPOSURE',
        timestamp: new Date()
      });
    }
    
    return alerts;
  }

  private async checkPerformanceAlerts(metrics: PerformanceMetrics): Promise<void> {
    const alerts: PerformanceAlert[] = [];
    
    // Win rate degradation
    if (metrics.totalTrades >= 20 && metrics.winRate < 0.60) {
      alerts.push({
        level: 'WARNING',
        type: 'WIN_RATE',
        message: `Win rate below 60%: ${(metrics.winRate * 100).toFixed(1)}%`,
        metrics: { winRate: metrics.winRate, totalTrades: metrics.totalTrades },
        timestamp: new Date(),
        userId: metrics.userId,
        sessionId: metrics.sessionId
      });
    }
    
    // Consecutive losses
    if (metrics.consecutiveLosses >= 5) {
      alerts.push({
        level: 'WARNING',
        type: 'STRATEGY',
        message: `${metrics.consecutiveLosses} consecutive losses - consider strategy adjustment`,
        metrics: { consecutiveLosses: metrics.consecutiveLosses },
        timestamp: new Date(),
        userId: metrics.userId,
        sessionId: metrics.sessionId
      });
    }
    
    // Log alerts
    for (const alert of alerts) {
      console.log(`⚠️ PERFORMANCE ALERT [${alert.level}]: ${alert.message}`);
    }
  }

  private determineBestMarketCondition(trades: TradeOutcome[]): string {
    // Simplified - would analyze actual market conditions
    return 'HIGH_VOLATILITY';
  }

  private calculatePerformanceScore(winRate: number, totalReturn: number): number {
    return Math.min(100, (winRate * 60) + (Math.max(0, totalReturn) * 0.4));
  }

  private calculateMonthlyReturn(metrics?: PerformanceMetrics): number {
    if (!metrics || metrics.totalTrades === 0) return 0;
    // Simplified monthly return calculation
    return metrics.averageReturn * 20; // Assuming 20 trading days per month
  }

  private async analyzeMarketRegimePerformance(userId: string): Promise<MarketRegimePerformance[]> {
    // Placeholder - would analyze trades by market regime
    return [
      {
        regime: 'HIGH_VOLATILITY',
        winRate: 0.72,
        averageReturn: 0.15,
        tradeFrequency: 8,
        bestStrategy: 'VOLATILITY_HUNTER',
        performanceScore: 85,
        totalTrades: 45,
        period: 'LAST_30_DAYS'
      },
      {
        regime: 'TRENDING',
        winRate: 0.68,
        averageReturn: 0.12,
        tradeFrequency: 6,
        bestStrategy: 'MOMENTUM_FOLLOW',
        performanceScore: 78,
        totalTrades: 32,
        period: 'LAST_30_DAYS'
      },
      {
        regime: 'RANGING',
        winRate: 0.58,
        averageReturn: 0.08,
        tradeFrequency: 4,
        bestStrategy: 'MEAN_REVERSION',
        performanceScore: 65,
        totalTrades: 28,
        period: 'LAST_30_DAYS'
      }
    ];
  }

  private generateRecommendations(
    performance?: PerformanceMetrics,
    risk?: RiskMetrics,
    strategies?: StrategyPerformance[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (performance && performance.winRate < this.TARGET_WIN_RATE) {
      recommendations.push('Consider focusing on higher-confidence signals to improve win rate');
    }
    
    if (risk && risk.riskScore > 70) {
      recommendations.push('Reduce position sizes or overall exposure to lower risk score');
    }
    
    if (strategies && strategies.length > 0) {
      const bestStrategy = strategies.reduce((best, current) => 
        current.performanceScore > best.performanceScore ? current : best
      );
      recommendations.push(`Focus on ${bestStrategy.strategy} strategy - showing best performance`);
    }
    
    return recommendations;
  }

  private async schedulePerformanceUpdate(userId: string, sessionId: string, outcome: TradeOutcome): Promise<void> {
    await this.monitoringQueue.add('update-performance', {
      userId,
      sessionId,
      tradeOutcome: outcome
    }, {
      priority: 8,
      delay: 0
    });
  }

  /**
   * Load historical performance data
   */
  private async loadHistoricalData(): Promise<void> {
    console.log('📊 Loading historical performance data...');
    // Placeholder - would load from database
  }

  /**
   * Start real-time monitoring
   */
  private async startRealTimeMonitoring(): Promise<void> {
    if (this.isProcessing) {
      console.log('⚠️ Performance monitoring already active');
      return;
    }

    this.isProcessing = true;
    console.log('🔄 Starting real-time performance monitoring...');

    // Monitor performance every 30 seconds
    setInterval(async () => {
      // Update all active user performance metrics
      for (const [key] of this.performanceCache) {
        const [userId, sessionId] = key.includes('_') ? key.split('_') : [key, undefined];
        
        await this.monitoringQueue.add('monitor-risk', {
          userId,
          sessionId
        }, {
          priority: 5,
          delay: 0
        });
      }
    }, 30000);

    // Generate reports every hour
    setInterval(async () => {
      for (const [key] of this.performanceCache) {
        const [userId] = key.includes('_') ? key.split('_') : [key];
        
        await this.monitoringQueue.add('generate-report', {
          userId,
          reportType: 'DAILY',
          timeframe: 'DAILY'
        }, {
          priority: 3,
          delay: 0
        });
      }
    }, 3600000);
  }

  /**
   * Get performance monitoring queue statistics
   */
  async getQueueStats(): Promise<any> {
    const waiting = await this.monitoringQueue.getWaiting();
    const active = await this.monitoringQueue.getActive();
    const completed = await this.monitoringQueue.getCompleted();
    const failed = await this.monitoringQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length + completed.length + failed.length
    };
  }

  /**
   * Clean shutdown
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Performance Monitoring...');
    
    this.isProcessing = false;
    await this.monitoringQueue.close();
    await this.redis.quit();
    await this.prisma.$disconnect();
  }
}

export default PerformanceMonitoringService;
export { 
  PerformanceMetrics, 
  StrategyPerformance, 
  MarketRegimePerformance, 
  RiskMetrics, 
  RiskAlert, 
  TradeOutcome, 
  PerformanceAlert 
};
