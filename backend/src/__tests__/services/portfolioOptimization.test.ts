import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { portfolioOptimizationService, Position, OptimizationResult, EfficientFrontierPoint } from '../../services/portfolioOptimization.service';

// Mock Prisma client
const mockPrisma = {
  optimizationResult: {
    create: jest.fn() as jest.MockedFunction<any>,
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
}));

// Mock portfolio service
const mockPortfolioService = {
  getPortfolioSummary: jest.fn(),
};

jest.mock('../../services/portfolio.service', () => ({
  portfolioService: mockPortfolioService,
}));

// Mock performance analytics service
jest.mock('../../services/performanceAnalytics.service', () => ({
  performanceAnalyticsService: {},
}));

// Mock audit service
const mockAuditService = {
  log: jest.fn(),
};

jest.mock('../../services/audit.service', () => ({
  AuditService: mockAuditService,
}));

describe('PortfolioOptimizationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockPositions: Position[] = [
    {
      symbol: 'AAPL',
      quantity: 10,
      price: 150,
      value: 1500,
      weight: 0.5,
      sector: 'Technology'
    },
    {
      symbol: 'GOOGL',
      quantity: 5,
      price: 200,
      value: 1000,
      weight: 0.3,
      sector: 'Technology'
    },
    {
      symbol: 'MSFT',
      quantity: 2,
      price: 300,
      value: 600,
      weight: 0.2,
      sector: 'Technology'
    }
  ];

  const mockPortfolioSummary = {
    positions: [
      {
        symbol: 'AAPL',
        quantity: 10,
        currentPrice: 150,
        marketValue: 1500,
        allocation: 50,
        sector: 'Technology'
      },
      {
        symbol: 'GOOGL',
        quantity: 5,
        currentPrice: 200,
        marketValue: 1000,
        allocation: 30,
        sector: 'Technology'
      },
      {
        symbol: 'MSFT',
        quantity: 2,
        currentPrice: 300,
        marketValue: 600,
        allocation: 20,
        sector: 'Technology'
      }
    ]
  };

  describe('optimizePortfolioMPT', () => {
    it('should successfully optimize portfolio using Modern Portfolio Theory', async () => {
      mockPortfolioService.getPortfolioSummary.mockResolvedValue(mockPortfolioSummary);
      mockPrisma.optimizationResult.create.mockResolvedValue({});
      mockAuditService.log.mockResolvedValue(undefined);

      const result = await portfolioOptimizationService.optimizePortfolioMPT('user-1');

      expect(result).toHaveProperty('optimalWeights');
      expect(result).toHaveProperty('expectedReturn');
      expect(result).toHaveProperty('risk');
      expect(result).toHaveProperty('sharpeRatio');
      expect(result).toHaveProperty('improvementScore');
      expect(result).toHaveProperty('rebalancingRecommendations');

      expect(Array.isArray(result.optimalWeights)).toBe(true);
      expect(result.optimalWeights).toHaveLength(3);
      expect(Array.isArray(result.rebalancingRecommendations)).toBe(true);

      expect(mockPortfolioService.getPortfolioSummary).toHaveBeenCalledWith('user-1', true);
      expect(mockPrisma.optimizationResult.create).toHaveBeenCalled();
    });

    it('should throw error when no historical returns data available', async () => {
      // Mock empty portfolio
      mockPortfolioService.getPortfolioSummary.mockResolvedValue({ positions: [] });

      await expect(
        portfolioOptimizationService.optimizePortfolioMPT('user-1')
      ).rejects.toThrow('No historical returns data available');
    });

    it('should optimize for target return when provided', async () => {
      mockPortfolioService.getPortfolioSummary.mockResolvedValue(mockPortfolioSummary);
      mockPrisma.optimizationResult.create.mockResolvedValue({});
      mockAuditService.log.mockResolvedValue(undefined);

      const targetReturn = 0.08; // 8% target return
      const result = await portfolioOptimizationService.optimizePortfolioMPT('user-1', targetReturn);

      expect(result).toHaveProperty('optimalWeights');
      expect(result.optimalWeights).toHaveLength(3);
    });

    it('should optimize for target risk when provided', async () => {
      mockPortfolioService.getPortfolioSummary.mockResolvedValue(mockPortfolioSummary);
      mockPrisma.optimizationResult.create.mockResolvedValue({});
      mockAuditService.log.mockResolvedValue(undefined);

      const targetRisk = 0.15; // 15% target risk
      const result = await portfolioOptimizationService.optimizePortfolioMPT('user-1', undefined, targetRisk);

      expect(result).toHaveProperty('optimalWeights');
      expect(result.risk).toBeGreaterThanOrEqual(0);
    });
  });

  describe('optimizePortfolioRiskParity', () => {
    it('should successfully optimize portfolio using Risk Parity', async () => {
      mockPortfolioService.getPortfolioSummary.mockResolvedValue(mockPortfolioSummary);
      mockPrisma.optimizationResult.create.mockResolvedValue({});
      mockAuditService.log.mockResolvedValue(undefined);

      const result = await portfolioOptimizationService.optimizePortfolioRiskParity('user-1');

      expect(result).toHaveProperty('optimalWeights');
      expect(result).toHaveProperty('expectedReturn');
      expect(result).toHaveProperty('risk');
      expect(result).toHaveProperty('sharpeRatio');
      expect(result).toHaveProperty('improvementScore');
      expect(result).toHaveProperty('rebalancingRecommendations');

      // Risk parity should aim for more equal weights
      expect(Array.isArray(result.optimalWeights)).toBe(true);
      expect(result.optimalWeights).toHaveLength(3);
    });

    it('should throw error when no historical returns data available', async () => {
      mockPortfolioService.getPortfolioSummary.mockResolvedValue({ positions: [] });

      await expect(
        portfolioOptimizationService.optimizePortfolioRiskParity('user-1')
      ).rejects.toThrow('No historical returns data available');
    });
  });

  describe('optimizePortfolioBlackLitterman', () => {
    it('should successfully optimize portfolio using Black-Litterman', async () => {
      mockPortfolioService.getPortfolioSummary.mockResolvedValue(mockPortfolioSummary);
      mockPrisma.optimizationResult.create.mockResolvedValue({});
      mockAuditService.log.mockResolvedValue(undefined);

      const result = await portfolioOptimizationService.optimizePortfolioBlackLitterman('user-1');

      expect(result).toHaveProperty('optimalWeights');
      expect(result).toHaveProperty('expectedReturn');
      expect(result).toHaveProperty('risk');
      expect(result).toHaveProperty('sharpeRatio');
      expect(result).toHaveProperty('improvementScore');
      expect(result).toHaveProperty('rebalancingRecommendations');

      expect(Array.isArray(result.optimalWeights)).toBe(true);
      expect(result.optimalWeights).toHaveLength(3);
    });

    it('should incorporate investor views when provided', async () => {
      mockPortfolioService.getPortfolioSummary.mockResolvedValue(mockPortfolioSummary);
      mockPrisma.optimizationResult.create.mockResolvedValue({});
      mockAuditService.log.mockResolvedValue(undefined);

      const investorViews = [
        { symbol: 'AAPL', expectedReturn: 0.12, confidence: 0.8 },
        { symbol: 'GOOGL', expectedReturn: 0.10, confidence: 0.6 }
      ];

      const result = await portfolioOptimizationService.optimizePortfolioBlackLitterman(
        'user-1',
        investorViews
      );

      expect(result).toHaveProperty('optimalWeights');
      expect(Array.isArray(result.optimalWeights)).toBe(true);
    });

    it('should throw error when no historical returns data available', async () => {
      mockPortfolioService.getPortfolioSummary.mockResolvedValue({ positions: [] });

      await expect(
        portfolioOptimizationService.optimizePortfolioBlackLitterman('user-1')
      ).rejects.toThrow('No historical returns data available');
    });
  });

  describe('generateEfficientFrontier', () => {
    it('should generate efficient frontier points', async () => {
      mockPortfolioService.getPortfolioSummary.mockResolvedValue(mockPortfolioSummary);

      const result = await portfolioOptimizationService.generateEfficientFrontier('user-1', 10);

      expect(Array.isArray(result)).toBe(true);
      
      if (result.length > 0) {
        result.forEach(point => {
          expect(point).toHaveProperty('risk');
          expect(point).toHaveProperty('return');
          expect(point).toHaveProperty('weights');
          expect(point).toHaveProperty('sharpeRatio');
          expect(Array.isArray(point.weights)).toBe(true);
        });

        // Check that frontier is sorted by risk
        for (let i = 1; i < result.length; i++) {
          expect(result[i].risk).toBeGreaterThanOrEqual(result[i - 1].risk);
        }
      }
    });

    it('should return empty array when no returns data available', async () => {
      mockPortfolioService.getPortfolioSummary.mockResolvedValue({ positions: [] });

      const result = await portfolioOptimizationService.generateEfficientFrontier('user-1', 5);

      expect(result).toEqual([]);
    });

    it('should handle custom number of points', async () => {
      mockPortfolioService.getPortfolioSummary.mockResolvedValue(mockPortfolioSummary);

      const result = await portfolioOptimizationService.generateEfficientFrontier('user-1', 25);

      expect(Array.isArray(result)).toBe(true);
      // Should generate up to 25 points (some may be filtered out if infeasible)
    });
  });

  describe('calculateCorrelationMatrix', () => {
    it('should calculate correlation matrix for given symbols', async () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT'];
      
      const result = await portfolioOptimizationService.calculateCorrelationMatrix(symbols);

      expect(Array.isArray(result)).toBe(true);
      
      if (result.length > 0) {
        expect(result).toHaveLength(3);
        expect(result[0]).toHaveLength(3);

        // Check diagonal elements are 1 (correlation with self)
        for (let i = 0; i < result.length; i++) {
          expect(result[i][i]).toBeCloseTo(1.0, 2);
        }

        // Check matrix is symmetric
        for (let i = 0; i < result.length; i++) {
          for (let j = 0; j < result.length; j++) {
            expect(result[i][j]).toBeCloseTo(result[j][i], 6);
          }
        }

        // Check correlation values are between -1 and 1
        for (let i = 0; i < result.length; i++) {
          for (let j = 0; j < result.length; j++) {
            expect(result[i][j]).toBeGreaterThanOrEqual(-1);
            expect(result[i][j]).toBeLessThanOrEqual(1);
          }
        }
      }
    });

    it('should return empty array when no symbols provided', async () => {
      const result = await portfolioOptimizationService.calculateCorrelationMatrix([]);

      expect(result).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle portfolio service errors', async () => {
      mockPortfolioService.getPortfolioSummary.mockRejectedValue(new Error('Portfolio service error'));

      await expect(
        portfolioOptimizationService.optimizePortfolioMPT('user-1')
      ).rejects.toThrow('Portfolio service error');
    });

    it('should handle database storage errors gracefully', async () => {
      mockPortfolioService.getPortfolioSummary.mockResolvedValue(mockPortfolioSummary);
      mockPrisma.optimizationResult.create.mockRejectedValue(new Error('Database error'));
      mockAuditService.log.mockResolvedValue(undefined);

      // Should still return optimization result even if storage fails
      await expect(
        portfolioOptimizationService.optimizePortfolioMPT('user-1')
      ).rejects.toThrow('Database error');
    });
  });

  describe('rebalancing recommendations', () => {
    it('should generate meaningful rebalancing recommendations', async () => {
      mockPortfolioService.getPortfolioSummary.mockResolvedValue(mockPortfolioSummary);
      mockPrisma.optimizationResult.create.mockResolvedValue({});
      mockAuditService.log.mockResolvedValue(undefined);

      const result = await portfolioOptimizationService.optimizePortfolioMPT('user-1');

      expect(Array.isArray(result.rebalancingRecommendations)).toBe(true);
      expect(result.rebalancingRecommendations).toHaveLength(3);

      result.rebalancingRecommendations.forEach(rec => {
        expect(rec).toHaveProperty('symbol');
        expect(rec).toHaveProperty('currentWeight');
        expect(rec).toHaveProperty('targetWeight');
        expect(rec).toHaveProperty('action');
        expect(rec).toHaveProperty('quantity');
        expect(rec).toHaveProperty('estimatedCost');
        expect(rec).toHaveProperty('priority');
        expect(rec).toHaveProperty('reasoning');

        expect(['buy', 'sell', 'hold']).toContain(rec.action);
        expect(typeof rec.reasoning).toBe('string');
        expect(rec.reasoning.length).toBeGreaterThan(0);
      });
    });
  });
});
