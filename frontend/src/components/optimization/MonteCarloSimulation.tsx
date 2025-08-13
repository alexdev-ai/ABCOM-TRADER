import React, { useState, useRef } from 'react';
import { Activity, Play, Pause, RotateCcw, Download, TrendingUp, TrendingDown } from 'lucide-react';

interface SimulationResult {
  percentile: number;
  portfolioValue: number;
  return: number;
}

interface PathData {
  day: number;
  value: number;
  return: number;
}

interface MonteCarloData {
  simulations: number;
  timeHorizon: number; // in years
  initialValue: number;
  expectedReturn: number;
  volatility: number;
  results: SimulationResult[];
  paths: PathData[][];
  summary: {
    mean: number;
    median: number;
    standardDeviation: number;
    probabilityOfLoss: number;
    probabilityOfDoubling: number;
    valueAtRisk95: number;
    valueAtRisk99: number;
    expectedShortfall: number;
  };
}

interface MonteCarloSimulationProps {
  data: MonteCarloData;
  title?: string;
  onRunSimulation?: (simulations: number, timeHorizon: number) => Promise<void>;
  isRunning?: boolean;
  className?: string;
}

const MonteCarloSimulation: React.FC<MonteCarloSimulationProps> = ({
  data,
  title = 'Monte Carlo Simulation',
  onRunSimulation,
  isRunning = false,
  className = ''
}) => {
  const [selectedPercentile, setSelectedPercentile] = useState<number | null>(null);
  const [showPaths, setShowPaths] = useState(false);
  const [pathCount, setPathCount] = useState(100);
  const [simulationParams, setSimulationParams] = useState({
    simulations: data.simulations || 10000,
    timeHorizon: data.timeHorizon || 10
  });
  const svgRef = useRef<SVGSVGElement>(null);

  // Chart dimensions
  const width = 800;
  const height = 400;
  const margin = { top: 20, right: 20, bottom: 60, left: 80 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  // Get percentile color
  const getPercentileColor = (percentile: number) => {
    if (percentile >= 90) return '#10b981'; // Green
    if (percentile >= 75) return '#3b82f6'; // Blue
    if (percentile >= 50) return '#f59e0b'; // Yellow
    if (percentile >= 25) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  // Calculate scales for paths chart
  const allValues = data.paths.flat().map(p => p.value);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const maxDays = Math.max(...data.paths.map(path => Math.max(...path.map(p => p.day))));

  const xScale = (day: number) => (day / maxDays) * chartWidth;
  const yScale = (value: number) => chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;

  // Export simulation results
  const exportResults = () => {
    const csvContent = [
      ['Percentile', 'Portfolio Value', 'Return'],
      ...data.results.map(result => [
        result.percentile.toFixed(1),
        result.portfolioValue.toFixed(2),
        (result.return * 100).toFixed(2)
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'monte-carlo-results.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Key percentiles for display
  const keyPercentiles = [5, 10, 25, 50, 75, 90, 95];
  const keyResults = keyPercentiles.map(p => 
    data.results.find(r => Math.abs(r.percentile - p) < 0.5) || 
    data.results.reduce((closest, current) => 
      Math.abs(current.percentile - p) < Math.abs(closest.percentile - p) ? current : closest
    )
  );

  return (
    <div className={`relative ${className}`}>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
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

        {/* Simulation Controls */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Simulations
              </label>
              <input
                type="number"
                value={simulationParams.simulations}
                onChange={(e) => setSimulationParams(prev => ({
                  ...prev,
                  simulations: parseInt(e.target.value) || 10000
                }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1000"
                max="100000"
                step="1000"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Horizon (Years)
              </label>
              <input
                type="number"
                value={simulationParams.timeHorizon}
                onChange={(e) => setSimulationParams(prev => ({
                  ...prev,
                  timeHorizon: parseInt(e.target.value) || 10
                }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
                max="50"
                step="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Return
              </label>
              <div className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-md text-gray-600">
                {formatPercentage(data.expectedReturn)}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Volatility
              </label>
              <div className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-md text-gray-600">
                {formatPercentage(data.volatility)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onRunSimulation && (
              <button
                onClick={() => onRunSimulation(simulationParams.simulations, simulationParams.timeHorizon)}
                disabled={isRunning}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunning ? (
                  <>
                    <Activity className="h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run Simulation
                  </>
                )}
              </button>
            )}
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showPaths"
                checked={showPaths}
                onChange={(e) => setShowPaths(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <label htmlFor="showPaths" className="text-sm text-gray-700">
                Show sample paths
              </label>
            </div>

            {showPaths && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Paths:</label>
                <input
                  type="number"
                  value={pathCount}
                  onChange={(e) => setPathCount(parseInt(e.target.value) || 100)}
                  className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="10"
                  max="500"
                  step="10"
                />
              </div>
            )}
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-blue-600 text-xs font-medium mb-1">Mean</div>
            <div className="text-lg font-bold text-blue-900">
              {formatCurrency(data.summary.mean)}
            </div>
            <div className="text-xs text-blue-700">
              {formatPercentage((data.summary.mean - data.initialValue) / data.initialValue)}
            </div>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-green-600 text-xs font-medium mb-1">Median</div>
            <div className="text-lg font-bold text-green-900">
              {formatCurrency(data.summary.median)}
            </div>
            <div className="text-xs text-green-700">
              {formatPercentage((data.summary.median - data.initialValue) / data.initialValue)}
            </div>
          </div>

          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-yellow-600 text-xs font-medium mb-1">Prob. of Loss</div>
            <div className="text-lg font-bold text-yellow-900">
              {formatPercentage(data.summary.probabilityOfLoss)}
            </div>
            <div className="text-xs text-yellow-700">Risk level</div>
          </div>

          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-purple-600 text-xs font-medium mb-1">VaR 95%</div>
            <div className="text-lg font-bold text-purple-900">
              {formatCurrency(data.summary.valueAtRisk95)}
            </div>
            <div className="text-xs text-purple-700">Worst 5%</div>
          </div>

          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-red-600 text-xs font-medium mb-1">VaR 99%</div>
            <div className="text-lg font-bold text-red-900">
              {formatCurrency(data.summary.valueAtRisk99)}
            </div>
            <div className="text-xs text-red-700">Worst 1%</div>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-gray-600 text-xs font-medium mb-1">Volatility</div>
            <div className="text-lg font-bold text-gray-900">
              {formatCurrency(data.summary.standardDeviation)}
            </div>
            <div className="text-xs text-gray-700">Std deviation</div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Results Chart/Table */}
          <div className="flex-1">
            {showPaths && data.paths.length > 0 ? (
              /* Paths Chart */
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Sample Paths ({Math.min(pathCount, data.paths.length)})
                </h4>
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
                        <pattern id="grid-monte" width="50" height="50" patternUnits="userSpaceOnUse">
                          <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
                        </pattern>
                      </defs>
                      <rect
                        x={0}
                        y={0}
                        width={chartWidth}
                        height={chartHeight}
                        fill="url(#grid-monte)"
                      />

                      {/* Axes */}
                      <line x1={0} y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#374151" strokeWidth={2} />
                      <line x1={0} y1={0} x2={0} y2={chartHeight} stroke="#374151" strokeWidth={2} />

                      {/* Sample paths */}
                      {data.paths.slice(0, pathCount).map((path, pathIndex) => (
                        <path
                          key={pathIndex}
                          d={`M ${path.map(point => `${xScale(point.day)},${yScale(point.value)}`).join(' L ')}`}
                          fill="none"
                          stroke={`rgba(59, 130, 246, ${0.1 + (pathIndex % 10) * 0.05})`}
                          strokeWidth={1}
                        />
                      ))}

                      {/* Initial value line */}
                      <line
                        x1={0}
                        y1={yScale(data.initialValue)}
                        x2={chartWidth}
                        y2={yScale(data.initialValue)}
                        stroke="#6b7280"
                        strokeWidth={2}
                        strokeDasharray="5,5"
                      />

                      {/* X-axis labels */}
                      {[0, 0.25, 0.5, 0.75, 1].map(t => {
                        const year = t * data.timeHorizon;
                        const x = t * chartWidth;
                        return (
                          <g key={t}>
                            <line x1={x} y1={chartHeight} x2={x} y2={chartHeight + 5} stroke="#374151" strokeWidth={1} />
                            <text x={x} y={chartHeight + 20} textAnchor="middle" className="fill-gray-600 text-xs">
                              {year.toFixed(0)}y
                            </text>
                          </g>
                        );
                      })}

                      {/* Y-axis labels */}
                      {[0, 0.25, 0.5, 0.75, 1].map(t => {
                        const value = minValue + t * (maxValue - minValue);
                        const y = chartHeight - t * chartHeight;
                        return (
                          <g key={t}>
                            <line x1={-5} y1={y} x2={0} y2={y} stroke="#374151" strokeWidth={1} />
                            <text x={-10} y={y + 4} textAnchor="end" className="fill-gray-600 text-xs">
                              {formatCurrency(value)}
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
                      Time (Years)
                    </text>
                    <text
                      x={15}
                      y={height / 2}
                      textAnchor="middle"
                      className="fill-gray-700 text-sm font-medium"
                      transform={`rotate(-90 15 ${height / 2})`}
                    >
                      Portfolio Value
                    </text>
                  </svg>
                </div>
              </div>
            ) : (
              /* Results Distribution */
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Outcome Distribution
                </h4>
                <div className="space-y-2">
                  {keyResults.map((result) => (
                    <div
                      key={result.percentile}
                      className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                        selectedPercentile === result.percentile
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedPercentile(
                        selectedPercentile === result.percentile ? null : result.percentile
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: getPercentileColor(result.percentile) }}
                          />
                          <span className="font-medium text-gray-900">
                            {result.percentile}th Percentile
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(result.portfolioValue)}
                          </div>
                          <div className={`text-sm ${
                            result.return > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {result.return > 0 ? '+' : ''}{formatPercentage(result.return)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Side Panel */}
          <div className="lg:w-80">
            {/* Scenario Probabilities */}
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Scenario Probabilities</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Portfolio grows 2x+:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-green-600">
                      {formatPercentage(data.summary.probabilityOfDoubling)}
                    </span>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Portfolio loses money:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-red-600">
                      {formatPercentage(data.summary.probabilityOfLoss)}
                    </span>
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Portfolio beats initial:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-blue-600">
                      {formatPercentage(1 - data.summary.probabilityOfLoss)}
                    </span>
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Analysis */}
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="text-sm font-semibold text-yellow-900 mb-3">Risk Analysis</h4>
              <div className="space-y-2 text-sm text-yellow-800">
                <div>
                  <strong>Expected Shortfall:</strong> {formatCurrency(data.summary.expectedShortfall)}
                </div>
                <div>
                  <strong>Worst 5% Average:</strong> {formatCurrency(data.summary.valueAtRisk95)}
                </div>
                <div>
                  <strong>Worst 1% Average:</strong> {formatCurrency(data.summary.valueAtRisk99)}
                </div>
                <div className="text-xs mt-2 text-yellow-700">
                  These metrics show potential losses in adverse scenarios.
                </div>
              </div>
            </div>

            {/* Simulation Info */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-900 mb-3">Simulation Details</h4>
              <div className="space-y-2 text-sm text-blue-800">
                <div className="flex justify-between">
                  <span>Simulations:</span>
                  <span className="font-medium">{data.simulations.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time Horizon:</span>
                  <span className="font-medium">{data.timeHorizon} years</span>
                </div>
                <div className="flex justify-between">
                  <span>Initial Value:</span>
                  <span className="font-medium">{formatCurrency(data.initialValue)}</span>
                </div>
                <div className="text-xs mt-2 text-blue-700">
                  Results based on geometric Brownian motion with the specified parameters.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonteCarloSimulation;
