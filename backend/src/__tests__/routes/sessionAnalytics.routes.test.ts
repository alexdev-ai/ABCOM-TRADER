import request from 'supertest';
import express from 'express';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import sessionAnalyticsRoutes from '../../routes/sessionAnalytics.routes';

// Mock session analytics service
const mockSessionAnalyticsService = {
  getRealTimeMetrics: jest.fn(),
  updateRealTimeMetrics: jest.fn(),
  getSessionAnalytics: jest.fn(),
  comparePerformance: jest.fn(),
  getOptimalSessionTiming: jest.fn(),
  predictSessionOutcome: jest.fn(),
  aggregateSessionData: jest.fn(),
  refreshAnalyticsCache: jest.fn()
};

jest.mock('../../services/sessionAnalytics.service', () => ({
  default: mockSessionAnalyticsService
}));

describe('Session Analytics Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/analytics', sessionAnalyticsRoutes);
    jest.clearAllMocks();
  });

  describe('GET /api/v1/analytics/real-time/:userId', () => {
    it('should return real-time metrics for valid user', async () => {
      const userId = 'test-user-id';
      const mockMetrics = [
        {
          sessionId: 'session-1',
          userId,
          currentPnL: 150.75,
          totalTrades: 5,
          lossLimitUtilization: 25.5
        }
      ];

      mockSessionAnalyticsService.getRealTimeMetrics.mockResolvedValue(mockMetrics);

      const response = await request(app)
        .get(`/api/v1/analytics/real-time/${userId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.metrics).toEqual(mockMetrics);
      expect(response.body.data.count).toBe(1);
      expect(mockSessionAnalyticsService.getRealTimeMetrics).toHaveBeenCalledWith(userId);
    });

    it('should return error for missing user ID', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/real-time/')
        .expect(404);
    });

    it('should handle service errors gracefully', async () => {
      const userId = 'test-user-id';
      mockSessionAnalyticsService.getRealTimeMetrics.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get(`/api/v1/analytics/real-time/${userId}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to retrieve real-time metrics');
    });
  });

  describe('POST /api/v1/analytics/real-time/:sessionId', () => {
    it('should update real-time metrics successfully', async () => {
      const sessionId = 'test-session-id';
      const metrics = {
        currentPnL: 75.50,
        totalTrades: 8,
        tradingVelocity: 2.5
      };

      mockSessionAnalyticsService.updateRealTimeMetrics.mockResolvedValue(undefined);

      const response = await request(app)
        .post(`/api/v1/analytics/real-time/${sessionId}`)
        .send(metrics)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Real-time metrics updated successfully');
      expect(mockSessionAnalyticsService.updateRealTimeMetrics).toHaveBeenCalledWith(sessionId, metrics);
    });

    it('should validate input parameters', async () => {
      const sessionId = 'test-session-id';
      const invalidMetrics = {
        currentPnL: 'invalid-number',
        totalTrades: -1
      };

      const response = await request(app)
        .post(`/api/v1/analytics/real-time/${sessionId}`)
        .send(invalidMetrics)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/v1/analytics/session/:userId', () => {
    it('should return session analytics for valid parameters', async () => {
      const userId = 'test-user-id';
      const mockAnalytics = {
        userId,
        periodType: 'monthly',
        totalSessions: 10,
        winRate: 65.5,
        totalProfitLoss: 1250.75
      };

      mockSessionAnalyticsService.getSessionAnalytics.mockResolvedValue(mockAnalytics);

      const response = await request(app)
        .get(`/api/v1/analytics/session/${userId}`)
        .query({
          periodType: 'monthly',
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockAnalytics);
    });

    it('should validate query parameters', async () => {
      const userId = 'test-user-id';

      const response = await request(app)
        .get(`/api/v1/analytics/session/${userId}`)
        .query({
          periodType: 'invalid-period',
          startDate: 'invalid-date',
          endDate: 'invalid-date'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/v1/analytics/comparison/:userId', () => {
    it('should return performance comparison data', async () => {
      const userId = 'test-user-id';
      const mockComparison = {
        userId,
        comparisonType: 'self_historical',
        relativeProfitLoss: 15.5,
        outperformanceScore: 78.2
      };

      mockSessionAnalyticsService.comparePerformance.mockResolvedValue(mockComparison);

      const response = await request(app)
        .get(`/api/v1/analytics/comparison/${userId}`)
        .query({
          comparisonType: 'self_historical',
          timeframe: 'monthly'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockComparison);
    });

    it('should validate comparison type', async () => {
      const userId = 'test-user-id';

      const response = await request(app)
        .get(`/api/v1/analytics/comparison/${userId}`)
        .query({
          comparisonType: 'invalid-type',
          timeframe: 'monthly'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/v1/analytics/timing/:userId', () => {
    it('should return optimal timing recommendations', async () => {
      const userId = 'test-user-id';
      const mockTiming = {
        userId,
        optimalHour: 10,
        optimalDayOfWeek: 2,
        recommendations: ['Trade on Tuesdays around 10 AM']
      };

      mockSessionAnalyticsService.getOptimalSessionTiming.mockResolvedValue(mockTiming);

      const response = await request(app)
        .get(`/api/v1/analytics/timing/${userId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockTiming);
    });

    it('should handle insufficient data error', async () => {
      const userId = 'test-user-id';
      mockSessionAnalyticsService.getOptimalSessionTiming.mockRejectedValue(
        new Error('Insufficient data for timing analysis')
      );

      const response = await request(app)
        .get(`/api/v1/analytics/timing/${userId}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient historical data for timing analysis. At least 10 completed sessions are required.');
    });
  });

  describe('POST /api/v1/analytics/prediction', () => {
    it('should return session outcome prediction', async () => {
      const sessionParams = {
        userId: 'test-user-id',
        durationMinutes: 120,
        lossLimitAmount: 50
      };

      const mockPrediction = {
        userId: 'test-user-id',
        predictedPnL: 45.75,
        successProbability: 72.5,
        riskScore: 35.2
      };

      mockSessionAnalyticsService.predictSessionOutcome.mockResolvedValue(mockPrediction);

      const response = await request(app)
        .post('/api/v1/analytics/prediction')
        .send(sessionParams)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPrediction);
    });

    it('should validate required fields', async () => {
      const invalidParams = {
        userId: '',
        durationMinutes: 0,
        lossLimitAmount: -1
      };

      const response = await request(app)
        .post('/api/v1/analytics/prediction')
        .send(invalidParams)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/v1/analytics/dashboard/:userId', () => {
    it('should return comprehensive dashboard data', async () => {
      const userId = 'test-user-id';
      
      const mockRealTimeMetrics = [{ sessionId: 'session-1', currentPnL: 100 }];
      const mockSessionAnalytics = { totalSessions: 5, winRate: 80 };
      const mockPerformanceComparison = { outperformanceScore: 85 };
      const mockOptimalTiming = { optimalHour: 10 };

      mockSessionAnalyticsService.getRealTimeMetrics.mockResolvedValue(mockRealTimeMetrics);
      mockSessionAnalyticsService.getSessionAnalytics.mockResolvedValue(mockSessionAnalytics);
      mockSessionAnalyticsService.comparePerformance.mockResolvedValue(mockPerformanceComparison);
      mockSessionAnalyticsService.getOptimalSessionTiming.mockResolvedValue(mockOptimalTiming);

      const response = await request(app)
        .get(`/api/v1/analytics/dashboard/${userId}`)
        .query({ period: 'monthly' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('realTimeMetrics');
      expect(response.body.data).toHaveProperty('sessionAnalytics');
      expect(response.body.data).toHaveProperty('performanceComparison');
      expect(response.body.data).toHaveProperty('optimalTiming');
      expect(response.body.data.period).toBe('monthly');
    });

    it('should handle partial failures gracefully', async () => {
      const userId = 'test-user-id';
      
      mockSessionAnalyticsService.getRealTimeMetrics.mockResolvedValue([]);
      mockSessionAnalyticsService.getSessionAnalytics.mockResolvedValue({ totalSessions: 0 });
      mockSessionAnalyticsService.comparePerformance.mockRejectedValue(new Error('No comparison data'));
      mockSessionAnalyticsService.getOptimalSessionTiming.mockRejectedValue(new Error('Insufficient data'));

      const response = await request(app)
        .get(`/api/v1/analytics/dashboard/${userId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.realTimeMetrics).toEqual([]);
      expect(response.body.data.performanceComparison).toBeNull();
      expect(response.body.data.optimalTiming).toBeNull();
    });
  });
});
