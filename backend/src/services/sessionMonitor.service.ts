import { PrismaClient } from '@prisma/client';
import { tradingSessionService, SessionStatus } from './tradingSession.service';
import { AuditService } from './audit.service';

const prisma = new PrismaClient();

export interface SessionNotification {
  userId: string;
  sessionId: string;
  type: 'time_warning' | 'loss_warning' | 'session_terminated' | 'session_expired';
  message: string;
  data?: any;
}

class SessionMonitorService {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly MONITOR_INTERVAL_MS = 30000; // 30 seconds
  private readonly TIME_WARNING_THRESHOLD = 0.8; // 80%
  private readonly LOSS_WARNING_THRESHOLD = 0.8; // 80%

  /**
   * Start background session monitoring
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      console.log('Session monitoring already running');
      return;
    }

    console.log('Starting session monitoring service...');
    
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.monitorAllActiveSessions();
      } catch (error) {
        console.error('Error in session monitoring:', error);
      }
    }, this.MONITOR_INTERVAL_MS);

    // Also run an initial check
    this.monitorAllActiveSessions().catch(console.error);
  }

  /**
   * Stop background session monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('Session monitoring stopped');
    }
  }

  /**
   * Monitor all active sessions for termination conditions
   */
  async monitorAllActiveSessions(): Promise<void> {
    const activeSessions = await prisma.tradingSession.findMany({
      where: {
        status: SessionStatus.ACTIVE
      },
      include: {
        user: true
      }
    });

    console.log(`Monitoring ${activeSessions.length} active sessions`);

    for (const session of activeSessions) {
      await this.monitorSession(session);
    }
  }

  /**
   * Monitor a specific session for termination conditions
   */
  private async monitorSession(session: any): Promise<void> {
    if (!session.startTime) {
      console.warn(`Session ${session.id} has no start time`);
      return;
    }

    const now = new Date();
    const elapsedMs = now.getTime() - session.startTime.getTime();
    const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
    const sessionDurationMs = session.durationMinutes * 60 * 1000;

    // Check for time-based termination
    if (elapsedMs >= sessionDurationMs) {
      await this.terminateSession(session.id, session.userId, 'time_limit', {
        elapsedMinutes,
        scheduledDuration: session.durationMinutes
      });
      return;
    }

    // Check for loss-based termination
    const currentLoss = Math.abs(Number(session.realizedPnl));
    const lossLimit = Number(session.lossLimitAmount);
    
    if (session.realizedPnl < 0 && currentLoss >= lossLimit) {
      await this.terminateSession(session.id, session.userId, 'loss_limit', {
        currentLoss,
        lossLimit,
        elapsedMinutes
      });
      return;
    }

    // Check for warning conditions
    await this.checkWarningConditions(session, elapsedMinutes);
  }

  /**
   * Check and send warning notifications
   */
  private async checkWarningConditions(session: any, elapsedMinutes: number): Promise<void> {
    const timeProgress = elapsedMinutes / session.durationMinutes;
    const currentLoss = session.realizedPnl < 0 ? Math.abs(Number(session.realizedPnl)) : 0;
    const lossProgress = currentLoss / Number(session.lossLimitAmount);

    // Time warning (80% of duration reached)
    if (timeProgress >= this.TIME_WARNING_THRESHOLD && timeProgress < 0.95) {
      await this.sendNotification({
        userId: session.userId,
        sessionId: session.id,
        type: 'time_warning',
        message: `Trading session approaching time limit: ${Math.round(timeProgress * 100)}% elapsed`,
        data: {
          elapsedMinutes,
          totalMinutes: session.durationMinutes,
          remainingMinutes: session.durationMinutes - elapsedMinutes
        }
      });
    }

    // Loss warning (80% of loss limit reached)
    if (lossProgress >= this.LOSS_WARNING_THRESHOLD && lossProgress < 0.95) {
      await this.sendNotification({
        userId: session.userId,
        sessionId: session.id,
        type: 'loss_warning',
        message: `Trading session approaching loss limit: ${Math.round(lossProgress * 100)}% of limit used`,
        data: {
          currentLoss,
          lossLimit: Number(session.lossLimitAmount),
          remainingBuffer: Number(session.lossLimitAmount) - currentLoss
        }
      });
    }
  }

  /**
   * Terminate a session automatically
   */
  async terminateSession(
    sessionId: string, 
    userId: string, 
    reason: string, 
    data?: any
  ): Promise<void> {
    try {
      console.log(`Auto-terminating session ${sessionId} for user ${userId}, reason: ${reason}`);

      // Stop the session using the existing service
      const stoppedSession = await tradingSessionService.stopSession(sessionId, userId, reason);

      // Send termination notification
      await this.sendNotification({
        userId,
        sessionId,
        type: 'session_terminated',
        message: `Trading session automatically terminated: ${this.getTerminationMessage(reason)}`,
        data: {
          reason,
          terminationTime: new Date(),
          finalStats: {
            actualDuration: stoppedSession.actualDurationMinutes,
            totalTrades: 0, // TODO: Add totalTrades field to TradingSession model
            finalPnL: Number(stoppedSession.realizedPnl),
            performancePercentage: Number(stoppedSession.sessionPerformancePercentage)
          },
          ...data
        }
      });

      // Additional cleanup tasks
      await this.performSessionCleanup(sessionId, userId, reason);

    } catch (error) {
      console.error(`Failed to terminate session ${sessionId}:`, error);
      
      // Log the termination failure
      await AuditService.log({
        userId,
        eventType: 'session',
        eventAction: 'termination_failed',
        eventData: {
          sessionId,
          reason,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Perform cleanup tasks after session termination
   */
  private async performSessionCleanup(
    sessionId: string, 
    userId: string, 
    reason: string
  ): Promise<void> {
    try {
      // Cancel any pending trades for this user (if implemented)
      // This would integrate with the trading service
      console.log(`Performing cleanup for session ${sessionId}`);

      // Log the cleanup completion
      await AuditService.log({
        userId,
        eventType: 'session',
        eventAction: 'cleanup_completed',
        eventData: {
          sessionId,
          terminationReason: reason,
          cleanupTime: new Date()
        }
      });

    } catch (error) {
      console.error(`Session cleanup failed for ${sessionId}:`, error);
    }
  }

  /**
   * Send notification to user
   */
  private async sendNotification(notification: SessionNotification): Promise<void> {
    try {
      // For now, we'll log the notification and store it in audit logs
      // In a production system, this would integrate with email, SMS, push notifications, etc.
      
      console.log(`Notification for user ${notification.userId}:`, notification.message);

      // Store notification in audit log
      await AuditService.log({
        userId: notification.userId,
        eventType: 'notification',
        eventAction: notification.type,
        eventData: {
          sessionId: notification.sessionId,
          message: notification.message,
          data: notification.data,
          timestamp: new Date()
        }
      });

      // TODO: Integrate with actual notification systems
      // - Email notifications
      // - Push notifications
      // - In-app notifications
      // - SMS alerts (for critical terminations)

    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  /**
   * Get human-readable termination message
   */
  private getTerminationMessage(reason: string): string {
    switch (reason) {
      case 'time_limit':
        return 'Maximum session duration reached';
      case 'loss_limit':
        return 'Loss limit exceeded';
      case 'manual_stop':
        return 'Manually stopped by user';
      case 'system_shutdown':
        return 'System maintenance termination';
      default:
        return `Session terminated (${reason})`;
    }
  }

  /**
   * Validate if trading is allowed for a user (called by trading service)
   */
  async validateTradingAllowed(userId: string): Promise<{
    allowed: boolean;
    reason?: string;
    sessionId?: string;
  }> {
    const activeSession = await tradingSessionService.getActiveSession(userId);
    
    if (!activeSession) {
      return {
        allowed: false,
        reason: 'No active trading session. Please start a session to begin trading.'
      };
    }

    // Check if session is still within time limits
    if (activeSession.startTime) {
      const now = new Date();
      const elapsedMs = now.getTime() - activeSession.startTime.getTime();
      const sessionDurationMs = activeSession.durationMinutes * 60 * 1000;
      
      if (elapsedMs >= sessionDurationMs) {
        // Session should be expired - trigger termination
        await this.terminateSession(activeSession.id, userId, 'time_limit');
        return {
          allowed: false,
          reason: 'Session has expired. Please start a new session to continue trading.',
          sessionId: activeSession.id
        };
      }
    }

    // Check if loss limit would be exceeded
    const currentLoss = Number(activeSession.realizedPnl) < 0 ? Math.abs(Number(activeSession.realizedPnl)) : 0;
    const lossLimit = Number(activeSession.lossLimitAmount);
    
    if (currentLoss >= lossLimit) {
      // Session should be terminated due to loss limit
      await this.terminateSession(activeSession.id, userId, 'loss_limit');
      return {
        allowed: false,
        reason: 'Loss limit reached. Session has been terminated.',
        sessionId: activeSession.id
      };
    }

    return {
      allowed: true,
      sessionId: activeSession.id
    };
  }

  /**
   * Force terminate all sessions (for system shutdown)
   */
  async terminateAllSessions(reason: string = 'system_shutdown'): Promise<void> {
    const activeSessions = await prisma.tradingSession.findMany({
      where: {
        status: SessionStatus.ACTIVE
      }
    });

    console.log(`Force terminating ${activeSessions.length} active sessions`);

    for (const session of activeSessions) {
      await this.terminateSession(session.id, session.userId, reason);
    }
  }

  /**
   * Get monitoring statistics
   */
  async getMonitoringStats(): Promise<{
    activeSessions: number;
    monitoringActive: boolean;
    lastCheck: Date;
    terminationsToday: number;
  }> {
    const activeSessions = await prisma.tradingSession.count({
      where: {
        status: SessionStatus.ACTIVE
      }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const terminationsToday = await prisma.tradingSession.count({
      where: {
        status: {
          in: [SessionStatus.STOPPED, SessionStatus.EXPIRED]
        },
        updatedAt: {
          gte: today
        },
        terminationReason: {
          in: ['time_limit', 'loss_limit']
        }
      }
    });

    return {
      activeSessions,
      monitoringActive: this.monitoringInterval !== null,
      lastCheck: new Date(),
      terminationsToday
    };
  }
}

export const sessionMonitorService = new SessionMonitorService();

// Auto-start monitoring when the service is imported
sessionMonitorService.startMonitoring();

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, stopping session monitoring...');
  sessionMonitorService.terminateAllSessions('system_shutdown')
    .then(() => sessionMonitorService.stopMonitoring())
    .catch(console.error);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, stopping session monitoring...');
  sessionMonitorService.terminateAllSessions('system_shutdown')
    .then(() => sessionMonitorService.stopMonitoring())
    .catch(console.error);
});
