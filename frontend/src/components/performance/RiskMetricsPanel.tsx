import React from 'react';
import { RiskMetrics, PerformanceMetrics } from '../../services/performanceAnalyticsApi';

interface RiskMetricsPanelProps {
  riskMetrics?: RiskMetrics;
  periodMetrics: PerformanceMetrics;
}

export const RiskMetricsPanel: React.FC<RiskMetricsPanelProps> = ({
  riskMetrics,
  periodMetrics
}) => {
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

  const formatDecimal = (value: number, decimals: number = 2): string => {
    return value.toFixed(decimals);
  };

  const getRiskColor = (metric: string, value: number): string => {
    switch (metric) {
      case 'var95':
      case 'var99':
      case 'expectedShortfall':
      case 'maxDrawdown':
        // Lower is better for risk metrics
        if (value < 3) return 'text-green-600';
        if (value < 8) return 'text-yellow-600';
        return 'text-red-600';
      
      case 'sharpeRatio':
      case 'sortinoRatio':
      case 'calmarRatio':
      case 'informationRatio':
        // Higher is better for risk-adjusted returns
        if (value > 1.5) return 'text-green-600';
        if (value > 0.8) return 'text-yellow-600';
        return 'text-red-600';
      
      case 'omega':
      case 'gainToPainRatio':
        // Higher is better
        if (value > 2) return 'text-green-600';
        if (value > 1.5) return 'text-yellow-600';
        return 'text-red-600';
      
      default:
        return 'text-gray-900';
    }
  };

  const getRiskLevel = (var95: number): { level: string; color: string; description: string } => {
    if (var95 < 2) {
      return {
        level: 'Low Risk',
        color: 'text-green-600 bg-green-50 border-green-200',
        description: 'Conservative portfolio with low volatility'
      };
    } else if (var95 < 5) {
      return {
        level: 'Moderate Risk',
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        description: 'Balanced risk profile suitable for most investors'
      };
    } else if (var95 < 10) {
      return {
        level: 'High Risk',
        color: 'text-orange-600 bg-orange-50 border-orange-200',
        description: 'Aggressive portfolio with significant volatility'
      };
    } else {
      return {
        level: 'Very High Risk',
        color: 'text-red-600 bg-red-50 border-red-200',
        description: 'Speculative portfolio with extreme volatility'
      };
    }
  };

  const riskMetricsData = [
    {
      label: 'Value at Risk (95%)',
      value: riskMetrics?.var95 || 0,
      format: 'percentage',
      tooltip: 'Maximum expected loss at 95% confidence level',
      icon: (
        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Value at Risk (99%)',
      value: riskMetrics?.var99 || 0,
      format: 'percentage',
      tooltip: 'Maximum expected loss at 99% confidence level',
      icon: (
        <svg className="w-5 h-5 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Expected Shortfall',
      value: riskMetrics?.expectedShortfall || 0,
      format: 'percentage',
      tooltip: 'Average loss beyond VaR threshold',
      icon: (
        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
      ),
    },
    {
      label: 'Maximum Drawdown',
      value: periodMetrics.maxDrawdown,
      format: 'percentage',
      tooltip: 'Largest peak-to-trough decline',
      icon: (
        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      ),
    },
    {
      label: 'Sharpe Ratio',
      value: periodMetrics.sharpeRatio,
      format: 'decimal',
      tooltip: 'Risk-adjusted return (return per unit of risk)',
      icon: (
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      label: 'Sortino Ratio',
      value: periodMetrics.sortinoRatio,
      format: 'decimal',
      tooltip: 'Return per unit of downside risk',
      icon: (
        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      label: 'Calmar Ratio',
      value: riskMetrics?.calmarRatio || 0,
      format: 'decimal',
      tooltip: 'Annual return divided by maximum drawdown',
      icon: (
        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      ),
    },
    {
      label: 'Gain-to-Pain Ratio',
      value: riskMetrics?.gainToPainRatio || 0,
      format: 'decimal',
      tooltip: 'Sum of gains divided by sum of losses',
      icon: (
        <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      ),
    }
  ];

  const formatValue = (value: number, format: string): string => {
    switch (format) {
      case 'percentage':
        return formatPercentage(value);
      case 'decimal':
        return formatDecimal(value);
      default:
        return value.toString();
    }
  };

  const riskLevel = getRiskLevel(riskMetrics?.var95 || 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Risk Metrics</h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium border ${riskLevel.color}`}>
          {riskLevel.level}
        </div>
      </div>

      {/* Risk Level Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-gray-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-gray-800 mb-1">Risk Assessment</h4>
            <p className="text-sm text-gray-600">{riskLevel.description}</p>
            <p className="text-xs text-gray-500 mt-1">
              Based on 95% Value at Risk of {formatPercentage(riskMetrics?.var95 || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Risk Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {riskMetricsData.map((metric, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {metric.icon}
                <span className="text-sm font-medium text-gray-700">{metric.label}</span>
                {metric.tooltip && (
                  <div className="group relative">
                    <svg className="w-4 h-4 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                      {metric.tooltip}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className={`text-xl font-bold ${getRiskColor(metric.label.toLowerCase().replace(/[^a-z0-9]/g, ''), metric.value)}`}>
              {formatValue(metric.value, metric.format)}
            </div>
          </div>
        ))}
      </div>

      {/* Risk Analysis */}
      <div className="space-y-4">
        {/* VaR Explanation */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-blue-800 mb-1">Value at Risk Interpretation</h4>
              <p className="text-sm text-blue-700">
                There is a 95% probability that daily losses will not exceed {formatPercentage(riskMetrics?.var95 || 0)}.
                In extreme scenarios (1% of the time), losses could reach {formatPercentage(riskMetrics?.var99 || 0)} or more.
              </p>
            </div>
          </div>
        </div>

        {/* Risk-Adjusted Performance */}
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-green-800 mb-1">Risk-Adjusted Performance</h4>
              <div className="space-y-1 text-sm text-green-700">
                <div className="flex justify-between">
                  <span>Sharpe Ratio Quality:</span>
                  <span className="font-medium">
                    {periodMetrics.sharpeRatio > 1.5 ? 'Excellent' : 
                     periodMetrics.sharpeRatio > 1.0 ? 'Good' :
                     periodMetrics.sharpeRatio > 0.5 ? 'Fair' : 'Poor'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Downside Protection:</span>
                  <span className="font-medium">
                    {periodMetrics.sortinoRatio > periodMetrics.sharpeRatio ? 'Strong' : 'Moderate'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trading Statistics */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-800 mb-2">Trading Performance</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Win Rate:</span>
              <span className="font-medium">{formatPercentage(periodMetrics.winRate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Trades:</span>
              <span className="font-medium">{periodMetrics.totalTrades}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Win:</span>
              <span className="font-medium text-green-600">{formatPercentage(periodMetrics.avgWin)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Loss:</span>
              <span className="font-medium text-red-600">{formatPercentage(periodMetrics.avgLoss)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Best Trade:</span>
              <span className="font-medium text-green-600">{formatPercentage(periodMetrics.largestGain)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Worst Trade:</span>
              <span className="font-medium text-red-600">{formatPercentage(periodMetrics.largestLoss)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
