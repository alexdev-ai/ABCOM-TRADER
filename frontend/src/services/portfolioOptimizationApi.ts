// Portfolio Optimization API Service
// Handles all API calls related to portfolio optimization, rebalancing, and risk analysis

// Types for Portfolio Optimization API
export interface PortfolioAnalysis {
  riskMetrics: {
    sharpeRatio: number;
    volatility: number;
    beta: number;
    alpha: number;
    maxDrawdown: number;
    var95: number;
    expectedShortfall: number;
    informationRatio: number;
    calmarRatio: number;
    sortinoRatio: number;
  };
  correlationMatrix: {
    symbols: string[];
    matrix: number[][];
  };
  riskDecomposition: {
    symbol: string;
    riskContribution: number;
    allocation: number;
    marginalRisk: number;
    componentRisk: number;
  }[];
  efficientFrontier: {
    risk: number;
    return: number;
    allocation: { [symbol: string]: number };
    sharpeRatio: number;
  }[];
  taxOptimization: {
    harvestingOpportunities: {
      id: string;
      symbol: string;
      unrealizedLoss: number;
      taxBenefit: number;
      harvestableShares: number;
      costBasis: number;
      currentPrice: number;
      washSaleRisk: boolean;
      recommendedAction: string;
    }[];
    totalPotentialBenefit: number;
    washSaleViolations: number;
    taxEfficiencyScore: number;
  };
  lastUpdated: string;
}

export interface TargetAllocation {
  id?: string;
  symbol: string;
  targetType: 'symbol' | 'sector' | 'asset_class';
  percentage: number;
  minPercentage?: number;
  maxPercentage?: number;
  priority: number;
  rebalancingTolerance: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RebalancingRecommendation {
  id: string;
  symbol: string;
  currentShares: number;
  targetShares: number;
  currentAllocation: number;
  targetAllocation: number;
  action: 'buy' | 'sell' | 'hold';
  quantity: number;
  estimatedPrice: number;
  estimatedCost: number;
  taxImpact: number;
  priority: number;
  reasoning: string;
  executionOrder: number;
  marketImpact: number;
  urgency: 'low' | 'medium' | 'high';
}

export interface RebalancingPlan {
  id: string;
  userId: string;
  method: 'immediate' | 'staged' | 'tax_optimized';
  recommendations: RebalancingRecommendation[];
  riskAnalysis: {
    portfolioRiskBefore: number;
    portfolioRiskAfter: number;
    riskImprovement: number;
    diversificationImpact: number;
  };
  taxImpact: {
    totalTaxImpact: number;
    netTaxImpact: number;
    taxEfficiencyScore: number;
    longTermGains: number;
    shortTermGains: number;
  };
  costAnalysis: {
    totalCost: number;
    transactionFees: number;
    marketImpactCost: number;
    bidAskSpread: number;
  };
  estimatedDuration: number;
  status: 'draft' | 'approved' | 'executing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface OptimizationRequest {
  method: 'mpt' | 'risk_parity' | 'black_litterman';
  targetReturn?: number;
  targetRisk?: number;
  investorViews?: {
    symbol: string;
    expectedReturn: number;
    confidence: number;
  }[];
  constraints?: {
    minWeight?: number;
    maxWeight?: number;
    sectorLimits?: { [sector: string]: number };
    turnoverLimit?: number;
  };
}

export interface OptimizationResult {
  id: string;
  method: string;
  optimalWeights: { [symbol: string]: number };
  expectedReturn: number;
  expectedRisk: number;
  sharpeRatio: number;
  diversificationRatio: number;
  turnover: number;
  convergenceStatus: string;
  iterations: number;
  executionTime: number;
  createdAt: string;
}

export interface ScenarioAnalysis {
  scenarios: string[];
  results: {
    scenario: string;
    portfolioReturn: number;
    benchmarkReturn: number;
    relativePerformance: number;
    maxDrawdown: number;
    volatility: number;
    probability: number;
  }[];
  summary: {
    bestCase: number;
    worstCase: number;
    averageCase: number;
    probabilityOfLoss: number;
    valueAtRisk: number;
    expectedShortfall: number;
  };
}

export interface MonteCarloResults {
  simulations: number;
  timeHorizon: number;
  percentileResults: {
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
  };
  probabilityMetrics: {
    probabilityOfLoss: number;
    probabilityOfPositiveReturn: number;
    probabilityOfOutperformance: number;
  };
  distributionStats: {
    mean: number;
    median: number;
    standardDeviation: number;
    skewness: number;
    kurtosis: number;
  };
  paths: number[][];
}

export interface TaxImpactAnalysis {
  totalTaxImpact: number;
  breakdown: {
    symbol: string;
    shortTermGains: number;
    longTermGains: number;
    totalTaxImpact: number;
    effectiveTaxRate: number;
  }[];
  harvestingBenefits: number;
  netTaxImpact: number;
  recommendations: string[];
}

export interface ExecutionProgress {
  executionId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  completedTrades: number;
  totalTrades: number;
  currentTrade?: {
    symbol: string;
    action: string;
    quantity: number;
    status: string;
  };
  estimatedTimeRemaining: number;
  errors: string[];
  startedAt: string;
  updatedAt: string;
}

export interface OptimizationHistory {
  id: string;
  method: string;
  performance: {
    return: number;
    risk: number;
    sharpeRatio: number;
  };
  executionDate: string;
  status: string;
  notes?: string;
}

// Base API configuration
const API_BASE_URL = '/api/v1/portfolio-optimization';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Helper function to handle API responses
const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// Portfolio Optimization API Service
export const portfolioOptimizationApi = {
  // Get comprehensive portfolio analysis
  getPortfolioAnalysis: async (): Promise<PortfolioAnalysis> => {
    const response = await fetch(`${API_BASE_URL}/analysis`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse<PortfolioAnalysis>(response);
  },

  // Get user's target allocations
  getTargetAllocations: async (): Promise<{ targets: TargetAllocation[]; lastUpdated: string }> => {
    const response = await fetch(`${API_BASE_URL}/targets`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse<{ targets: TargetAllocation[]; lastUpdated: string }>(response);
  },

  // Set user's target allocations
  setTargetAllocations: async (targets: Omit<TargetAllocation, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<{ success: boolean; message: string; targets: TargetAllocation[] }> => {
    const response = await fetch(`${API_BASE_URL}/targets`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ targets })
    });
    return handleResponse<{ success: boolean; message: string; targets: TargetAllocation[] }>(response);
  },

  // Get rebalancing recommendations
  getRebalancingRecommendations: async (
    method: 'immediate' | 'staged' | 'tax_optimized' = 'tax_optimized',
    options?: {
      maxTaxImpact?: number;
      minTradeSize?: number;
      maxTradeSize?: number;
    }
  ): Promise<RebalancingPlan> => {
    const params = new URLSearchParams({
      method,
      ...(options?.maxTaxImpact && { maxTaxImpact: options.maxTaxImpact.toString() }),
      ...(options?.minTradeSize && { minTradeSize: options.minTradeSize.toString() }),
      ...(options?.maxTradeSize && { maxTradeSize: options.maxTradeSize.toString() })
    });

    const response = await fetch(`${API_BASE_URL}/recommendations?${params}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse<RebalancingPlan>(response);
  },

  // Run portfolio optimization
  runOptimization: async (request: OptimizationRequest): Promise<{ method: string; result: OptimizationResult; timestamp: string }> => {
    const response = await fetch(`${API_BASE_URL}/optimize`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(request)
    });
    return handleResponse<{ method: string; result: OptimizationResult; timestamp: string }>(response);
  },

  // Get scenario analysis
  getScenarioAnalysis: async (
    scenarios: number = 1000,
    timeHorizon: number = 252,
    stressTest: boolean = true
  ): Promise<{
    monteCarlo: MonteCarloResults;
    stressTests: ScenarioAnalysis;
    valueAtRisk: any;
    timestamp: string;
  }> => {
    const params = new URLSearchParams({
      scenarios: scenarios.toString(),
      timeHorizon: timeHorizon.toString(),
      stressTest: stressTest.toString()
    });

    const response = await fetch(`${API_BASE_URL}/scenarios?${params}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse<{
      monteCarlo: MonteCarloResults;
      stressTests: ScenarioAnalysis;
      valueAtRisk: any;
      timestamp: string;
    }>(response);
  },

  // Execute rebalancing plan
  executeRebalancingPlan: async (
    planId: string,
    executionMethod: 'manual_approval' | 'automatic' = 'manual_approval'
  ): Promise<{ success: boolean; message: string; executionId?: string }> => {
    const response = await fetch(`${API_BASE_URL}/execute`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ planId, executionMethod })
    });
    return handleResponse<{ success: boolean; message: string; executionId?: string }>(response);
  },

  // Get execution progress
  getExecutionProgress: async (executionId: string): Promise<ExecutionProgress> => {
    const response = await fetch(`${API_BASE_URL}/execution/${executionId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse<ExecutionProgress>(response);
  },

  // Get comprehensive tax analysis
  getTaxAnalysis: async (): Promise<{
    harvestingOpportunities: any[];
    washSaleViolations: any[];
    washSaleGuidance: any;
    summary: {
      totalHarvestingBenefit: number;
      violationsCount: number;
      totalLossDisallowed: number;
    };
    timestamp: string;
  }> => {
    const response = await fetch(`${API_BASE_URL}/tax-analysis`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse<{
      harvestingOpportunities: any[];
      washSaleViolations: any[];
      washSaleGuidance: any;
      summary: {
        totalHarvestingBenefit: number;
        violationsCount: number;
        totalLossDisallowed: number;
      };
      timestamp: string;
    }>(response);
  },

  // Calculate tax impact of proposed trades
  calculateTaxImpact: async (
    recommendations: RebalancingRecommendation[],
    userTaxRates?: {
      shortTermRate: number;
      longTermRate: number;
      stateRate?: number;
    }
  ): Promise<TaxImpactAnalysis> => {
    const response = await fetch(`${API_BASE_URL}/tax-impact`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ recommendations, userTaxRates })
    });
    return handleResponse<TaxImpactAnalysis>(response);
  },

  // Get optimization history
  getOptimizationHistory: async (
    limit: number = 10,
    offset: number = 0
  ): Promise<{
    history: OptimizationHistory[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
    };
  }> => {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });

    const response = await fetch(`${API_BASE_URL}/history?${params}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse<{
      history: OptimizationHistory[];
      pagination: {
        limit: number;
        offset: number;
        total: number;
      };
    }>(response);
  },

  // Utility functions for data processing and formatting
  utils: {
    // Format currency values
    formatCurrency: (amount: number): string => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    },

    // Format percentage values
    formatPercentage: (value: number, decimals: number = 2): string => {
      return `${(value * 100).toFixed(decimals)}%`;
    },

    // Calculate portfolio risk metrics
    calculateRiskMetrics: (returns: number[]): {
      mean: number;
      volatility: number;
      sharpeRatio: number;
      maxDrawdown: number;
    } => {
      const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
      const volatility = Math.sqrt(variance);
      const sharpeRatio = mean / volatility;
      
      let peak = 0;
      let maxDrawdown = 0;
      let cumReturn = 1;
      
      for (const ret of returns) {
        cumReturn *= (1 + ret);
        peak = Math.max(peak, cumReturn);
        const drawdown = (peak - cumReturn) / peak;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }

      return { mean, volatility, sharpeRatio, maxDrawdown };
    },

    // Calculate correlation between two return series
    calculateCorrelation: (returns1: number[], returns2: number[]): number => {
      const n = Math.min(returns1.length, returns2.length);
      const mean1 = returns1.slice(0, n).reduce((sum, ret) => sum + ret, 0) / n;
      const mean2 = returns2.slice(0, n).reduce((sum, ret) => sum + ret, 0) / n;
      
      let numerator = 0;
      let sum1 = 0;
      let sum2 = 0;
      
      for (let i = 0; i < n; i++) {
        const diff1 = returns1[i] - mean1;
        const diff2 = returns2[i] - mean2;
        numerator += diff1 * diff2;
        sum1 += diff1 * diff1;
        sum2 += diff2 * diff2;
      }
      
      return numerator / Math.sqrt(sum1 * sum2);
    },

    // Validate target allocations
    validateTargetAllocations: (targets: TargetAllocation[]): {
      isValid: boolean;
      errors: string[];
    } => {
      const errors: string[] = [];
      
      // Check if allocations sum to 100%
      const totalAllocation = targets.reduce((sum, target) => sum + target.percentage, 0);
      if (Math.abs(totalAllocation - 100) > 0.01) {
        errors.push(`Target allocations must sum to 100%. Current total: ${totalAllocation.toFixed(2)}%`);
      }
      
      // Check for duplicate symbols
      const symbols = targets.map(t => t.symbol);
      const uniqueSymbols = new Set(symbols);
      if (symbols.length !== uniqueSymbols.size) {
        errors.push('Duplicate symbols found in target allocations');
      }
      
      // Check percentage ranges
      targets.forEach((target, index) => {
        if (target.percentage < 0 || target.percentage > 100) {
          errors.push(`Target ${index + 1}: Percentage must be between 0% and 100%`);
        }
        
        if (target.minPercentage !== undefined && target.maxPercentage !== undefined) {
          if (target.minPercentage > target.maxPercentage) {
            errors.push(`Target ${index + 1}: Minimum percentage cannot be greater than maximum percentage`);
          }
          
          if (target.percentage < target.minPercentage || target.percentage > target.maxPercentage) {
            errors.push(`Target ${index + 1}: Target percentage must be within specified range`);
          }
        }
      });
      
      return {
        isValid: errors.length === 0,
        errors
      };
    }
  }
};

export default portfolioOptimizationApi;
