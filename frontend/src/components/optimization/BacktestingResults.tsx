import React, { useState, useRef } from 'react';
import { BarChart3, Calendar, TrendingUp, TrendingDown, Download, RefreshCw } from 'lucide-react';

interface BacktestPeriod {
  startDate: Date;
  endDate: Date;
  portfolioReturn: number;
  benchmarkReturn: number;
  excessReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  calmarRatio: number;
  winRate: number;
}

interface MonthlyReturn {
  date: Date;
  portfolioReturn: number;
  benchmarkReturn: number;
  excessReturn: number;
}

interface BacktestData {
  strategy: string;
  benchmark: string;
  startDate: Date;
  endDate: Date;
  periods: BacktestPeriod[];
  monthlyReturns: MonthlyReturn[];
  summary: {
    totalReturn: number;
    annualizedReturn: number;
    benchmarkReturn: number;
    alpha: number;
    beta: number;
    sharpeRatio: number;
    sortinoRatio: number;
    informationRatio: number;
    maxDrawdown: number;
    volatility: number;
    downDeviation: number;
    winRate: number;
    bestMonth: number;
    worstMonth: number;
    avgWinReturn: number;
    avgLossReturn: number;
  };
}

interface BacktestingResultsProps {
  data: BacktestData;
  title?: string;
  onRunBacktest?: (startDate: Date, endDate: Date) => Promise<void>;
  isRunning?: boolean;
  className?: string;
}

const BacktestingResults: React.FC<BacktestingResultsProps> = ({
  data,
  title = 'Backtesting Results',
  onRunBacktest,
  isRunning = false,
  className = ''
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<BacktestPeriod | null>(null);
  const [viewMode, setViewMode] = useState<'performance' | 'drawdown' | 'rolling'>('performance');
  const [rollingWindow, setRollingWindow] = useState(12); // months
  const [backtestParams, setBacktestParams] = useState({
    startDate: data.startDate ? new Date(data.startDate) : new Date(new Date().getFullYear() - 5, 0, 1),
    endDate: data.endDate ? new Date(data.endDate) : new Date()
  });
  const svgRef = useRef<SVGSVGElement>(null);

  // Chart dimensions
  const width = 900;
  const height = 400;
  const margin = { top: 20, right: 20, bottom: 60, left: 80 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Format functions
  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  // Calculate cumulative returns for chart
  const calculateCumulativeReturns = () => {
    let portfolioCumulative = 1;
    let benchmarkCumulative = 1;
    
    return data.monthlyReturns.map((monthData, index) => {
      portfolioCumulative *= (1 + monthData.portfolioReturn);
      benchmarkCumulative *= (1 + monthData.benchmarkReturn);
      
      return {
        date: monthData.date,
        portfolioValue: portfolioCumulative,
        benchmarkValue: benchmarkCumulative,
        portfolioReturn: portfolioCumulative - 1,
        benchmarkReturn: benchmarkCumulative - 1,
        excessReturn: (portfolioCumulative - 1) - (benchmarkCumulative - 1)
      };
    });
  };

  const cumulativeReturns = calculateCumulativeReturns();

  // Calculate rolling metrics
  const calculateRollingMetrics = () => {
    if (data.monthlyReturns.length < rollingWindow) return [];
    
    const rollingMetrics = [];
    for (let i = rollingWindow - 1; i < data.monthlyReturns.length; i++) {
      const windowReturns = data.monthlyReturns.slice(i - rollingWindow + 1, i + 1);
      
      const portfolioReturns = windowReturns.map(r => r.portfolioReturn);
      const benchmarkReturns = windowReturns.map(r => r.benchmarkReturn);
      
      const portfolioMean = portfolioReturns.reduce((sum, r) => sum + r, 0) / portfolioReturns.length;
      const benchmarkMean = benchmarkReturns.reduce((sum, r) => sum + r, 0) / benchmarkReturns.length;
      
      const portfolioStd = Math.sqrt(
        portfolioReturns.reduce((sum, r) => sum + Math.pow(r - portfolioMean, 2), 0) / portfolioReturns.length
      );
      
      const sharpeRatio = portfolioMean / portfolioStd * Math.sqrt(12); // Annualized
      
      rollingMetrics.push({
        date: windowReturns[windowReturns.length - 1].date,
        sharpeRatio,
        alpha: portfolioMean - benchmarkMean,
        volatility: portfolioStd * Math.sqrt(12) // Annualized
      });
    }
    
    return rollingMetrics;
  };

  const rollingMetrics = calculateRollingMetrics();

  // Chart scales
  const chartData = viewMode === 'performance' ? cumulativeReturns : 
                   viewMode === 'rolling' ? rollingMetrics : cumulativeReturns;
                   
  const xScale = (date: Date) => {
    const startTime = data.monthlyReturns[0]?.date.getTime() || Date.now();
    const endTime = data.monthlyReturns[data.monthlyReturns.length - 1]?.date.getTime() || Date.now();
    return ((date.getTime() - startTime) / (endTime - startTime)) * chartWidth;
  };

  // Get performance color
  const getPerformanceColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  // Export results
  const exportResults = () => {
    const csvContent = [
      ['Date', 'Portfolio Return', 'Benchmark Return', 'Excess Return'],
      ...data.monthlyReturns.map(row => [
        row.date.toISOString().split('T')[0],
        (row.portfolioReturn * 100).toFixed(2),
        (row.benchmarkReturn * 100).toFixed(2),
        (row.excessReturn * 100).toFixed(2)
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'backtest-results.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Get chart Y-scale based on view mode
  const getYScale = () => {
    if (viewMode === 'performance') {
      const values = cumulativeReturns.flatMap(d => [d.portfolioValue, d.benchmarkValue]);
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      return (value: number) => chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;
    } else if (viewMode === 'rolling') {
      const values = rollingMetrics.map(d => d.sharpeRatio);
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      return (value: number) => chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;
    }
    return (value: number) => chartHeight / 2;
  };

  const yScale = getYScale();

  return (
    <div className={`relative ${className}`}>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportResults}
              className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Export Results
            </button>
          </div>
        </div>

        {/* Backtest Controls */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={backtestParams.startDate.toISOString().split('T')[0]}
                onChange={(e) => setBacktestParams(prev => ({
                  ...prev,
                  startDate: new Date(e.target.value)
                }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={backtestParams.endDate.toISOString().split('T')[0]}
                onChange={(e) => setBacktestParams(prev => ({
                  ...prev,
                  endDate: new Date(e.target.value)
                }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Strategy
              </label>
              <div className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-md text-gray-600">
                {data.strategy}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Benchmark
              </label>
              <div className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-md text-gray-600">
                {data.benchmark}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {onRunBacktest && (
              <button
                onClick={() => onRunBacktest(backtestParams.startDate, backtestParams.endDate)}
                disabled={isRunning}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4" />
                    Run Backtest
                  </>
                )}
              </button>
            )}

            {/* View Mode Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">View:</label>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as any)}
                className="text-sm px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="performance">Performance</option>
                <option value="drawdown">Drawdown</option>
                <option value="rolling">Rolling Metrics</option>
              </select>
            </div>

            {viewMode === 'rolling' && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Window:</label>
                <input
                  type="number"
                  value={rollingWindow}
                  onChange={(e) => setRollingWindow(parseInt(e.target.value) || 12)}
                  className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="3"
                  max="60"
                  step="1"
                />
                <span className="text-sm text-gray-600">months</span>
              </div>
            )}
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-blue-600 text-xs font-medium mb-1">Total Return</div>
            <div className={`text-lg font-bold ${getPerformanceColor(data.summary.totalReturn)}`}>
              {formatPercentage(data.summary.totalReturn)}
            </div>
            <div className="text-xs text-blue-700">Portfolio</div>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-gray-600 text-xs font-medium mb-1">Benchmark</div>
            <div className={`text-lg font-bold ${getPerformanceColor(data.summary.benchmarkReturn)}`}>
              {formatPercentage(data.summary.benchmarkReturn)}
            </div>
            <div className="text-xs text-gray-700">Total return</div>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-green-600 text-xs font-medium mb-1">Alpha</div>
            <div className={`text-lg font-bold ${getPerformanceColor(data.summary.alpha)}`}>
              {formatPercentage(data.summary.alpha)}
            </div>
            <div className="text-xs text-green-700">Excess return</div>
          </div>

          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-purple-600 text-xs font-medium mb-1">Sharpe Ratio</div>
            <div className="text-lg font-bold text-purple-900">
              {data.summary.sharpeRatio.toFixed(2)}
            </div>
            <div className="text-xs text-purple-700">Risk-adjusted</div>
          </div>

          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-yellow-600 text-xs font-medium mb-1">Max Drawdown</div>
            <div className="text-lg font-bold text-red-600">
              {formatPercentage(Math.abs(data.summary.maxDrawdown))}
            </div>
            <div className="text-xs text-yellow-700">Worst decline</div>
          </div>

          <div className="text-center p-4 bg-indigo-50 rounded-lg">
            <div className="text-indigo-600 text-xs font-medium mb-1">Information Ratio</div>
            <div className="text-lg font-bold text-indigo-900">
              {data.summary.informationRatio.toFixed(2)}
            </div>
            <div className="text-xs text-indigo-700">Alpha quality</div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Chart */}
          <div className="flex-1">
            <div className="mb-4">
              <h4 className="text-lg font-semibold text-gray-900">
                {viewMode === 'performance' && 'Cumulative Performance'}
                {viewMode === 'drawdown' && 'Drawdown Analysis'}
                {viewMode === 'rolling' && `Rolling ${rollingWindow}-Month Sharpe Ratio`}
              </h4>
            </div>
            
            <div className="overflow-auto">
              <svg
                ref={svgRef}
                width={width}
                height={height}
                className="overflow-visible"
              >
                {/* Chart area */}
                <g transform={`translate(${margin.left}, ${margin.top})`}>
                  {/* Grid lines */}
                  <defs>
                    <pattern id="grid-backtest" width="50" height="50" patternUnits="userSpaceOnUse">
                      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect
                    x={0}
                    y={0}
                    width={chartWidth}
                    height={chartHeight}
                    fill="url(#grid-backtest)"
                  />

                  {/* Axes */}
                  <line x1={0} y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#374151" strokeWidth={2} />
                  <line x1={0} y1={0} x2={0} y2={chartHeight} stroke="#374151" strokeWidth={2} />

                  {viewMode === 'performance' && (
                    <>
                      {/* Portfolio line */}
                      <path
                        d={`M ${cumulativeReturns.map(d => `${xScale(d.date)},${yScale(d.portfolioValue)}`).join(' L ')}`}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth={2}
                      />
                      
                      {/* Benchmark line */}
                      <path
                        d={`M ${cumulativeReturns.map(d => `${xScale(d.date)},${yScale(d.benchmarkValue)}`).join(' L ')}`}
                        fill="none"
                        stroke="#6b7280"
                        strokeWidth={2}
                        strokeDasharray="5,5"
                      />
                    </>
                  )}

                  {viewMode === 'rolling' && (
                    <path
                      d={`M ${rollingMetrics.map(d => `${xScale(d.date)},${yScale(d.sharpeRatio)}`).join(' L ')}`}
                      fill="none"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                    />
                  )}

                  {/* X-axis labels */}
                  {[0, 0.25, 0.5, 0.75, 1].map(t => {
                    const dateIndex = Math.floor(t * (data.monthlyReturns.length - 1));
                    const date = data.monthlyReturns[dateIndex]?.date;
                    if (!date) return null;
                    const x = t * chartWidth;
                    return (
                      <g key={t}>
                        <line x1={x} y1={chartHeight} x2={x} y2={chartHeight + 5} stroke="#374151" strokeWidth={1} />
                        <text x={x} y={chartHeight + 20} textAnchor="middle" className="fill-gray-600 text-xs">
                          {formatDate(date)}
                        </text>
                      </g>
                    );
                  })}
                </g>

                {/* Axis labels */}
                <text
                  x={width / 2}
                  y={height - 10}
                  textAnchor="middle"
                  className="fill-gray-700 text-sm font-medium"
                >
                  Time
                </text>
                <text
                  x={15}
                  y={height / 2}
                  textAnchor="middle"
                  className="fill-gray-700 text-sm font-medium"
                  transform={`rotate(-90 15 ${height / 2})`}
                >
                  {viewMode === 'performance' && 'Cumulative Return'}
                  {viewMode === 'drawdown' && 'Drawdown'}
                  {viewMode === 'rolling' && 'Sharpe Ratio'}
                </text>
              </svg>
            </div>

            {/* Legend */}
            {viewMode === 'performance' && (
              <div className="mt-4 flex items-center justify-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-blue-500"></div>
                  <span className="text-sm text-gray-700">Portfolio</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-gray-500 border-dashed"></div>
                  <span className="text-sm text-gray-700">Benchmark ({data.benchmark})</span>
                </div>
              </div>
            )}
          </div>

          {/* Side Panel */}
          <div className="lg:w-80">
            {/* Performance Metrics */}
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Performance Metrics</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Annualized Return:</span>
                  <span className={`font-medium ${getPerformanceColor(data.summary.annualizedReturn)}`}>
                    {formatPercentage(data.summary.annualizedReturn)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Volatility:</span>
                  <span className="font-medium text-gray-900">
                    {formatPercentage(data.summary.volatility)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Beta:</span>
                  <span className="font-medium text-gray-900">
                    {data.summary.beta.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sortino Ratio:</span>
                  <span className="font-medium text-gray-900">
                    {data.summary.sortinoRatio.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Win Rate:</span>
                  <span className="font-medium text-gray-900">
                    {formatPercentage(data.summary.winRate)}
                  </span>
                </div>
              </div>
            </div>

            {/* Monthly Statistics */}
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="text-sm font-semibold text-green-900 mb-3">Monthly Statistics</h4>
              <div className="space-y-2 text-sm text-green-800">
                <div className="flex justify-between">
                  <span>Best Month:</span>
                  <span className="font-medium text-green-600">
                    {formatPercentage(data.summary.bestMonth)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Worst Month:</span>
                  <span className="font-medium text-red-600">
                    {formatPercentage(data.summary.worstMonth)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Win:</span>
                  <span className="font-medium text-green-600">
                    {formatPercentage(data.summary.avgWinReturn)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Loss:</span>
                  <span className="font-medium text-red-600">
                    {formatPercentage(data.summary.avgLossReturn)}
                  </span>
                </div>
              </div>
            </div>

            {/* Risk Analysis */}
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="text-sm font-semibold text-red-900 mb-3">Risk Analysis</h4>
              <div className="space-y-2 text-sm text-red-800">
                <div className="flex justify-between">
                  <span>Max Drawdown:</span>
                  <span className="font-medium text-red-600">
                    {formatPercentage(Math.abs(data.summary.maxDrawdown))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Down Deviation:</span>
                  <span className="font-medium">
                    {formatPercentage(data.summary.downDeviation)}
                  </span>
                </div>
                <div className="text-xs mt-2 text-red-700">
                  Drawdown shows the maximum peak-to-trough decline during the backtest period.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BacktestingResults;
