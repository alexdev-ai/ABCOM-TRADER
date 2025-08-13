import { PrismaClient, TradingSession, User } from '@prisma/client';
import { Decimal } from 'decimal.js';

const prisma = new PrismaClient();

export interface CreateSessionRequest {
  durationMinutes: number;
  lossLimitAmount?: number;
  lossLimitPercentage?: number;
}

export interface SessionSummary {
  id: string;
  status: string;
  durationMinutes: number;
  remainingMinutes: number;
  lossLimitAmount: number;
  lossLimitPercentage: number;
  currentPnl: number;
  totalTrades: number;
  startTime: Date | null;
  endTime: Date | null;
  progress: {
    timeElapsed: number;
    timeRemaining: number;
    lossLimitUsed: number;
  };
}

export class TradingSessionService {
  /**
   * Create a new trading session with time and loss limits
   */
  static async createSession(
    userId: string,
    sessionData: CreateSessionRequest
  ): Promise<TradingSession> {
    // Check if user already has an active session
    const activeSession = await this.getActiveSession(userId);
    if (activeSession) {
      throw new Error('USER_HAS_ACTIVE_SESSION');
    }

    // Get user data for validation
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountBalance: true, riskTolerance: true }
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    // Validate session parameters
    this.validateSessionParameters(sessionData, user);

    // Calculate loss limits
    const { lossLimitAmount, lossLimitPercentage } = this.calculateLossLimits(
      sessionData,
      user.accountBalance
    );

    // Create the session
    const session = await prisma.tradingSession.create({
      data: {
        userId,
        durationMinutes: sessionData.durationMinutes,
        lossLimitAmount: new Decimal(lossLimitAmount),
        lossLimitPercentage: new Decimal(lossLimitPercentage),
        status: 'pending'
      }
    });

    return session;
  }

  /**
   * Activate a pending session
   */
  static async activateSession(sessionId: string, userId: string): Promise<TradingSession> {
    const session = await prisma.tradingSession.findFirst({
      where: {
        id: sessionId,
        userId,
        status: 'pending'
      }
    });

    if (!session) {
      throw new Error('SESSION_NOT_FOUND_OR_NOT_PENDING');
    }

    const now = new Date();
    const endTime = new Date(now.getTime() + session.durationMinutes * 60 * 1000);

    const activatedSession = await prisma.tradingSession.update({
      where: { id: sessionId },
      data: {
        status: 'active',
        startTime: now,
        endTime
      }
    });

    return activatedSession;
  }

  /**
   * Get active session for user
   */
  static async getActiveSession(userId: string): Promise<TradingSession | null> {
    const session = await prisma.tradingSession.findFirst({
      where: {
        userId,
        status: { in: ['pending', 'active'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Check if session has expired
    if (session && session.status === 'active' && session.endTime && new Date() > session.endTime) {
      await this.expireSession(session.id);
      return null;
    }

    return session;
  }

  /**
   * Get session summary with real-time calculations
   */
  static async getSessionSummary(sessionId: string, userId: string): Promise<SessionSummary> {
    const session = await prisma.tradingSession.findFirst({
      where: { id: sessionId, userId }
    });

    if (!session) {
      throw new Error('SESSION_NOT_FOUND');
    }

    const now = new Date();
    let remainingMinutes = 0;
    let timeElapsed = 0;
    let timeRemaining = 100;

    if (session.startTime && session.endTime) {
      const totalDuration = session.endTime.getTime() - session.startTime.getTime();
      const elapsed = now.getTime() - session.startTime.getTime();
      
      timeElapsed = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
      timeRemaining = Math.max(0, 100 - timeElapsed);
      remainingMinutes = Math.max(0, Math.ceil((session.endTime.getTime() - now.getTime()) / (1000 * 60)));
    } else if (session.status === 'pending') {
      remainingMinutes = session.durationMinutes;
      timeRemaining = 100;
    }

    // Calculate loss limit usage
    const currentPnl = parseFloat(session.realizedPnl.toString());
    const lossLimitAmount = parseFloat(session.lossLimitAmount.toString());
    const lossLimitUsed = lossLimitAmount > 0 ? Math.max(0, (-currentPnl / lossLimitAmount) * 100) : 0;

    return {
      id: session.id,
      status: session.status,
      durationMinutes: session.durationMinutes,
      remainingMinutes,
      lossLimitAmount: parseFloat(session.lossLimitAmount.toString()),
      lossLimitPercentage: parseFloat(session.lossLimitPercentage.toString()),
      currentPnl,
      totalTrades: session.totalTrades,
      startTime: session.startTime || null,
      endTime: session.endTime || null,
      progress: {
        timeElapsed,
        timeRemaining,
        lossLimitUsed: Math.min(100, lossLimitUsed)
      }
    };
  }

  /**
   * Stop a session manually
   */
  static async stopSession(sessionId: string, userId: string): Promise<TradingSession> {
    const session = await prisma.tradingSession.findFirst({
      where: {
        id: sessionId,
        userId,
        status: { in: ['pending', 'active'] }
      }
    });

    if (!session) {
      throw new Error('SESSION_NOT_FOUND_OR_NOT_ACTIVE');
    }

    const now = new Date();
    let actualDurationMinutes = 0;

    if (session.startTime) {
      actualDurationMinutes = Math.ceil((now.getTime() - session.startTime.getTime()) / (1000 * 60));
    }

    const stoppedSession = await prisma.tradingSession.update({
      where: { id: sessionId },
      data: {
        status: 'stopped',
        endTime: now,
        actualDurationMinutes,
        terminationReason: 'manual_stop'
      }
    });

    return stoppedSession;
  }

  /**
   * Expire a session that has reached its time limit
   */
  static async expireSession(sessionId: string): Promise<TradingSession> {
    const session = await prisma.tradingSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      throw new Error('SESSION_NOT_FOUND');
    }

    const now = new Date();
    let actualDurationMinutes = session.durationMinutes;

    if (session.startTime) {
      actualDurationMinutes = Math.ceil((now.getTime() - session.startTime.getTime()) / (1000 * 60));
    }

    const expiredSession = await prisma.tradingSession.update({
      where: { id: sessionId },
      data: {
        status: 'expired',
        endTime: now,
        actualDurationMinutes,
        terminationReason: 'time_limit'
      }
    });

    return expiredSession;
  }

  /**
   * Get session history for user
   */
  static async getSessionHistory(
    userId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<TradingSession[]> {
    return await prisma.tradingSession.findMany({
      where: {
        userId,
        status: { in: ['completed', 'stopped', 'expired'] }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });
  }

  /**
   * Update session P&L and trade count
   */
  static async updateSessionPerformance(
    sessionId: string,
    pnlChange: number,
    tradeCount: number = 1
  ): Promise<void> {
    const session = await prisma.tradingSession.findUnique({
      where: { id: sessionId }
    });

    if (!session || session.status !== 'active') {
      return;
    }

    const newPnl = new Decimal(session.realizedPnl).plus(pnlChange);
    const newTradeCount = session.totalTrades + tradeCount;

    // Check if loss limit has been reached
    const lossLimitReached = newPnl.lessThan(new Decimal(session.lossLimitAmount).neg());

    if (lossLimitReached) {
      // Stop session due to loss limit
      await prisma.tradingSession.update({
        where: { id: sessionId },
        data: {
          realizedPnl: newPnl,
          totalTrades: newTradeCount,
          status: 'stopped',
          endTime: new Date(),
          terminationReason: 'loss_limit'
        }
      });
    } else {
      // Update session performance
      await prisma.tradingSession.update({
        where: { id: sessionId },
        data: {
          realizedPnl: newPnl,
          totalTrades: newTradeCount
        }
      });
    }
  }

  /**
   * Validate session parameters
   */
  private static validateSessionParameters(
    sessionData: CreateSessionRequest,
    user: { accountBalance: Decimal; riskTolerance: string }
  ): void {
    const { durationMinutes, lossLimitAmount, lossLimitPercentage } = sessionData;

    // Validate duration (1 hour to 7 days)
    const validDurations = [60, 240, 1440, 10080]; // 1h, 4h, 24h, 7d
    if (!validDurations.includes(durationMinutes)) {
      throw new Error('INVALID_DURATION');
    }

    // Validate loss limits
    if (!lossLimitAmount && !lossLimitPercentage) {
      throw new Error('LOSS_LIMIT_REQUIRED');
    }

    const accountBalance = parseFloat(user.accountBalance.toString());
    
    if (lossLimitAmount && lossLimitAmount > accountBalance * 0.5) {
      throw new Error('LOSS_LIMIT_TOO_HIGH');
    }

    if (lossLimitPercentage && lossLimitPercentage > 50) {
      throw new Error('LOSS_PERCENTAGE_TOO_HIGH');
    }
  }

  /**
   * Calculate loss limits based on input and account balance
   */
  private static calculateLossLimits(
    sessionData: CreateSessionRequest,
    accountBalance: Decimal
  ): { lossLimitAmount: number; lossLimitPercentage: number } {
    const balance = parseFloat(accountBalance.toString());

    let lossLimitAmount: number;
    let lossLimitPercentage: number;

    if (sessionData.lossLimitAmount) {
      lossLimitAmount = sessionData.lossLimitAmount;
      lossLimitPercentage = (lossLimitAmount / balance) * 100;
    } else if (sessionData.lossLimitPercentage) {
      lossLimitPercentage = sessionData.lossLimitPercentage;
      lossLimitAmount = (balance * lossLimitPercentage) / 100;
    } else {
      // Default to 10% of account balance
      lossLimitPercentage = 10;
      lossLimitAmount = (balance * 10) / 100;
    }

    return { lossLimitAmount, lossLimitPercentage };
  }

  /**
   * Check if user can create a new session
   */
  static async canCreateSession(userId: string): Promise<{ canCreate: boolean; reason?: string }> {
    const activeSession = await this.getActiveSession(userId);
    
    if (activeSession) {
      return {
        canCreate: false,
        reason: 'User already has an active session'
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountBalance: true, isActive: true }
    });

    if (!user || !user.isActive) {
      return {
        canCreate: false,
        reason: 'User account is inactive'
      };
    }

    const minBalance = 90; // $90 minimum
    if (parseFloat(user.accountBalance.toString()) < minBalance) {
      return {
        canCreate: false,
        reason: 'Insufficient account balance (minimum $90 required)'
      };
    }

    return { canCreate: true };
  }
}

export default TradingSessionService;
