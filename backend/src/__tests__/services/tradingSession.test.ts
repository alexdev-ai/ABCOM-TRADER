import { TradingSessionService } from '../../services/tradingSession.service';
import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';

// Create a properly typed mock
const mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;

describe('TradingSessionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('canCreateSession', () => {
    it('should allow session creation for eligible user', async () => {
      // Mock user with sufficient balance and no active session
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        accountBalance: new Decimal(100),
        isActive: true
      });

      (mockPrisma.tradingSession.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await TradingSessionService.canCreateSession('user-1');

      expect(result.canCreate).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should prevent session creation for user with active session', async () => {
      // Mock user with active session
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        accountBalance: new Decimal(100),
        isActive: true
      });

      (mockPrisma.tradingSession.findFirst as jest.Mock).mockResolvedValue({
        id: 'active-session',
        status: 'active'
      });

      const result = await TradingSessionService.canCreateSession('user-1');

      expect(result.canCreate).toBe(false);
      expect(result.reason).toBe('User already has an active session');
    });

    it('should prevent session creation for inactive user', async () => {
      // Mock inactive user
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        accountBalance: new Decimal(100),
        isActive: false
      });

      const result = await TradingSessionService.canCreateSession('user-1');

      expect(result.canCreate).toBe(false);
      expect(result.reason).toBe('User account is inactive');
    });

    it('should prevent session creation for user with insufficient balance', async () => {
      // Mock user with low balance
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        accountBalance: new Decimal(50), // Below $90 minimum
        isActive: true
      });

      (mockPrisma.tradingSession.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await TradingSessionService.canCreateSession('user-1');

      expect(result.canCreate).toBe(false);
      expect(result.reason).toBe('Insufficient account balance (minimum $90 required)');
    });
  });

  describe('createSession', () => {
    beforeEach(() => {
      // Mock user for validation
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        accountBalance: new Decimal(100),
        riskTolerance: 'MEDIUM'
      });

      // Mock no active session
      (mockPrisma.tradingSession.findFirst as jest.Mock).mockResolvedValue(null);
    });

    it('should create a new session with valid parameters', async () => {
      const sessionData = {
        durationMinutes: 60,
        lossLimitAmount: 9
      };

      const mockCreatedSession = {
        id: 'test-session-id',
        userId: 'user-1',
        durationMinutes: 60,
        lossLimitAmount: new Decimal(9),
        lossLimitPercentage: new Decimal(9),
        status: 'pending',
        startTime: null,
        endTime: null,
        actualDurationMinutes: null,
        totalTrades: 0,
        realizedPnl: new Decimal(0),
        sessionPerformancePercentage: new Decimal(0),
        terminationReason: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (mockPrisma.tradingSession.create as jest.Mock).mockResolvedValue(mockCreatedSession);

      const session = await TradingSessionService.createSession('user-1', sessionData);

      expect(session).toMatchObject({
        id: 'test-session-id',
        userId: 'user-1',
        durationMinutes: 60,
        status: 'pending'
      });

      expect(mockPrisma.tradingSession.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          durationMinutes: 60,
          lossLimitAmount: new Decimal(9),
          lossLimitPercentage: new Decimal(9),
          status: 'pending'
        }
      });
    });

    it('should throw error for invalid duration', async () => {
      const sessionData = {
        durationMinutes: 30, // Invalid duration
        lossLimitAmount: 9
      };

      await expect(
        TradingSessionService.createSession('user-1', sessionData)
      ).rejects.toThrow('INVALID_DURATION');
    });

    it('should throw error when user has active session', async () => {
      // Mock active session exists
      (mockPrisma.tradingSession.findFirst as jest.Mock).mockResolvedValue({
        id: 'active-session',
        status: 'active'
      });

      const sessionData = {
        durationMinutes: 60,
        lossLimitAmount: 9
      };

      await expect(
        TradingSessionService.createSession('user-1', sessionData)
      ).rejects.toThrow('USER_HAS_ACTIVE_SESSION');
    });
  });

  describe('activateSession', () => {
    it('should activate a pending session', async () => {
      const mockPendingSession = {
        id: 'session-1',
        userId: 'user-1',
        status: 'pending',
        durationMinutes: 60
      };

      const mockActivatedSession = {
        ...mockPendingSession,
        status: 'active',
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000)
      };

      (mockPrisma.tradingSession.findFirst as jest.Mock).mockResolvedValue(mockPendingSession);
      (mockPrisma.tradingSession.update as jest.Mock).mockResolvedValue(mockActivatedSession);

      const session = await TradingSessionService.activateSession('session-1', 'user-1');

      expect(session.status).toBe('active');
      expect(session.startTime).toBeDefined();
      expect(session.endTime).toBeDefined();
    });

    it('should throw error if session not found or not pending', async () => {
      (mockPrisma.tradingSession.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        TradingSessionService.activateSession('session-1', 'user-1')
      ).rejects.toThrow('SESSION_NOT_FOUND_OR_NOT_PENDING');
    });
  });

  describe('stopSession', () => {
    it('should stop an active session', async () => {
      const mockActiveSession = {
        id: 'session-1',
        userId: 'user-1',
        status: 'active',
        startTime: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      };

      const mockStoppedSession = {
        ...mockActiveSession,
        status: 'stopped',
        endTime: new Date(),
        actualDurationMinutes: 30,
        terminationReason: 'manual_stop'
      };

      (mockPrisma.tradingSession.findFirst as jest.Mock).mockResolvedValue(mockActiveSession);
      (mockPrisma.tradingSession.update as jest.Mock).mockResolvedValue(mockStoppedSession);

      const session = await TradingSessionService.stopSession('session-1', 'user-1');

      expect(session.status).toBe('stopped');
      expect(session.terminationReason).toBe('manual_stop');
      expect(session.endTime).toBeDefined();
    });

    it('should throw error if session not found or not active', async () => {
      (mockPrisma.tradingSession.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        TradingSessionService.stopSession('session-1', 'user-1')
      ).rejects.toThrow('SESSION_NOT_FOUND_OR_NOT_ACTIVE');
    });
  });

  describe('getActiveSession', () => {
    it('should return active session for user', async () => {
      const mockActiveSession = {
        id: 'session-1',
        userId: 'user-1',
        status: 'active',
        endTime: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
      };

      (mockPrisma.tradingSession.findFirst as jest.Mock).mockResolvedValue(mockActiveSession);

      const session = await TradingSessionService.getActiveSession('user-1');

      expect(session).toEqual(mockActiveSession);
    });

    it('should return null if no active session', async () => {
      (mockPrisma.tradingSession.findFirst as jest.Mock).mockResolvedValue(null);

      const session = await TradingSessionService.getActiveSession('user-1');

      expect(session).toBeNull();
    });
  });

  describe('getSessionHistory', () => {
    it('should return user session history', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          userId: 'user-1',
          status: 'completed',
          createdAt: new Date()
        },
        {
          id: 'session-2',
          userId: 'user-1',
          status: 'stopped',
          createdAt: new Date()
        }
      ];

      (mockPrisma.tradingSession.findMany as jest.Mock).mockResolvedValue(mockSessions);

      const sessions = await TradingSessionService.getSessionHistory('user-1', 10, 0);

      expect(sessions).toEqual(mockSessions);
      expect(mockPrisma.tradingSession.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          status: { in: ['completed', 'stopped', 'expired'] }
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0
      });
    });
  });
});
