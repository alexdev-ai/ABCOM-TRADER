import React from 'react';
import { PerformancePeriod } from '../../services/performanceAnalyticsApi';

interface BenchmarkComparisonProps {
  periodData: PerformancePeriod;
  benchmark: string;
}

export const BenchmarkComparison: React.FC<BenchmarkComparisonProps> = ({
  periodData,
  benchmark
}) => {
  const formatPercentage = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const formatDecimal = (value: number, decimals: number = 2): string => {
    return value.toFixed(decimals);
  };

  const getPerformanceColor = (value: number): string => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getPerformanceIcon = (value: number): JSX.Element => {
    if (value > 0) {
      return (
        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
        </svg>
      );
    }
    if (value < 0) {
      return (
        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    );
  };

  const benchmarkMetrics = [
    {
      label: 'Portfolio Return',
      value: periodData.metrics.totalReturnPercent,
      format: 'percentage',
      icon: (
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      label: `${benchmark} Return`,
      value: periodData.benchmark.benchmarkReturnPercent,
      format: 'percentage',
      icon: (
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      label: 'Alpha',
      value: periodData.benchmark.alpha,
      format: 'percentage',
      tooltip: 'Excess return over benchmark',
      icon: (
        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
    },
    {
      label: 'Beta',  
      value: periodData.benchmark.beta,
      format: 'decimal',
      tooltip: 'Sensitivity to market movements',
      icon: (
        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
      ),
    },
    {
      label: 'Correlation',
      value: periodData.benchmark.correlation,
      format: 'decimal',
      tooltip: 'Correlation with benchmark (-1 to 1)',
      icon: (
        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      ),
    },
    {
      label: 'Information Ratio',
      value: periodData.benchmark.informationRatio,
      format: 'decimal',
      tooltip: 'Alpha per unit of tracking error',
      icon: (
        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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

  const outperformance = periodData.metrics.totalReturnPercent - periodData.benchmark.benchmarkReturnPercent;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Benchmark Comparison</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">vs {benchmark}</span>
          <span className="text-sm text-gray-400">•</span>
          <span className="text-sm text-gray-600">{periodData.period}</span>
        </div>
      </div>

      {/* Outperformance Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getPerformanceIcon(outperformance)}
            <span className="text-sm font-medium text-gray-700">
              {outperformance >= 0 ? 'Outperforming' : 'Underperforming'}
            </span>
          </div>
          <div className={`text-lg font-bold ${getPerformanceColor(outperformance)}`}>
            {formatPercentage(outperformance)}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Portfolio performance relative to {benchmark} benchmark
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {benchmarkMetrics.map((metric, index) => (
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
            
            <div className={`text-xl font-bold ${metric.format === 'percentage' ? getPerformanceColor(metric.value) : 'text-gray-900'}`}>
              {formatValue(metric.value, metric.format)}
            </div>
          </div>
        ))}
      </div>

      {/* Beta Interpretation */}
      <div className="mt-6 bg-blue-50 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-800 mb-1">Risk Profile</h4>
            <p className="text-sm text-blue-700">
              {periodData.benchmark.beta > 1.2 
                ? `High risk: Portfolio is ${((periodData.benchmark.beta - 1) * 100).toFixed(0)}% more volatile than ${benchmark}`
                : periodData.benchmark.beta < 0.8
                ? `Low risk: Portfolio is ${((1 - periodData.benchmark.beta) * 100).toFixed(0)}% less volatile than ${benchmark}`
                : `Moderate risk: Portfolio volatility is similar to ${benchmark}`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Performance Analysis */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-800 mb-2">Performance Analysis</h4>
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Alpha Quality:</span>
            <span className={`font-medium ${periodData.benchmark.alpha > 2 ? 'text-green-600' : periodData.benchmark.alpha < -2 ? 'text-red-600' : 'text-yellow-600'}`}>
              {periodData.benchmark.alpha > 2 ? 'Excellent' : periodData.benchmark.alpha < -2 ? 'Poor' : 'Average'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Correlation Level:</span>
            <span className="font-medium">
              {Math.abs(periodData.benchmark.correlation) > 0.8 ? 'High' : Math.abs(periodData.benchmark.correlation) > 0.5 ? 'Moderate' : 'Low'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Tracking Error:</span>
            <span className="font-medium">{formatPercentage(periodData.benchmark.trackingError)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
