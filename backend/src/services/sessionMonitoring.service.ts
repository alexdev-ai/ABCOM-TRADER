import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import tradingSessionService from './tradingSession.service';

const prisma = new PrismaClient();

// Import background processor (lazy loading to avoid circular deps)
let sessionBackgroundProcessor: any = null;
const getBackgroundProcessor = async () => {
  if (!sessionBackgroundProcessor) {
    const { default: processor } = await import('./sessionBackgroundProcessor.service');
    sessionBackgroundProcessor = processor;
  }
  return sessionBackgroundProcessor;
};

export interface SessionWarning {
  sessionId: string;
  userId: string;
  warningType: 'time' | 'loss';
  thresholdPercentage: number;
  currentValue: number;
  limitValue: number;
  timestamp: Date;
}

export interface SessionMonitoringStats {
  totalActiveSessions: number;
  sessionsApproachingTimeLimit: number;
  sessionsApproachingLossLimit: number;
  averageSessionDuration: number;
  totalWarningsSent: number;
  lastMonitoringCheck: Date;
}

export class SessionMonitoringService {
  private static instance: SessionMonitoringService;
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isGlobalMonitoringActive: boolean = false;
  private globalMonitoringInterval: NodeJS.Timeout | null = null;
  private warningCache: Map<string, Set<string>> = new Map(); // sessionId -> Set of warning types sent
  private monitoringStats: SessionMonitoringStats = {
    totalActiveSessions: 0,
    sessionsApproachingTimeLimit: 0,
    sessionsApproachingLossLimit: 0,
    averageSessionDuration: 0,
    totalWarningsSent: 0,
    lastMonitoringCheck: new Date()
  };

  private constructor() {
    this.startGlobalMonitoring();
  }

  public static getInstance(): SessionMonitoringService {
    if (!SessionMonitoringService.instance) {
      SessionMonitoringService.instance = new SessionMonitoringService();
    }
    return SessionMonitoringService.instance;
  }

  /**
   * Start monitoring a specific session
   */
  async startSessionMonitoring(sessionId: string): Promise<void> {
    try {
      // Clear any existing interval for this session
      if (this.monitoringIntervals.has(sessionId)) {
        clearInterval(this.monitoringIntervals.get(sessionId)!);
      }

      // Create new monitoring interval (every 30 seconds)
      const interval = setInterval(async () => {
        await this.checkSessionStatus(sessionId);
      }, 30000);

      this.monitoringIntervals.set(sessionId, interval);
      
      // Initialize warning cache for this session
      if (!this.warningCache.has(sessionId)) {
        this.warningCache.set(sessionId, new Set());
      }

      console.log(`Started individual monitoring for session ${sessionId}`);

    } catch (error) {
      console.error(`Failed to start session monitoring for ${sessionId}:`, error);
    }
  }

  /**
   * Stop monitoring a specific session
   */
  async stopSessionMonitoring(sessionId: string): Promise<void> {
    try {
      const interval = this.monitoringIntervals.get(sessionId);
      if (interval) {
        clearInterval(interval);
        this.monitoringIntervals.delete(sessionId);
      }

      // Clear warning cache for this session
      this.warningCache.delete(sessionId);

      console.log(`Stopped individual monitoring for session ${sessionId}`);

    } catch (error) {
      console.error(`Failed to stop session monitoring for ${sessionId}:`, error);
    }
  }

  /**
   * Check status of a specific session
   */
  private async checkSessionStatus(sessionId: string): Promise<void> {
    try {
      const session = await prisma.tradingSession.findUnique({
        where: { id: sessionId }
      });

      if (!session) {
        await this.stopSessionMonitoring(sessionId);
        return;
      }

      // Stop monitoring if session is no longer active
      if (session.status !== 'ACTIVE') {
        await this.stopSessionMonitoring(sessionId);
        return;
      }

      const now = new Date();
      const sessionWarnings: SessionWarning[] = [];

      // Check time expiration
      if (session.endTime && session.startTime) {
        const totalDuration = session.endTime.getTime() - session.startTime.getTime();
        const elapsed = now.getTime() - session.startTime.getTime();
        const timePercentage = (elapsed / totalDuration) * 100;

        // Check for time warnings (80%, 90%, 95%)
        const timeThresholds = [80, 90, 95];
        for (const threshold of timeThresholds) {
          if (timePercentage >= threshold && timePercentage < threshold + 5) {
            const warningKey = `time_${threshold}`;
            if (!this.hasWarningSent(sessionId, warningKey)) {
              sessionWarnings.push({
                sessionId,
                userId: session.userId,
                warningType: 'time',
                thresholdPercentage: threshold,
                currentValue: elapsed,
                limitValue: totalDuration,
                timestamp: now
              });
              this.markWarningSent(sessionId, warningKey);
            }
          }
        }

        // Check for session expiration
        if (now >= session.endTime) {
          await this.expireSession(sessionId, session.userId);
          return;
        }
      }

      // Check loss limit
      const currentLoss = Math.abs(Math.min(0, session.realizedPnl?.toNumber() || 0));
      const lossLimit = session.lossLimitAmount.toNumber();
      const lossPercentage = (currentLoss / lossLimit) * 100;

      // Check for loss warnings (80%, 90%, 95%)
      const lossThresholds = [80, 90, 95];
      for (const threshold of lossThresholds) {
        if (lossPercentage >= threshold && lossPercentage < threshold + 5) {
          const warningKey = `loss_${threshold}`;
          if (!this.hasWarningSent(sessionId, warningKey)) {
            sessionWarnings.push({
              sessionId,
              userId: session.userId,
              warningType: 'loss',
              thresholdPercentage: threshold,
              currentValue: currentLoss,
              limitValue: lossLimit,
              timestamp: now
            });
            this.markWarningSent(sessionId, warningKey);
          }
        }
      }

      // Check for loss limit breach
      if (currentLoss >= lossLimit) {
        await this.terminateSessionForLossLimit(sessionId, session.userId);
        return;
      }

      // Send warnings if any
      if (sessionWarnings.length > 0) {
        await this.sendWarnings(sessionWarnings);
      }

    } catch (error) {
      console.error(`Session status check failed for ${sessionId}:`, error);
    }
  }

  /**
   * Start global monitoring of all active sessions
   */
  private startGlobalMonitoring(): void {
    if (this.isGlobalMonitoringActive) {
      return;
    }

    this.globalMonitoringInterval = setInterval(async () => {
      await this.performGlobalMonitoringCheck();
    }, 60000); // Check every minute

    this.isGlobalMonitoringActive = true;
    console.log('Started global session monitoring');
  }

  /**
   * Perform global monitoring check
   */
  private async performGlobalMonitoringCheck(): Promise<void> {
    try {
      // Get all active sessions
      const activeSessions = await prisma.tradingSession.findMany({
        where: {
          status: 'ACTIVE'
        },
        select: {
          id: true,
          userId: true,
          startTime: true,
          endTime: true,
          realizedPnl: true,
          lossLimitAmount: true,
          durationMinutes: true
        }
      });

      const now = new Date();
      let sessionsApproachingTimeLimit = 0;
      let sessionsApproachingLossLimit = 0;
      let totalDuration = 0;

      for (const session of activeSessions) {
        // Check time threshold
        if (session.endTime && session.startTime) {
          const totalSessionDuration = session.endTime.getTime() - session.startTime.getTime();
          const elapsed = now.getTime() - session.startTime.getTime();
          const timePercentage = (elapsed / totalSessionDuration) * 100;
          
          if (timePercentage >= 80) {
            sessionsApproachingTimeLimit++;
          }

          totalDuration += session.durationMinutes;
        }

        // Check loss threshold
        const currentLoss = Math.abs(Math.min(0, session.realizedPnl?.toNumber() || 0));
        const lossLimit = session.lossLimitAmount.toNumber();
        const lossPercentage = (currentLoss / lossLimit) * 100;

        if (lossPercentage >= 80) {
          sessionsApproachingLossLimit++;
        }

        // Ensure session has individual monitoring
        if (!this.monitoringIntervals.has(session.id)) {
          await this.startSessionMonitoring(session.id);
        }
      }

      // Update monitoring stats
      this.monitoringStats = {
        totalActiveSessions: activeSessions.length,
        sessionsApproachingTimeLimit,
        sessionsApproachingLossLimit,
        averageSessionDuration: activeSessions.length > 0 ? totalDuration / activeSessions.length : 0,
        totalWarningsSent: this.monitoringStats.totalWarningsSent,
        lastMonitoringCheck: now
      };

      // Clean up monitoring for sessions that are no longer active
      const activeSessionIds = new Set(activeSessions.map(s => s.id));
      for (const [sessionId] of this.monitoringIntervals) {
        if (!activeSessionIds.has(sessionId)) {
          await this.stopSessionMonitoring(sessionId);
        }
      }

      console.log(`Global monitoring: ${activeSessions.length} active sessions, ${sessionsApproachingTimeLimit} approaching time limit, ${sessionsApproachingLossLimit} approaching loss limit`);

    } catch (error) {
      console.error('Global monitoring check failed:', error);
    }
  }

  /**
   * Expire a session due to time limit
   */
  private async expireSession(sessionId: string, userId: string): Promise<void> {
    try {
      await tradingSessionService.stopSession(sessionId, userId, 'time_expired');
      await this.stopSessionMonitoring(sessionId);

      console.log(`Session ${sessionId} expired due to time limit`);

      // Schedule performance calculation
      const backgroundProcessor = await getBackgroundProcessor();
      await backgroundProcessor.schedulePerformanceCalculation(sessionId, userId, 2000);

    } catch (error) {
      console.error(`Failed to expire session ${sessionId}:`, error);
    }
  }

  /**
   * Terminate session due to loss limit
   */
  private async terminateSessionForLossLimit(sessionId: string, userId: string): Promise<void> {
    try {
      await tradingSessionService.stopSession(sessionId, userId, 'loss_limit_reached');
      await this.stopSessionMonitoring(sessionId);

      console.log(`Session ${sessionId} terminated due to loss limit`);

      // Schedule performance calculation
      const backgroundProcessor = await getBackgroundProcessor();
      await backgroundProcessor.schedulePerformanceCalculation(sessionId, userId, 2000);

    } catch (error) {
      console.error(`Failed to terminate session ${sessionId} for loss limit:`, error);
    }
  }

  /**
   * Send warning notifications
   */
  private async sendWarnings(warnings: SessionWarning[]): Promise<void> {
    try {
      for (const warning of warnings) {
        console.log(`⚠️  SESSION WARNING: ${warning.sessionId} - ${warning.warningType} limit ${warning.thresholdPercentage}% reached`);
        
        // Schedule warning notification via background processor
        const backgroundProcessor = await getBackgroundProcessor();
        await backgroundProcessor.scheduleWarningNotification(
          warning.sessionId,
          warning.userId,
          warning.warningType,
          warning.thresholdPercentage
        );

        this.monitoringStats.totalWarningsSent++;
      }

    } catch (error) {
      console.error('Failed to send warnings:', error);
    }
  }

  /**
   * Check if warning has been sent for this session and type
   */
  private hasWarningSent(sessionId: string, warningKey: string): boolean {
    const sessionWarnings = this.warningCache.get(sessionId);
    return sessionWarnings?.has(warningKey) || false;
  }

  /**
   * Mark warning as sent for this session and type
   */
  private markWarningSent(sessionId: string, warningKey: string): void {
    if (!this.warningCache.has(sessionId)) {
      this.warningCache.set(sessionId, new Set());
    }
    this.warningCache.get(sessionId)!.add(warningKey);
  }

  /**
   * Get current monitoring statistics
   */
  getMonitoringStats(): SessionMonitoringStats {
    return { ...this.monitoringStats };
  }

  /**
   * Get list of actively monitored sessions
   */
  getActivelyMonitoredSessions(): string[] {
    return Array.from(this.monitoringIntervals.keys());
  }

  /**
   * Force check all active sessions immediately
   */
  async forceGlobalCheck(): Promise<void> {
    console.log('Forcing global monitoring check...');
    await this.performGlobalMonitoringCheck();
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      console.log('Shutting down session monitoring service...');

      // Clear all individual session monitoring intervals
      for (const [sessionId, interval] of this.monitoringIntervals) {
        clearInterval(interval);
      }
      this.monitoringIntervals.clear();

      // Clear global monitoring interval
      if (this.globalMonitoringInterval) {
        clearInterval(this.globalMonitoringInterval);
        this.globalMonitoringInterval = null;
      }

      this.isGlobalMonitoringActive = false;
      this.warningCache.clear();

      console.log('Session monitoring service shut down gracefully');

    } catch (error) {
      console.error('Error during session monitoring shutdown:', error);
    }
  }
}

// Export singleton instance
export default SessionMonitoringService.getInstance();
