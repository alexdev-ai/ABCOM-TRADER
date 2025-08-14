import Queue from 'bull';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import MarketDataService, { MarketDataPoint, MarketCondition } from './marketData.service';
import { tradingSessionService } from './tradingSession.service';

interface TradingDecision {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD' | 'STOP';
  confidence: number; // 0-100
  reasoning: string;
  technicalSignals: TechnicalSignal[];
  riskAssessment: RiskAssessment;
  positionSize: number;
  expectedTarget: number;
  stopLoss: number;
  timeframe: string;
  strategy: 'VOLATILITY_HUNTER' | 'MOMENTUM_FOLLOW' | 'MEAN_REVERSION' | 'EARNINGS_EXPLOIT';
  createdAt: Date;
}

interface TechnicalSignal {
  indicator: string;
  value: number;
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength: number; // 0-1
  timeframe: string;
}

interface RiskAssessment {
  riskPercentage: number;
  maxDrawdown: number;
  correlationRisk: number;
  volatilityRisk: number;
  circuitBreakerActive: boolean;
}

interface AlgorithmPerformance {
  totalTrades: number;
  winRate: number;
  monthlyReturn: number;
  averageHoldTime: number;
  maxDrawdown: number;
  profitFactor: number;
  sharpeRatio: number;
}

class SmartTradeAlgorithmService {
  private algorithmQueue: Queue.Queue;
  private redis: Redis;
  private prisma: PrismaClient;
  private marketDataService: MarketDataService;
  private tradingSessionService: typeof tradingSessionService;
  private isProcessing: boolean = false;
  
  // Multi-strategy components
  private regimeDetector: MarketRegimeDetector;
  private technicalAnalyzer: TechnicalAnalysisEngine;
  private optionsAnalyzer: OptionsFlowAnalyzer;
  private earningsExploiter: EarningsExploiter;
  private aggressiveRiskManager: AggressiveRiskManager;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL + '?family=0' || 'redis://localhost:6379?family=0');
    this.prisma = new PrismaClient();
    this.marketDataService = new MarketDataService();
    this.tradingSessionService = tradingSessionService;
    
    // Initialize Bull Queue for background processing
    this.algorithmQueue = new Queue('SmartTrade Algorithm', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential'
        }
      }
    });

    // Initialize components
    this.regimeDetector = new MarketRegimeDetector(this.marketDataService);
    this.technicalAnalyzer = new TechnicalAnalysisEngine();
    this.optionsAnalyzer = new OptionsFlowAnalyzer(this.marketDataService);
    this.earningsExploiter = new EarningsExploiter(this.marketDataService);
    this.aggressiveRiskManager = new AggressiveRiskManager(this.tradingSessionService);

    this.setupJobProcessors();
  }

  /**
   * Initialize algorithm service and start background processing
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔥 Initializing SmartTrade AI Algorithm Service...');
      
      // Initialize market data streaming
      await this.marketDataService.initializeMarketDataStream();
      
      // Start algorithm processing
      await this.startAlgorithmProcessing();
      
      console.log('🚀 SmartTrade AI Algorithm Service ready for AGGRESSIVE HIGH-OCTANE trading!');
      
    } catch (error) {
      console.error('💥 Failed to initialize algorithm service:', error);
      throw error;
    }
  }

  /**
   * Setup Bull Queue job processors for different algorithm tasks
   */
  private setupJobProcessors(): void {
    // Market analysis job processor
    this.algorithmQueue.process('market-analysis', 5, async (job) => {
      const { symbols, userId } = job.data;
      return await this.processMarketAnalysis(symbols, userId);
    });

    // Trading decision job processor
    this.algorithmQueue.process('trading-decision', 10, async (job) => {
      const { symbol, userId, sessionId } = job.data;
      return await this.generateTradingDecision(symbol, userId, sessionId);
    });

    // Risk monitoring job processor
    this.algorithmQueue.process('risk-monitoring', 3, async (job) => {
      const { userId, sessionId } = job.data;
      return await this.monitorRiskLimits(userId, sessionId);
    });

    // Performance tracking job processor
    this.algorithmQueue.process('performance-tracking', 1, async (job) => {
      const { userId } = job.data;
      return await this.trackPerformance(userId);
    });

    console.log('📊 Algorithm job processors configured');
  }

  /**
   * Start continuous algorithm processing for market open domination
   */
  private async startAlgorithmProcessing(): Promise<void> {
    if (this.isProcessing) {
      console.log('⚠️ Algorithm processing already active');
      return;
    }

    this.isProcessing = true;
    console.log('🎯 Starting MARKET OPEN DOMINATION processing...');

    // Schedule market analysis every 30 seconds during market hours
    setInterval(async () => {
      if (await this.isMarketOpen()) {
        await this.scheduleMarketAnalysis();
      }
    }, 30000);

    // Schedule risk monitoring every 10 seconds
    setInterval(async () => {
      await this.scheduleRiskMonitoring();
    }, 10000);

    // Schedule performance tracking every 5 minutes
    setInterval(async () => {
      await this.schedulePerformanceTracking();
    }, 300000);
  }

  /**
   * Generate comprehensive trading decision using multi-strategy approach
   */
  async generateTradingDecision(symbol: string, userId: string, sessionId: string): Promise<TradingDecision> {
    try {
      console.log(`🧠 Generating trading decision for ${symbol}...`);

      // Step 1: Detect market regime
      const marketRegime = await this.regimeDetector.detectCurrentRegime();
      
      // Step 2: Get comprehensive technical analysis
      const technicalSignals = await this.technicalAnalyzer.analyze(symbol);
      
      // Step 3: Get options flow analysis
      const optionsFlow = await this.optionsAnalyzer.analyze(symbol);
      
      // Step 4: Check for earnings opportunities
      const earningsPlay = await this.earningsExploiter.analyze(symbol);
      
      // Step 5: Select optimal strategy based on market conditions
      const selectedStrategy = this.selectOptimalStrategy(marketRegime, technicalSignals, optionsFlow);
      
      // Step 6: Calculate position size with aggressive risk management
      const riskAssessment = await this.aggressiveRiskManager.calculateRisk(
        symbol, 
        userId, 
        sessionId, 
        marketRegime
      );
      
      // Step 7: Generate final decision
      const decision = this.fuseSignalsIntoDecision(
        symbol,
        selectedStrategy,
        technicalSignals,
        optionsFlow,
        earningsPlay,
        riskAssessment,
        marketRegime
      );

      // Step 8: Log decision for audit trail
      await this.logAlgorithmDecision(decision, userId, sessionId);

      console.log(`✅ Trading decision for ${symbol}: ${decision.action} (${decision.confidence}% confidence)`);
      return decision;

    } catch (error) {
      console.error(`❌ Error generating trading decision for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Select optimal trading strategy based on market conditions
   */
  private selectOptimalStrategy(
    marketRegime: MarketCondition,
    technicalSignals: TechnicalSignal[],
    optionsFlow: any
  ): 'VOLATILITY_HUNTER' | 'MOMENTUM_FOLLOW' | 'MEAN_REVERSION' | 'EARNINGS_EXPLOIT' {
    
    // AGGRESSIVE HIGH-OCTANE strategy selection
    if (marketRegime.regime === 'HIGH_VOLATILITY' && marketRegime.vixLevel > 25) {
      return 'VOLATILITY_HUNTER';
    }
    
    if (marketRegime.trendStrength > 0.7 && this.isWithinMarketOpenWindow()) {
      return 'MOMENTUM_FOLLOW';
    }
    
    if (optionsFlow?.unusualActivity && optionsFlow?.institutionalFlow !== 'NEUTRAL') {
      return 'EARNINGS_EXPLOIT';
    }
    
    return 'MEAN_REVERSION';
  }

  /**
   * Fuse all signals into final trading decision
   */
  private fuseSignalsIntoDecision(
    symbol: string,
    strategy: string,
    technicalSignals: TechnicalSignal[],
    optionsFlow: any,
    earningsPlay: any,
    riskAssessment: RiskAssessment,
    marketRegime: MarketCondition
  ): TradingDecision {
    
    // Calculate confidence based on signal convergence
    const confidence = this.calculateConfidence(technicalSignals, optionsFlow, earningsPlay);
    
    // Determine action based on strategy and signals
    const action = this.determineAction(strategy, technicalSignals, optionsFlow, confidence);
    
    // Calculate position size (2-3% risk per trade)
    const positionSize = this.calculatePositionSize(riskAssessment, confidence);
    
    // Generate reasoning
    const reasoning = this.generateReasoning(strategy, technicalSignals, optionsFlow, marketRegime);
    
    return {
      id: `decision_${Date.now()}_${symbol}`,
      symbol,
      action,
      confidence,
      reasoning,
      technicalSignals,
      riskAssessment,
      positionSize,
      expectedTarget: this.calculateTarget(action, technicalSignals),
      stopLoss: this.calculateStopLoss(action, technicalSignals, riskAssessment),
      timeframe: this.getOptimalTimeframe(strategy),
      strategy: strategy as any,
      createdAt: new Date()
    };
  }

  /**
   * Calculate decision confidence based on signal convergence
   */
  private calculateConfidence(
    technicalSignals: TechnicalSignal[],
    optionsFlow: any,
    earningsPlay: any
  ): number {
    let confidence = 50; // Base confidence
    
    // Technical signal convergence
    const bullishSignals = technicalSignals.filter(s => s.signal === 'BULLISH').length;
    const bearishSignals = technicalSignals.filter(s => s.signal === 'BEARISH').length;
    const signalStrength = Math.abs(bullishSignals - bearishSignals) / technicalSignals.length;
    
    confidence += signalStrength * 30;
    
    // Options flow confirmation
    if (optionsFlow?.confidence > 0.8) {
      confidence += 15;
    }
    
    // Earnings catalyst
    if (earningsPlay?.reactionType === 'MOMENTUM_CONTINUATION') {
      confidence += 10;
    }
    
    // Market open bonus (first 30 minutes)
    if (this.isWithinMarketOpenWindow()) {
      confidence += 5;
    }
    
    return Math.min(Math.max(confidence, 0), 100);
  }

  /**
   * Determine trading action based on strategy and signals
   */
  private determineAction(
    strategy: string,
    technicalSignals: TechnicalSignal[],
    optionsFlow: any,
    confidence: number
  ): 'BUY' | 'SELL' | 'HOLD' | 'STOP' {
    
    if (confidence < 60) return 'HOLD';
    
    const bullishSignals = technicalSignals.filter(s => s.signal === 'BULLISH').length;
    const bearishSignals = technicalSignals.filter(s => s.signal === 'BEARISH').length;
    
    if (bullishSignals > bearishSignals && optionsFlow?.institutionalFlow === 'BULLISH') {
      return 'BUY';
    }
    
    if (bearishSignals > bullishSignals && optionsFlow?.institutionalFlow === 'BEARISH') {
      return 'SELL';
    }
    
    return 'HOLD';
  }

  /**
   * Calculate aggressive position size (2-3% risk per trade)
   */
  private calculatePositionSize(riskAssessment: RiskAssessment, confidence: number): number {
    const baseRisk = 0.025; // 2.5% base risk
    const confidenceMultiplier = confidence / 100;
    const marketRegimeMultiplier = riskAssessment.volatilityRisk > 0.5 ? 1.2 : 1.0;
    
    return baseRisk * confidenceMultiplier * marketRegimeMultiplier;
  }

  /**
   * Generate human-readable reasoning for the decision
   */
  private generateReasoning(
    strategy: string,
    technicalSignals: TechnicalSignal[],
    optionsFlow: any,
    marketRegime: MarketCondition
  ): string {
    const reasons = [];
    
    reasons.push(`Strategy: ${strategy} selected for ${marketRegime.regime} market`);
    
    const strongSignals = technicalSignals.filter(s => s.strength > 0.7);
    if (strongSignals.length > 0) {
      reasons.push(`Strong technical signals: ${strongSignals.map(s => s.indicator).join(', ')}`);
    }
    
    if (optionsFlow?.unusualActivity) {
      reasons.push(`Unusual options activity detected (${optionsFlow.volumeSpike}x normal)`);
    }
    
    if (this.isWithinMarketOpenWindow()) {
      reasons.push('Market open window - increased volatility expected');
    }
    
    return reasons.join(' | ');
  }

  // Helper methods
  private calculateTarget(action: string, technicalSignals: TechnicalSignal[]): number {
    // Implementation for target calculation
    return 0; // Placeholder
  }

  private calculateStopLoss(action: string, technicalSignals: TechnicalSignal[], riskAssessment: RiskAssessment): number {
    // Implementation for stop loss calculation
    return 0; // Placeholder
  }

  private getOptimalTimeframe(strategy: string): string {
    switch (strategy) {
      case 'VOLATILITY_HUNTER': return '1min';
      case 'MOMENTUM_FOLLOW': return '5min';
      case 'EARNINGS_EXPLOIT': return '15min';
      default: return '5min';
    }
  }

  private async isMarketOpen(): Promise<boolean> {
    const now = new Date();
    const currentTime = now.toTimeString().substr(0, 8);
    return currentTime >= '09:30:00' && currentTime <= '16:00:00';
  }

  private isWithinMarketOpenWindow(): boolean {
    const now = new Date();
    const currentTime = now.toTimeString().substr(0, 8);
    return currentTime >= '09:30:00' && currentTime <= '10:00:00';
  }

  // Scheduling methods
  private async scheduleMarketAnalysis(): Promise<void> {
    // Schedule market analysis for active users
    const activeUsers = await this.getActiveUsers();
    
    for (const user of activeUsers) {
      await this.algorithmQueue.add('market-analysis', {
        symbols: ['AAPL', 'MSFT', 'GOOGL', 'TSLA'], // Top volume stocks
        userId: user.id,
      }, {
        priority: 1,
        delay: 0
      });
    }
  }

  private async scheduleRiskMonitoring(): Promise<void> {
    const activeSessions = await this.getActiveTradingSessions();
    
    for (const session of activeSessions) {
      await this.algorithmQueue.add('risk-monitoring', {
        userId: session.userId,
        sessionId: session.id
      }, {
        priority: 10, // High priority for risk monitoring
        delay: 0
      });
    }
  }

  private async schedulePerformanceTracking(): Promise<void> {
    const users = await this.getAllUsers();
    
    for (const user of users) {
      await this.algorithmQueue.add('performance-tracking', {
        userId: user.id
      }, {
        priority: 5,
        delay: 0
      });
    }
  }

  // Processing methods
  private async processMarketAnalysis(symbols: string[], userId: string): Promise<any> {
    console.log(`📊 Processing market analysis for user ${userId}`);
    
    const analyses = [];
    for (const symbol of symbols) {
      const analysis = await this.analyzeSymbol(symbol);
      analyses.push(analysis);
    }
    
    return { userId, analyses, timestamp: new Date() };
  }

  private async monitorRiskLimits(userId: string, sessionId: string): Promise<any> {
    console.log(`⚠️ Monitoring risk limits for session ${sessionId}`);
    
    const riskStatus = await this.aggressiveRiskManager.checkRiskLimits(userId, sessionId);
    
    if (riskStatus.circuitBreakerTriggered) {
      console.log(`🚨 CIRCUIT BREAKER TRIGGERED for session ${sessionId}`);
      await this.handleCircuitBreaker(userId, sessionId);
    }
    
    return riskStatus;
  }

  private async trackPerformance(userId: string): Promise<AlgorithmPerformance> {
    console.log(`📈 Tracking performance for user ${userId}`);
    
    // Calculate performance metrics
    const performance = await this.calculatePerformanceMetrics(userId);
    
    // Store performance data
    await this.storePerformanceMetrics(userId, performance);
    
    return performance;
  }

  // Database operations
  private async logAlgorithmDecision(decision: TradingDecision, userId: string, sessionId: string): Promise<void> {
    // Log decision to database for audit trail
    // TODO: Create algorithmDecision table in schema
    console.log(`📝 Logging algorithm decision: ${decision.id} - ${decision.action} ${decision.symbol} (${decision.confidence}% confidence)`);
    
    // For now, log to console until database table is created
    console.log({
      id: decision.id,
      userId,
      sessionId,
      symbol: decision.symbol,
      action: decision.action,
      confidence: decision.confidence,
      reasoning: decision.reasoning,
      strategy: decision.strategy,
      positionSize: decision.positionSize,
      expectedTarget: decision.expectedTarget,
      stopLoss: decision.stopLoss,
      timeframe: decision.timeframe,
      timestamp: decision.createdAt
    });
  }

  // Placeholder methods for helper classes
  private async analyzeSymbol(symbol: string): Promise<any> {
    return { symbol, analysis: 'placeholder' };
  }

  private async handleCircuitBreaker(userId: string, sessionId: string): Promise<void> {
    // Emergency liquidation logic
    console.log(`🛑 Executing emergency liquidation for session ${sessionId}`);
  }

  private async calculatePerformanceMetrics(userId: string): Promise<AlgorithmPerformance> {
    return {
      totalTrades: 0,
      winRate: 0,
      monthlyReturn: 0,
      averageHoldTime: 0,
      maxDrawdown: 0,
      profitFactor: 0,
      sharpeRatio: 0
    };
  }

  private async storePerformanceMetrics(userId: string, performance: AlgorithmPerformance): Promise<void> {
    // Store performance metrics in database
  }

  private async getActiveUsers(): Promise<any[]> {
    return []; // Placeholder
  }

  private async getActiveTradingSessions(): Promise<any[]> {
    return []; // Placeholder
  }

  private async getAllUsers(): Promise<any[]> {
    return []; // Placeholder
  }

  /**
   * Get algorithm queue statistics
   */
  async getQueueStats(): Promise<any> {
    const waiting = await this.algorithmQueue.getWaiting();
    const active = await this.algorithmQueue.getActive();
    const completed = await this.algorithmQueue.getCompleted();
    const failed = await this.algorithmQueue.getFailed();

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
    console.log('🛑 Shutting down SmartTrade AI Algorithm Service...');
    
    this.isProcessing = false;
    await this.algorithmQueue.close();
    await this.marketDataService.shutdown();
    await this.redis.quit();
    await this.prisma.$disconnect();
  }
}

// Helper classes - these would be implemented as separate services
class MarketRegimeDetector {
  constructor(private marketDataService: MarketDataService) {}
  
  async detectCurrentRegime(): Promise<MarketCondition> {
    return await this.marketDataService.detectMarketRegime();
  }
}

class TechnicalAnalysisEngine {
  async analyze(symbol: string): Promise<TechnicalSignal[]> {
    // Placeholder - would implement comprehensive technical analysis
    return [
      { indicator: 'RSI', value: 45, signal: 'NEUTRAL', strength: 0.6, timeframe: '5min' },
      { indicator: 'MACD', value: 0.5, signal: 'BULLISH', strength: 0.8, timeframe: '5min' }
    ];
  }
}

class OptionsFlowAnalyzer {
  constructor(private marketDataService: MarketDataService) {}
  
  async analyze(symbol: string): Promise<any> {
    return await this.marketDataService.getOptionsFlowSignal(symbol);
  }
}

class EarningsExploiter {
  constructor(private marketDataService: MarketDataService) {}
  
  async analyze(symbol: string): Promise<any> {
    return await this.marketDataService.getEarningsData(symbol);
  }
}

class AggressiveRiskManager {
  constructor(private tradingSessionService: any) {}
  
  async calculateRisk(symbol: string, userId: string, sessionId: string, marketRegime: MarketCondition): Promise<RiskAssessment> {
    return {
      riskPercentage: 0.025, // 2.5% base risk
      maxDrawdown: 0.25, // 25% max drawdown tolerance
      correlationRisk: 0.3,
      volatilityRisk: marketRegime.vixLevel / 100,
      circuitBreakerActive: false
    };
  }
  
  async checkRiskLimits(userId: string, sessionId: string): Promise<any> {
    return {
      circuitBreakerTriggered: false,
      riskLevel: 'NORMAL',
      recommendations: []
    };
  }
}

export default SmartTradeAlgorithmService;
export { TradingDecision, TechnicalSignal, RiskAssessment, AlgorithmPerformance };
