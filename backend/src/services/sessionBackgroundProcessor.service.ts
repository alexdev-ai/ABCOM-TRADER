import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import Queue from 'bull';
import Redis from 'ioredis';
import tradingSessionService from './tradingSession.service';
import algorithmQueueService from './algorithmQueue.service';

const prisma = new PrismaClient();

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
  commandTimeout: 5000,
  family: 0
};

// Session job interface
export interface SessionJobData {
  sessionId: string;
  userId: string;
  jobType: 'expiration' | 'loss_check' | 'cleanup' | 'performance' | 'warning';
  scheduledAt: Date;
  executeAt: Date;
  metadata?: Record<string, any>;
}

export interface SessionJobResult {
  success: boolean;
  action?: string;
  message?: string;
  error?: string;
  processingTime: number;
  sessionStatus?: string;
}

// Create Bull queue for session background jobs
const sessionJobQueue = new Queue<SessionJobData>('session-background-jobs', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 200, // Keep last 200 completed jobs
    removeOnFail: 100,     // Keep last 100 failed jobs
    attempts: 3,           // Retry failed jobs 3 times
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export class SessionBackgroundProcessor {
  private static instance: SessionBackgroundProcessor;
  private isProcessing: boolean = false;
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private processingStats = {
    totalProcessed: 0,
    successCount: 0,
    errorCount: 0,
    averageProcessingTime: 0,
    lastProcessedAt: null as Date | null,
    jobTypeStats: {
      expiration: { processed: 0, success: 0, errors: 0 },
      loss_check: { processed: 0, success: 0, errors: 0 },
      cleanup: { processed: 0, success: 0, errors: 0 },
      performance: { processed: 0, success: 0, errors: 0 },
      warning: { processed: 0, success: 0, errors: 0 }
    }
  };

  private constructor() {
    this.setupQueueProcessors();
    this.setupQueueEvents();
    this.setupHealthChecks();
    this.startPeriodicJobs();
  }

  public static getInstance(): SessionBackgroundProcessor {
    if (!SessionBackgroundProcessor.instance) {
      SessionBackgroundProcessor.instance = new SessionBackgroundProcessor();
    }
    return SessionBackgroundProcessor.instance;
  }

  /**
   * Schedule session expiration job
   */
  async scheduleSessionExpiration(sessionId: string, userId: string, endTime: Date): Promise<string> {
    try {
      const delay = Math.max(0, endTime.getTime() - Date.now());
      
      const job = await sessionJobQueue.add('session-expiration', {
        sessionId,
        userId,
        jobType: 'expiration',
        scheduledAt: new Date(),
        executeAt: endTime,
        metadata: { endTime: endTime.toISOString() }
      }, {
        delay,
        jobId: `expiration-${sessionId}`,
        attempts: 2, // Less retries for time-sensitive expiration
      });

      console.log(`Scheduled session expiration job: ${job.id} for session ${sessionId} at ${endTime.toISOString()}`);
      return job.id as string;

    } catch (error) {
      console.error('Failed to schedule session expiration job:', error);
      throw new Error(`Session expiration scheduling failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Schedule periodic loss limit monitoring for active session
   */
  async schedulePeriodicLossCheck(sessionId: string, userId: string): Promise<void> {
    try {
      // Check every 30 seconds
      const job = await sessionJobQueue.add('loss-limit-check', {
        sessionId,
        userId,
        jobType: 'loss_check',
        scheduledAt: new Date(),
        executeAt: new Date(Date.now() + 30000), // 30 seconds from now
        metadata: { interval: 30000 }
      }, {
        repeat: { every: 30000 }, // Repeat every 30 seconds
        jobId: `loss-check-${sessionId}`,
        attempts: 2,
      });

      console.log(`Scheduled periodic loss checking for session ${sessionId}`);

    } catch (error) {
      console.error('Failed to schedule loss limit checking:', error);
    }
  }

  /**
   * Schedule session cleanup job (runs daily)
   */
  async scheduleSessionCleanup(): Promise<void> {
    try {
      await sessionJobQueue.add('session-cleanup', {
        sessionId: 'system',
        userId: 'system',
        jobType: 'cleanup',
        scheduledAt: new Date(),
        executeAt: new Date(),
        metadata: { type: 'daily_cleanup' }
      }, {
        repeat: { cron: '0 2 * * *' }, // Run at 2 AM daily
        jobId: 'daily-session-cleanup',
        attempts: 3,
      });

      console.log('Scheduled daily session cleanup job');

    } catch (error) {
      console.error('Failed to schedule session cleanup:', error);
    }
  }

  /**
   * Schedule performance calculation job
   */
  async schedulePerformanceCalculation(sessionId: string, userId: string, delay: number = 0): Promise<void> {
    try {
      await sessionJobQueue.add('performance-calculation', {
        sessionId,
        userId,
        jobType: 'performance',
        scheduledAt: new Date(),
        executeAt: new Date(Date.now() + delay),
        metadata: { calculationType: 'session_complete' }
      }, {
        delay,
        jobId: `performance-${sessionId}`,
        attempts: 3,
      });

      console.log(`Scheduled performance calculation for session ${sessionId}`);

    } catch (error) {
      console.error('Failed to schedule performance calculation:', error);
    }
  }

  /**
   * Send warning notification job
   */
  async scheduleWarningNotification(
    sessionId: string, 
    userId: string, 
    warningType: 'time' | 'loss', 
    percentage: number
  ): Promise<void> {
    try {
      await sessionJobQueue.add('warning-notification', {
        sessionId,
        userId,
        jobType: 'warning',
        scheduledAt: new Date(),
        executeAt: new Date(),
        metadata: { warningType, percentage }
      }, {
        jobId: `warning-${warningType}-${sessionId}-${Math.floor(percentage)}`,
        attempts: 2,
      });

      console.log(`Scheduled ${warningType} warning for session ${sessionId} (${percentage}%)`);

    } catch (error) {
      console.error('Failed to schedule warning notification:', error);
    }
  }

  /**
   * Setup queue processors
   */
  private setupQueueProcessors(): void {
    // Session expiration processor
    sessionJobQueue.process('session-expiration', 5, async (job) => {
      const startTime = Date.now();
      const { sessionId, userId } = job.data;

      try {
        console.log(`Processing session expiration job for session ${sessionId}`);

        const result = await this.processSessionExpiration(sessionId, userId);
        const processingTime = Date.now() - startTime;
        
        this.updateProcessingStats(processingTime, true, 'expiration');

        console.log(`Session expiration completed for ${sessionId}: ${result.action}`);
        return result;

      } catch (error) {
        const processingTime = Date.now() - startTime;
        this.updateProcessingStats(processingTime, false, 'expiration');

        console.error(`Session expiration job failed for ${sessionId}:`, error);
        throw error;
      }
    });

    // Loss limit checking processor
    sessionJobQueue.process('loss-limit-check', 10, async (job) => {
      const startTime = Date.now();
      const { sessionId, userId } = job.data;

      try {
        console.log(`Processing loss limit check for session ${sessionId}`);

        const result = await this.processLossLimitCheck(sessionId, userId);
        const processingTime = Date.now() - startTime;
        
        this.updateProcessingStats(processingTime, true, 'loss_check');

        return result;

      } catch (error) {
        const processingTime = Date.now() - startTime;
        this.updateProcessingStats(processingTime, false, 'loss_check');

        console.error(`Loss limit check failed for ${sessionId}:`, error);
        throw error;
      }
    });

    // Session cleanup processor
    sessionJobQueue.process('session-cleanup', 2, async (job) => {
      const startTime = Date.now();

      try {
        console.log('Processing session cleanup job');

        const result = await this.processSessionCleanup();
        const processingTime = Date.now() - startTime;
        
        this.updateProcessingStats(processingTime, true, 'cleanup');

        console.log(`Session cleanup completed: ${result.message}`);
        return result;

      } catch (error) {
        const processingTime = Date.now() - startTime;
        this.updateProcessingStats(processingTime, false, 'cleanup');

        console.error('Session cleanup job failed:', error);
        throw error;
      }
    });

    // Performance calculation processor
    sessionJobQueue.process('performance-calculation', 3, async (job) => {
      const startTime = Date.now();
      const { sessionId, userId } = job.data;

      try {
        console.log(`Processing performance calculation for session ${sessionId}`);

        const result = await this.processPerformanceCalculation(sessionId, userId);
        const processingTime = Date.now() - startTime;
        
        this.updateProcessingStats(processingTime, true, 'performance');

        console.log(`Performance calculation completed for ${sessionId}`);
        return result;

      } catch (error) {
        const processingTime = Date.now() - startTime;
        this.updateProcessingStats(processingTime, false, 'performance');

        console.error(`Performance calculation failed for ${sessionId}:`, error);
        throw error;
      }
    });

    // Warning notification processor
    sessionJobQueue.process('warning-notification', 5, async (job) => {
      const startTime = Date.now();
      const { sessionId, userId, metadata } = job.data;

      try {
        console.log(`Processing warning notification for session ${sessionId}`);

        const result = await this.processWarningNotification(sessionId, userId, metadata);
        const processingTime = Date.now() - startTime;
        
        this.updateProcessingStats(processingTime, true, 'warning');

        console.log(`Warning notification sent for ${sessionId}: ${metadata?.warningType}`);
        return result;

      } catch (error) {
        const processingTime = Date.now() - startTime;
        this.updateProcessingStats(processingTime, false, 'warning');

        console.error(`Warning notification failed for ${sessionId}:`, error);
        throw error;
      }
    });
  }

  /**
   * Setup queue event handlers
   */
  private setupQueueEvents(): void {
    sessionJobQueue.on('completed', (job, result) => {
      console.log(`Session background job ${job.id} completed: ${result?.action || 'success'}`);
    });

    sessionJobQueue.on('failed', (job, err) => {
      console.error(`Session background job ${job?.id} failed:`, err.message);
    });

    sessionJobQueue.on('stalled', (job) => {
      console.warn(`Session background job ${job.id} stalled`);
    });

    sessionJobQueue.on('progress', (job, progress) => {
      console.log(`Session background job ${job.id} progress: ${progress}%`);
    });
  }

  /**
   * Setup health checks and monitoring
   */
  private setupHealthChecks(): void {
    setInterval(async () => {
      try {
        const waiting = await sessionJobQueue.getWaiting();
        const active = await sessionJobQueue.getActive();
        const failed = await sessionJobQueue.getFailed();
        const delayed = await sessionJobQueue.getDelayed();

        // Health checks
        if (waiting.length > 500) {
          console.warn(`High session job queue backlog: ${waiting.length} waiting jobs`);
        }

        if (failed.length > 50) {
          console.warn(`High session job failure rate: ${failed.length} failed jobs`);
        }

        if (active.length > 20) {
          console.warn(`High concurrent session job processing: ${active.length} active jobs`);
        }

        // Clean up old jobs periodically
        await sessionJobQueue.clean(24 * 60 * 60 * 1000, 'completed'); // Remove completed jobs older than 24 hours
        await sessionJobQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed');  // Remove failed jobs older than 7 days

        // Log queue stats every 5 minutes
        const now = new Date();
        if (now.getMinutes() % 5 === 0 && now.getSeconds() < 10) {
          console.log(`Session Job Queue Stats - Waiting: ${waiting.length}, Active: ${active.length}, Failed: ${failed.length}, Delayed: ${delayed.length}`);
        }

      } catch (error) {
        console.error('Session job queue health check failed:', error);
      }
    }, 60000); // Check every minute
  }

  /**
   * Start periodic background jobs
   */
  private startPeriodicJobs(): void {
    // Schedule daily cleanup job
    this.scheduleSessionCleanup();

    console.log('Session background processor initialized with periodic jobs');
  }

  /**
   * Process session expiration
   */
  private async processSessionExpiration(sessionId: string, userId: string): Promise<SessionJobResult> {
    try {
      const session = await prisma.tradingSession.findUnique({
        where: { id: sessionId }
      });

      if (!session) {
        return {
          success: true,
          action: 'no_action',
          message: 'Session not found - may have been manually terminated',
          processingTime: 0
        };
      }

      if (session.status !== 'ACTIVE') {
        return {
          success: true,
          action: 'no_action',
          message: `Session already in ${session.status} status`,
          processingTime: 0,
          sessionStatus: session.status
        };
      }

      // Stop session due to time expiration
      await tradingSessionService.stopSession(sessionId, userId, 'time_expired');

      // Stop any monitoring for this session
      await this.stopSessionMonitoring(sessionId);

      // Schedule performance calculation
      await this.schedulePerformanceCalculation(sessionId, userId, 5000); // 5 second delay

      return {
        success: true,
        action: 'session_expired',
        message: 'Session expired due to time limit',
        processingTime: 0,
        sessionStatus: 'EXPIRED'
      };

    } catch (error) {
      console.error('Session expiration processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown expiration error',
        processingTime: 0
      };
    }
  }

  /**
   * Process loss limit checking
   */
  private async processLossLimitCheck(sessionId: string, userId: string): Promise<SessionJobResult> {
    try {
      const session = await prisma.tradingSession.findUnique({
        where: { id: sessionId }
      });

      if (!session || session.status !== 'ACTIVE') {
        // Stop the recurring job if session is not active
        await sessionJobQueue.removeRepeatable('loss-limit-check', { every: 30000, jobId: `loss-check-${sessionId}` });
        
        return {
          success: true,
          action: 'monitoring_stopped',
          message: 'Session no longer active - stopped monitoring',
          processingTime: 0,
          sessionStatus: session?.status || 'NOT_FOUND'
        };
      }

      const currentLoss = Math.abs(Math.min(0, session.realizedPnl?.toNumber() || 0));
      const lossLimit = session.lossLimitAmount.toNumber();
      const lossPercentage = (currentLoss / lossLimit) * 100;

      // Check if loss limit exceeded
      if (currentLoss >= lossLimit) {
        await tradingSessionService.stopSession(sessionId, userId, 'loss_limit_reached');
        await this.stopSessionMonitoring(sessionId);
        await this.schedulePerformanceCalculation(sessionId, userId, 2000);

        return {
          success: true,
          action: 'session_terminated',
          message: `Session terminated - loss limit reached (${lossPercentage.toFixed(1)}%)`,
          processingTime: 0,
          sessionStatus: 'STOPPED'
        };
      }

      // Send warning if approaching limit (80-95% range)
      if (lossPercentage >= 80 && lossPercentage < 95) {
        await this.scheduleWarningNotification(sessionId, userId, 'loss', lossPercentage);
      }

      return {
        success: true,
        action: 'monitoring_continued',
        message: `Loss monitoring: ${lossPercentage.toFixed(1)}% of limit used`,
        processingTime: 0,
        sessionStatus: 'ACTIVE'
      };

    } catch (error) {
      console.error('Loss limit checking error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown loss check error',
        processingTime: 0
      };
    }
  }

  /**
   * Process session cleanup
   */
  private async processSessionCleanup(): Promise<SessionJobResult> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days ago

      // Clean up old completed sessions (keep for 30 days)
      const cleanupResult = await prisma.tradingSession.deleteMany({
        where: {
          status: { in: ['COMPLETED', 'STOPPED', 'EXPIRED'] },
          updatedAt: { lt: cutoffDate }
        }
      });

      console.log(`Cleaned up ${cleanupResult.count} old sessions`);

      return {
        success: true,
        action: 'cleanup_completed',
        message: `Cleaned up ${cleanupResult.count} old sessions`,
        processingTime: 0
      };

    } catch (error) {
      console.error('Session cleanup error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown cleanup error',
        processingTime: 0
      };
    }
  }

  /**
   * Process performance calculation
   */
  private async processPerformanceCalculation(sessionId: string, userId: string): Promise<SessionJobResult> {
    try {
      // Use the existing algorithm queue service for performance calculation
      await algorithmQueueService.addPerformanceJob(userId, 'daily');

      return {
        success: true,
        action: 'performance_calculated',
        message: 'Performance metrics calculated and updated',
        processingTime: 0
      };

    } catch (error) {
      console.error('Performance calculation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown performance calculation error',
        processingTime: 0
      };
    }
  }

  /**
   * Process warning notification
   */
  private async processWarningNotification(
    sessionId: string, 
    userId: string, 
    metadata: any
  ): Promise<SessionJobResult> {
    try {
      const { warningType, percentage } = metadata;

      // In a real implementation, this would send notifications via:
      // - WebSocket to frontend
      // - Email/SMS alerts
      // - Push notifications
      // - Slack/Discord webhooks

      console.log(`⚠️  WARNING: Session ${sessionId} - ${warningType} limit ${percentage.toFixed(1)}% reached`);

      // TODO: Implement actual notification service integration
      // await notificationService.sendWarning(userId, sessionId, warningType, percentage);

      return {
        success: true,
        action: 'warning_sent',
        message: `${warningType} warning sent at ${percentage.toFixed(1)}%`,
        processingTime: 0
      };

    } catch (error) {
      console.error('Warning notification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown warning error',
        processingTime: 0
      };
    }
  }

  /**
   * Start monitoring for a session
   */
  async startSessionMonitoring(sessionId: string, userId: string): Promise<void> {
    try {
      // Schedule periodic loss checking
      await this.schedulePeriodicLossCheck(sessionId, userId);

      console.log(`Started background monitoring for session ${sessionId}`);

    } catch (error) {
      console.error('Failed to start session monitoring:', error);
    }
  }

  /**
   * Stop monitoring for a session
   */
  async stopSessionMonitoring(sessionId: string): Promise<void> {
    try {
      // Remove the recurring loss check job
      await sessionJobQueue.removeRepeatable('loss-limit-check', { every: 30000, jobId: `loss-check-${sessionId}` });

      console.log(`Stopped background monitoring for session ${sessionId}`);

    } catch (error) {
      console.error('Failed to stop session monitoring:', error);
    }
  }

  /**
   * Update processing statistics
   */
  private updateProcessingStats(processingTime: number, success: boolean, jobType: string): void {
    this.processingStats.totalProcessed++;
    
    if (success) {
      this.processingStats.successCount++;
    } else {
      this.processingStats.errorCount++;
    }

    // Update job type specific stats
    if (this.processingStats.jobTypeStats[jobType as keyof typeof this.processingStats.jobTypeStats]) {
      const typeStats = this.processingStats.jobTypeStats[jobType as keyof typeof this.processingStats.jobTypeStats];
      typeStats.processed++;
      if (success) {
        typeStats.success++;
      } else {
        typeStats.errors++;
      }
    }

    // Update average processing time
    const currentAvg = this.processingStats.averageProcessingTime;
    const count = this.processingStats.totalProcessed;
    this.processingStats.averageProcessingTime = ((currentAvg * (count - 1)) + processingTime) / count;
    
    this.processingStats.lastProcessedAt = new Date();
  }

  /**
   * Get background processing statistics
   */
  async getProcessingStats() {
    try {
      const waiting = await sessionJobQueue.getWaiting();
      const active = await sessionJobQueue.getActive();
      const completed = await sessionJobQueue.getCompleted();
      const failed = await sessionJobQueue.getFailed();
      const delayed = await sessionJobQueue.getDelayed();

      return {
        queue: {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length
        },
        processing: this.processingStats,
        health: {
          isHealthy: failed.length < 20 && waiting.length < 100,
          lastCheck: new Date()
        }
      };
    } catch (error) {
      console.error('Failed to get processing stats:', error);
      return {
        queue: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
        processing: this.processingStats,
        health: { isHealthy: false, lastCheck: new Date() }
      };
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      // Clear all monitoring intervals
      for (const [sessionId, interval] of this.monitoringIntervals) {
        clearInterval(interval);
      }
      this.monitoringIntervals.clear();

      // Close the job queue
      await sessionJobQueue.close();
      
      console.log('Session background processor shut down gracefully');
    } catch (error) {
      console.error('Error during session background processor shutdown:', error);
    }
  }
}

// Export singleton instance
export default SessionBackgroundProcessor.getInstance();
