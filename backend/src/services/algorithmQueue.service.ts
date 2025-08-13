import Queue from 'bull';
import Redis from 'ioredis';
import AlgorithmEngine, { AlgorithmInput, AlgorithmDecision } from './algorithmEngine.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
  commandTimeout: 5000
};

// Create Redis connection
const redis = new Redis(redisConfig);

// Algorithm decision job interface
export interface AlgorithmJobData {
  userId: string;
  sessionId?: string | undefined;
  symbol: string;
  currentPrice: number;
  jobId: string;
  priority: number; // 1-10, higher is more important
  requestedAt: Date;
}

export interface AlgorithmJobResult {
  success: boolean;
  decision?: AlgorithmDecision;
  error?: string;
  processingTime: number;
  algorithmVersion: string;
}

// Create Bull queue for algorithm decisions
const algorithmQueue = new Queue<AlgorithmJobData>('algorithm-decisions', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50,      // Keep last 50 failed jobs
    attempts: 3,           // Retry failed jobs 3 times
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Create Bull queue for performance monitoring
const performanceQueue = new Queue('algorithm-performance', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 20,
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 5000,
    },
  },
});

export class AlgorithmQueueService {
  private static instance: AlgorithmQueueService;
  private isProcessing: boolean = false;
  private processingStats = {
    totalProcessed: 0,
    successCount: 0,
    errorCount: 0,
    averageProcessingTime: 0,
    lastProcessedAt: null as Date | null
  };

  private constructor() {
    this.setupQueueProcessors();
    this.setupQueueEvents();
    this.setupHealthChecks();
  }

  public static getInstance(): AlgorithmQueueService {
    if (!AlgorithmQueueService.instance) {
      AlgorithmQueueService.instance = new AlgorithmQueueService();
    }
    return AlgorithmQueueService.instance;
  }

  /**
   * Add algorithm decision job to queue
   */
  async addAlgorithmJob(jobData: AlgorithmJobData): Promise<string> {
    try {
      const job = await algorithmQueue.add('process-algorithm-decision', jobData, {
        priority: jobData.priority,
        delay: 0,
        jobId: jobData.jobId,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
      });

      console.log(`Algorithm job added to queue: ${job.id} for user ${jobData.userId}, symbol ${jobData.symbol}`);
      return job.id as string;

    } catch (error) {
      console.error('Failed to add algorithm job to queue:', error);
      throw new Error(`Queue job creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add performance monitoring job
   */
  async addPerformanceJob(userId: string, timeframe: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<void> {
    try {
      await performanceQueue.add('calculate-performance', {
        userId,
        timeframe,
        date: new Date()
      }, {
        delay: 0,
        attempts: 2,
      });

      console.log(`Performance calculation job added for user ${userId}, timeframe: ${timeframe}`);
    } catch (error) {
      console.error('Failed to add performance job:', error);
    }
  }

  /**
   * Setup queue processors
   */
  private setupQueueProcessors(): void {
    // Algorithm decision processor
    algorithmQueue.process('process-algorithm-decision', 5, async (job) => {
      const startTime = Date.now();
      const { userId, sessionId, symbol, currentPrice } = job.data;

      try {
        console.log(`Processing algorithm decision job ${job.id} for ${symbol}`);

        // Get required data for algorithm input
        const algorithmInput = await this.prepareAlgorithmInput(userId, sessionId, symbol, currentPrice);
        
        // Execute algorithm decision
        const decision = await AlgorithmEngine.makeDecision(algorithmInput);
        
        const processingTime = Date.now() - startTime;
        
        // Update processing stats
        this.updateProcessingStats(processingTime, true);

        const result: AlgorithmJobResult = {
          success: true,
          decision,
          processingTime,
          algorithmVersion: '1.0.0'
        };

        console.log(`Algorithm decision completed for ${symbol}: ${decision.decisionType} (${decision.confidence}% confidence)`);

        // Trigger performance monitoring if needed
        if (Math.random() < 0.1) { // 10% of decisions trigger performance update
          await this.addPerformanceJob(userId);
        }

        return result;

      } catch (error) {
        const processingTime = Date.now() - startTime;
        this.updateProcessingStats(processingTime, false);

        console.error(`Algorithm decision job ${job.id} failed:`, error);

        const result: AlgorithmJobResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown algorithm error',
          processingTime,
          algorithmVersion: '1.0.0'
        };

        throw error; // Re-throw to trigger job retry
      }
    });

    // Performance monitoring processor
    performanceQueue.process('calculate-performance', 2, async (job) => {
      const { userId, timeframe, date } = job.data;
      
      try {
        console.log(`Calculating performance for user ${userId}, timeframe: ${timeframe}`);
        
        await this.calculateAlgorithmPerformance(userId, timeframe, date);
        
        console.log(`Performance calculation completed for user ${userId}`);
        
      } catch (error) {
        console.error(`Performance calculation failed for user ${userId}:`, error);
        throw error;
      }
    });
  }

  /**
   * Setup queue event handlers
   */
  private setupQueueEvents(): void {
    algorithmQueue.on('completed', (job, result) => {
      console.log(`Algorithm job ${job.id} completed successfully in ${result.processingTime}ms`);
    });

    algorithmQueue.on('failed', (job, err) => {
      console.error(`Algorithm job ${job?.id} failed:`, err.message);
    });

    algorithmQueue.on('stalled', (job) => {
      console.warn(`Algorithm job ${job.id} stalled`);
    });

    performanceQueue.on('completed', (job) => {
      console.log(`Performance job completed for timeframe: ${job.data.timeframe}`);
    });

    performanceQueue.on('failed', (job, err) => {
      console.error(`Performance job failed:`, err.message);
    });
  }

  /**
   * Setup health checks
   */
  private setupHealthChecks(): void {
    setInterval(async () => {
      try {
        const waiting = await algorithmQueue.getWaiting();
        const active = await algorithmQueue.getActive();
        const failed = await algorithmQueue.getFailed();

        if (waiting.length > 100) {
          console.warn(`High queue backlog: ${waiting.length} waiting jobs`);
        }

        if (failed.length > 20) {
          console.warn(`High failure rate: ${failed.length} failed jobs`);
        }

        // Clean up old jobs periodically
        await algorithmQueue.clean(24 * 60 * 60 * 1000, 'completed'); // Remove completed jobs older than 24 hours
        await algorithmQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed');  // Remove failed jobs older than 7 days

      } catch (error) {
        console.error('Queue health check failed:', error);
      }
    }, 60000); // Check every minute
  }

  /**
   * Prepare algorithm input by gathering required data
   */
  private async prepareAlgorithmInput(
    userId: string, 
    sessionId: string | undefined, 
    symbol: string, 
    currentPrice: number
  ): Promise<AlgorithmInput> {
    try {
      // Get user data and risk profile
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { riskManagement: true }
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Get portfolio context
      const portfolioSummary = await prisma.portfolioSummary.findUnique({
        where: { userId }
      });

      const portfolioPositions = await prisma.portfolioPosition.findMany({
        where: { userId }
      });

      // Get current position for the symbol if exists
      const currentPosition = portfolioPositions.find(p => p.symbol === symbol);

      // Calculate sector concentration
      const sectorConcentration: Record<string, number> = {};
      const totalValue = portfolioSummary?.totalValue.toNumber() || 0;
      
      portfolioPositions.forEach(position => {
        const sector = position.sector || 'Unknown';
        const value = position.marketValue?.toNumber() || 0;
        const percentage = totalValue > 0 ? value / totalValue : 0;
        sectorConcentration[sector] = (sectorConcentration[sector] || 0) + percentage;
      });

      // Get latest market condition (or create mock data)
      const marketCondition = await this.getLatestMarketCondition();

      // Get technical indicators (mock data for now - would integrate with real data)
      const technicalIndicators = await this.getTechnicalIndicators(symbol);

      // Prepare algorithm input
      const algorithmInput: AlgorithmInput = {
        userId,
        sessionId,
        symbol,
        currentPrice,
        marketCondition,
        userRiskProfile: {
          riskTolerance: user.riskTolerance,
          riskScore: user.riskManagement?.riskScore || 50,
          dailyLossLimit: user.riskManagement?.dailyLossLimit.toNumber() || 1000,
          accountBalance: user.accountBalance.toNumber(),
          maxPositionSize: 0.1 // 10% max position size
        },
        portfolioContext: {
          totalValue: portfolioSummary?.totalValue.toNumber() || 0,
          cashBalance: portfolioSummary?.cashBalance.toNumber() || 0,
          currentPosition: currentPosition ? {
            symbol: currentPosition.symbol,
            quantity: currentPosition.quantity.toNumber(),
            averageCost: currentPosition.averageCost.toNumber(),
            currentValue: currentPosition.marketValue?.toNumber() || 0,
            unrealizedPnl: currentPosition.unrealizedPnl?.toNumber() || 0
          } : undefined,
          diversification: {
            numberOfPositions: portfolioPositions.length,
            sectorConcentration
          }
        },
        technicalIndicators
      };

      return algorithmInput;

    } catch (error) {
      console.error('Failed to prepare algorithm input:', error);
      throw new Error(`Algorithm input preparation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get latest market condition data
   */
  private async getLatestMarketCondition() {
    try {
      const latest = await prisma.marketCondition.findFirst({
        orderBy: { timestamp: 'desc' }
      });

      if (latest) {
        return {
          overallCondition: latest.overallCondition as 'bull' | 'bear' | 'sideways' | 'volatile',
          trendStrength: latest.trendStrength?.toNumber() || 50,
          volatilityIndex: latest.volatilityIndex?.toNumber() || 20,
          marketSentiment: (latest.marketSentiment as 'positive' | 'negative' | 'neutral') || 'neutral',
          spyPrice: latest.spyPrice?.toNumber() || 400,
          spyChangePercent: latest.spyChangePercent?.toNumber() || 0,
          volume: Number(latest.volume) || 1000000,
          rsi: latest.rsi?.toNumber() || 50,
          macd: latest.macd?.toNumber() || 0,
          sma20: latest.sma20?.toNumber() || 400,
          sma50: latest.sma50?.toNumber() || 395,
          sma200: latest.sma200?.toNumber() || 385
        };
      } else {
        // Return mock market condition if no data exists
        return {
          overallCondition: 'sideways' as const,
          trendStrength: 50,
          volatilityIndex: 20,
          marketSentiment: 'neutral' as const,
          spyPrice: 400,
          spyChangePercent: 0.1,
          volume: 1000000,
          rsi: 50,
          macd: 0,
          sma20: 400,
          sma50: 395,
          sma200: 385
        };
      }
    } catch (error) {
      console.error('Failed to get market condition:', error);
      // Return default values on error
      return {
        overallCondition: 'sideways' as const,
        trendStrength: 50,
        volatilityIndex: 20,
        marketSentiment: 'neutral' as const,
        spyPrice: 400,
        spyChangePercent: 0,
        volume: 1000000,
        rsi: 50,
        macd: 0,
        sma20: 400,
        sma50: 395,
        sma200: 385
      };
    }
  }

  /**
   * Get technical indicators for symbol (mock implementation)
   */
  private async getTechnicalIndicators(symbol: string) {
    // This would integrate with real market data APIs
    // For now, return mock data
    return {
      rsi: 45 + Math.random() * 20, // 45-65 range
      macd: (Math.random() - 0.5) * 2, // -1 to 1 range
      sma20: 100 + Math.random() * 20,
      sma50: 95 + Math.random() * 20,
      sma200: 90 + Math.random() * 20,
      bollBandUpper: 105 + Math.random() * 10,
      bollBandLower: 95 + Math.random() * 10,
      volume: Math.floor(Math.random() * 1000000) + 500000,
      priceChange24h: (Math.random() - 0.5) * 10, // -5% to +5%
      support: 95 + Math.random() * 5,
      resistance: 105 + Math.random() * 5
    };
  }

  /**
   * Calculate algorithm performance metrics
   */
  private async calculateAlgorithmPerformance(userId: string, timeframe: string, date: Date): Promise<void> {
    try {
      const startDate = new Date(date);
      const endDate = new Date(date);

      // Adjust date range based on timeframe
      switch (timeframe) {
        case 'daily':
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'weekly':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'monthly':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
      }

      // Get algorithm decisions for the period
      const decisions = await prisma.algorithmDecision.findMany({
        where: {
          userId,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      // Calculate performance metrics
      const totalDecisions = decisions.length;
      const executedDecisions = decisions.filter(d => d.isExecuted).length;
      const winCount = decisions.filter(d => d.outcome === 'win').length;
      const lossCount = decisions.filter(d => d.outcome === 'loss').length;
      const breakEvenCount = decisions.filter(d => d.outcome === 'breakeven').length;

      const winRate = executedDecisions > 0 ? (winCount / executedDecisions) * 100 : 0;
      
      const wins = decisions.filter(d => d.outcome === 'win');
      const losses = decisions.filter(d => d.outcome === 'loss');
      
      const avgWin = wins.length > 0 ? 
        wins.reduce((sum, d) => sum + (d.profitLoss?.toNumber() || 0), 0) / wins.length : 0;
      const avgLoss = losses.length > 0 ? 
        losses.reduce((sum, d) => sum + Math.abs(d.profitLoss?.toNumber() || 0), 0) / losses.length : 0;

      const totalPnL = decisions.reduce((sum, d) => sum + (d.profitLoss?.toNumber() || 0), 0);
      const avgHoldingTime = decisions.filter(d => d.holdingDuration).length > 0 ?
        decisions.filter(d => d.holdingDuration).reduce((sum, d) => sum + (d.holdingDuration || 0), 0) / 
        decisions.filter(d => d.holdingDuration).length / 60 : 0; // Convert to hours

      const avgConfidence = decisions.length > 0 ?
        decisions.reduce((sum, d) => sum + d.confidence.toNumber(), 0) / decisions.length : 0;

      const highConfidenceDecisions = decisions.filter(d => d.confidence.toNumber() > 80);
      const highConfidenceWinRate = highConfidenceDecisions.length > 0 ?
        (highConfidenceDecisions.filter(d => d.outcome === 'win').length / highConfidenceDecisions.length) * 100 : 0;

      const lowConfidenceDecisions = decisions.filter(d => d.confidence.toNumber() < 50);
      const lowConfidenceWinRate = lowConfidenceDecisions.length > 0 ?
        (lowConfidenceDecisions.filter(d => d.outcome === 'win').length / lowConfidenceDecisions.length) * 100 : 0;

      // Store performance data - create or update existing record
      const existing = await prisma.algorithmPerformance.findFirst({
        where: {
          userId,
          date: startDate,
          timeframe
        }
      });

      if (existing) {
        await prisma.algorithmPerformance.update({
          where: { id: existing.id },
          data: {
            totalDecisions,
            executedDecisions,
            winCount,
            lossCount,
            breakEvenCount,
            winRate: winRate,
            avgWin: avgWin,
            avgLoss: avgLoss,
            avgHoldingTime: avgHoldingTime,
            totalProfitLoss: totalPnL,
            avgConfidence: avgConfidence,
            highConfidenceWinRate: highConfidenceWinRate,
            lowConfidenceWinRate: lowConfidenceWinRate,
            updatedAt: new Date()
          }
        });
      } else {
        await prisma.algorithmPerformance.create({
          data: {
            userId,
            date: startDate,
            timeframe,
            totalDecisions,
            executedDecisions,
            winCount,
            lossCount,
            breakEvenCount,
            winRate: winRate,
            avgWin: avgWin,
            avgLoss: avgLoss,
            avgHoldingTime: avgHoldingTime,
            totalProfitLoss: totalPnL,
            avgConfidence: avgConfidence,
            highConfidenceWinRate: highConfidenceWinRate,
            lowConfidenceWinRate: lowConfidenceWinRate
          }
        });
      }

      console.log(`Performance calculated for user ${userId}: ${winRate.toFixed(1)}% win rate, ${totalDecisions} decisions`);

    } catch (error) {
      console.error('Failed to calculate algorithm performance:', error);
      throw error;
    }
  }

  /**
   * Update processing statistics
   */
  private updateProcessingStats(processingTime: number, success: boolean): void {
    this.processingStats.totalProcessed++;
    
    if (success) {
      this.processingStats.successCount++;
    } else {
      this.processingStats.errorCount++;
    }

    // Update average processing time
    const currentAvg = this.processingStats.averageProcessingTime;
    const count = this.processingStats.totalProcessed;
    this.processingStats.averageProcessingTime = ((currentAvg * (count - 1)) + processingTime) / count;
    
    this.processingStats.lastProcessedAt = new Date();
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    try {
      const waiting = await algorithmQueue.getWaiting();
      const active = await algorithmQueue.getActive();
      const completed = await algorithmQueue.getCompleted();
      const failed = await algorithmQueue.getFailed();

      return {
        algorithm: {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length
        },
        processing: this.processingStats,
        health: {
          isHealthy: failed.length < 10 && waiting.length < 50,
          lastCheck: new Date()
        }
      };
    } catch (error) {
      console.error('Failed to get queue stats:', error);
      return {
        algorithm: { waiting: 0, active: 0, completed: 0, failed: 0 },
        processing: this.processingStats,
        health: { isHealthy: false, lastCheck: new Date() }
      };
    }
  }

  /**
   * Clear all queues (use with caution)
   */
  async clearQueues(): Promise<void> {
    try {
      await algorithmQueue.empty();
      await performanceQueue.empty();
      console.log('All queues cleared');
    } catch (error) {
      console.error('Failed to clear queues:', error);
      throw error;
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      await algorithmQueue.close();
      await performanceQueue.close();
      await redis.disconnect();
      console.log('Algorithm queue service shut down gracefully');
    } catch (error) {
      console.error('Error during algorithm queue shutdown:', error);
    }
  }
}

// Create unique constraint for algorithm performance
// This would be added to Prisma schema later:
// @@unique([userId, date, timeframe], name: "userId_date_timeframe")

export default AlgorithmQueueService.getInstance();
