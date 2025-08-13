import React, { useState, useEffect } from 'react';
import { BarChart, Activity, TrendingUp, TrendingDown, AlertTriangle, Info, Play } from 'lucide-react';

interface ScenarioResult {
  scenario: string;
  description: string;
  portfolioReturn: number;
  benchmarkReturn: number;
  relativePerformance: number;
  maxDrawdown: number;
  volatility: number;
  probability: number;
  duration?: number; // in days
  severity: 'low' | 'medium' | 'high' | 'extreme';
}

interface ScenarioSummary {
  bestCase: number;
  worstCase: number;
  averageCase: number;
  probabilityOfLoss: number;
  valueAtRisk: number;
  expectedShortfall: number;
  stressTestResult: 'pass' | 'caution' | 'fail';
}

interface ScenarioAnalysisProps {
  scenarios: ScenarioResult[];
  summary: ScenarioSummary;
  currentPortfolioValue: number;
  title?: string;
  onRunAnalysis?: () => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

const ScenarioAnalysis: React.FC<ScenarioAnalysisProps> = ({
  scenarios,
  summary,
  currentPortfolioValue,
  title = 'Scenario Analysis',
  onRunAnalysis,
  isLoading = false,
  className = ''
}) => {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioResult | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'impact' | 'probability' | 'name'>('impact');

  // Filter and sort scenarios
  const filteredScenarios = scenarios
    .filter(scenario => filterSeverity === 'all' || scenario.severity === filterSeverity)
    .sort((a, b) => {
      switch (sortBy) {
        case 'impact':
          return a.portfolioReturn - b.portfolioReturn;
        case 'probability':
          return b.probability - a.probability;
        case 'name':
          return a.scenario.localeCompare(b.scenario);
        default:
          return 0;
      }
    });

  // Get severity color
  const getSeverityColor = (severity: ScenarioResult['severity']) => {
    switch (severity) {
      case 'low':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'extreme':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Get performance color
  const getPerformanceColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < -0.1) return 'text-red-600';
    return 'text-yellow-600';
  };

  // Format percentage
  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate portfolio value impact
  const calculateImpact = (returnRate: number) => {
    return currentPortfolioValue * returnRate;
  };

  // Get stress test color
  const getStressTestColor = (result: ScenarioSummary['stressTestResult']) => {
    switch (result) {
      case 'pass':
        return 'text-green-600 bg-green-100';
      case 'caution':
        return 'text-yellow-600 bg-yellow-100';
      case 'fail':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Info className="h-4 w-4" />
              <span>Stress Testing</span>
            </div>
            {onRunAnalysis && (
              <button
                onClick={onRunAnalysis}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Activity className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {isLoading ? 'Running...' : 'Run Analysis'}
              </button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-green-600 text-xs font-medium mb-1">Best Case</div>
            <div className="text-xl font-bold text-green-900">
              {formatPercentage(summary.bestCase)}
            </div>
            <div className="text-xs text-green-700">
              {formatCurrency(calculateImpact(summary.bestCase))}
            </div>
          </div>

          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-red-600 text-xs font-medium mb-1">Worst Case</div>
            <div className="text-xl font-bold text-red-900">
              {formatPercentage(summary.worstCase)}
            </div>
            <div className="text-xs text-red-700">
              {formatCurrency(calculateImpact(summary.worstCase))}
            </div>
          </div>

          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-blue-600 text-xs font-medium mb-1">Average</div>
            <div className="text-xl font-bold text-blue-900">
              {formatPercentage(summary.averageCase)}
            </div>
            <div className="text-xs text-blue-700">
              {formatCurrency(calculateImpact(summary.averageCase))}
            </div>
          </div>

          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-yellow-600 text-xs font-medium mb-1">Loss Probability</div>
            <div className="text-xl font-bold text-yellow-900">
              {formatPercentage(summary.probabilityOfLoss)}
            </div>
            <div className="text-xs text-yellow-700">Risk level</div>
          </div>

          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-purple-600 text-xs font-medium mb-1">Value at Risk</div>
            <div className="text-xl font-bold text-purple-900">
              {formatPercentage(summary.valueAtRisk)}
            </div>
            <div className="text-xs text-purple-700">95% confidence</div>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-gray-600 text-xs font-medium mb-1">Stress Test</div>
            <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStressTestColor(summary.stressTestResult)}`}>
              {summary.stressTestResult.toUpperCase()}
            </div>
            <div className="text-xs text-gray-700 mt-1">Overall result</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Filter by severity:</label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="text-sm px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All ({scenarios.length})</option>
              <option value="low">Low ({scenarios.filter(s => s.severity === 'low').length})</option>
              <option value="medium">Medium ({scenarios.filter(s => s.severity === 'medium').length})</option>
              <option value="high">High ({scenarios.filter(s => s.severity === 'high').length})</option>
              <option value="extreme">Extreme ({scenarios.filter(s => s.severity === 'extreme').length})</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="impact">Impact (worst first)</option>
              <option value="probability">Probability (highest first)</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Scenarios List */}
        <div className="space-y-3">
          {filteredScenarios.map((scenario, index) => (
            <div
              key={scenario.scenario}
              className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                selectedScenario?.scenario === scenario.scenario
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setSelectedScenario(selectedScenario?.scenario === scenario.scenario ? null : scenario)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-gray-900">{scenario.scenario}</h4>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(scenario.severity)}`}>
                      {scenario.severity.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatPercentage(scenario.probability)} probability
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{scenario.description}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Portfolio Return:</span>
                      <div className={`font-semibold ${getPerformanceColor(scenario.portfolioReturn)}`}>
                        {formatPercentage(scenario.portfolioReturn)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatCurrency(calculateImpact(scenario.portfolioReturn))}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-gray-500">vs Benchmark:</span>
                      <div className={`font-semibold ${getPerformanceColor(scenario.relativePerformance)}`}>
                        {scenario.relativePerformance > 0 ? '+' : ''}
                        {formatPercentage(scenario.relativePerformance)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Relative performance
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-gray-500">Max Drawdown:</span>
                      <div className="font-semibold text-red-600">
                        {formatPercentage(scenario.maxDrawdown)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Worst decline
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-gray-500">Volatility:</span>
                      <div className="font-semibold text-gray-900">
                        {formatPercentage(scenario.volatility)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Expected volatility
                      </div>
                    </div>
                  </div>
                  
                  {scenario.duration && (
                    <div className="mt-2 text-xs text-gray-500">
                      Expected duration: {scenario.duration} days
                    </div>
                  )}
                </div>
                
                <div className="flex-shrink-0 ml-4">
                  {scenario.portfolioReturn > 0 ? (
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  ) : scenario.portfolioReturn < -0.1 ? (
                    <TrendingDown className="h-8 w-8 text-red-500" />
                  ) : (
                    <Activity className="h-8 w-8 text-yellow-500" />
                  )}
                </div>
              </div>
              
              {/* Expanded details */}
              {selectedScenario?.scenario === scenario.scenario && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Impact Analysis */}
                    <div>
                      <h5 className="font-semibold text-gray-900 mb-2">Impact Analysis</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Current Portfolio Value:</span>
                          <span className="font-medium">{formatCurrency(currentPortfolioValue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Projected Value:</span>
                          <span className={`font-medium ${getPerformanceColor(scenario.portfolioReturn)}`}>
                            {formatCurrency(currentPortfolioValue + calculateImpact(scenario.portfolioReturn))}
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-gray-600">Net Impact:</span>
                          <span className={`font-bold ${getPerformanceColor(scenario.portfolioReturn)}`}>
                            {scenario.portfolioReturn > 0 ? '+' : ''}
                            {formatCurrency(calculateImpact(scenario.portfolioReturn))}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Risk Metrics */}
                    <div>
                      <h5 className="font-semibold text-gray-900 mb-2">Risk Metrics</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Probability:</span>
                          <span className="font-medium">{formatPercentage(scenario.probability)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Severity Level:</span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(scenario.severity)}`}>
                            {scenario.severity.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Benchmark Performance:</span>
                          <span className={`font-medium ${getPerformanceColor(scenario.benchmarkReturn)}`}>
                            {formatPercentage(scenario.benchmarkReturn)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty state */}
        {filteredScenarios.length === 0 && (
          <div className="text-center py-8">
            <BarChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {filterSeverity === 'all' 
                ? 'No scenarios available' 
                : `No ${filterSeverity} severity scenarios`}
            </p>
          </div>
        )}

        {/* Risk Assessment */}
        {scenarios.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-start gap-3">
              {summary.stressTestResult === 'fail' ? (
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
              ) : summary.stressTestResult === 'caution' ? (
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              ) : (
                <Activity className="h-5 w-5 text-green-500 mt-0.5" />
              )}
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Portfolio Risk Assessment</h4>
                <p className="text-sm text-gray-600">
                  {summary.stressTestResult === 'pass' && 
                    'Your portfolio shows good resilience across stress scenarios. The expected shortfall is manageable and diversification appears adequate.'
                  }
                  {summary.stressTestResult === 'caution' && 
                    'Your portfolio shows moderate risk exposure. Consider reviewing asset allocation and diversification to improve stress test performance.'
                  }
                  {summary.stressTestResult === 'fail' && 
                    'Your portfolio shows high risk exposure to stress scenarios. Immediate rebalancing and risk reduction measures are recommended.'
                  }
                </p>
                <div className="mt-2 text-xs text-gray-500">
                  Expected Shortfall (ES): {formatPercentage(summary.expectedShortfall)} | 
                  VaR 95%: {formatPercentage(summary.valueAtRisk)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScenarioAnalysis;
