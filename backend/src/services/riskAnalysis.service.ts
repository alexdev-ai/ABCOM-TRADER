import { PrismaClient } from '@prisma/client';
import { portfolioOptimizationService } from './portfolioOptimization.service';

const prisma = new PrismaClient();

// Types for risk analysis
export interface RiskMetrics {
  portfolioVolatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  valueAtRisk: number;
  expectedShortfall: number;
  beta: number;
  alpha: number;
  trackingError: number;
  informationRatio: number;
}

export interface CorrelationMatrix {
  symbols: string[];
  correlations: number[][];
  labels: string[];
}

export interface RiskDecomposition {
  symbol: string;
  contribution: number;
  percentage: number;
  marginalRisk: number;
}

export interface StressTestScenario {
  name: string;
  description: string;
  shocks: { [symbol: string]: number };
  expectedImpact: number;
  probability?: number;
}

export interface StressTestResult {
  scenario: StressTestScenario;
  portfolioImpact: number;
  positionImpacts: { symbol: string; impact: number }[];
  newPortfolioValue: number;
  drawdown: number;
}

export interface MonteCarloResult {
  scenarios: number;
  timeHorizon: number;
  percentiles: {
    p5: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
  };
  expectedReturn: number;
  volatility: number;
  probabilityOfLoss: number;
  maximumDrawdown: number;
  scenarios_data?: number[];
}

export interface VaRCalculation {
  method: 'historical' | 'parametric' | 'monte_carlo';
  confidenceLevel: number;
  timeHorizon: number;
  valueAtRisk: number;
  expectedShortfall: number;
}

class RiskAnalysisService {
  /**
   * Calculate comprehensive risk metrics for a user's portfolio
   */
  async calculatePortfolioRiskMetrics(
    userId: string,
    benchmarkSymbol: string = 'SPY'
  ): Promise<RiskMetrics> {
    const positions = await this.getUserPositions(userId);
    const returns = await this.getHistoricalReturns(positions.map(p => p.symbol));
    const benchmarkReturns = await this.getBenchmarkReturns(benchmarkSymbol);
    
    if (!returns.length) {
      throw new Error('No historical returns data available');
    }

    const portfolioReturns = this.calculatePortfolioReturns(positions, returns);
    const riskFreeRate = 0.02; // 2% annual risk-free rate

    const volatility = this.calculateVolatility(portfolioReturns);
    const sharpeRatio = this.calculateSharpeRatio(portfolioReturns, riskFreeRate);
    const sortinoRatio = this.calculateSortinoRatio(portfolioReturns, riskFreeRate);
    const maxDrawdown = this.calculateMaxDrawdown(portfolioReturns);
    const valueAtRisk = this.calculateVaR(portfolioReturns, 0.95);
    const expectedShortfall = this.calculateExpectedShortfall(portfolioReturns, 0.95);
    
    // Beta and Alpha calculations vs benchmark
    const beta = this.calculateBeta(portfolioReturns, benchmarkReturns);
    const alpha = this.calculateAlpha(portfolioReturns, benchmarkReturns, beta, riskFreeRate);
    const trackingError = this.calculateTrackingError(portfolioReturns, benchmarkReturns);
    const informationRatio = this.calculateInformationRatio(portfolioReturns, benchmarkReturns);

    return {
      portfolioVolatility: volatility,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      valueAtRisk,
      expectedShortfall,
      beta,
      alpha,
      trackingError,
      informationRatio
    };
  }

  /**
   * Calculate correlation matrix between portfolio assets
   */
  async calculateCorrelationMatrix(userId: string): Promise<CorrelationMatrix> {
    const positions = await this.getUserPositions(userId);
    const symbols = positions.map(p => p.symbol);
    const returns = await this.getHistoricalReturns(symbols);

    if (!returns.length) {
      throw new Error('No historical returns data available');
    }

    const correlations = this.calculateCorrelationFromReturns(returns);

    return {
      symbols,
      correlations,
      labels: symbols
    };
  }

  /**
   * Perform risk decomposition analysis
   */
  async performRiskDecomposition(userId: string): Promise<RiskDecomposition[]> {
    const positions = await this.getUserPositions(userId);
    const returns = await this.getHistoricalReturns(positions.map(p => p.symbol));

    if (!returns.length) {
      throw new Error('No historical returns data available');
    }

    const covarianceMatrix = this.calculateCovarianceMatrix(returns);
    const weights = positions.map(p => p.weight);
    const portfolioRisk = this.calculatePortfolioRisk(weights, covarianceMatrix);

    const riskContributions = this.calculateRiskContributions(weights, covarianceMatrix, portfolioRisk);

    return positions.map((position, index) => ({
      symbol: position.symbol,
      contribution: riskContributions[index] || 0,
      percentage: portfolioRisk > 0 ? ((riskContributions[index] || 0) / portfolioRisk) * 100 : 0,
      marginalRisk: this.calculateMarginalRisk(weights, covarianceMatrix, index)
    }));
  }

  /**
   * Run stress tests on portfolio
   */
  async runStressTests(userId: string, scenarios?: StressTestScenario[]): Promise<StressTestResult[]> {
    const positions = await this.getUserPositions(userId);
    const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);

    // Default stress test scenarios if none provided
    const defaultScenarios: StressTestScenario[] = [
      {
        name: 'Market Crash',
        description: '2008-style financial crisis',
        shocks: this.createMarketShocks(-0.30), // 30% market decline
        expectedImpact: -0.25
      },
      {
        name: 'Tech Selloff',
        description: 'Technology sector correction',
        shocks: this.createSectorShocks('Technology', -0.40),
        expectedImpact: -0.15
      },
      {
        name: 'Interest Rate Spike',
        description: 'Sudden interest rate increase',
        shocks: this.createInterestRateShocks(0.03), // 300 bps increase
        expectedImpact: -0.12
      },
      {
        name: 'Inflation Shock',
        description: 'Unexpected inflation surge',
        shocks: this.createInflationShocks(0.05), // 5% inflation shock
        expectedImpact: -0.08
      },
      {
        name: 'Currency Crisis',
        description: 'Major currency devaluation',
        shocks: this.createCurrencyShocks(-0.25),
        expectedImpact: -0.10
      }
    ];

    const testScenarios = scenarios || defaultScenarios;
    const results: StressTestResult[] = [];

    for (const scenario of testScenarios) {
      const positionImpacts = positions.map(position => {
        const shock = scenario.shocks[position.symbol] || scenario.shocks['market_default'] || 0;
        const impact = position.value * shock;
        return { symbol: position.symbol, impact };
      });

      const totalImpact = positionImpacts.reduce((sum, impact) => sum + impact.impact, 0);
      const newPortfolioValue = totalValue + totalImpact;
      const drawdown = totalImpact / totalValue;

      results.push({
        scenario,
        portfolioImpact: totalImpact,
        positionImpacts,
        newPortfolioValue,
        drawdown
      });
    }

    return results.sort((a, b) => a.portfolioImpact - b.portfolioImpact);
  }

  /**
   * Run Monte Carlo simulation for portfolio
   */
  async runMonteCarloSimulation(
    userId: string,
    scenarios: number = 10000,
    timeHorizonDays: number = 252
  ): Promise<MonteCarloResult> {
    const positions = await this.getUserPositions(userId);
    const returns = await this.getHistoricalReturns(positions.map(p => p.symbol));

    if (!returns.length) {
      throw new Error('No historical returns data available');
    }

    const expectedReturns = this.calculateExpectedReturns(returns);
    const covarianceMatrix = this.calculateCovarianceMatrix(returns);
    const weights = positions.map(p => p.weight);
    
    const portfolioExpectedReturn = this.calculatePortfolioReturn(weights, expectedReturns);
    const portfolioVolatility = this.calculatePortfolioRisk(weights, covarianceMatrix);

    // Run Monte Carlo simulation
    const simulationResults: number[] = [];
    const maxDrawdowns: number[] = [];

    for (let i = 0; i < scenarios; i++) {
      const scenarioReturns = this.generateRandomWalk(
        portfolioExpectedReturn,
        portfolioVolatility,
        timeHorizonDays
      );
      
      const totalReturn = scenarioReturns.reduce((acc, ret) => acc * (1 + ret), 1) - 1;
      simulationResults.push(totalReturn);

      // Calculate max drawdown for this scenario
      const drawdown = this.calculateMaxDrawdownFromReturns(scenarioReturns);
      maxDrawdowns.push(drawdown);
    }

    simulationResults.sort((a, b) => a - b);
    maxDrawdowns.sort((a, b) => b - a);

    const percentiles = {
      p5: simulationResults[Math.floor(scenarios * 0.05)] || 0,
      p10: simulationResults[Math.floor(scenarios * 0.10)] || 0,
      p25: simulationResults[Math.floor(scenarios * 0.25)] || 0,
      p50: simulationResults[Math.floor(scenarios * 0.50)] || 0,
      p75: simulationResults[Math.floor(scenarios * 0.75)] || 0,
      p90: simulationResults[Math.floor(scenarios * 0.90)] || 0,
      p95: simulationResults[Math.floor(scenarios * 0.95)] || 0
    };

    const expectedReturn = simulationResults.reduce((sum, ret) => sum + ret, 0) / scenarios;
    const volatility = Math.sqrt(
      simulationResults.reduce((sum, ret) => sum + Math.pow(ret - expectedReturn, 2), 0) / (scenarios - 1)
    );
    const probabilityOfLoss = simulationResults.filter(ret => ret < 0).length / scenarios;
    const maximumDrawdown = Math.max(...maxDrawdowns);

    return {
      scenarios,
      timeHorizon: timeHorizonDays,
      percentiles,
      expectedReturn,
      volatility,
      probabilityOfLoss,
      maximumDrawdown,
      scenarios_data: simulationResults
    };
  }

  /**
   * Calculate Value at Risk using different methods
   */
  async calculateVaRMethods(
    userId: string,
    confidenceLevel: number = 0.95,
    timeHorizon: number = 1
  ): Promise<VaRCalculation[]> {
    const positions = await this.getUserPositions(userId);
    const returns = await this.getHistoricalReturns(positions.map(p => p.symbol));

    if (!returns.length) {
      throw new Error('No historical returns data available');
    }

    const portfolioReturns = this.calculatePortfolioReturns(positions, returns);
    const results: VaRCalculation[] = [];

    // Historical VaR
    const historicalVaR = this.calculateHistoricalVaR(portfolioReturns, confidenceLevel);
    const historicalES = this.calculateExpectedShortfall(portfolioReturns, confidenceLevel);
    results.push({
      method: 'historical',
      confidenceLevel,
      timeHorizon,
      valueAtRisk: historicalVaR,
      expectedShortfall: historicalES
    });

    // Parametric VaR
    const parametricVaR = this.calculateParametricVaR(portfolioReturns, confidenceLevel);
    const parametricES = this.calculateParametricES(portfolioReturns, confidenceLevel);
    results.push({
      method: 'parametric',
      confidenceLevel,
      timeHorizon,
      valueAtRisk: parametricVaR,
      expectedShortfall: parametricES
    });

    // Monte Carlo VaR
    const monteCarloResult = await this.calculateMonteCarloVaR(userId, confidenceLevel, 1000);
    results.push({
      method: 'monte_carlo',
      confidenceLevel,
      timeHorizon,
      valueAtRisk: monteCarloResult.valueAtRisk,
      expectedShortfall: monteCarloResult.expectedShortfall
    });

    return results;
  }

  // Private helper methods

  private async getUserPositions(userId: string) {
    const positions = await prisma.portfolioPosition.findMany({
      where: { userId },
      include: { user: true }
    });

    const totalValue = positions.reduce((sum, pos) => 
      sum + (pos.marketValue?.toNumber() || 0), 0
    );

    return positions.map(pos => ({
      symbol: pos.symbol,
      quantity: pos.quantity.toNumber(),
      price: pos.currentPrice?.toNumber() || 0,
      value: pos.marketValue?.toNumber() || 0,
      weight: totalValue > 0 ? (pos.marketValue?.toNumber() || 0) / totalValue : 0,
      sector: pos.sector || undefined
    }));
  }

  private async getHistoricalReturns(symbols: string[]): Promise<number[][]> {
    // Mock data for development - replace with actual market data service
    if (!symbols.length) return [];
    
    return symbols.map(() => 
      Array.from({ length: 252 }, () => (Math.random() - 0.5) * 0.04)
    );
  }

  private async getBenchmarkReturns(symbol: string): Promise<number[]> {
    // Mock benchmark returns - replace with actual market data
    return Array.from({ length: 252 }, () => (Math.random() - 0.5) * 0.03);
  }

  private calculatePortfolioReturns(positions: any[], returns: number[][]): number[] {
    const weights = positions.map(p => p.weight);
    const numPeriods = returns[0]?.length || 0;
    const portfolioReturns: number[] = [];

    for (let period = 0; period < numPeriods; period++) {
      let periodReturn = 0;
      for (let i = 0; i < weights.length; i++) {
        const returnValue = returns[i]?.[period];
        if (returnValue !== undefined) {
          periodReturn += weights[i] * returnValue;
        }
      }
      portfolioReturns.push(periodReturn);
    }

    return portfolioReturns;
  }

  private calculateVolatility(returns: number[]): number {
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / (returns.length - 1);
    return Math.sqrt(variance * 252); // Annualized
  }

  private calculateSharpeRatio(returns: number[], riskFreeRate: number): number {
    const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length * 252; // Annualized
    const volatility = this.calculateVolatility(returns);
    return volatility > 0 ? (meanReturn - riskFreeRate) / volatility : 0;
  }

  private calculateSortinoRatio(returns: number[], riskFreeRate: number): number {
    const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length * 252;
    const downside = returns.filter(ret => ret < 0);
    
    if (downside.length === 0) return Infinity;
    
    const downsideDeviation = Math.sqrt(
      downside.reduce((sum, ret) => sum + Math.pow(ret, 2), 0) / downside.length * 252
    );
    
    return downsideDeviation > 0 ? (meanReturn - riskFreeRate) / downsideDeviation : 0;
  }

  private calculateMaxDrawdown(returns: number[]): number {
    let peak = 1;
    let maxDrawdown = 0;
    let currentValue = 1;

    for (const ret of returns) {
      currentValue *= (1 + ret);
      if (currentValue > peak) {
        peak = currentValue;
      }
      const drawdown = (peak - currentValue) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  private calculateVaR(returns: number[], confidenceLevel: number): number {
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
    return -sortedReturns[index]; // Negative for loss amount
  }

  private calculateExpectedShortfall(returns: number[], confidenceLevel: number): number {
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
    const tailReturns = sortedReturns.slice(0, index + 1);
    const meanTailReturn = tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length;
    return -meanTailReturn; // Negative for loss amount
  }

  private calculateBeta(portfolioReturns: number[], benchmarkReturns: number[]): number {
    const portfolioMean = portfolioReturns.reduce((sum, ret) => sum + ret, 0) / portfolioReturns.length;
    const benchmarkMean = benchmarkReturns.reduce((sum, ret) => sum + ret, 0) / benchmarkReturns.length;

    let covariance = 0;
    let benchmarkVariance = 0;

    for (let i = 0; i < Math.min(portfolioReturns.length, benchmarkReturns.length); i++) {
      const portfolioDiff = portfolioReturns[i] - portfolioMean;
      const benchmarkDiff = benchmarkReturns[i] - benchmarkMean;
      covariance += portfolioDiff * benchmarkDiff;
      benchmarkVariance += benchmarkDiff * benchmarkDiff;
    }

    return benchmarkVariance > 0 ? covariance / benchmarkVariance : 0;
  }

  private calculateAlpha(
    portfolioReturns: number[],
    benchmarkReturns: number[],
    beta: number,
    riskFreeRate: number
  ): number {
    const portfolioReturn = portfolioReturns.reduce((sum, ret) => sum + ret, 0) / portfolioReturns.length * 252;
    const benchmarkReturn = benchmarkReturns.reduce((sum, ret) => sum + ret, 0) / benchmarkReturns.length * 252;
    
    return portfolioReturn - (riskFreeRate + beta * (benchmarkReturn - riskFreeRate));
  }

  private calculateTrackingError(portfolioReturns: number[], benchmarkReturns: number[]): number {
    const differences = portfolioReturns.map((ret, i) => ret - (benchmarkReturns[i] || 0));
    const mean = differences.reduce((sum, diff) => sum + diff, 0) / differences.length;
    const variance = differences.reduce((sum, diff) => sum + Math.pow(diff - mean, 2), 0) / (differences.length - 1);
    return Math.sqrt(variance * 252); // Annualized
  }

  private calculateInformationRatio(portfolioReturns: number[], benchmarkReturns: number[]): number {
    const differences = portfolioReturns.map((ret, i) => ret - (benchmarkReturns[i] || 0));
    const activeReturn = differences.reduce((sum, diff) => sum + diff, 0) / differences.length * 252;
    const trackingError = this.calculateTrackingError(portfolioReturns, benchmarkReturns);
    
    return trackingError > 0 ? activeReturn / trackingError : 0;
  }

  private calculateCorrelationFromReturns(returns: number[][]): number[][] {
    const n = returns.length;
    const correlation: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          correlation[i][j] = 1.0;
        } else {
          correlation[i][j] = this.calculateCorrelation(returns[i], returns[j]);
        }
      }
    }

    return correlation;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    const meanX = x.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.slice(0, n).reduce((sum, val) => sum + val, 0) / n;

    let numerator = 0;
    let sumXSquared = 0;
    let sumYSquared = 0;

    for (let i = 0; i < n; i++) {
      const xDiff = x[i] - meanX;
      const yDiff = y[i] - meanY;
      numerator += xDiff * yDiff;
      sumXSquared += xDiff * xDiff;
      sumYSquared += yDiff * yDiff;
    }

    const denominator = Math.sqrt(sumXSquared * sumYSquared);
    return denominator > 0 ? numerator / denominator : 0;
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
    const n = Math.min(x.length, y.length);
    const meanX = x.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.slice(0, n).reduce((sum, val) => sum + val, 0) / n;

    return x.slice(0, n).reduce((sum, xi, i) => 
      sum + (xi - meanX) * (y[i] - meanY), 0
    ) / (n - 1);
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

  private calculatePortfolioReturn(weights: number[], expectedReturns: number[]): number {
    return weights.reduce((sum, weight, i) => sum + weight * expectedReturns[i], 0);
  }

  private calculateExpectedReturns(returns: number[][]): number[] {
    return returns.map(assetReturns => 
      assetReturns.reduce((sum, ret) => sum + ret, 0) / assetReturns.length
    );
  }

  private calculateRiskContributions(
    weights: number[],
    covarianceMatrix: number[][],
    portfolioRisk: number
  ): number[] {
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

  private calculateMarginalRisk(
    weights: number[],
    covarianceMatrix: number[][],
    assetIndex: number
  ): number {
    let marginalRisk = 0;
    for (let j = 0; j < weights.length; j++) {
      marginalRisk += weights[j] * covarianceMatrix[assetIndex][j];
    }
    return marginalRisk;
  }

  // Stress test scenario creators
  private createMarketShocks(marketShock: number): { [symbol: string]: number } {
    return { market_default: marketShock };
  }

  private createSectorShocks(sector: string, sectorShock: number): { [symbol: string]: number } {
    // In production, would map symbols to sectors and apply shocks
    return { market_default: sectorShock * 0.5 }; // Simplified
  }

  private createInterestRateShocks(rateIncrease: number): { [symbol: string]: number } {
    // Interest rate sensitive sectors get larger shocks
    return { 
      market_default: -rateIncrease * 2, // Duration-based impact
      'REITs': -rateIncrease * 4,
      'Utilities': -rateIncrease * 3,
      'Financials': rateIncrease * 1.5 // Banks benefit from higher rates
    };
  }

  private createInflationShocks(inflationShock: number): { [symbol: string]: number } {
    return {
      market_default: -inflationShock * 0.5,
      'Energy': inflationShock * 2, // Energy benefits from inflation
      'Materials': inflationShock * 1.5,
      'Technology': -inflationShock * 2 // Growth stocks hurt by inflation
    };
  }

  private createCurrencyShocks(currencyShock: number): { [symbol: string]: number } {
    return {
      market_default: currencyShock * 0.3,
      'International': currencyShock * 2,
      'Exporters': currencyShock * 1.5
    };
  }

  private generateRandomWalk(
    expectedReturn: number,
    volatility: number,
    periods: number
  ): number[] {
    const returns: number[] = [];
    const dt = 1 / 252; // Daily time step
    const drift = expectedReturn * dt;
    const diffusion = volatility * Math.sqrt(dt);

    for (let i = 0; i < periods; i++) {
      const randomShock = this.generateNormalRandom();
      const dailyReturn = drift + diffusion * randomShock;
      returns.push(dailyReturn);
    }

    return returns;
  }

  private generateNormalRandom(): number {
    // Box-Muller transformation for normal random numbers
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  private calculateMaxDrawdownFromReturns(returns: number[]): number {
    let peak = 1;
    let maxDrawdown = 0;
    let currentValue = 1;

    for (const ret of returns) {
      currentValue *= (1 + ret);
      if (currentValue > peak) {
        peak = currentValue;
      }
      const drawdown = (peak - currentValue) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  private calculateHistoricalVaR(returns: number[], confidenceLevel: number): number {
    return this.calculateVaR(returns, confidenceLevel);
  }

  private calculateParametricVaR(returns: number[], confidenceLevel: number): number {
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const std = Math.sqrt(
      returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / (returns.length - 1)
    );
    
    // Z-score for confidence level (approximate)
    const zScore = confidenceLevel === 0.95 ? 1.645 : confidenceLevel === 0.99 ? 2.326 : 1.96;
    return -(mean - zScore * std);
  }

  private calculateParametricES(returns: number[], confidenceLevel: number): number {
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const std = Math.sqrt(
      returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / (returns.length - 1)
    );
    
    // Approximate ES calculation for normal distribution
    const zScore = confidenceLevel === 0.95 ? 1.645 : confidenceLevel === 0.99 ? 2.326 : 1.96;
    const phi = Math.exp(-0.5 * zScore * zScore) / Math.sqrt(2 * Math.PI);
    return -(mean - std * phi / (1 - confidenceLevel));
  }

  private async calculateMonteCarloVaR(
    userId: string,
    confidenceLevel: number,
    scenarios: number
  ): Promise<{ valueAtRisk: number; expectedShortfall: number }> {
    const monteCarloResult = await this.runMonteCarloSimulation(userId, scenarios, 1);
    const scenarioData = monteCarloResult.scenarios_data || [];
    
    if (!scenarioData.length) {
      return { valueAtRisk: 0, expectedShortfall: 0 };
    }

    const sortedResults = [...scenarioData].sort((a, b) => a - b);
    const varIndex = Math.floor((1 - confidenceLevel) * sortedResults.length);
    const valueAtRisk = -sortedResults[varIndex];
    
    const tailResults = sortedResults.slice(0, varIndex + 1);
    const expectedShortfall = tailResults.length > 0 
      ? -tailResults.reduce((sum, ret) => sum + ret, 0) / tailResults.length 
      : 0;

    return { valueAtRisk, expectedShortfall };
  }
}

export const riskAnalysisService = new RiskAnalysisService();
