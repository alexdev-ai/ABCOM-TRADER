import request from 'supertest';
import express from 'express';
import portfolioOptimizationRoutes from '../../routes/portfolioOptimization.routes';
import { portfolioOptimizationService } from '../../services/portfolioOptimization.service';

// Mock the service
jest.mock('../../services/portfolioOptimization.service');

const app = express();
app.use(express.json());
app.use('/api/portfolio-optimization', portfolioOptimizationRoutes);

describe('Portfolio Optimization Routes', () => {
  const mockUserId = 'test-user-123';
  const mockAuthMiddleware = (req: any, res: any, next: any) => {
    req.user = { id: mockUserId };
    next();
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/portfolio-optimization/analysis', () => {
    const mockOptimizationResult = {
      optimalWeights: [0.4, 0.3, 0.3],
      expectedReturn: 0.08,
      risk: 0.12,
      sharpeRatio: 0.67,
      improvementScore: 0.15,
      rebalancingRecommendations: [
        {
          symbol: 'AAPL',
          currentWeight: 0.35,
          targetWeight: 0.40,
          action: 'buy' as const,
          quantity: 10,
          estimatedCost: 1500,
          priority: 0.8,
          reasoning: 'Increase allocation for better diversification'
        }
      ]
    };

    test('should return portfolio analysis for authenticated user', async () => {
      (portfolioOptimizationService.optimizePortfolioMPT as jest.Mock)
        .mockResolvedValue(mockOptimizationResult);

      const response = await request(app)
        .get('/api/portfolio-optimization/analysis')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockOptimizationResult);
      expect(portfolioOptimizationService.optimizePortfolioMPT).toHaveBeenCalledWith(mockUserId);
    });

    test('should handle service errors gracefully', async () => {
      (portfolioOptimizationService.optimizePortfolioMPT as jest.Mock)
        .mockRejectedValue(new Error('Portfolio service unavailable'));

      const response = await request(app)
        .get('/api/portfolio-optimization/analysis')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Portfolio service unavailable');
    });

    test('should return 401 for unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/portfolio-optimization/analysis')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('authentication');
    });
  });

  describe('POST /api/portfolio-optimization/optimize', () => {
    const mockOptimizeRequest = {
      method: 'mpt',
      targetReturn: 0.08,
      targetRisk: 0.15
    };

    test('should run MPT optimization with parameters', async () => {
      const mockResult = {
        optimalWeights: [0.5, 0.3, 0.2],
        expectedReturn: 0.08,
        risk: 0.14,
        sharpeRatio: 0.71,
        improvementScore: 0.20,
        rebalancingRecommendations: []
      };

      (portfolioOptimizationService.optimizePortfolioMPT as jest.Mock)
        .mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/portfolio-optimization/optimize')
        .set('Authorization', 'Bearer valid-token')
        .send(mockOptimizeRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
      expect(portfolioOptimizationService.optimizePortfolioMPT)
        .toHaveBeenCalledWith(mockUserId, 0.08, 0.15);
    });

    test('should run risk parity optimization', async () => {
      const mockRequest = { method: 'risk_parity' };
      const mockResult = {
        optimalWeights: [0.33, 0.33, 0.34],
        expectedReturn: 0.07,
        risk: 0.11,
        sharpeRatio: 0.64,
        improvementScore: 0.12,
        rebalancingRecommendations: []
      };

      (portfolioOptimizationService.optimizePortfolioRiskParity as jest.Mock)
        .mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/portfolio-optimization/optimize')
        .set('Authorization', 'Bearer valid-token')
        .send(mockRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(portfolioOptimizationService.optimizePortfolioRiskParity)
        .toHaveBeenCalledWith(mockUserId);
    });

    test('should run Black-Litterman optimization with views', async () => {
      const mockRequest = {
        method: 'black_litterman',
        investorViews: [
          { symbol: 'AAPL', expectedReturn: 0.12, confidence: 0.8 }
        ]
      };

      const mockResult = {
        optimalWeights: [0.45, 0.35, 0.20],
        expectedReturn: 0.09,
        risk: 0.13,
        sharpeRatio: 0.69,
        improvementScore: 0.18,
        rebalancingRecommendations: []
      };

      (portfolioOptimizationService.optimizePortfolioBlackLitterman as jest.Mock)
        .mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/portfolio-optimization/optimize')
        .set('Authorization', 'Bearer valid-token')
        .send(mockRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(portfolioOptimizationService.optimizePortfolioBlackLitterman)
        .toHaveBeenCalledWith(mockUserId, mockRequest.investorViews);
    });

    test('should validate request parameters', async () => {
      const invalidRequest = {
        method: 'invalid_method'
      };

      const response = await request(app)
        .post('/api/portfolio-optimization/optimize')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid optimization method');
    });
  });

  describe('GET /api/portfolio-optimization/efficient-frontier', () => {
    test('should generate efficient frontier points', async () => {
      const mockFrontier = [
        { risk: 0.10, return: 0.06, weights: [0.6, 0.4], sharpeRatio: 0.60 },
        { risk: 0.12, return: 0.07, weights: [0.5, 0.5], sharpeRatio: 0.58 },
        { risk: 0.15, return: 0.08, weights: [0.4, 0.6], sharpeRatio: 0.53 }
      ];

      (portfolioOptimizationService.generateEfficientFrontier as jest.Mock)
        .mockResolvedValue(mockFrontier);

      const response = await request(app)
        .get('/api/portfolio-optimization/efficient-frontier')
        .query({ numPoints: '10' })
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockFrontier);
      expect(portfolioOptimizationService.generateEfficientFrontier)
        .toHaveBeenCalledWith(mockUserId, 10);
    });

    test('should use default number of points if not specified', async () => {
      (portfolioOptimizationService.generateEfficientFrontier as jest.Mock)
        .mockResolvedValue([]);

      await request(app)
        .get('/api/portfolio-optimization/efficient-frontier')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(portfolioOptimizationService.generateEfficientFrontier)
        .toHaveBeenCalledWith(mockUserId, 50); // Default value
    });
  });

  describe('GET /api/portfolio-optimization/correlation-matrix', () => {
    test('should return correlation matrix for portfolio assets', async () => {
      const mockMatrix = [
        [1.0, 0.75, 0.60],
        [0.75, 1.0, 0.65],
        [0.60, 0.65, 1.0]
      ];

      (portfolioOptimizationService.calculateCorrelationMatrix as jest.Mock)
        .mockResolvedValue(mockMatrix);

      const response = await request(app)
        .get('/api/portfolio-optimization/correlation-matrix')
        .query({ symbols: 'AAPL,GOOGL,MSFT' })
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockMatrix);
      expect(portfolioOptimizationService.calculateCorrelationMatrix)
        .toHaveBeenCalledWith(['AAPL', 'GOOGL', 'MSFT']);
    });

    test('should handle missing symbols parameter', async () => {
      const response = await request(app)
        .get('/api/portfolio-optimization/correlation-matrix')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('symbols parameter is required');
    });
  });

  describe('Performance and Load Tests', () => {
    test('should handle concurrent optimization requests', async () => {
      const mockResult = {
        optimalWeights: [0.5, 0.5],
        expectedReturn: 0.08,
        risk: 0.12,
        sharpeRatio: 0.67,
        improvementScore: 0.15,
        rebalancingRecommendations: []
      };

      (portfolioOptimizationService.optimizePortfolioMPT as jest.Mock)
        .mockResolvedValue(mockResult);

      // Send 5 concurrent requests
      const promises = Array(5).fill(null).map(() =>
        request(app)
          .get('/api/portfolio-optimization/analysis')
          .set('Authorization', 'Bearer valid-token')
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockResult);
      });

      expect(portfolioOptimizationService.optimizePortfolioMPT)
        .toHaveBeenCalledTimes(5);
    });

    test('should complete optimization requests within reasonable time', async () => {
      const mockResult = {
        optimalWeights: Array(50).fill(0.02), // 50 assets
        expectedReturn: 0.08,
        risk: 0.15,
        sharpeRatio: 0.53,
        improvementScore: 0.10,
        rebalancingRecommendations: []
      };

      (portfolioOptimizationService.optimizePortfolioMPT as jest.Mock)
        .mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve(mockResult), 100))
        );

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/portfolio-optimization/analysis')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      const endTime = Date.now();

      expect(response.body.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/portfolio-optimization/optimize')
        .set('Authorization', 'Bearer valid-token')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle service timeouts', async () => {
      (portfolioOptimizationService.optimizePortfolioMPT as jest.Mock)
        .mockImplementation(() => 
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Service timeout')), 100)
          )
        );

      const response = await request(app)
        .get('/api/portfolio-optimization/analysis')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Service timeout');
    });

    test('should handle large request payloads', async () => {
      const largeRequest = {
        method: 'black_litterman',
        investorViews: Array(1000).fill(null).map((_, i) => ({
          symbol: `STOCK${i}`,
          expectedReturn: 0.08 + (Math.random() - 0.5) * 0.04,
          confidence: 0.5 + Math.random() * 0.5
        }))
      };

      const mockResult = {
        optimalWeights: Array(1000).fill(0.001),
        expectedReturn: 0.08,
        risk: 0.20,
        sharpeRatio: 0.40,
        improvementScore: 0.05,
        rebalancingRecommendations: []
      };

      (portfolioOptimizationService.optimizePortfolioBlackLitterman as jest.Mock)
        .mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/portfolio-optimization/optimize')
        .set('Authorization', 'Bearer valid-token')
        .send(largeRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.optimalWeights).toHaveLength(1000);
    });
  });
});
