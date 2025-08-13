import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import sessionAnalyticsService from '../../services/sessionAnalytics.service';

// Mock Prisma client
const mockPrisma = {
  tradingSession: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn()
  },
  sessionAnalytics: {
    upsert: jest.fn()
  },
  realTimeMetrics: {
    upsert: jest.fn()
  }
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma)
}));

describe('SessionAnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRealTimeMetrics', () => {
    it('should return real-time metrics for active sessions', async () => {
      const userId = 'test-user-id';
      const mockSessions = [
        {
          id: 'session-1',
          userId,
          status: 'ACTIVE',
          realizedPnl: { toNumber: () => 150.75 },
          totalTrades: 5,
          lossLimitAmount: { toNumber: () => 100 },
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600000)
        }
      ];

      mockPrisma.tradingSession.findMany.mockResolvedValue(mockSessions);

      const result = await sessionAnalyticsService.getRealTimeMetrics(userId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        sessionId: 'session-1',
        userId,
        currentPnL: 150.75,
        totalTrades: 5,
        lossLimitUtilization: expect.any(Number)
      });
      expect(mockPrisma.tradingSession.findMany).toHaveBeenCalledWith({
        where: { userId, status: 'ACTIVE' }
      });
    });

    it('should return empty array when no active sessions', async () => {
      const userId = 'test-user-id';
      mockPrisma.tradingSession.findMany.mockResolvedValue([]);

      const result = await sessionAnalyticsService.getRealTimeMetrics(userId);

      expect(result).toEqual([]);
    });
  });

  describe('getSessionAnalytics', () => {
    it('should calculate comprehensive session analytics', async () => {
      const userId = 'test-user-id';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockSessions = [
        {
          id: 'session-1',
          status: 'COMPLETED',
          realizedPnl: { toNumber: () => 100 },
          totalTrades: 10,
          durationMinutes: 120,
          lossLimitAmount: { toNumber: () => 50 },
          startTime: new Date('2024-01-15T10:00:00Z'),
          createdAt: new Date('2024-01-15')
        },
        {
          id: 'session-2',
          status: 'COMPLETED',
          realizedPnl: { toNumber: () => -25 },
          totalTrades: 5,
          durationMinutes: 60,
          lossLimitAmount: { toNumber: () => 50 },
          startTime: new Date('2024-01-20T14:00:00Z'),
          createdAt: new Date('2024-01-20')
        }
      ];

      mockPrisma.tradingSession.findMany.mockResolvedValue(mockSessions);

      const result = await sessionAnalyticsService.getSessionAnalytics(
        userId,
        'monthly',
        startDate,
        endDate
      );

      expect(result).toMatchObject({
        userId,
        periodType: 'monthly',
        totalSessions: 2,
        completedSessions: 2,
        totalProfitLoss: 75,
        winRate: 50,
        averageSessionDuration: 90,
        totalTrades: 15
      });
    });
  });

  describe('comparePerformance', () => {
    it('should compare current performance with historical baseline', async () => {
      const userId = 'test-user-id';
      
      // Mock historical data
      const mockHistoricalSessions = [
        {
          realizedPnl: { toNumber: () => 50 },
          totalTrades: 8,
          status: 'COMPLETED'
        }
      ];

      // Mock current period data
      const mockCurrentSessions = [
        {
          realizedPnl: { toNumber: () => 100 },
          totalTrades: 10,
          status: 'COMPLETED'
        }
      ];

      mockPrisma.tradingSession.findMany
        .mockResolvedValueOnce(mockHistoricalSessions) // First call for baseline
        .mockResolvedValueOnce(mockCurrentSessions);   // Second call for current

      const result = await sessionAnalyticsService.comparePerformance(
        userId,
        'self_historical',
        'monthly'
      );

      expect(result).toMatchObject({
        userId,
        comparisonType: 'self_historical',
        relativeProfitLoss: expect.any(Number),
        outperformanceScore: expect.any(Number)
      });
    });
  });

  describe('getOptimalSessionTiming', () => {
    it('should return optimal timing recommendations', async () => {
      const userId = 'test-user-id';
      
      const mockSessions = Array.from({ length: 15 }, (_, i) => ({
        realizedPnl: { toNumber: () => Math.random() * 200 - 100 },
        startTime: new Date(2024, 0, i + 1, 10 + (i % 8), 0),
        status: 'COMPLETED'
      }));

      mockPrisma.tradingSession.findMany.mockResolvedValue(mockSessions);

      const result = await sessionAnalyticsService.getOptimalSessionTiming(userId);

      expect(result).toMatchObject({
        userId,
        optimalHour: expect.any(Number),
        optimalDayOfWeek: expect.any(Number),
        recommendations: expect.any(Array)
      });
    });

    it('should throw error when insufficient data', async () => {
      const userId = 'test-user-id';
      mockPrisma.tradingSession.findMany.mockResolvedValue([]);

      await expect(
        sessionAnalyticsService.getOptimalSessionTiming(userId)
      ).rejects.toThrow('Insufficient data for timing analysis');
    });
  });

  describe('predictSessionOutcome', () => {
    it('should predict session outcome based on parameters', async () => {
      const sessionParams = {
        userId: 'test-user-id',
        durationMinutes: 120,
        lossLimitAmount: 50
      };

      // Mock historical sessions for prediction model
      const mockSessions = Array.from({ length: 20 }, (_, i) => ({
        durationMinutes: 60 + (i * 10),
        lossLimitAmount: { toNumber: () => 50 },
        realizedPnl: { toNumber: () => Math.random() * 200 - 100 },
        status: Math.random() > 0.3 ? 'COMPLETED' : 'STOPPED'
      }));

      mockPrisma.tradingSession.findMany.mockResolvedValue(mockSessions);

      const result = await sessionAnalyticsService.predictSessionOutcome(sessionParams);

      expect(result).toMatchObject({
        userId: 'test-user-id',
        predictedPnL: expect.any(Number),
        successProbability: expect.any(Number),
        riskScore: expect.any(Number),
        confidence: expect.any(Number),
        recommendations: expect.any(Array)
      });
    });
  });

  describe('aggregateSessionData', () => {
    it('should aggregate session data by period type', async () => {
      const userId = 'test-user-id';
      
      mockPrisma.tradingSession.findMany.mockResolvedValue([
        {
          realizedPnl: { toNumber: () => 100 },
          totalTrades: 10,
          durationMinutes: 120,
          createdAt: new Date('2024-01-15')
        }
      ]);

      mockPrisma.sessionAnalytics.upsert.mockResolvedValue({
        id: 'analytics-1',
        userId,
        periodType: 'daily'
      });

      await sessionAnalyticsService.aggregateSessionData(userId, 'daily');

      expect(mockPrisma.sessionAnalytics.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object),
          update: expect.any(Object),
          create: expect.any(Object)
        })
      );
    });
  });

  describe('updateRealTimeMetrics', () => {
    it('should update real-time metrics for active session', async () => {
      const sessionId = 'test-session-id';
      const metrics = {
        currentPnL: 75.50,
        totalTrades: 8,
        tradingVelocity: 2.5
      };

      mockPrisma.tradingSession.findUnique.mockResolvedValue({
        id: sessionId,
        status: 'ACTIVE'
      });

      mockPrisma.realTimeMetrics.upsert.mockResolvedValue({
        sessionId,
        ...metrics
      });

      await sessionAnalyticsService.updateRealTimeMetrics(sessionId, metrics);

      expect(mockPrisma.realTimeMetrics.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sessionId },
          update: expect.objectContaining(metrics),
          create: expect.objectContaining({
            sessionId,
            ...metrics
          })
        })
      );
    });
  });
});
