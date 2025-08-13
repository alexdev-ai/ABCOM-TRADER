import React, { useState, useEffect } from 'react';
import { Loader2, TrendingUp, TrendingDown, DollarSign, AlertTriangle, BarChart3, PieChart, Target, Activity, RefreshCw } from 'lucide-react';

// Types for portfolio optimization
interface PortfolioAnalysis {
  riskMetrics: {
    sharpeRatio: number;
    volatility: number;
    beta: number;
    alpha: number;
    maxDrawdown: number;
  };
  correlationMatrix: number[][];
  riskDecomposition: {
    symbol: string;
    riskContribution: number;
    allocation: number;
  }[];
  efficientFrontier: {
    risk: number;
    return: number;
    allocation: { [symbol: string]: number };
  }[];
  taxOptimization: {
    harvestingOpportunities: {
      symbol: string;
      unrealizedLoss: number;
      taxBenefit: number;
      harvestableShares: number;
    }[];
    totalPotentialBenefit: number;
  };
  lastUpdated: Date;
}

interface TargetAllocation {
  symbol: string;
  targetType: 'symbol' | 'sector' | 'asset_class';
  percentage: number;
  minPercentage?: number;
  maxPercentage?: number;
}

interface RebalancingRecommendation {
  id: string;
  symbol: string;
  currentShares: number;
  targetShares: number;
  action: 'buy' | 'sell' | 'hold';
  quantity: number;
  estimatedPrice: number;
  estimatedCost: number;
  taxImpact: number;
  priority: number;
  reasoning: string;
}

interface RebalancingPlan {
  id: string;
  recommendations: RebalancingRecommendation[];
  riskAnalysis: {
    portfolioRiskBefore: number;
    portfolioRiskAfter: number;
    riskImprovement: number;
  };
  taxImpact: {
    totalTaxImpact: number;
    netTaxImpact: number;
    taxEfficiencyScore: number;
  };
  totalCost: number;
  estimatedDuration: number;
}

const PortfolioOptimizationPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [targetAllocations, setTargetAllocations] = useState<TargetAllocation[]>([]);
  const [rebalancingPlan, setRebalancingPlan] = useState<RebalancingPlan | null>(null);
  const [activeTab, setActiveTab] = useState('analysis');
  const [optimizationMethod, setOptimizationMethod] = useState<'tax_optimized' | 'immediate' | 'staged'>('tax_optimized');

  // Fetch portfolio analysis on component mount
  useEffect(() => {
    fetchPortfolioAnalysis();
    fetchTargetAllocations();
  }, []);

  const fetchPortfolioAnalysis = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/portfolio-optimization/analysis', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch portfolio analysis');
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portfolio analysis');
    } finally {
      setLoading(false);
    }
  };

  const fetchTargetAllocations = async () => {
    try {
      const response = await fetch('/api/v1/portfolio-optimization/targets', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTargetAllocations(data.targets || []);
      }
    } catch (err) {
      console.error('Failed to fetch target allocations:', err);
    }
  };

  const generateRebalancingRecommendations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/portfolio-optimization/recommendations?method=${optimizationMethod}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to generate rebalancing recommendations');
      }

      const data = await response.json();
      setRebalancingPlan(data);
      setActiveTab('rebalancing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate recommendations');
    } finally {
      setLoading(false);
    }
  };

  const executeRebalancingPlan = async () => {
    if (!rebalancingPlan) return;

    try {
      setLoading(true);
      const response = await fetch('/api/v1/portfolio-optimization/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          planId: rebalancingPlan.id,
          executionMethod: 'manual_approval'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to execute rebalancing plan');
      }

      const result = await response.json();
      alert(`Rebalancing execution ${result.success ? 'started successfully' : 'failed'}: ${result.message}`);
      
      if (result.success) {
        // Refresh analysis after execution
        fetchPortfolioAnalysis();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute rebalancing plan');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  if (loading && !analysis) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="animate-spin h-8 w-8 text-blue-600" />
            <span className="ml-2 text-gray-600">Loading portfolio optimization...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div className="text-red-600 font-medium">Error</div>
            </div>
            <div className="text-red-600 mt-1">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Portfolio Optimization</h1>
              <p className="text-gray-600 mt-1">
                Optimize your portfolio for better risk-adjusted returns
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={fetchPortfolioAnalysis} 
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh Analysis
              </button>
              <button 
                onClick={generateRebalancingRecommendations}
                disabled={loading || targetAllocations.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate Recommendations
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'analysis', label: 'Analysis', icon: BarChart3 },
                { id: 'targets', label: 'Target Allocation', icon: Target },
                { id: 'rebalancing', label: 'Rebalancing', icon: Activity },
                { id: 'scenarios', label: 'Scenarios', icon: PieChart }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Portfolio Analysis Tab */}
        {activeTab === 'analysis' && analysis && (
          <div className="space-y-6">
            {/* Risk Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Sharpe Ratio</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analysis.riskMetrics.sharpeRatio.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">Risk-adjusted return</p>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Volatility</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatPercentage(analysis.riskMetrics.volatility)}
                    </p>
                    <p className="text-xs text-gray-500">Annual volatility</p>
                  </div>
                  <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Activity className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Beta</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analysis.riskMetrics.beta.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">Market sensitivity</p>
                  </div>
                  <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Alpha</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatPercentage(analysis.riskMetrics.alpha)}
                    </p>
                    <p className="text-xs text-gray-500">Excess return</p>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Max Drawdown</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatPercentage(analysis.riskMetrics.maxDrawdown)}
                    </p>
                    <p className="text-xs text-gray-500">Worst decline</p>
                  </div>
                  <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Decomposition */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Risk Decomposition</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Individual asset contributions to portfolio risk
                </p>
                <div className="space-y-2">
                  {analysis.riskDecomposition?.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          {item.symbol}
                        </span>
                        <span className="text-sm text-gray-600">
                          {formatPercentage(item.allocation)} allocation
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">
                          {formatPercentage(item.riskContribution)} risk
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tax Loss Harvesting Opportunities */}
            {analysis.taxOptimization?.harvestingOpportunities?.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Tax Loss Harvesting Opportunities</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Potential tax savings: {formatCurrency(analysis.taxOptimization.totalPotentialBenefit)}
                  </p>
                  <div className="space-y-2">
                    {analysis.taxOptimization.harvestingOpportunities.slice(0, 5).map((opportunity, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            {opportunity.symbol}
                          </span>
                          <span className="text-sm text-gray-600">
                            {opportunity.harvestableShares} shares
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-red-600">
                            {formatCurrency(opportunity.unrealizedLoss)} loss
                          </div>
                          <div className="text-sm text-green-600">
                            {formatCurrency(opportunity.taxBenefit)} tax benefit
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Target Allocation Tab */}
        {activeTab === 'targets' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Target Allocations</h3>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                Define your desired portfolio allocation by asset, sector, or symbol
              </p>
              
              {targetAllocations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">
                    No target allocations set. Create your first target allocation to get started.
                  </p>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Add Target Allocation
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {targetAllocations.map((target, index) => (
                    <div key={index} className="flex justify-between items-center p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {target.targetType}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900">{target.symbol}</div>
                          {target.minPercentage !== undefined && target.maxPercentage !== undefined && (
                            <div className="text-sm text-gray-500">
                              Range: {formatPercentage(target.minPercentage / 100)} - {formatPercentage(target.maxPercentage / 100)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {formatPercentage(target.percentage / 100)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <span className="font-medium text-gray-900">Total Allocation:</span>
                    <span className="text-xl font-bold text-gray-900">
                      {formatPercentage(targetAllocations.reduce((sum, t) => sum + t.percentage, 0) / 100)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rebalancing Tab */}
        {activeTab === 'rebalancing' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Rebalancing Recommendations</h3>
                  <p className="text-sm text-gray-600">
                    Optimize your portfolio based on target allocations
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select 
                    value={optimizationMethod} 
                    onChange={(e) => setOptimizationMethod(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="tax_optimized">Tax Optimized</option>
                    <option value="immediate">Immediate</option>
                    <option value="staged">Staged</option>
                  </select>
                  {rebalancingPlan && (
                    <button 
                      onClick={executeRebalancingPlan}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Execute Plan
                    </button>
                  )}
                </div>
              </div>

              {rebalancingPlan ? (
                <div className="space-y-6">
                  {/* Plan Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-600 mb-1">Total Cost</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(rebalancingPlan.totalCost)}
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-600 mb-1">Tax Impact</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(rebalancingPlan.taxImpact.netTaxImpact)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Efficiency: {formatPercentage(rebalancingPlan.taxImpact.taxEfficiencyScore)}
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-600 mb-1">Risk Change</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatPercentage(rebalancingPlan.riskAnalysis.riskImprovement)}
                      </p>
                      <p className="text-xs text-gray-500">Risk improvement</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-600 mb-1">Est. Duration</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {Math.round(rebalancingPlan.estimatedDuration / 60)}m
                      </p>
                      <p className="text-xs text-gray-500">Execution time</p>
                    </div>
                  </div>

                  {/* Recommendations List */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="p-4 border-b border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900">Recommended Trades</h4>
                    </div>
                    <div className="p-4 space-y-3">
                      {rebalancingPlan.recommendations.map((rec, index) => (
                        <div key={index} className="flex justify-between items-center p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              rec.action === 'buy' 
                                ? 'bg-green-100 text-green-800' 
                                : rec.action === 'sell' 
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                            }`}>
                              {rec.action.toUpperCase()}
                            </span>
                            <div>
                              <div className="font-medium text-gray-900">{rec.symbol}</div>
                              <div className="text-sm text-gray-600">
                                {rec.quantity} shares @ {formatCurrency(rec.estimatedPrice)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {rec.reasoning}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-gray-900">
                              {formatCurrency(rec.estimatedCost)}
                            </div>
                            {rec.taxImpact !== 0 && (
                              <div className="text-sm text-gray-600">
                                Tax: {formatCurrency(rec.taxImpact)}
                              </div>
                            )}
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 mt-1">
                              Priority: {rec.priority.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <PieChart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 mb-4">
                    Generate rebalancing recommendations based on your target allocations
                  </p>
                  <button 
                    onClick={generateRebalancingRecommendations}
                    disabled={targetAllocations.length === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Generate Recommendations
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scenarios Tab */}
        {activeTab === 'scenarios' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Scenario Analysis</h3>
              <p className="text-sm text-gray-600 mb-6">
                Analyze portfolio performance under different market conditions
              </p>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-4">
                  Scenario analysis will be available soon
                </p>
                <button 
                  disabled
                  className="px-4 py-2 border border-gray-300 text-gray-400 rounded-lg cursor-not-allowed"
                >
                  Run Scenario Analysis
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioOptimizationPage;
