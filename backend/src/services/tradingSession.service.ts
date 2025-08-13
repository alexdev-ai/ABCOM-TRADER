import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import algorithmQueueService from './algorithmQueue.service';

const prisma = new PrismaClient();

// Import background processor (will be lazy-loaded to avoid circular dependencies)
let sessionBackgroundProcessor: any = null;
const getBackgroundProcessor = async () => {
  if (!sessionBackgroundProcessor) {
    const { default: processor } = await import('./sessionBackgroundProcessor.service');
    sessionBackgroundProcessor = processor;
  }
  return sessionBackgroundProcessor;
};

// Session status constants
export const SessionStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  STOPPED: 'STOPPED',
  COMPLETED: 'COMPLETED',
  EMERGENCY_STOPPED: 'EMERGENCY_STOPPED'
} as const;

export const SessionEventType = {
  SESSION_CREATED: 'SESSION_CREATED',
  SESSION_STARTED: 'SESSION_STARTED',
  SESSION_ENDED: 'SESSION_ENDED',
  LOSS_LIMIT_WARNING: 'LOSS_LIMIT_WARNING',
  TIME_LIMIT_WARNING: 'TIME_LIMIT_WARNING',
  EMERGENCY_STOP: 'EMERGENCY_STOP',
  ALGORITHM_DECISION: 'ALGORITHM_DECISION'
} as const;

export interface SessionCreationData {
  userId: string;
  durationMinutes: number;
  lossLimitAmount: number;
}

export interface SessionUpdateData {
  currentPnL?: number;
  tradeCount?: number;
}

export class TradingSessionService {
  private static instance: TradingSessionService;

  private constructor() {}

  public static getInstance(): TradingSessionService {
    if (!TradingSessionService.instance) {
      TradingSessionService.instance = new TradingSessionService();
    }
    return TradingSessionService.instance;
  }

  /**
   * Create a new trading session
   */
  async createSession(sessionData: SessionCreationData) {
    const { userId, durationMinutes, lossLimitAmount } = sessionData;

    try {
      // Get user data
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { 
          tradingSessions: { 
            where: { 
              status: { in: ['PENDING', 'ACTIVE'] } 
            } 
          } 
        }
      });

      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      // Check for existing active session
      if (user.tradingSessions.length > 0) {
        throw new Error('ACTIVE_SESSION_EXISTS');
      }

      // Validate session parameters
      const validDurations = [60, 240, 1440, 10080]; // 1h, 4h, 24h, 7d
      if (!validDurations.includes(durationMinutes)) {
        throw new Error('INVALID_DURATION');
      }

      // Validate loss limit
      const accountBalance = user.accountBalance.toNumber();
      const maxLossLimit = accountBalance * 0.30; // 30% max

      if (lossLimitAmount > maxLossLimit) {
        throw new Error(`LOSS_LIMIT_TOO_HIGH: Max allowed is $${maxLossLimit.toFixed(2)}`);
      }

      if (accountBalance < lossLimitAmount) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      // Calculate end time and loss limit percentage
      const endTime = new Date(Date.now() + durationMinutes * 60 * 1000);
      const lossLimitPercent = (lossLimitAmount / accountBalance) * 100;

      // Create session in transaction
      const session = await prisma.$transaction(async (tx) => {
        const newSession = await tx.tradingSession.create({
          data: {
            userId,
            durationMinutes,
            lossLimitAmount: new Decimal(lossLimitAmount),
            lossLimitPercentage: new Decimal(lossLimitPercent),
            status: SessionStatus.PENDING,
            endTime
          }
        });

        // TODO: Add session event logging when SessionEvent model is available

        return newSession;
      });

      console.log(`Trading session created: ${session.id} for user ${userId}`);
      return session;

    } catch (error) {
      console.error('Session creation error:', error);
      throw error;
    }
  }

  /**
   * Start an active session
   */
  async startSession(sessionId: string, userId: string) {
    try {
      const session = await prisma.tradingSession.findFirst({
        where: {
          id: sessionId,
          userId,
          status: SessionStatus.PENDING
        }
      });

      if (!session) {
        throw new Error('SESSION_NOT_FOUND');
      }

      // Start the session
      const updatedSession = await prisma.$transaction(async (tx) => {
        const updated = await tx.tradingSession.update({
          where: { id: sessionId },
          data: {
            status: SessionStatus.ACTIVE,
            startTime: new Date()
          }
        });

        // TODO: Add session start event logging when SessionEvent model is available

        return updated;
      });

      console.log(`Trading session started: ${sessionId}`);
      return updatedSession;

    } catch (error) {
      console.error('Session start error:', error);
      throw error;
    }
  }

  /**
   * Stop a session manually
   */
  async stopSession(sessionId: string, userId: string, reason: string = 'manual_stop') {
    try {
      const session = await prisma.tradingSession.findFirst({
        where: {
          id: sessionId,
          userId,
          status: { in: [SessionStatus.PENDING, SessionStatus.ACTIVE] }
        }
      });

      if (!session) {
        throw new Error('SESSION_NOT_FOUND');
      }

      // Stop the session
      const updatedSession = await prisma.$transaction(async (tx) => {
        const updated = await tx.tradingSession.update({
          where: { id: sessionId },
          data: {
            status: SessionStatus.STOPPED,
            terminationReason: reason
          }
        });

        // TODO: Add session end event logging when SessionEvent model is available

        return updated;
      });

      console.log(`Trading session stopped: ${sessionId}, reason: ${reason}`);
      return updatedSession;

    } catch (error) {
      console.error('Session stop error:', error);
      throw error;
    }
  }

  /**
   * Emergency stop a session
   */
  async emergencyStopSession(sessionId: string, userId: string) {
    try {
      const session = await prisma.tradingSession.findFirst({
        where: {
          id: sessionId,
          userId,
          status: { in: [SessionStatus.PENDING, SessionStatus.ACTIVE] }
        }
      });

      if (!session) {
        throw new Error('SESSION_NOT_FOUND');
      }

      // Emergency stop the session
      const updatedSession = await prisma.$transaction(async (tx) => {
        const updated = await tx.tradingSession.update({
          where: { id: sessionId },
          data: {
            status: SessionStatus.EMERGENCY_STOPPED,
            terminationReason: 'emergency_stop'
          }
        });

        // TODO: Add emergency stop event logging when SessionEvent model is available

        return updated;
      });

      console.log(`EMERGENCY STOP: Session ${sessionId} stopped by user ${userId}`);
      return updatedSession;

    } catch (error) {
      console.error('Emergency stop error:', error);
      throw error;
    }
  }

  /**
   * Get active session for user
   */
  async getActiveSession(userId: string) {
    try {
      const session = await prisma.tradingSession.findFirst({
        where: {
          userId,
          status: { in: [SessionStatus.PENDING, SessionStatus.ACTIVE] }
        }
      });

      return session;
    } catch (error) {
      console.error('Get active session error:', error);
      throw error;
    }
  }

  /**
   * Update session performance data (using legacy fields)
   */
  async updateSessionPerformance(sessionId: string, updateData: SessionUpdateData) {
    try {
      const session = await prisma.tradingSession.findUnique({
        where: { id: sessionId }
      });

      if (!session || session.status !== SessionStatus.ACTIVE) {
        return; // Skip update if session is not active
      }

      // Update session data using legacy fields
      const updateFields: any = {
        updatedAt: new Date()
      };
      
      if (updateData.currentPnL !== undefined) {
        updateFields.realizedPnl = new Decimal(updateData.currentPnL);
      }
      
      if (updateData.tradeCount !== undefined) {
        updateFields.totalTrades = updateData.tradeCount;
      }

      await prisma.tradingSession.update({
        where: { id: sessionId },
        data: updateFields
      });

      // Check loss limit using realized PnL
      if (updateData.currentPnL !== undefined) {
        const currentLoss = Math.abs(Math.min(0, updateData.currentPnL));
        const lossLimitReached = currentLoss >= session.lossLimitAmount.toNumber();

        // Check if approaching loss limit (80%)
        const lossWarningThreshold = session.lossLimitAmount.toNumber() * 0.8;
        const shouldWarnLossLimit = currentLoss >= lossWarningThreshold && currentLoss < session.lossLimitAmount.toNumber();

        // Handle loss limit warning
        if (shouldWarnLossLimit) {
          // TODO: Add loss limit warning event logging when SessionEvent model is available
          console.log(`Loss limit warning for session ${sessionId}: ${(currentLoss / session.lossLimitAmount.toNumber()) * 100}% used`);
        }

        // Handle loss limit reached
        if (lossLimitReached) {
          await this.stopSession(sessionId, session.userId, 'loss_limit_reached');
        }
      }

    } catch (error) {
      console.error('Update session performance error:', error);
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(userId?: string) {
    try {
      const whereClause = userId ? { userId } : {};

      const stats = await prisma.tradingSession.aggregate({
        where: whereClause,
        _count: true,
        _avg: {
          durationMinutes: true,
          realizedPnl: true,
          totalTrades: true
        }
      });

      const statusCounts = await prisma.tradingSession.groupBy({
        by: ['status'],
        where: whereClause,
        _count: {
          status: true
        }
      });

      return {
        totalSessions: stats._count,
        averageDuration: stats._avg.durationMinutes,
        averagePnL: stats._avg.realizedPnl,
        averageTradeCount: stats._avg.totalTrades,
        statusBreakdown: statusCounts.reduce((acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        }, {} as Record<string, number>)
      };
    } catch (error) {
      console.error('Get session stats error:', error);
      throw error;
    }
  }

  /**
   * Get session history for user
   */
  async getSessionHistory(userId: string, limit: number = 10, offset: number = 0) {
    try {
      const sessions = await prisma.tradingSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      });

      return sessions;
    } catch (error) {
      console.error('Get session history error:', error);
      throw error;
    }
  }

  /**
   * Check if session is expired and update status
   */
  async checkSessionExpiration(sessionId: string) {
    try {
      const session = await prisma.tradingSession.findUnique({
        where: { id: sessionId }
      });

      if (!session || session.status !== SessionStatus.ACTIVE) {
        return false;
      }

      if (session.endTime && new Date() > session.endTime) {
        await this.stopSession(sessionId, session.userId, 'time_expired');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Check session expiration error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const tradingSessionService = TradingSessionService.getInstance();
export default tradingSessionService;
