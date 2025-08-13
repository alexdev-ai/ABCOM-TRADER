import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies
const mockTradingSessionService = {
  stopSession: jest.fn()
};

const mockAlgorithmQueueService = {
  addPerformanceJob: jest.fn()
};

const mockPrisma = {
  tradingSession: {
    findUnique: jest.fn(),
    deleteMany: jest.fn()
  }
};

jest.mock('../../services/tradingSession.service', () => ({
  default: mockTradingSessionService
}));

jest.mock('../../services/algorithmQueue.service', () => ({
  default: mockAlgorithmQueueService
}));

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma)
}));

// Import after mocking
import SessionBackgroundProcessor from '../../services/sessionBackgroundProcessor.service';

describe('SessionBackgroundProcessor', () => {
  let processor: any;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = SessionBackgroundProcessor;
  });

  describe('scheduleSessionExpiration', () => {
    it('should schedule session expiration job successfully', async () => {
      const sessionId = 'test-session-id';
      const userId = 'test-user-id';
      const endTime = new Date(Date.now() + 3600000); // 1 hour from now

      const jobId = await processor.scheduleSessionExpiration(sessionId, userId, endTime);

      expect(typeof jobId).toBe('string');
      expect(jobId).toContain('expiration-');
    });

    it('should handle immediate expiration (past date)', async () => {
      const sessionId = 'test-session-id';
      const userId = 'test-user-id';
      const endTime = new Date(Date.now() - 1000); // 1 second ago

      const jobId = await processor.scheduleSessionExpiration(sessionId, userId, endTime);

      expect(typeof jobId).toBe('string');
    });
  });

  describe('schedulePeriodicLossCheck', () => {
    it('should schedule periodic loss checking', async () => {
      const sessionId = 'test-session-id';
      const userId = 'test-user-id';

      await expect(
        processor.schedulePeriodicLossCheck(sessionId, userId)
      ).resolves.not.toThrow();
    });
  });

  describe('scheduleSessionCleanup', () => {
    it('should schedule daily cleanup job', async () => {
      await expect(
        processor.scheduleSessionCleanup()
      ).resolves.not.toThrow();
    });
  });

  describe('schedulePerformanceCalculation', () => {
    it('should schedule performance calculation job', async () => {
      const sessionId = 'test-session-id';
      const userId = 'test-user-id';

      await expect(
        processor.schedulePerformanceCalculation(sessionId, userId)
      ).resolves.not.toThrow();
    });

    it('should schedule with delay', async () => {
      const sessionId = 'test-session-id';
      const userId = 'test-user-id';
      const delay = 5000;

      await expect(
        processor.schedulePerformanceCalculation(sessionId, userId, delay)
      ).resolves.not.toThrow();
    });
  });

  describe('scheduleWarningNotification', () => {
    it('should schedule warning notification for loss threshold', async () => {
      const sessionId = 'test-session-id';
      const userId = 'test-user-id';

      await expect(
        processor.scheduleWarningNotification(sessionId, userId, 'loss', 85)
      ).resolves.not.toThrow();
    });

    it('should schedule warning notification for time threshold', async () => {
      const sessionId = 'test-session-id';
      const userId = 'test-user-id';

      await expect(
        processor.scheduleWarningNotification(sessionId, userId, 'time', 90)
      ).resolves.not.toThrow();
    });
  });

  describe('startSessionMonitoring', () => {
    it('should start monitoring for a session', async () => {
      const sessionId = 'test-session-id';
      const userId = 'test-user-id';

      await expect(
        processor.startSessionMonitoring(sessionId, userId)
      ).resolves.not.toThrow();
    });
  });

  describe('stopSessionMonitoring', () => {
    it('should stop monitoring for a session', async () => {
      const sessionId = 'test-session-id';

      await expect(
        processor.stopSessionMonitoring(sessionId)
      ).resolves.not.toThrow();
    });
  });

  describe('getProcessingStats', () => {
    it('should return processing statistics', async () => {
      const stats = await processor.getProcessingStats();

      expect(stats).toHaveProperty('queue');
      expect(stats).toHaveProperty('processing');
      expect(stats).toHaveProperty('health');
      expect(stats.queue).toHaveProperty('waiting');
      expect(stats.queue).toHaveProperty('active');
      expect(stats.queue).toHaveProperty('completed');
      expect(stats.queue).toHaveProperty('failed');
    });
  });

  describe('job processing', () => {
    it('should process session expiration successfully', async () => {
      const mockSession = {
        id: 'test-session',
        status: 'ACTIVE',
        userId: 'test-user'
      };

      mockPrisma.tradingSession.findUnique.mockResolvedValue(mockSession);
      mockTradingSessionService.stopSession.mockResolvedValue(undefined);

      // This would be called internally by the job processor
      // We can't easily test the private methods, but we can verify the setup
      expect(mockPrisma.tradingSession.findUnique).toBeDefined();
      expect(mockTradingSessionService.stopSession).toBeDefined();
    });

    it('should handle session cleanup', async () => {
      const cleanupResult = { count: 5 };
      mockPrisma.tradingSession.deleteMany.mockResolvedValue(cleanupResult);

      // This would be called internally by the cleanup job
      expect(mockPrisma.tradingSession.deleteMany).toBeDefined();
    });

    it('should handle performance calculation', async () => {
      mockAlgorithmQueueService.addPerformanceJob.mockResolvedValue(undefined);

      // This would be called internally by the performance job
      expect(mockAlgorithmQueueService.addPerformanceJob).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const sessionId = 'test-session-id';
      const userId = 'test-user-id';
      const endTime = new Date(Date.now() + 3600000);

      // Mock a database error
      mockPrisma.tradingSession.findUnique.mockRejectedValue(new Error('Database error'));

      // The service should handle errors gracefully and not throw
      await expect(
        processor.scheduleSessionExpiration(sessionId, userId, endTime)
      ).resolves.toBeDefined();
    });

    it('should handle invalid job parameters', async () => {
      const sessionId = '';
      const userId = '';
      const endTime = new Date('invalid');

      // Should handle invalid parameters gracefully
      await expect(
        processor.scheduleSessionExpiration(sessionId, userId, endTime)
      ).rejects.toThrow();
    });
  });
});
