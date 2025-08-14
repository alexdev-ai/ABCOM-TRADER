import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TradingSessionService, SessionStatus, SessionCreationData, SessionUpdateData } from '../../services/tradingSession.service';

// Mock Prisma client
const mockPrisma = {
  user: {
    findUnique: jest.fn() as jest.MockedFunction<any>,
    findFirst: jest.fn() as jest.MockedFunction<any>,
    update: jest.fn() as jest.MockedFunction<any>,
  },
  tradingSession: {
    findFirst: jest.fn() as jest.MockedFunction<any>,
    findUnique: jest.fn() as jest.MockedFunction<any>,
    findMany: jest.fn() as jest.MockedFunction<any>,
    create: jest.fn() as jest.MockedFunction<any>,
    update: jest.fn() as jest.MockedFunction<any>,
    aggregate: jest.fn() as jest.MockedFunction<any>,
    groupBy: jest.fn() as jest.MockedFunction<any>,
  },
  $transaction: jest.fn() as jest.MockedFunction<any>,
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
}));

// Mock the background processor
jest.mock('../../services/sessionBackgroundProcessor.service', () => ({
  default: {
    scheduleSessionExpiration: jest.fn(),
    startSessionMonitoring: jest.fn(),
  }
}));

// Mock the session monitoring service
jest.mock('../../services/sessionMonitoring.service', () => ({
  default: {
    startSessionMonitoring: jest.fn(),
  }
}));

describe('TradingSessionService', () => {
  let tradingSessionService: TradingSessionService;

  beforeEach(() => {
    jest.clearAllMocks();
    tradingSessionService = TradingSessionService.getInstance();
  });

  describe('createSession', () => {
    const sessionData: SessionCreationData = {
      userId: 'user-1',
      durationMinutes: 240,
      lossLimitAmount: 100
    };

    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      accountBalance: { toNumber: () => 1000 },
      tradingSessions: []
    };

    it('should successfully create a new trading session', async () => {
      // Mock user lookup with no active sessions
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Mock session creation
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        durationMinutes: 240,
        lossLimitAmount: { toNumber: () => 100 },
        status: SessionStatus.PENDING,
        endTime: new Date()
      };

      mockPrisma.$transaction.mockImplementation((callback: any) => callback(mockPrisma));
      mockPrisma.tradingSession.create.mockResolvedValue(mockSession);

      const result = await tradingSessionService.createSession(sessionData);

      expect(result).toEqual(mockSession);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: { 
          tradingSessions: { 
            where: { 
              status: { in: ['PENDING', 'ACTIVE'] } 
            } 
          } 
        }
      });
    });

    it('should throw error when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(tradingSessionService.createSession(sessionData)).rejects.toThrow('USER_NOT_FOUND');
    });

    it('should throw error when active session exists', async () => {
      const userWithActiveSession = {
        ...mockUser,
        tradingSessions: [{ id: 'active-session', status: 'ACTIVE' }]
      };
      
      mockPrisma.user.findUnique.mockResolvedValue(userWithActiveSession);

      await expect(tradingSessionService.createSession(sessionData)).rejects.toThrow('ACTIVE_SESSION_EXISTS');
    });

    it('should throw error for invalid duration', async () => {
      const invalidSessionData = { ...sessionData, durationMinutes: 30 };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(tradingSessionService.createSession(invalidSessionData)).rejects.toThrow('INVALID_DURATION');
    });

    it('should throw error when loss limit too high', async () => {
      const highLossLimitData = { ...sessionData, lossLimitAmount: 500 }; // 50% of 1000 balance
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(tradingSessionService.createSession(highLossLimitData)).rejects.toThrow('LOSS_LIMIT_TOO_HIGH');
    });
  });

  describe('startSession', () => {
    it('should successfully start a pending session', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        status: SessionStatus.PENDING,
        endTime: new Date()
      };

      const mockUpdatedSession = {
        ...mockSession,
        status: SessionStatus.ACTIVE,
        startTime: new Date()
      };

      mockPrisma.tradingSession.findFirst.mockResolvedValue(mockSession);
      mockPrisma.$transaction.mockImplementation((callback: any) => callback(mockPrisma));
      mockPrisma.tradingSession.update.mockResolvedValue(mockUpdatedSession);

      const result = await tradingSessionService.startSession('session-1', 'user-1');

      expect(result.status).toBe(SessionStatus.ACTIVE);
      expect(mockPrisma.tradingSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: {
          status: SessionStatus.ACTIVE,
          startTime: expect.any(Date)
        }
      });
    });

    it('should throw error when session not found', async () => {
      mockPrisma.tradingSession.findFirst.mockResolvedValue(null);

      await expect(
        tradingSessionService.startSession('session-1', 'user-1')
      ).rejects.toThrow('SESSION_NOT_FOUND');
    });
  });

  describe('stopSession', () => {
    it('should successfully stop an active session', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        status: SessionStatus.ACTIVE
      };

      const mockStoppedSession = {
        ...mockSession,
        status: SessionStatus.STOPPED,
        terminationReason: 'manual_stop'
      };

      mockPrisma.tradingSession.findFirst.mockResolvedValue(mockSession);
      mockPrisma.$transaction.mockImplementation((callback: any) => callback(mockPrisma));
      mockPrisma.tradingSession.update.mockResolvedValue(mockStoppedSession);

      const result = await tradingSessionService.stopSession('session-1', 'user-1');

      expect(result.status).toBe(SessionStatus.STOPPED);
      expect(result.terminationReason).toBe('manual_stop');
    });

    it('should throw error when session not found', async () => {
      mockPrisma.tradingSession.findFirst.mockResolvedValue(null);

      await expect(
        tradingSessionService.stopSession('session-1', 'user-1')
      ).rejects.toThrow('SESSION_NOT_FOUND');
    });
  });

  describe('getActiveSession', () => {
    it('should return active session for user', async () => {
      const mockActiveSession = {
        id: 'session-1',
        userId: 'user-1',
        status: SessionStatus.ACTIVE
      };

      mockPrisma.tradingSession.findFirst.mockResolvedValue(mockActiveSession);

      const result = await tradingSessionService.getActiveSession('user-1');

      expect(result).toEqual(mockActiveSession);
      expect(mockPrisma.tradingSession.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          status: { in: [SessionStatus.PENDING, SessionStatus.ACTIVE] }
        }
      });
    });

    it('should return null when no active session', async () => {
      mockPrisma.tradingSession.findFirst.mockResolvedValue(null);

      const result = await tradingSessionService.getActiveSession('user-1');

      expect(result).toBeNull();
    });
  });

  describe('getSessionHistory', () => {
    it('should return session history with pagination', async () => {
      const mockSessions = [
        { id: 'session-1', userId: 'user-1', status: SessionStatus.COMPLETED },
        { id: 'session-2', userId: 'user-1', status: SessionStatus.STOPPED }
      ];

      mockPrisma.tradingSession.findMany.mockResolvedValue(mockSessions);

      const result = await tradingSessionService.getSessionHistory('user-1', 10, 0);

      expect(result).toEqual(mockSessions);
      expect(mockPrisma.tradingSession.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0
      });
    });
  });

  describe('updateSessionPerformance', () => {
    it('should update session performance data', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        status: SessionStatus.ACTIVE,
        lossLimitAmount: { toNumber: () => 100 }
      };

      const updateData: SessionUpdateData = {
        currentPnL: -50,
        tradeCount: 5
      };

      mockPrisma.tradingSession.findUnique.mockResolvedValue(mockSession);
      mockPrisma.tradingSession.update.mockResolvedValue({});

      await tradingSessionService.updateSessionPerformance('session-1', updateData);

      expect(mockPrisma.tradingSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: expect.objectContaining({
          updatedAt: expect.any(Date)
        })
      });
    });

    it('should not update inactive session', async () => {
      const mockSession = {
        id: 'session-1',
        status: SessionStatus.STOPPED
      };

      mockPrisma.tradingSession.findUnique.mockResolvedValue(mockSession);

      await tradingSessionService.updateSessionPerformance('session-1', { currentPnL: -50 });

      expect(mockPrisma.tradingSession.update).not.toHaveBeenCalled();
    });
  });

  describe('getSessionStats', () => {
    it('should return session statistics', async () => {
      const mockAggregateResult = {
        _count: 10,
        _avg: {
          durationMinutes: 240,
          realizedPnl: { toNumber: () => 25.5 },
          totalTrades: 8
        }
      };

      const mockGroupByResult = [
        { status: SessionStatus.COMPLETED, _count: { status: 5 } },
        { status: SessionStatus.STOPPED, _count: { status: 3 } },
        { status: SessionStatus.ACTIVE, _count: { status: 2 } }
      ];

      mockPrisma.tradingSession.aggregate.mockResolvedValue(mockAggregateResult);
      mockPrisma.tradingSession.groupBy.mockResolvedValue(mockGroupByResult);

      const result = await tradingSessionService.getSessionStats('user-1');

      expect(result.totalSessions).toBe(10);
      expect(result.averageDuration).toBe(240);
      expect(result.statusBreakdown).toEqual({
        [SessionStatus.COMPLETED]: 5,
        [SessionStatus.STOPPED]: 3,
        [SessionStatus.ACTIVE]: 2
      });
    });
  });

  describe('checkSessionExpiration', () => {
    it('should expire an active session that has passed end time', async () => {
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        status: SessionStatus.ACTIVE,
        endTime: pastDate
      };

      mockPrisma.tradingSession.findUnique.mockResolvedValue(mockSession);
      
      // Mock the stopSession method call
      jest.spyOn(tradingSessionService, 'stopSession').mockResolvedValue({} as any);

      const result = await tradingSessionService.checkSessionExpiration('session-1');

      expect(result).toBe(true);
      expect(tradingSessionService.stopSession).toHaveBeenCalledWith('session-1', 'user-1', 'time_expired');
    });

    it('should not expire session that has not reached end time', async () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
      const mockSession = {
        id: 'session-1',
        status: SessionStatus.ACTIVE,
        endTime: futureDate
      };

      mockPrisma.tradingSession.findUnique.mockResolvedValue(mockSession);

      const result = await tradingSessionService.checkSessionExpiration('session-1');

      expect(result).toBe(false);
    });
  });
});
