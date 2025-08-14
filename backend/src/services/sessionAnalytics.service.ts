import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// Analytics interfaces
export interface SessionAnalytics {
  id: string;
  userId: string;
  periodType: 'daily' | 'weekly' | 'monthly' | 'yearly';
  periodStart: Date;
  periodEnd: Date;
  
  // Session Metrics
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  expiredSessions: number;
  emergencyStoppedSessions: number;
  
  // Performance Metrics
  totalProfitLoss: number;
  averageProfitLoss: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  
  // Duration Metrics
  averageSessionDuration: number;
  shortestSession: number;
  longestSession: number;
  totalTradingTime: number;
  
  // Risk Metrics
  averageLossLimitUtilization: number;
  maxLossLimitReached: number;
  riskAdjustedReturn: number;
  volatility: number;
  
  // Trading Metrics
  totalTrades: number;
  averageTradesPerSession: number;
  averageTradeSize: number;
  tradingFrequency: number;
  
  // Timing Analysis
  bestPerformingHour: number;
  worstPerformingHour: number;
  bestPerformingDayOfWeek: number;
  worstPerformingDayOfWeek: number;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface RealTimeSessionMetrics {
  userId: string;
  sessionId: string;
  timestamp: Date;
  
  currentPnL: number;
  unrealizedPnL: number;
  realizedPnL: number;
  totalTrades: number;
  averageTradeSize: number;
  
  lossLimitUtilization: number;
  timeElapsedPercentage: number;
  tradingVelocity: number;
  
  riskScore: number;
  performanceScore: number;
  confidenceLevel: number;
}

export interface PerformanceComparison {
  userId: string;
  comparisonType: 'self_historical' | 'market_benchmark' | 'peer_group';
  
  baselineMetrics: Partial<SessionAnalytics>;
  currentMetrics: Partial<SessionAnalytics>;
  
  relativeProfitLoss: number;
  relativeWinRate: number;
  relativeDrawdown: number;
  relativeSharpeRatio: number;
  
  outperformanceScore: number;
  confidenceInterval: number;
  statisticalSignificance: number;
  
  recommendations: string[];
  insights: string[];
}

export interface OptimalTimingRecommendation {
  userId: string;
  optimalHours: number[];
  optimalDaysOfWeek: number[];
  avgPerformanceByHour: Record<number, number>;
  avgPerformanceByDay: Record<number, number>;
  confidence: number;
  sampleSize: number;
}

export interface OutcomePrediction {
  predictedProfitLoss: number;
  winProbability: number;
  riskScore: number;
  expectedDuration: number;
  confidence: number;
  factors: Array<{
    factor: string;
    impact: number;
    description: string;
  }>;
}

export class SessionAnalyticsService {
  private static instance: SessionAnalyticsService;
  private analyticsCache: Map<string, any> = new Map();
  private cacheExpiryTime: number = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): SessionAnalyticsService {
    if (!SessionAnalyticsService.instance) {
      SessionAnalyticsService.instance = new SessionAnalyticsService();
    }
    return SessionAnalyticsService.instance;
  }

  /**
   * Get real-time metrics for active sessions
   */
  async getRealTimeMetrics(userId: string): Promise<RealTimeSessionMetrics[]> {
    try {
      const activeSessions = await prisma.tradingSession.findMany({
        where: {
          userId,
          status: 'ACTIVE'
        },
        include: {
          _count: {
            select: {
              algorithmDecisions: true
            }
          }
        }
      });

      const metrics: RealTimeSessionMetrics[] = [];

      for (const session of activeSessions) {
        const currentPnL = session.realizedPnl?.toNumber() || 0;
        const lossLimit = session.lossLimitAmount.toNumber();
        const lossUtilization = lossLimit > 0 ? (Math.abs(Math.min(0, currentPnL)) / lossLimit) * 100 : 0;
        
        let timeElapsedPercentage = 0;
        if (session.startTime && session.endTime) {
          const totalDuration = session.endTime.getTime() - session.startTime.getTime();
          const elapsed = Date.now() - session.startTime.getTime();
          timeElapsedPercentage = (elapsed / totalDuration) * 100;
        }

        const totalTrades = session.tradeCount || 0;
        const tradingVelocity = session.startTime ? 
          totalTrades / ((Date.now() - session.startTime.getTime()) / (1000 * 60 * 60)) : 0; // trades per hour

        metrics.push({
          userId,
          sessionId: session.id,
          timestamp: new Date(),
          currentPnL,
          unrealizedPnL: 0, // TODO: Calculate from open positions
          realizedPnL: currentPnL,
          totalTrades,
          averageTradeSize: totalTrades > 0 ? Math.abs(currentPnL) / totalTrades : 0,
          lossLimitUtilization: lossUtilization,
          timeElapsedPercentage: Math.min(100, timeElapsedPercentage),
          tradingVelocity,
          riskScore: this.calculateRiskScore(lossUtilization, tradingVelocity),
          performanceScore: this.calculatePerformanceScore(currentPnL, lossLimit),
          confidenceLevel: Math.min(100, totalTrades * 10) // Higher confidence with more trades
        });
      }

      return metrics;

    } catch (error) {
      console.error('Failed to get real-time metrics:', error);
      throw error;
    }
  }

  /**
   * Update real-time metrics for a session
   */
  async updateRealTimeMetrics(sessionId: string, metrics: Partial<RealTimeSessionMetrics>): Promise<void> {
    try {
      // Cache the metrics for real-time access
      const cacheKey = `realtime_${sessionId}`;
      const existing = this.analyticsCache.get(cacheKey) || {};
      
      this.analyticsCache.set(cacheKey, {
        ...existing,
        ...metrics,
        timestamp: new Date()
      });

      // TODO: Store in time-series database for historical analysis
      console.log(`Updated real-time metrics for session ${sessionId}`);

    } catch (error) {
      console.error('Failed to update real-time metrics:', error);
    }
  }

  /**
   * Get session analytics for a specific period
   */
  async getSessionAnalytics(
    userId: string, 
    periodType: 'daily' | 'weekly' | 'monthly' | 'yearly',
    startDate: Date, 
    endDate: Date
  ): Promise<SessionAnalytics> {
    try {
      const cacheKey = `analytics_${userId}_${periodType}_${startDate.toISOString()}_${endDate.toISOString()}`;
      
      // Check cache first
      if (this.analyticsCache.has(cacheKey)) {
        const cached = this.analyticsCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheExpiryTime) {
          return cached.data;
        }
      }

      // Fetch sessions for the period
      const sessions = await prisma.tradingSession.findMany({
        where: {
          userId,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      const analytics = await this.calculateSessionAnalytics(
        userId,
        sessions,
        periodType,
        startDate,
        endDate
      );

      // Cache the result
      this.analyticsCache.set(cacheKey, {
        data: analytics,
        timestamp: Date.now()
      });

      return analytics;

    } catch (error) {
      console.error('Failed to get session analytics:', error);
      throw error;
    }
  }

  /**
   * Compare performance against different baselines
   */
  async comparePerformance(
    userId: string, 
    comparisonType: 'self_historical' | 'market_benchmark' | 'peer_group',
    timeframe: string
  ): Promise<PerformanceComparison> {
    try {
      const now = new Date();
      const currentPeriodStart = this.getPeriodStart(timeframe, now);
      const previousPeriodStart = this.getPeriodStart(timeframe, currentPeriodStart);
      const previousPeriodEnd = currentPeriodStart;

      // Get current period metrics
      const currentMetrics = await this.getSessionAnalytics(
        userId, 
        'monthly', 
        currentPeriodStart, 
        now
      );

      let baselineMetrics: Partial<SessionAnalytics>;

      switch (comparisonType) {
        case 'self_historical':
          baselineMetrics = await this.getSessionAnalytics(
            userId, 
            'monthly', 
            previousPeriodStart, 
            previousPeriodEnd
          );
          break;
        
        case 'market_benchmark':
          // TODO: Implement market benchmark comparison
          baselineMetrics = await this.getMarketBenchmark(currentPeriodStart, now);
          break;
        
        case 'peer_group':
          // TODO: Implement peer group comparison
          baselineMetrics = await this.getPeerGroupAverage(currentPeriodStart, now);
          break;
        
        default:
          throw new Error(`Unknown comparison type: ${comparisonType}`);
      }

      // Calculate relative performance
      const comparison: PerformanceComparison = {
        userId,
        comparisonType,
        baselineMetrics,
        currentMetrics,
        relativeProfitLoss: this.calculateRelativeChange(
          baselineMetrics.totalProfitLoss || 0,
          currentMetrics.totalProfitLoss
        ),
        relativeWinRate: this.calculateRelativeChange(
          baselineMetrics.winRate || 0,
          currentMetrics.winRate
        ),
        relativeDrawdown: this.calculateRelativeChange(
          baselineMetrics.maxDrawdown || 0,
          currentMetrics.maxDrawdown
        ),
        relativeSharpeRatio: this.calculateRelativeChange(
          baselineMetrics.sharpeRatio || 0,
          currentMetrics.sharpeRatio
        ),
        outperformanceScore: 0, // TODO: Calculate composite score
        confidenceInterval: 0.95,
        statisticalSignificance: 0, // TODO: Calculate p-value
        recommendations: [],
        insights: []
      };

      // Generate insights and recommendations
      comparison.insights = this.generateInsights(comparison);
      comparison.recommendations = this.generateRecommendations(comparison);

      return comparison;

    } catch (error) {
      console.error('Failed to compare performance:', error);
      throw error;
    }
  }

  /**
   * Get optimal session timing recommendations
   */
  async getOptimalSessionTiming(userId: string): Promise<OptimalTimingRecommendation> {
    try {
      const sessions = await prisma.tradingSession.findMany({
        where: {
          userId,
          status: { in: ['COMPLETED', 'STOPPED', 'EXPIRED'] }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 100 // Analyze last 100 sessions
      });

      if (sessions.length < 10) {
        throw new Error('Insufficient data for timing analysis');
      }

      const hourlyPerformance: Record<number, number[]> = {};
      const dailyPerformance: Record<number, number[]> = {};

      sessions.forEach(session => {
        if (session.startTime && session.realizedPnl) {
          const hour = session.startTime.getHours();
          const dayOfWeek = session.startTime.getDay();
          const pnl = session.realizedPnl.toNumber();

          if (!hourlyPerformance[hour]) hourlyPerformance[hour] = [];
          if (!dailyPerformance[dayOfWeek]) dailyPerformance[dayOfWeek] = [];

          hourlyPerformance[hour].push(pnl);
          dailyPerformance[dayOfWeek].push(pnl);
        }
      });

      // Calculate average performance by hour and day
      const avgPerformanceByHour: Record<number, number> = {};
      const avgPerformanceByDay: Record<number, number> = {};

      Object.entries(hourlyPerformance).forEach(([hour, pnls]) => {
        avgPerformanceByHour[parseInt(hour)] = pnls.reduce((sum, pnl) => sum + pnl, 0) / pnls.length;
      });

      Object.entries(dailyPerformance).forEach(([day, pnls]) => {
        avgPerformanceByDay[parseInt(day)] = pnls.reduce((sum, pnl) => sum + pnl, 0) / pnls.length;
      });

      // Find optimal hours (top 25%)
      const sortedHours = Object.entries(avgPerformanceByHour)
        .sort(([,a], [,b]) => b - a)
        .slice(0, Math.ceil(Object.keys(avgPerformanceByHour).length * 0.25));

      const optimalHours = sortedHours.map(([hour]) => parseInt(hour));

      // Find optimal days (top 50%)
      const sortedDays = Object.entries(avgPerformanceByDay)
        .sort(([,a], [,b]) => b - a)
        .slice(0, Math.ceil(Object.keys(avgPerformanceByDay).length * 0.5));

      const optimalDaysOfWeek = sortedDays.map(([day]) => parseInt(day));

      return {
        userId,
        optimalHours,
        optimalDaysOfWeek,
        avgPerformanceByHour,
        avgPerformanceByDay,
        confidence: Math.min(95, sessions.length * 2), // Higher confidence with more data
        sampleSize: sessions.length
      };

    } catch (error) {
      console.error('Failed to get optimal timing:', error);
      throw error;
    }
  }

  /**
   * Predict session outcome based on parameters
   */
  async predictSessionOutcome(sessionParams: any): Promise<OutcomePrediction> {
    try {
      // TODO: Implement machine learning model for outcome prediction
      // For now, use simple heuristics based on historical data

      const { userId, durationMinutes, lossLimitAmount } = sessionParams;

      // Get similar historical sessions
      const similarSessions = await prisma.tradingSession.findMany({
        where: {
          userId,
          durationMinutes: {
            gte: Math.floor(durationMinutes * 0.8),
            lte: Math.ceil(durationMinutes * 1.2)
          },
          lossLimitAmount: {
            gte: Math.floor(lossLimitAmount * 0.8),
            lte: Math.ceil(lossLimitAmount * 1.2)
          },
          status: { in: ['COMPLETED', 'STOPPED', 'EXPIRED'] }
        },
        take: 50
      });

      if (similarSessions.length < 5) {
        return {
          predictedProfitLoss: 0,
          winProbability: 0.5,
          riskScore: 50,
          expectedDuration: durationMinutes,
          confidence: 0.1,
          factors: [{
            factor: 'Insufficient Data',
            impact: 0,
            description: 'Not enough historical data for accurate prediction'
          }]
        };
      }

      const pnls = similarSessions.map(s => s.realizedPnl?.toNumber() || 0);
      const wins = pnls.filter(pnl => pnl > 0).length;
      const avgPnL = pnls.reduce((sum, pnl) => sum + pnl, 0) / pnls.length;

      return {
        predictedProfitLoss: avgPnL,
        winProbability: wins / similarSessions.length,
        riskScore: this.calculatePredictedRiskScore(sessionParams, similarSessions),
        expectedDuration: durationMinutes,
        confidence: Math.min(0.9, similarSessions.length / 50),
        factors: [
          {
            factor: 'Historical Performance',
            impact: 0.6,
            description: `Based on ${similarSessions.length} similar sessions`
          },
          {
            factor: 'Risk Parameters',
            impact: 0.3,
            description: 'Session duration and loss limit configuration'
          },
          {
            factor: 'Market Conditions',
            impact: 0.1,
            description: 'Current market volatility and trends'
          }
        ]
      };

    } catch (error) {
      console.error('Failed to predict session outcome:', error);
      throw error;
    }
  }

  /**
   * Aggregate session data for analytics
   */
  async aggregateSessionData(userId: string, aggregationType: 'daily' | 'weekly' | 'monthly'): Promise<void> {
    try {
      const now = new Date();
      const periodStart = this.getPeriodStart(aggregationType, now);

      const sessions = await prisma.tradingSession.findMany({
        where: {
          userId,
          createdAt: {
            gte: periodStart,
            lte: now
          }
        }
      });

      const analytics = await this.calculateSessionAnalytics(
        userId,
        sessions,
        aggregationType,
        periodStart,
        now
      );

      // TODO: Store aggregated data in analytics tables
      console.log(`Aggregated ${aggregationType} data for user ${userId}: ${sessions.length} sessions`);

    } catch (error) {
      console.error('Failed to aggregate session data:', error);
    }
  }

  /**
   * Refresh analytics cache
   */
  async refreshAnalyticsCache(userId?: string): Promise<void> {
    try {
      if (userId) {
        // Clear cache entries for specific user
        for (const [key] of this.analyticsCache) {
          if (key.includes(userId)) {
            this.analyticsCache.delete(key);
          }
        }
      } else {
        // Clear entire cache
        this.analyticsCache.clear();
      }

      console.log(`Refreshed analytics cache${userId ? ` for user ${userId}` : ''}`);

    } catch (error) {
      console.error('Failed to refresh analytics cache:', error);
    }
  }

  // Private helper methods

  private async calculateSessionAnalytics(
    userId: string,
    sessions: any[],
    periodType: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<SessionAnalytics> {
    // Session counts by status
    const totalSessions = sessions.length;
    const activeSessions = sessions.filter(s => s.status === 'ACTIVE').length;
    const completedSessions = sessions.filter(s => s.status === 'COMPLETED').length;
    const expiredSessions = sessions.filter(s => s.status === 'EXPIRED').length;
    const emergencyStoppedSessions = sessions.filter(s => s.status === 'EMERGENCY_STOPPED').length;

    // Performance calculations
    const pnls = sessions.map(s => s.realizedPnl?.toNumber() || 0);
    const totalProfitLoss = pnls.reduce((sum, pnl) => sum + pnl, 0);
    const averageProfitLoss = totalSessions > 0 ? totalProfitLoss / totalSessions : 0;

    const wins = pnls.filter(pnl => pnl > 0);
    const losses = pnls.filter(pnl => pnl < 0);
    const winRate = totalSessions > 0 ? (wins.length / totalSessions) * 100 : 0;
    const averageWin = wins.length > 0 ? wins.reduce((sum, win) => sum + win, 0) / wins.length : 0;
    const averageLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, loss) => sum + loss, 0)) / losses.length : 0;
    const profitFactor = averageLoss > 0 ? (averageWin * wins.length) / (averageLoss * losses.length) : 0;

    // Duration calculations
    const durations = sessions
      .filter(s => s.startTime && s.actualEndTime)
      .map(s => s.actualEndTime!.getTime() - s.startTime!.getTime());
    
    const averageSessionDuration = durations.length > 0 ? 
      durations.reduce((sum, dur) => sum + dur, 0) / durations.length / (1000 * 60) : 0; // in minutes
    const shortestSession = durations.length > 0 ? Math.min(...durations) / (1000 * 60) : 0;
    const longestSession = durations.length > 0 ? Math.max(...durations) / (1000 * 60) : 0;
    const totalTradingTime = durations.reduce((sum, dur) => sum + dur, 0) / (1000 * 60);

    // Risk calculations
    const lossLimits = sessions.map(s => s.lossLimitAmount.toNumber());
    const lossUtilizations = sessions.map(s => {
      const loss = Math.abs(Math.min(0, s.realizedPnl?.toNumber() || 0));
      const limit = s.lossLimitAmount.toNumber();
      return limit > 0 ? (loss / limit) * 100 : 0;
    });
    
    const averageLossLimitUtilization = lossUtilizations.length > 0 ? 
      lossUtilizations.reduce((sum, util) => sum + util, 0) / lossUtilizations.length : 0;
    const maxLossLimitReached = sessions.filter(s => 
      s.terminationReason === 'loss_limit_reached'
    ).length;

    // Trading calculations
    const totalTrades = sessions.reduce((sum, s) => sum + (s.tradeCount || 0), 0);
    const averageTradesPerSession = totalSessions > 0 ? totalTrades / totalSessions : 0;

    // Timing analysis
    const hourlyPnLs: Record<number, number[]> = {};
    const dailyPnLs: Record<number, number[]> = {};

    sessions.forEach(session => {
      if (session.startTime && session.realizedPnl) {
        const hour = session.startTime.getHours();
        const day = session.startTime.getDay();
        const pnl = session.realizedPnl.toNumber();

        if (!hourlyPnLs[hour]) hourlyPnLs[hour] = [];
        if (!dailyPnLs[day]) dailyPnLs[day] = [];

        hourlyPnLs[hour].push(pnl);
        dailyPnLs[day].push(pnl);
      }
    });

    const bestPerformingHour = this.findBestPerformingPeriod(hourlyPnLs);
    const worstPerformingHour = this.findWorstPerformingPeriod(hourlyPnLs);
    const bestPerformingDayOfWeek = this.findBestPerformingPeriod(dailyPnLs);
    const worstPerformingDayOfWeek = this.findWorstPerformingPeriod(dailyPnLs);

    return {
      id: `${userId}_${periodType}_${periodStart.toISOString()}`,
      userId,
      periodType: periodType as any,
      periodStart,
      periodEnd,
      totalSessions,
      activeSessions,
      completedSessions,
      expiredSessions,
      emergencyStoppedSessions,
      totalProfitLoss,
      averageProfitLoss,
      winRate,
      averageWin,
      averageLoss,
      profitFactor,
      maxDrawdown: this.calculateMaxDrawdown(pnls),
      sharpeRatio: this.calculateSharpeRatio(pnls),
      averageSessionDuration,
      shortestSession,
      longestSession,
      totalTradingTime,
      averageLossLimitUtilization,
      maxLossLimitReached,
      riskAdjustedReturn: this.calculateRiskAdjustedReturn(pnls),
      volatility: this.calculateVolatility(pnls),
      totalTrades,
      averageTradesPerSession,
      averageTradeSize: totalTrades > 0 ? Math.abs(totalProfitLoss) / totalTrades : 0,
      tradingFrequency: totalTradingTime > 0 ? totalTrades / (totalTradingTime / 60) : 0, // trades per hour
      bestPerformingHour,
      worstPerformingHour,
      bestPerformingDayOfWeek,
      worstPerformingDayOfWeek,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private calculateRiskScore(lossUtilization: number, tradingVelocity: number): number {
    // Simple risk scoring algorithm
    let score = 0;
    
    // Loss utilization component (0-60 points)
    score += Math.min(60, lossUtilization * 0.6);
    
    // Trading velocity component (0-40 points)
    if (tradingVelocity > 10) score += 40; // Very high velocity
    else if (tradingVelocity > 5) score += 20; // High velocity
    else if (tradingVelocity > 2) score += 10; // Medium velocity
    
    return Math.min(100, score);
  }

  private calculatePerformanceScore(currentPnL: number, lossLimit: number): number {
    // Performance scoring (0-100)
    if (currentPnL > 0) {
      // Positive performance, scale based on proportion of loss limit
      return Math.min(100, 50 + (currentPnL / lossLimit) * 50);
    } else {
      // Negative performance, scale based on loss utilization
      const lossUtilization = Math.abs(currentPnL) / lossLimit;
      return Math.max(0, 50 - (lossUtilization * 50));
    }
  }

  private calculateMaxDrawdown(pnls: number[]): number {
    if (pnls.length === 0) return 0;
    
    let peak = 0;
    let maxDrawdown = 0;
    let cumulativePnL = 0;
    
    for (const pnl of pnls) {
      cumulativePnL += pnl;
      if (cumulativePnL > peak) {
        peak = cumulativePnL;
      }
      const drawdown = peak - cumulativePnL;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    return maxDrawdown;
  }

  private calculateSharpeRatio(returns: number[], riskFreeRate: number = 0.02): number {
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev > 0 ? (avgReturn - riskFreeRate) / stdDev : 0;
  }

  private calculateRiskAdjustedReturn(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const totalReturn = returns.reduce((sum, ret) => sum + ret, 0);
    const volatility = this.calculateVolatility(returns);
    
    return volatility > 0 ? totalReturn / volatility : 0;
  }

  private calculateVolatility(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  private findBestPerformingPeriod(periodData: Record<number, number[]>): number {
    let bestPeriod = 0;
    let bestAvg = -Infinity;
    
    Object.entries(periodData).forEach(([period, pnls]) => {
      const avg = pnls.reduce((sum, pnl) => sum + pnl, 0) / pnls.length;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestPeriod = parseInt(period);
      }
    });
    
    return bestPeriod;
  }

  private findWorstPerformingPeriod(periodData: Record<number, number[]>): number {
    let worstPeriod = 0;
    let worstAvg = Infinity;
    
    Object.entries(periodData).forEach(([period, pnls]) => {
      const avg = pnls.reduce((sum, pnl) => sum + pnl, 0) / pnls.length;
      if (avg < worstAvg) {
        worstAvg = avg;
        worstPeriod = parseInt(period);
      }
    });
    
    return worstPeriod;
  }

  private getPeriodStart(timeframe: string, referenceDate: Date): Date {
    const date = new Date(referenceDate);
    
    switch (timeframe.toLowerCase()) {
      case 'daily':
      case '1d':
        date.setDate(date.getDate() - 1);
        break;
      case 'weekly':
      case '1w':
        date.setDate(date.getDate() - 7);
        break;
      case 'monthly':
      case '1m':
        date.setMonth(date.getMonth() - 1);
        break;
      case 'yearly':
      case '1y':
        date.setFullYear(date.getFullYear() - 1);
        break;
      default:
        date.setMonth(date.getMonth() - 1); // Default to monthly
    }
    
    return date;
  }

  private async getMarketBenchmark(startDate: Date, endDate: Date): Promise<Partial<SessionAnalytics>> {
    // TODO: Implement actual market benchmark data retrieval
    // For now, return mock benchmark data
    return {
      totalProfitLoss: 0.05, // 5% return
      winRate: 55,
      maxDrawdown: 0.08,
      sharpeRatio: 1.2,
      volatility: 0.15
    };
  }

  private async getPeerGroupAverage(startDate: Date, endDate: Date): Promise<Partial<SessionAnalytics>> {
    // TODO: Implement peer group comparison
    // For now, return aggregated data from all users (anonymized)
    try {
      const allUsersSessions = await prisma.tradingSession.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          status: { in: ['COMPLETED', 'STOPPED', 'EXPIRED'] }
        }
      });

      if (allUsersSessions.length === 0) {
        return {
          totalProfitLoss: 0,
          winRate: 50,
          maxDrawdown: 0,
          sharpeRatio: 0,
          volatility: 0
        };
      }

      const pnls = allUsersSessions.map(s => s.realizedPnl?.toNumber() || 0);
      const wins = pnls.filter(pnl => pnl > 0).length;
      
      return {
        totalProfitLoss: pnls.reduce((sum, pnl) => sum + pnl, 0) / pnls.length,
        winRate: (wins / pnls.length) * 100,
        maxDrawdown: this.calculateMaxDrawdown(pnls),
        sharpeRatio: this.calculateSharpeRatio(pnls),
        volatility: this.calculateVolatility(pnls)
      };

    } catch (error) {
      console.error('Failed to get peer group average:', error);
      return {
        totalProfitLoss: 0,
        winRate: 50,
        maxDrawdown: 0,
        sharpeRatio: 0,
        volatility: 0
      };
    }
  }

  private calculateRelativeChange(baseline: number, current: number): number {
    if (baseline === 0) {
      return current === 0 ? 0 : (current > 0 ? 100 : -100);
    }
    return ((current - baseline) / Math.abs(baseline)) * 100;
  }

  private generateInsights(comparison: PerformanceComparison): string[] {
    const insights: string[] = [];
    
    if (comparison.relativeProfitLoss > 10) {
      insights.push(`Your profit/loss performance has improved by ${comparison.relativeProfitLoss.toFixed(1)}% compared to the baseline period.`);
    } else if (comparison.relativeProfitLoss < -10) {
      insights.push(`Your profit/loss performance has declined by ${Math.abs(comparison.relativeProfitLoss).toFixed(1)}% compared to the baseline period.`);
    }
    
    if (comparison.relativeWinRate > 5) {
      insights.push(`Your win rate has increased by ${comparison.relativeWinRate.toFixed(1)}%, indicating improved trade selection.`);
    } else if (comparison.relativeWinRate < -5) {
      insights.push(`Your win rate has decreased by ${Math.abs(comparison.relativeWinRate).toFixed(1)}%, suggesting need for strategy refinement.`);
    }
    
    if (comparison.relativeDrawdown > 20) {
      insights.push(`Maximum drawdown has increased significantly, indicating higher risk exposure.`);
    } else if (comparison.relativeDrawdown < -20) {
      insights.push(`Maximum drawdown has improved significantly, showing better risk management.`);
    }
    
    if (insights.length === 0) {
      insights.push('Performance metrics are relatively stable compared to the baseline period.');
    }
    
    return insights;
  }

  private generateRecommendations(comparison: PerformanceComparison): string[] {
    const recommendations: string[] = [];
    
    if (comparison.relativeProfitLoss < -15) {
      recommendations.push('Consider reducing position sizes and focusing on higher probability trades.');
      recommendations.push('Review your trading strategy and consider backtesting recent changes.');
    }
    
    if (comparison.relativeWinRate < -10) {
      recommendations.push('Analyze your recent losing trades to identify common patterns.');
      recommendations.push('Consider tightening your entry criteria to improve trade quality.');
    }
    
    if (comparison.relativeDrawdown > 25) {
      recommendations.push('Implement stricter risk management rules to limit maximum drawdown.');
      recommendations.push('Consider reducing correlation between your trading positions.');
    }
    
    if (comparison.relativeSharpeRatio < -20) {
      recommendations.push('Focus on improving risk-adjusted returns rather than absolute returns.');
      recommendations.push('Consider diversifying your trading strategies to reduce volatility.');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Continue with your current approach while monitoring performance metrics.');
      recommendations.push('Consider gradually increasing position sizes if performance remains consistent.');
    }
    
    return recommendations;
  }

  private calculatePredictedRiskScore(sessionParams: any, similarSessions: any[]): number {
    const { lossLimitAmount, durationMinutes } = sessionParams;
    
    // Calculate average loss utilization from similar sessions
    const lossUtilizations = similarSessions.map(s => {
      const loss = Math.abs(Math.min(0, s.realizedPnl?.toNumber() || 0));
      const limit = s.lossLimitAmount.toNumber();
      return limit > 0 ? (loss / limit) * 100 : 0;
    });
    
    const avgLossUtilization = lossUtilizations.reduce((sum, util) => sum + util, 0) / lossUtilizations.length;
    
    // Base risk score on historical loss utilization
    let riskScore = avgLossUtilization;
    
    // Adjust for session duration (longer sessions may be riskier)
    if (durationMinutes > 480) { // > 8 hours
      riskScore += 10;
    } else if (durationMinutes > 240) { // > 4 hours
      riskScore += 5;
    }
    
    // Adjust for loss limit amount (higher limits may encourage more risk)
    if (lossLimitAmount > 5000) {
      riskScore += 5;
    }
    
    return Math.min(100, Math.max(0, riskScore));
  }
}

// Export singleton instance
export default SessionAnalyticsService.getInstance();
