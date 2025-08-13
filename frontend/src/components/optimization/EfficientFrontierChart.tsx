import React, { useEffect, useRef, useState } from 'react';
import { TrendingUp, Info } from 'lucide-react';

interface EfficientFrontierPoint {
  risk: number;
  return: number;
  allocation: { [symbol: string]: number };
  sharpeRatio: number;
}

interface EfficientFrontierChartProps {
  frontierData: EfficientFrontierPoint[];
  currentPortfolio?: {
    risk: number;
    return: number;
    label: string;
  };
  targetPortfolio?: {
    risk: number;
    return: number;
    label: string;
  };
  onPointClick?: (point: EfficientFrontierPoint) => void;
  width?: number;
  height?: number;
  className?: string;
}

const EfficientFrontierChart: React.FC<EfficientFrontierChartProps> = ({
  frontierData,
  currentPortfolio,
  targetPortfolio,
  onPointClick,
  width = 600,
  height = 400,
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<EfficientFrontierPoint | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Chart dimensions and margins
  const margin = { top: 20, right: 20, bottom: 60, left: 80 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Calculate scales
  const allRisks = [
    ...frontierData.map(p => p.risk),
    ...(currentPortfolio ? [currentPortfolio.risk] : []),
    ...(targetPortfolio ? [targetPortfolio.risk] : [])
  ];
  const allReturns = [
    ...frontierData.map(p => p.return),
    ...(currentPortfolio ? [currentPortfolio.return] : []),
    ...(targetPortfolio ? [targetPortfolio.return] : [])
  ];

  const minRisk = Math.min(...allRisks);
  const maxRisk = Math.max(...allRisks);
  const minReturn = Math.min(...allReturns);
  const maxReturn = Math.max(...allReturns);

  // Add some padding to the scales
  const riskPadding = (maxRisk - minRisk) * 0.1;
  const returnPadding = (maxReturn - minReturn) * 0.1;

  const xScale = (risk: number) => ((risk - minRisk + riskPadding) / (maxRisk - minRisk + 2 * riskPadding)) * chartWidth;
  const yScale = (ret: number) => chartHeight - ((ret - minReturn + returnPadding) / (maxReturn - minReturn + 2 * returnPadding)) * chartHeight;

  // Generate path for efficient frontier curve
  const generatePath = () => {
    if (frontierData.length === 0) return '';
    
    const sortedData = [...frontierData].sort((a, b) => a.risk - b.risk);
    let path = `M ${xScale(sortedData[0].risk)} ${yScale(sortedData[0].return)}`;
    
    for (let i = 1; i < sortedData.length; i++) {
      path += ` L ${xScale(sortedData[i].risk)} ${yScale(sortedData[i].return)}`;
    }
    
    return path;
  };

  // Find optimal portfolio (highest Sharpe ratio)
  const optimalPortfolio = frontierData.length > 0 
    ? frontierData.reduce((best, current) => 
        current.sharpeRatio > best.sharpeRatio ? current : best
      )
    : null;

  // Handle mouse events
  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    });
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <div className={`relative ${className}`}>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Efficient Frontier</h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Info className="h-4 w-4" />
            <span>Risk vs Return Analysis</span>
          </div>
        </div>

        <div className="relative">
          <svg
            ref={svgRef}
            width={width}
            height={height}
            onMouseMove={handleMouseMove}
            className="overflow-visible"
          >
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect
              x={margin.left}
              y={margin.top}
              width={chartWidth}
              height={chartHeight}
              fill="url(#grid)"
            />

            {/* Axes */}
            <g transform={`translate(${margin.left}, ${margin.top})`}>
              {/* X-axis */}
              <line
                x1={0}
                y1={chartHeight}
                x2={chartWidth}
                y2={chartHeight}
                stroke="#374151"
                strokeWidth={2}
              />
              
              {/* Y-axis */}
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={chartHeight}
                stroke="#374151"
                strokeWidth={2}
              />

              {/* X-axis ticks and labels */}
              {[0, 0.25, 0.5, 0.75, 1].map(t => {
                const risk = minRisk - riskPadding + t * (maxRisk - minRisk + 2 * riskPadding);
                const x = t * chartWidth;
                return (
                  <g key={t}>
                    <line
                      x1={x}
                      y1={chartHeight}
                      x2={x}
                      y2={chartHeight + 5}
                      stroke="#374151"
                      strokeWidth={1}
                    />
                    <text
                      x={x}
                      y={chartHeight + 20}
                      textAnchor="middle"
                      className="fill-gray-600 text-xs"
                    >
                      {formatPercentage(risk)}
                    </text>
                  </g>
                );
              })}

              {/* Y-axis ticks and labels */}
              {[0, 0.25, 0.5, 0.75, 1].map(t => {
                const ret = minReturn - returnPadding + t * (maxReturn - minReturn + 2 * returnPadding);
                const y = chartHeight - t * chartHeight;
                return (
                  <g key={t}>
                    <line
                      x1={-5}
                      y1={y}
                      x2={0}
                      y2={y}
                      stroke="#374151"
                      strokeWidth={1}
                    />
                    <text
                      x={-10}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-gray-600 text-xs"
                    >
                      {formatPercentage(ret)}
                    </text>
                  </g>
                );
              })}

              {/* Efficient frontier curve */}
              {frontierData.length > 0 && (
                <path
                  d={generatePath()}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  className="drop-shadow-sm"
                />
              )}

              {/* Frontier points */}
              {frontierData.map((point, index) => (
                <circle
                  key={index}
                  cx={xScale(point.risk)}
                  cy={yScale(point.return)}
                  r={4}
                  fill="#3b82f6"
                  stroke="#ffffff"
                  strokeWidth={2}
                  className="cursor-pointer hover:r-6 transition-all duration-200"
                  onMouseEnter={() => setHoveredPoint(point)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  onClick={() => onPointClick?.(point)}
                />
              ))}

              {/* Optimal portfolio (highest Sharpe ratio) */}
              {optimalPortfolio && (
                <g>
                  <circle
                    cx={xScale(optimalPortfolio.risk)}
                    cy={yScale(optimalPortfolio.return)}
                    r={6}
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth={3}
                    className="drop-shadow-md"
                  />
                  <circle
                    cx={xScale(optimalPortfolio.risk)}
                    cy={yScale(optimalPortfolio.return)}
                    r={12}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="4,4"
                    className="animate-pulse"
                  />
                </g>
              )}

              {/* Current portfolio */}
              {currentPortfolio && (
                <g>
                  <circle
                    cx={xScale(currentPortfolio.risk)}
                    cy={yScale(currentPortfolio.return)}
                    r={6}
                    fill="#ef4444"
                    stroke="#ffffff"
                    strokeWidth={3}
                  />
                  <text
                    x={xScale(currentPortfolio.risk)}
                    y={yScale(currentPortfolio.return) - 15}
                    textAnchor="middle"
                    className="fill-gray-700 text-xs font-medium"
                  >
                    {currentPortfolio.label}
                  </text>
                </g>
              )}

              {/* Target portfolio */}
              {targetPortfolio && (
                <g>
                  <circle
                    cx={xScale(targetPortfolio.risk)}
                    cy={yScale(targetPortfolio.return)}
                    r={6}
                    fill="#f59e0b"
                    stroke="#ffffff"
                    strokeWidth={3}
                  />
                  <text
                    x={xScale(targetPortfolio.risk)}
                    y={yScale(targetPortfolio.return) - 15}
                    textAnchor="middle"
                    className="fill-gray-700 text-xs font-medium"
                  >
                    {targetPortfolio.label}
                  </text>
                </g>
              )}
            </g>

            {/* Axis labels */}
            <text
              x={width / 2}
              y={height - 10}
              textAnchor="middle"
              className="fill-gray-700 text-sm font-medium"
            >
              Risk (Volatility)
            </text>
            <text
              x={15}
              y={height / 2}
              textAnchor="middle"
              className="fill-gray-700 text-sm font-medium"
              transform={`rotate(-90 15 ${height / 2})`}
            >
              Expected Return
            </text>
          </svg>

          {/* Tooltip */}
          {hoveredPoint && (
            <div
              className="absolute bg-gray-900 text-white p-3 rounded-lg shadow-lg pointer-events-none z-10 text-sm"
              style={{
                left: Math.min(mousePosition.x + 10, width - 200),
                top: mousePosition.y - 10,
                maxWidth: '200px'
              }}
            >
              <div className="font-medium mb-2">Portfolio Details</div>
              <div className="space-y-1">
                <div>Risk: {formatPercentage(hoveredPoint.risk)}</div>
                <div>Return: {formatPercentage(hoveredPoint.return)}</div>
                <div>Sharpe Ratio: {hoveredPoint.sharpeRatio.toFixed(2)}</div>
                <div className="mt-2 text-xs">
                  <div className="font-medium mb-1">Top Allocations:</div>
                  {Object.entries(hoveredPoint.allocation)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 3)
                    .map(([symbol, weight]) => (
                      <div key={symbol}>
                        {symbol}: {formatPercentage(weight)}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-blue-600"></div>
            <span className="text-gray-600">Efficient Frontier</span>
          </div>
          {optimalPortfolio && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-600">Optimal Portfolio</span>
            </div>
          )}
          {currentPortfolio && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-gray-600">Current Portfolio</span>
            </div>
          )}
          {targetPortfolio && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-gray-600">Target Portfolio</span>
            </div>
          )}
        </div>

        {optimalPortfolio && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg">
            <div className="text-sm font-medium text-green-800 mb-1">
              Optimal Portfolio (Highest Sharpe Ratio: {optimalPortfolio.sharpeRatio.toFixed(2)})
            </div>
            <div className="text-xs text-green-700">
              Risk: {formatPercentage(optimalPortfolio.risk)} | 
              Return: {formatPercentage(optimalPortfolio.return)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EfficientFrontierChart;
