import { PrismaClient, User } from '@prisma/client';
import { AuditService } from './audit.service';

const prisma = new PrismaClient();

// Define TradingSession type based on Prisma model
type TradingSession = {
  id: string;
  userId: string;
  durationMinutes: number;
  lossLimitAmount: any; // Decimal
  lossLimitPercentage: any; // Decimal
  status: string;
  startTime: Date | null;
  endTime: Date | null;
  actualDurationMinutes: number | null;
  totalTrades: number;
  realizedPnl: any; // Decimal
  sessionPerformancePercentage: any; // Decimal
  terminationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export interface SessionConfig {
  durationMinutes: 60 | 240 | 1440 | 10080; // 1h, 4h, 1d, 7d
  lossLimitAmount?: number;
  lossLimitPercentage?: number;
}

export interface SessionCreateRequest {
  durationMinutes: 60 | 240 | 1440 | 10080;
  lossLimitAmount?: number;
  lossLimitPercentage?: number;
}

export interface SessionCreateResponse {
  sessionId: string;
  durationMinutes: number;
  lossLimitAmount: number;
  lossLimitPercentage: number;
  estimatedEndTime: string;
  status: 'pending';
}

export interface ActiveSessionResponse {
  sessionId: string;
  status: 'active';
  durationMinutes: number;
  elapsedMinutes: number;
  remainingMinutes: number;
  lossLimitAmount: number;
  currentPnL: number;
  totalTrades: number;
  progressPercentages: {
    timeElapsed: number;
    lossLimitUsed: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export enum SessionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  STOPPED = 'stopped',
  EXPIRED = 'expired'
}

export class SessionBusinessRules {
  // Only one active session per user
  static readonly MAX_ACTIVE_SESSIONS = 1;
  
  // Session duration options (minutes)
  static readonly DURATION_OPTIONS = [60, 240, 1440, 10080];
  
  // Loss limit percentages
  static readonly LOSS_LIMIT_PERCENTAGES = [10, 20, 30];
  
  // Minimum account balance for session creation
  static readonly MINIMUM_BALANCE = 100;
  
  // Minimum loss limit amount
  static readonly MINIMUM_LOSS_LIMIT = 9;
  
  // Maximum loss limit percentage
  static readonly MAXIMUM_LOSS_LIMIT_PERCENTAGE = 30;
}

class TradingSessionService {
  /**
   * Create a new trading session
   */
  async createSession(userId: string, config: SessionConfig): Promise<TradingSession> {
    // Validate session configuration
    const validation = await this.validateSessionConfig(userId, config);
    if (!validation.isValid) {
      throw new Error(`Session validation failed: ${validation.errors.join(', ')}`);
    }

    // Check if user can create a session
    const canCreate = await this.canCreateSession(userId);
    if (!canCreate) {
      throw new Error('User already has an active session');
    }

    // Get user for balance calculation
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Calculate loss limits
    const lossLimitAmount = config.lossLimitAmount || 
      (Number(user.accountBalance) * (config.lossLimitPercentage || 10) / 100);
    
    const lossLimitPercentage = config.lossLimitPercentage || 
      (config.lossLimitAmount ? (config.lossLimitAmount / Number(user.accountBalance)) * 100 : 10);

    // Create session
    const session = await prisma.tradingSession.create({
      data: {
        userId,
        durationMinutes: config.durationMinutes,
        lossLimitAmount,
        lossLimitPercentage,
        status: SessionStatus.PENDING
      }
    });

    // Log session creation
    await auditService.log({
      userId,
      eventType: 'session',
      eventAction: 'session_created',
      eventData: JSON.stringify({
        sessionId: session.id,
        durationMinutes: config.durationMinutes,
        lossLimitAmount,
        lossLimitPercentage
      })
    });

    return session;
  }

  /**
   * Get active session for user
   */
  async getActiveSession(userId: string): Promise<TradingSession | null> {
    const session = await prisma.tradingSession.findFirst({
      where: {
        userId,
        status: SessionStatus.ACTIVE
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return session;
  }

  /**
   * Get active session with real-time data
   */
  async getActiveSessionData(userId: string): Promise<ActiveSessionResponse | null> {
    const session = await this.getActiveSession(userId);
    if (!session || !session.startTime) {
      return null;
    }

    const now = new Date();
    const elapsedMinutes = Math.floor((now.getTime() - session.startTime.getTime()) / (1000 * 60));
    const remainingMinutes = Math.max(0, session.durationMinutes - elapsedMinutes);
    
    // Calculate progress percentages
    const timeElapsed = Math.min(100, (elapsedMinutes / session.durationMinutes) * 100);
    const lossLimitUsed = session.realizedPnl < 0 ? 
      Math.min(100, (Math.abs(Number(session.realizedPnl)) / Number(session.lossLimitAmount)) * 100) : 0;

    return {
      sessionId: session.id,
      status: 'active',
      durationMinutes: session.durationMinutes,
      elapsedMinutes,
      remainingMinutes,
      lossLimitAmount: Number(session.lossLimitAmount),
      currentPnL: Number(session.realizedPnl),
      totalTrades: session.totalTrades,
      progressPercentages: {
        timeElapsed,
        lossLimitUsed
      }
    };
  }

  /**
   * Start a pending session
   */
  async startSession(sessionId: string, userId: string): Promise<TradingSession> {
    const session = await prisma.tradingSession.findFirst({
      where: {
        id: sessionId,
        userId,
        status: SessionStatus.PENDING
      }
    });

    if (!session) {
      throw new Error('Session not found or cannot be started');
    }

    const now = new Date();
    const endTime = new Date(now.getTime() + session.durationMinutes * 60 * 1000);

    const updatedSession = await prisma.tradingSession.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.ACTIVE,
        startTime: now,
        endTime
      }
    });

    // Log session start
    await auditService.log({
      userId,
      eventType: 'session',
      eventAction: 'session_started',
      eventData: JSON.stringify({
        sessionId,
        startTime: now,
        endTime
      })
    });

    return updatedSession;
  }

  /**
   * Stop an active session
   */
  async stopSession(sessionId: string, userId: string, reason: string = 'manual_stop'): Promise<TradingSession> {
    const session = await prisma.tradingSession.findFirst({
      where: {
        id: sessionId,
        userId,
        status: SessionStatus.ACTIVE
      }
    });

    if (!session || !session.startTime) {
      throw new Error('Active session not found');
    }

    const now = new Date();
    const actualDurationMinutes = Math.floor((now.getTime() - session.startTime.getTime()) / (1000 * 60));
    
    // Calculate final performance percentage
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const performancePercentage = user ? (Number(session.realizedPnl) / Number(user.accountBalance)) * 100 : 0;

    const updatedSession = await prisma.tradingSession.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.STOPPED,
        endTime: now,
        actualDurationMinutes,
        sessionPerformancePercentage: performancePercentage,
        terminationReason: reason
      }
    });

    // Log session stop
    await auditService.log({
      userId,
      eventType: 'session',
      eventAction: 'session_stopped',
      eventData: JSON.stringify({
        sessionId,
        reason,
        actualDurationMinutes,
        finalPnL: Number(session.realizedPnl),
        performancePercentage
      })
    });

    return updatedSession;
  }

  /**
   * Update session statistics after a trade
   */
  async updateSessionStats(userId: string, tradePnL: number): Promise<void> {
    const session = await this.getActiveSession(userId);
    if (!session) {
      return; // No active session to update
    }

    const updatedSession = await prisma.tradingSession.update({
      where: { id: session.id },
      data: {
        totalTrades: { increment: 1 },
        realizedPnl: { increment: tradePnL }
      }
    });

    // Check if loss limit reached
    if (Number(updatedSession.realizedPnl) <= -Number(updatedSession.lossLimitAmount)) {
      await this.stopSession(session.id, userId, 'loss_limit');
    }
  }

  /**
   * Check for expired sessions and update their status
   */
  async checkExpiredSessions(): Promise<void> {
    const now = new Date();
    
    const expiredSessions = await prisma.tradingSession.findMany({
      where: {
        status: SessionStatus.ACTIVE,
        endTime: {
          lte: now
        }
      }
    });

    for (const session of expiredSessions) {
      if (session.startTime) {
        const actualDurationMinutes = Math.floor((now.getTime() - session.startTime.getTime()) / (1000 * 60));
        
        await prisma.tradingSession.update({
          where: { id: session.id },
          data: {
            status: SessionStatus.EXPIRED,
            actualDurationMinutes,
            terminationReason: 'time_limit'
          }
        });

        await auditService.log({
          userId: session.userId,
          eventType: 'session',
          eventAction: 'session_expired',
          eventData: JSON.stringify({
            sessionId: session.id,
            actualDurationMinutes
          })
        });
      }
    }
  }

  /**
   * Get session history for user
   */
  async getSessionHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    filters?: {
      dateFrom?: Date;
      dateTo?: Date;
      status?: string;
      performanceFilter?: 'profit' | 'loss' | 'all';
    }
  ) {
    const where: any = { userId };

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.performanceFilter === 'profit') {
      where.realizedPnl = { gt: 0 };
    } else if (filters?.performanceFilter === 'loss') {
      where.realizedPnl = { lt: 0 };
    }

    const [sessions, total] = await Promise.all([
      prisma.tradingSession.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.tradingSession.count({ where })
    ]);

    return {
      sessions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    };
  }

  /**
   * Validate session configuration
   */
  async validateSessionConfig(userId: string, config: SessionConfig): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate duration
    if (!SessionBusinessRules.DURATION_OPTIONS.includes(config.durationMinutes)) {
      errors.push(`Invalid duration. Must be one of: ${SessionBusinessRules.DURATION_OPTIONS.join(', ')} minutes`);
    }

    // Get user for balance validation
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      errors.push('User not found');
      return { isValid: false, errors, warnings };
    }

    const accountBalance = Number(user.accountBalance);

    // Validate minimum balance
    if (accountBalance < SessionBusinessRules.MINIMUM_BALANCE) {
      errors.push(`Insufficient account balance. Minimum required: $${SessionBusinessRules.MINIMUM_BALANCE}`);
    }

    // Validate loss limits
    if (config.lossLimitAmount) {
      if (config.lossLimitAmount < SessionBusinessRules.MINIMUM_LOSS_LIMIT) {
        errors.push(`Loss limit amount too low. Minimum: $${SessionBusinessRules.MINIMUM_LOSS_LIMIT}`);
      }
      if (config.lossLimitAmount > accountBalance) {
        errors.push('Loss limit amount cannot exceed account balance');
      }
    }

    if (config.lossLimitPercentage) {
      if (config.lossLimitPercentage < 1 || config.lossLimitPercentage > SessionBusinessRules.MAXIMUM_LOSS_LIMIT_PERCENTAGE) {
        errors.push(`Loss limit percentage must be between 1% and ${SessionBusinessRules.MAXIMUM_LOSS_LIMIT_PERCENTAGE}%`);
      }
    }

    // Calculate effective loss limit
    const effectiveLossLimit = config.lossLimitAmount || 
      (accountBalance * (config.lossLimitPercentage || 10) / 100);

    // Warnings for high loss limits
    if (effectiveLossLimit > accountBalance * 0.2) {
      warnings.push('Loss limit exceeds 20% of account balance - consider a lower limit');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check if user can create a new session
   */
  async canCreateSession(userId: string): Promise<boolean> {
    const activeSession = await this.getActiveSession(userId);
    return activeSession === null;
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string, userId: string): Promise<TradingSession | null> {
    return await prisma.tradingSession.findFirst({
      where: {
        id: sessionId,
        userId
      }
    });
  }
}

export const tradingSessionService = new TradingSessionService();
