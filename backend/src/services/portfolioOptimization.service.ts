import { PrismaClient } from '@prisma/client';
import { portfolioService, PortfolioPosition, PortfolioSummary } from './portfolio.service';
import { performanceAnalyticsService } from './performanceAnalytics.service';
import { AuditService } from './audit.service';

const prisma = new PrismaClient();

// Types for portfolio optimization
export interface Position {
  symbol: string;
  quantity: number;
  price: number;
  value: number;
  weight: number;
  sector?: string | undefined;
}

export interface OptimizationInput {
  positions: Position[];
  returns: number[][];
  covarianceMatrix: number[][];
  riskFreeRate: number;
  constraints?: OptimizationConstraints;
}

export interface OptimizationConstraints {
  minWeight?: number;
  maxWeight?: number;
  sectorConstraints?: { [sector: string]: { min: number; max: number } };
  turnoverLimit?: number;
}

export interface OptimizationResult {
  optimalWeights: number[];
  expectedReturn: number;
  risk: number;
  sharpeRatio: number;
  improvementScore: number;
  rebalancingRecommendations: RebalancingRecommendation[];
}

export interface RebalancingRecommendation {
  symbol: string;
  currentWeight: number;
  targetWeight: number;
  action: 'buy' | 'sell' | 'hold';
  quantity: number;
  estimatedCost: number;
  priority: number;
  reasoning: string;
}

export interface EfficientFrontierPoint {
  risk: number;
  return: number;
  weights: number[];
  sharpeRatio: number;
}

class PortfolioOptimizationService {
  /**
   * Modern Portfolio Theory - Mean Variance Optimization
   * Finds optimal portfolio weights for given risk/return constraints
   */
  async optimizePortfolioMPT(
    userId: string,
    targetReturn?: number,
    targetRisk?: number
  ): Promise<OptimizationResult> {
    const positions = await this.getUserPositions(userId);
    const returns = await this.getHistoricalReturns(positions.map(p => p.symbol));
    
    if (!returns.length) {
      throw new Error('No historical returns data available');
    }
    
    const covarianceMatrix = this.calculateCovarianceMatrix(returns);
    const expectedReturns = this.calculateExpectedReturns(returns);

    const riskFreeRate = 0.02; // 2% risk-free rate (configurable)

    // Optimize using mean-variance optimization
    const optimalWeights = this.meanVarianceOptimization(
      expectedReturns,
      covarianceMatrix,
      targetReturn,
      targetRisk
    );

    const portfolioReturn = this.calculatePortfolioReturn(optimalWeights, expectedReturns);
    const portfolioRisk = this.calculatePortfolioRisk(optimalWeights, covarianceMatrix);
    const sharpeRatio = portfolioRisk > 0 ? (portfolioReturn - riskFreeRate) / portfolioRisk : 0;

    // Calculate current portfolio metrics
    const currentWeights = positions.map(p => p.weight);
    const currentReturn = this.calculatePortfolioReturn(currentWeights, expectedReturns);
    const currentRisk = this.calculatePortfolioRisk(currentWeights, covarianceMatrix);
    const currentSharpe = currentRisk > 0 ? (currentReturn - riskFreeRate) / currentRisk : 0;

    const improvementScore = currentSharpe !== 0 ? (sharpeRatio - currentSharpe) / Math.abs(currentSharpe) : 0;

    // Generate rebalancing recommendations
    const recommendations = this.generateRebalancingRecommendations(
      positions,
      optimalWeights
    );

    // Store optimization result
    await this.storeOptimizationResult(userId, {
      optimizationType: 'mpt',
      currentSharpeRatio: currentSharpe || 0,
      optimizedSharpeRatio: sharpeRatio || 0,
      currentRisk: currentRisk || 0,
      optimizedRisk: portfolioRisk || 0,
      improvementScore: improvementScore || 0,
      resultsData: JSON.stringify({
        optimalWeights,
        expectedReturn: portfolioReturn,
        recommendations
      })
    });

    return {
      optimalWeights,
      expectedReturn: portfolioReturn,
      risk: portfolioRisk,
      sharpeRatio,
      improvementScore,
      rebalancingRecommendations: recommendations
    };
  }

  /**
   * Risk Parity Optimization
   * Allocates portfolio such that each asset contributes equally to portfolio risk
   */
  async optimizePortfolioRiskParity(userId: string): Promise<OptimizationResult> {
    const positions = await this.getUserPositions(userId);
    const returns = await this.getHistoricalReturns(positions.map(p => p.symbol));
    
    if (!returns.length) {
      throw new Error('No historical returns data available');
    }
    
    const covarianceMatrix = this.calculateCovarianceMatrix(returns);
    const expectedReturns = this.calculateExpectedReturns(returns);

    // Risk parity optimization - equal risk contribution
    const optimalWeights = this.riskParityOptimization(covarianceMatrix);

    const portfolioReturn = this.calculatePortfolioReturn(optimalWeights, expectedReturns);
    const portfolioRisk = this.calculatePortfolioRisk(optimalWeights, covarianceMatrix);
    const riskFreeRate = 0.02;
    const sharpeRatio = portfolioRisk > 0 ? (portfolioReturn - riskFreeRate) / portfolioRisk : 0;

    // Calculate improvement vs current portfolio
    const currentWeights = positions.map(p => p.weight);
    const currentReturn = this.calculatePortfolioReturn(currentWeights, expectedReturns);
    const currentRisk = this.calculatePortfolioRisk(currentWeights, covarianceMatrix);
    const currentSharpe = currentRisk > 0 ? (currentReturn - riskFreeRate) / currentRisk : 0;

    const improvementScore = currentSharpe !== 0 ? (sharpeRatio - currentSharpe) / Math.abs(currentSharpe) : 0;

    const recommendations = this.generateRebalancingRecommendations(
      positions,
      optimalWeights
    );

    await this.storeOptimizationResult(userId, {
      optimizationType: 'risk_parity',
      currentSharpeRatio: currentSharpe || 0,
      optimizedSharpeRatio: sharpeRatio || 0,
      currentRisk: currentRisk || 0,
      optimizedRisk: portfolioRisk || 0,
      improvementScore: improvementScore || 0,
      resultsData: JSON.stringify({
        optimalWeights,
        expectedReturn: portfolioReturn,
        recommendations
      })
    });

    return {
      optimalWeights,
      expectedReturn: portfolioReturn,
      risk: portfolioRisk,
      sharpeRatio,
      improvementScore,
      rebalancingRecommendations: recommendations
    };
  }

  /**
   * Black-Litterman Model
   * Bayesian approach that incorporates market equilibrium and investor views
   */
  async optimizePortfolioBlackLitterman(
    userId: string,
    investorViews?: { symbol: string; expectedReturn: number; confidence: number }[]
  ): Promise<OptimizationResult> {
    const positions = await this.getUserPositions(userId);
    const returns = await this.getHistoricalReturns(positions.map(p => p.symbol));
    
    if (!returns.length) {
      throw new Error('No historical returns data available');
    }
    
    const covarianceMatrix = this.calculateCovarianceMatrix(returns);
    
    // Market equilibrium returns (reverse optimization from market cap weights)
    const marketWeights = await this.getMarketCapWeights(positions.map(p => p.symbol));
    const impliedReturns = this.calculateImpliedReturns(marketWeights, covarianceMatrix);

    // Incorporate investor views if provided
    const adjustedReturns = investorViews 
      ? this.incorporateInvestorViews(impliedReturns, investorViews, covarianceMatrix)
      : impliedReturns;

    // Optimize using adjusted returns
    const optimalWeights = this.meanVarianceOptimization(
      adjustedReturns,
      covarianceMatrix
    );

    const portfolioReturn = this.calculatePortfolioReturn(optimalWeights, adjustedReturns);
    const portfolioRisk = this.calculatePortfolioRisk(optimalWeights, covarianceMatrix);
    const riskFreeRate = 0.02;
    const sharpeRatio = portfolioRisk > 0 ? (portfolioReturn - riskFreeRate) / portfolioRisk : 0;

    const currentWeights = positions.map(p => p.weight);
    const currentReturn = this.calculatePortfolioReturn(currentWeights, adjustedReturns);
    const currentRisk = this.calculatePortfolioRisk(currentWeights, covarianceMatrix);
    const currentSharpe = currentRisk > 0 ? (currentReturn - riskFreeRate) / currentRisk : 0;

    const improvementScore = currentSharpe !== 0 ? (sharpeRatio - currentSharpe) / Math.abs(currentSharpe) : 0;

    const recommendations = this.generateRebalancingRecommendations(
      positions,
      optimalWeights
    );

    await this.storeOptimizationResult(userId, {
      optimizationType: 'black_litterman',
      currentSharpeRatio: currentSharpe || 0,
      optimizedSharpeRatio: sharpeRatio || 0,
      currentRisk: currentRisk || 0,
      optimizedRisk: portfolioRisk || 0,
      improvementScore: improvementScore || 0,
      resultsData: JSON.stringify({
        optimalWeights,
        expectedReturn: portfolioReturn,
        recommendations,
        investorViews
      })
    });

    return {
      optimalWeights,
      expectedReturn: portfolioReturn,
      risk: portfolioRisk,
      sharpeRatio,
      improvementScore,
      rebalancingRecommendations: recommendations
    };
  }

  /**
   * Generate Efficient Frontier
   * Calculate risk/return combinations for different portfolio allocations
   */
  async generateEfficientFrontier(
    userId: string,
    numPoints: number = 50
  ): Promise<EfficientFrontierPoint[]> {
    const positions = await this.getUserPositions(userId);
    const returns = await this.getHistoricalReturns(positions.map(p => p.symbol));
    
    if (!returns.length) {
      return [];
    }
    
    const covarianceMatrix = this.calculateCovarianceMatrix(returns);
    const expectedReturns = this.calculateExpectedReturns(returns);

    const minReturn = Math.min(...expectedReturns);
    const maxReturn = Math.max(...expectedReturns);
    const returnRange = maxReturn - minReturn;

    const efficientFrontier: EfficientFrontierPoint[] = [];

    for (let i = 0; i < numPoints; i++) {
      const targetReturn = minReturn + (returnRange * i) / (numPoints - 1);
      
      try {
        const weights = this.meanVarianceOptimization(
          expectedReturns,
          covarianceMatrix,
          targetReturn
        );

        const portfolioReturn = this.calculatePortfolioReturn(weights, expectedReturns);
        const portfolioRisk = this.calculatePortfolioRisk(weights, covarianceMatrix);
        const sharpeRatio = portfolioRisk > 0 ? (portfolioReturn - 0.02) / portfolioRisk : 0;

        efficientFrontier.push({
          risk: portfolioRisk,
          return: portfolioReturn,
          weights,
          sharpeRatio
        });
      } catch (error) {
        // Skip infeasible points
        continue;
      }
    }

    return efficientFrontier.sort((a, b) => a.risk - b.risk);
  }

  /**
   * Calculate correlation matrix between portfolio assets
   */
  async calculateCorrelationMatrix(symbols: string[]): Promise<number[][]> {
    const returns = await this.getHistoricalReturns(symbols);
    
    if (!returns.length) {
      return [];
    }
    
    return this.calculateCorrelationFromReturns(returns);
  }

  // Private helper methods

  private async getUserPositions(userId: string): Promise<Position[]> {
    // Use existing portfolio service to get positions
    const portfolioSummary = await portfolioService.getPortfolioSummary(userId, true);
    
    return portfolioSummary.positions.map(pos => ({
      symbol: pos.symbol,
      quantity: pos.quantity,
      price: pos.currentPrice,
      value: pos.marketValue,
      weight: pos.allocation / 100, // Convert percentage to decimal
      sector: pos.sector || undefined
    }));
  }

  private async getHistoricalReturns(symbols: string[]): Promise<number[][]> {
    // This would typically fetch from market data service
    // For now, return mock data for development
    if (!symbols.length) return [];
    
    const mockReturns: number[][] = symbols.map(() => 
      Array.from({ length: 252 }, () => (Math.random() - 0.5) * 0.04)
    );
    return mockReturns;
  }

  private calculateCovarianceMatrix(returns: number[][]): number[][] {
    const n = returns.length;
    const covariance: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        covariance[i][j] = this.calculateCovariance(returns[i], returns[j]);
      }
    }

    return covariance;
  }

  private calculateCovariance(x: number[], y: number[]): number {
    const n = x.length;
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;

    return x.reduce((sum, xi, i) => 
      sum + (xi - meanX) * (y[i] - meanY), 0
    ) / (n - 1);
  }

  private calculateExpectedReturns(returns: number[][]): number[] {
    return returns.map(assetReturns => 
      assetReturns.reduce((sum, ret) => sum + ret, 0) / assetReturns.length
    );
  }

  private calculatePortfolioReturn(weights: number[], expectedReturns: number[]): number {
    return weights.reduce((sum, weight, i) => sum + weight * expectedReturns[i], 0);
  }

  private calculatePortfolioRisk(weights: number[], covarianceMatrix: number[][]): number {
    if (!weights.length || !covarianceMatrix.length) return 0;
    
    let risk = 0;
    for (let i = 0; i < weights.length; i++) {
      for (let j = 0; j < weights.length; j++) {
        risk += weights[i] * weights[j] * covarianceMatrix[i][j];
      }
    }
    return Math.sqrt(Math.max(0, risk));
  }

  private meanVarianceOptimization(
    expectedReturns: number[],
    covarianceMatrix: number[][],
    targetReturn?: number,
    targetRisk?: number
  ): number[] {
    // Simplified implementation - in production, use optimization library like nlopt or similar
    const n = expectedReturns.length;
    
    if (targetReturn) {
      // Minimize risk for given return
      return this.minimizeRiskForReturn(expectedReturns, covarianceMatrix, targetReturn);
    } else if (targetRisk) {
      // Maximize return for given risk
      return this.maximizeReturnForRisk(expectedReturns, covarianceMatrix, targetRisk);
    } else {
      // Maximize Sharpe ratio
      return this.maximizeSharpeRatio(expectedReturns, covarianceMatrix);
    }
  }

  private minimizeRiskForReturn(
    expectedReturns: number[],
    covarianceMatrix: number[][],
    targetReturn: number
  ): number[] {
    // Simplified equal weight allocation - replace with proper quadratic programming
    const n = expectedReturns.length;
    return Array(n).fill(1 / n);
  }

  private maximizeReturnForRisk(
    expectedReturns: number[],
    covarianceMatrix: number[][],
    targetRisk: number
  ): number[] {
    // Simplified implementation
    const n = expectedReturns.length;
    return Array(n).fill(1 / n);
  }

  private maximizeSharpeRatio(
    expectedReturns: number[],
    covarianceMatrix: number[][]
  ): number[] {
    // Simplified implementation - weight by expected return / risk
    const n = expectedReturns.length;
    const weights = expectedReturns.map((ret, i) => 
      ret / Math.sqrt(covarianceMatrix[i][i])
    );
    
    const sum = weights.reduce((s, w) => s + w, 0);
    return weights.map(w => w / sum);
  }

  private riskParityOptimization(covarianceMatrix: number[][]): number[] {
    // Risk parity: equal risk contribution
    const n = covarianceMatrix.length;
    const weights = Array(n).fill(1 / n);
    
    // Iterative algorithm to achieve equal risk contribution
    for (let iter = 0; iter < 100; iter++) {
      const riskContributions = this.calculateRiskContributions(weights, covarianceMatrix);
      const avgRiskContribution = riskContributions.reduce((s, r) => s + r, 0) / n;
      
      // Adjust weights based on risk contribution deviation
      for (let i = 0; i < n; i++) {
        const adjustment = avgRiskContribution / riskContributions[i];
        weights[i] *= Math.pow(adjustment, 0.1); // Damped adjustment
      }
      
      // Normalize weights
      const sum = weights.reduce((s, w) => s + w, 0);
      for (let i = 0; i < n; i++) {
        weights[i] /= sum;
      }
    }
    
    return weights;
  }

  private calculateRiskContributions(weights: number[], covarianceMatrix: number[][]): number[] {
    const portfolioRisk = this.calculatePortfolioRisk(weights, covarianceMatrix);
    const riskContributions: number[] = [];
    
    for (let i = 0; i < weights.length; i++) {
      let marginalRisk = 0;
      for (let j = 0; j < weights.length; j++) {
        marginalRisk += weights[j] * covarianceMatrix[i][j];
      }
      riskContributions[i] = portfolioRisk > 0 ? (weights[i] * marginalRisk / portfolioRisk) : 0;
    }
    
    return riskContributions;
  }

  private async getMarketCapWeights(symbols: string[]): Promise<number[]> {
    // Mock market cap weights - in production, fetch from market data service
    const n = symbols.length;
    const weights = Array.from({ length: n }, () => Math.random());
    const sum = weights.reduce((s, w) => s + w, 0);
    return sum > 0 ? weights.map(w => w / sum) : weights;
  }

  private calculateImpliedReturns(
    marketWeights: number[],
    covarianceMatrix: number[][]
  ): number[] {
    const riskAversion = 3.0; // Typical risk aversion parameter
    const impliedReturns: number[] = [];
    
    for (let i = 0; i < marketWeights.length; i++) {
      let impliedReturn = 0;
      for (let j = 0; j < marketWeights.length; j++) {
        impliedReturn += riskAversion * covarianceMatrix[i][j] * marketWeights[j];
      }
      impliedReturns[i] = impliedReturn;
    }
    
    return impliedReturns;
  }

  private incorporateInvestorViews(
    impliedReturns: number[],
    views: { symbol: string; expectedReturn: number; confidence: number }[],
    covarianceMatrix: number[][]
  ): number[] {
    // Simplified Black-Litterman view incorporation
    // In production, implement full Black-Litterman formula
    const adjustedReturns = [...impliedReturns];
    
    views.forEach(view => {
      // Find symbol index (simplified - in production, maintain symbol-index mapping)
      const symbolIndex = 0; // Would be properly resolved
      if (symbolIndex < adjustedReturns.length) {
        const blendFactor = view.confidence / (1 + view.confidence);
        adjustedReturns[symbolIndex] = 
          blendFactor * view.expectedReturn + 
          (1 - blendFactor) * impliedReturns[symbolIndex];
      }
    });
    
    return adjustedReturns;
  }

  private calculateCorrelationFromReturns(returns: number[][]): number[][] {
    const n = returns.length;
    const correlation: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          correlation[i][j] = 1.0;
        } else {
          const covar = this.calculateCovariance(returns[i], returns[j]);
          const stdI = Math.sqrt(this.calculateVariance(returns[i]));
          const stdJ = Math.sqrt(this.calculateVariance(returns[j]));
          correlation[i][j] = covar / (stdI * stdJ);
        }
      }
    }
    
    return correlation;
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
  }

  private generateRebalancingRecommendations(
    positions: Position[],
    targetWeights: number[]
  ): RebalancingRecommendation[] {
    return positions.map((position, index) => {
      const currentWeight = position.weight;
      const targetWeight = targetWeights[index] || 0;
      const weightDiff = targetWeight - currentWeight;
      
      let action: 'buy' | 'sell' | 'hold' = 'hold';
      if (Math.abs(weightDiff) > 0.01) { // 1% threshold
        action = weightDiff > 0 ? 'buy' : 'sell';
      }
      
      const quantity = position.price > 0 ? Math.abs(weightDiff * position.value / position.price) : 0;
      const estimatedCost = quantity * position.price;
      const priority = Math.abs(weightDiff) * 100; // Priority based on weight difference
      
      return {
        symbol: position.symbol,
        currentWeight,
        targetWeight,
        action,
        quantity,
        estimatedCost,
        priority,
        reasoning: this.generateRebalancingReasoning(position, weightDiff, action)
      };
    });
  }

  private generateRebalancingReasoning(
    position: Position,
    weightDiff: number,
    action: 'buy' | 'sell' | 'hold'
  ): string {
    if (action === 'hold') {
      return `${position.symbol} is within target allocation range`;
    }
    
    const percentage = Math.abs(weightDiff * 100).toFixed(1);
    if (action === 'buy') {
      return `Increase ${position.symbol} allocation by ${percentage}% to improve portfolio optimization`;
    } else {
      return `Reduce ${position.symbol} allocation by ${percentage}% to improve portfolio diversification`;
    }
  }

  private async storeOptimizationResult(
    userId: string,
    optimizationData: {
      optimizationType: string;
      currentSharpeRatio: number;
      optimizedSharpeRatio: number;
      currentRisk: number;
      optimizedRisk: number;
      improvementScore: number;
      resultsData: string;
    }
  ): Promise<void> {
    // Log the optimization result
    await AuditService.log({
      userId,
      eventType: 'portfolio_optimization',
      eventAction: 'OPTIMIZATION_COMPLETED',
      eventData: {
        optimizationType: optimizationData.optimizationType,
        improvementScore: optimizationData.improvementScore,
        timestamp: new Date().toISOString()
      }
    });

    await prisma.optimizationResult.create({
      data: {
        userId,
        optimizationDate: new Date(),
        ...optimizationData
      }
    });
  }
}

export const portfolioOptimizationService = new PortfolioOptimizationService();
