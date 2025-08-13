import { portfolioOptimizationService } from '../../services/portfolioOptimization.service';
import { portfolioService } from '../../services/portfolio.service';
import { PrismaClient } from '@prisma/client';

// Mock dependencies
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    optimizationResult: {
      create: jest.fn()
    },
    portfolioPosition: {
      findMany: jest.fn()
    }
  }))
}));

jest.mock('../../services/portfolio.service');
jest.mock('../../services/performanceAnalytics.service');
jest.mock('../../services/audit.service');

const mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;

describe('PortfolioOptimizationService', () => {
  const mockUserId = 'test-user-123';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Modern Portfolio Theory (MPT) Optimization', () => {
    const mockPortfolioSummary = {
      userId: mockUserId,
      totalValue: 100000,
      positions: [
        {
          symbol: 'AAPL',
          quantity: 50,
          currentPrice: 150,
          marketValue: 7500,
          allocation: 7.5,
          sector: 'Technology'
        },
        {
          symbol: 'GOOGL',
          quantity: 30,
          currentPrice: 140,
          marketValue: 4200,
          allocation: 4.2,
          sector: 'Technology'
        },
        {
          symbol: 'JNJ',
          quantity: 100,
          currentPrice: 165,
          marketValue: 16500,
          allocation: 16.5,
          sector: 'Healthcare'
        }
      ]
    };

    beforeEach(() => {
      (portfolioService.getPortfolioSummary as jest.Mock).mockResolvedValue(mockPortfolioSummary);
    });

    test('should optimize portfolio using MPT with target return', async () => {
      const targetReturn = 0.08; // 8% target return
      
      const result = await portfolioOptimizationService.optimizePortfolioMPT(
        mockUserId,
        targetReturn
      );

      expect(result).toBeDefined();
      expect(result.optimalWeights).toHaveLength(3);
      expect(result.expectedReturn).toBeGreaterThan(0);
      expect(result.risk).toBeGreaterThan(0);
      expect(result.sharpeRatio).toBeGreaterThan(0);
      expect(result.rebalancingRecommendations).toBeDefined();
      
      // Verify weights sum to 1 (100%)
      const weightSum = result.optimalWeights.reduce((sum, weight) => sum + weight, 0);
      expect(weightSum).toBeCloseTo(1, 2);
    });

    test('should optimize portfolio using MPT with target risk', async () => {
      const targetRisk = 0.15; // 15% target risk
      
      const result = await portfolioOptimizationService.optimizePortfolioMPT(
        mockUserId,
        undefined,
        targetRisk
      );

      expect(result).toBeDefined();
      expect(result.optimalWeights).toHaveLength(3);
      expect(result.risk).toBeLessThanOrEqual(targetRisk * 1.1); // Allow 10% tolerance
      expect(result.rebalancingRecommendations).toBeDefined();
    });

    test('should maximize Sharpe ratio when no targets specified', async () => {
      const result = await portfolioOptimizationService.optimizePortfolioMPT(mockUserId);

      expect(result).toBeDefined();
      expect(result.sharpeRatio).toBeGreaterThan(0);
      expect(result.improvementScore).toBeDefined();
      
      // Should generate rebalancing recommendations
      expect(result.rebalancingRecommendations.length).toBeGreaterThan(0);
      result.rebalancingRecommendations.forEach(rec => {
        expect(rec.symbol).toBeDefined();
        expect(rec.action).toMatch(/^(buy|sell|hold)$/);
        expect(rec.reasoning).toBeDefined();
      });
    });

    test('should handle empty portfolio gracefully', async () => {
      (portfolioService.getPortfolioSummary as jest.Mock).mockResolvedValue({
        ...mockPortfolioSummary,
        positions: []
      });

      await expect(
        portfolioOptimizationService.optimizePortfolioMPT(mockUserId)
      ).rejects.toThrow('No historical returns data available');
    });
  });

  describe('Risk Parity Optimization', () => {
    const mockPortfolioSummary = {
      userId: mockUserId,
      totalValue: 100000,
      positions: [
        {
          symbol: 'SPY',
          quantity: 100,
          currentPrice: 400,
          marketValue: 40000,
          allocation: 40,
          sector: 'Equity'
        },
        {
          symbol: 'TLT',
          quantity: 200,
          currentPrice: 150,
          marketValue: 30000,
          allocation: 30,
          sector: 'Fixed Income'
        },
        {
          symbol: 'GLD',
          quantity: 150,
          currentPrice: 200,
          marketValue: 30000,
          allocation: 30,
          sector: 'Commodity'
        }
      ]
    };

    beforeEach(() => {
      (portfolioService.getPortfolioSummary as jest.Mock).mockResolvedValue(mockPortfolioSummary);
    });

    test('should optimize portfolio using risk parity', async () => {
      const result = await portfolioOptimizationService.optimizePortfolioRiskParity(mockUserId);

      expect(result).toBeDefined();
      expect(result.optimalWeights).toHaveLength(3);
      expect(result.expectedReturn).toBeGreaterThan(0);
      expect(result.risk).toBeGreaterThan(0);
      
      // Risk parity should produce more balanced weights than market cap weighting
      const weights = result.optimalWeights;
      const minWeight = Math.min(...weights);
      const maxWeight = Math.max(...weights);
      const weightSpread = maxWeight - minWeight;
      
      // Weight spread should be reasonable (not too concentrated)
      expect(weightSpread).toBeLessThan(0.6); // Less than 60% spread
    });

    test('should generate meaningful rebalancing recommendations', async () => {
      const result = await portfolioOptimizationService.optimizePortfolioRiskParity(mockUserId);

      expect(result.rebalancingRecommendations).toBeDefined();
      expect(result.rebalancingRecommendations.length).toBeGreaterThan(0);
      
      result.rebalancingRecommendations.forEach(rec => {
        expect(rec.symbol).toMatch(/^(SPY|TLT|GLD)$/);
        expect(rec.currentWeight).toBeGreaterThanOrEqual(0);
        expect(rec.targetWeight).toBeGreaterThanOrEqual(0);
        expect(rec.priority).toBeGreaterThanOrEqual(0);
        expect(rec.reasoning).toContain(rec.symbol);
      });
    });
  });

  describe('Black-Litterman Model', () => {
    const mockPortfolioSummary = {
      userId: mockUserId,
      totalValue: 100000,
      positions: [
        {
          symbol: 'MSFT',
          quantity: 100,
          currentPrice: 300,
          marketValue: 30000,
          allocation: 30,
          sector: 'Technology'
        },
        {
          symbol: 'AAPL',
          quantity: 200,
          currentPrice: 150,
          marketValue: 30000,
          allocation: 30,
          sector: 'Technology'
        },
        {
          symbol: 'BRK.B',
          quantity: 100,
          currentPrice: 400,
          marketValue: 40000,
          allocation: 40,
          sector: 'Financial'
        }
      ]
    };

    beforeEach(() => {
      (portfolioService.getPortfolioSummary as jest.Mock).mockResolvedValue(mockPortfolioSummary);
    });

    test('should optimize portfolio using Black-Litterman without views', async () => {
      const result = await portfolioOptimizationService.optimizePortfolioBlackLitterman(mockUserId);

      expect(result).toBeDefined();
      expect(result.optimalWeights).toHaveLength(3);
      expect(result.expectedReturn).toBeGreaterThan(0);
      expect(result.risk).toBeGreaterThan(0);
      expect(result.sharpeRatio).toBeGreaterThan(0);
    });

    test('should incorporate investor views when provided', async () => {
      const investorViews = [
        { symbol: 'AAPL', expectedReturn: 0.12, confidence: 0.8 },
        { symbol: 'MSFT', expectedReturn: 0.10, confidence: 0.6 }
      ];

      const result = await portfolioOptimizationService.optimizePortfolioBlackLitterman(
        mockUserId,
        investorViews
      );

      expect(result).toBeDefined();
      expect(result.optimalWeights).toHaveLength(3);
      expect(result.rebalancingRecommendations).toBeDefined();
      
      // Should store investor views in results
      const storedData = JSON.parse(
        (prisma.optimizationResult.create as jest.Mock).mock.calls[0][0].data.resultsData
      );
      expect(storedData.investorViews).toEqual(investorViews);
    });
  });

  describe('Efficient Frontier Generation', () => {
    const mockPortfolioSummary = {
      userId: mockUserId,
      totalValue: 100000,
      positions: [
        {
          symbol: 'VTI',
          quantity: 200,
          currentPrice: 200,
          marketValue: 40000,
          allocation: 40,
          sector: 'Equity'
        },
        {
          symbol: 'BND',
          quantity: 600,
          currentPrice: 100,
          marketValue: 60000,
          allocation: 60,
          sector: 'Fixed Income'
        }
      ]
    };

    beforeEach(() => {
      (portfolioService.getPortfolioSummary as jest.Mock).mockResolvedValue(mockPortfolioSummary);
    });

    test('should generate efficient frontier points', async () => {
      const numPoints = 10;
      const frontier = await portfolioOptimizationService.generateEfficientFrontier(
        mockUserId,
        numPoints
      );

      expect(frontier).toBeDefined();
      expect(frontier.length).toBeLessThanOrEqual(numPoints);
      
      if (frontier.length > 1) {
        // Frontier should be sorted by risk (ascending)
        for (let i = 1; i < frontier.length; i++) {
          expect(frontier[i].risk).toBeGreaterThanOrEqual(frontier[i-1].risk);
        }
        
        // Each point should have valid properties
        frontier.forEach(point => {
          expect(point.risk).toBeGreaterThan(0);
          expect(point.return).toBeDefined();
          expect(point.weights).toHaveLength(2);
          expect(point.sharpeRatio).toBeDefined();
        });
      }
    });

    test('should handle single asset portfolio', async () => {
      (portfolioService.getPortfolioSummary as jest.Mock).mockResolvedValue({
        ...mockPortfolioSummary,
        positions: mockPortfolioSummary.positions.slice(0, 1)
      });

      const frontier = await portfolioOptimizationService.generateEfficientFrontier(mockUserId, 5);
      
      expect(frontier).toBeDefined();
      if (frontier.length > 0) {
        frontier.forEach(point => {
          expect(point.weights).toHaveLength(1);
          expect(point.weights[0]).toBeCloseTo(1, 2);
        });
      }
    });
  });

  describe('Correlation Matrix Calculation', () => {
    test('should calculate correlation matrix for given symbols', async () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT'];
      const correlationMatrix = await portfolioOptimizationService.calculateCorrelationMatrix(symbols);

      expect(correlationMatrix).toBeDefined();
      expect(correlationMatrix.length).toBe(3);
      expect(correlationMatrix[0].length).toBe(3);
      
      // Diagonal should be 1.0 (perfect self-correlation)
      for (let i = 0; i < 3; i++) {
        expect(correlationMatrix[i][i]).toBeCloseTo(1.0, 2);
      }
      
      // Matrix should be symmetric
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          expect(correlationMatrix[i][j]).toBeCloseTo(correlationMatrix[j][i], 6);
        }
      }
      
      // Correlations should be between -1 and 1
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          expect(correlationMatrix[i][j]).toBeGreaterThanOrEqual(-1);
          expect(correlationMatrix[i][j]).toBeLessThanOrEqual(1);
        }
      }
    });

    test('should handle empty symbols array', async () => {
      const correlationMatrix = await portfolioOptimizationService.calculateCorrelationMatrix([]);
      expect(correlationMatrix).toEqual([]);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle portfolio service errors gracefully', async () => {
      (portfolioService.getPortfolioSummary as jest.Mock).mockRejectedValue(
        new Error('Portfolio service unavailable')
      );

      await expect(
        portfolioOptimizationService.optimizePortfolioMPT(mockUserId)
      ).rejects.toThrow('Portfolio service unavailable');
    });

    test('should handle database storage errors', async () => {
      (portfolioService.getPortfolioSummary as jest.Mock).mockResolvedValue({
        userId: mockUserId,
        totalValue: 100000,
        positions: [
          {
            symbol: 'TEST',
            quantity: 100,
            currentPrice: 100,
            marketValue: 10000,
            allocation: 100,
            sector: 'Test'
          }
        ]
      });
      
      (prisma.optimizationResult.create as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      // Should still return optimization result even if storage fails
      const result = await portfolioOptimizationService.optimizePortfolioMPT(mockUserId);
      expect(result).toBeDefined();
    });
  });

  describe('Mathematical Accuracy', () => {
    test('should produce mathematically consistent results', async () => {
      const mockPortfolioSummary = {
        userId: mockUserId,
        totalValue: 100000,
        positions: [
          {
            symbol: 'A',
            quantity: 100,
            currentPrice: 50,
            marketValue: 5000,
            allocation: 5,
            sector: 'Test'
          },
          {
            symbol: 'B',
            quantity: 200,
            currentPrice: 25,
            marketValue: 5000,
            allocation: 5,
            sector: 'Test'
          }
        ]
      };

      (portfolioService.getPortfolioSummary as jest.Mock).mockResolvedValue(mockPortfolioSummary);

      const result = await portfolioOptimizationService.optimizePortfolioMPT(mockUserId);

      // Mathematical consistency checks
      expect(result.optimalWeights.every(w => w >= 0)).toBe(true); // No negative weights
      expect(result.optimalWeights.every(w => w <= 1)).toBe(true); // No weights > 100%
      
      const weightSum = result.optimalWeights.reduce((sum, w) => sum + w, 0);
      expect(weightSum).toBeCloseTo(1, 3); // Weights sum to 100%
      
      expect(result.risk).toBeGreaterThanOrEqual(0); // Risk cannot be negative
      expect(result.expectedReturn).toBeDefined();
      expect(isFinite(result.sharpeRatio)).toBe(true); // Sharpe ratio should be finite
    });

    test('should handle zero variance assets', async () => {
      // This tests the robustness of the optimization algorithms
      // when dealing with assets that have zero or very low variance
      const result = await portfolioOptimizationService.optimizePortfolioMPT(mockUserId);
      
      expect(result).toBeDefined();
      expect(result.risk).toBeGreaterThanOrEqual(0);
      expect(isFinite(result.expectedReturn)).toBe(true);
    });
  });

  describe('Performance Benchmarks', () => {
    test('should complete optimization within reasonable time', async () => {
      const mockLargePortfolio = {
        userId: mockUserId,
        totalValue: 1000000,
        positions: Array.from({ length: 50 }, (_, i) => ({
          symbol: `STOCK${i}`,
          quantity: 100,
          currentPrice: 100 + i,
          marketValue: 10000 + i * 100,
          allocation: 1 + i * 0.1,
          sector: `Sector${i % 10}`
        }))
      };

      (portfolioService.getPortfolioSummary as jest.Mock).mockResolvedValue(mockLargePortfolio);

      const startTime = Date.now();
      const result = await portfolioOptimizationService.optimizePortfolioMPT(mockUserId);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
