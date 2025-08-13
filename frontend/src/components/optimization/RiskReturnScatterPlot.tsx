import React, { useState, useRef } from 'react';
import { BarChart3, Info, TrendingUp, TrendingDown } from 'lucide-react';

interface AssetData {
  symbol: string;
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  marketCap?: number;
  sector?: string;
  currentAllocation?: number;
  targetAllocation?: number;
}

interface RiskReturnScatterPlotProps {
  data: AssetData[];
  benchmarkData?: {
    symbol: string;
    expectedReturn: number;
    volatility: number;
    sharpeRatio: number;
  }[];
  title?: string;
  showBubbleSize?: boolean;
  colorBy?: 'sector' | 'sharpe' | 'allocation';
  width?: number;
  height?: number;
  className?: string;
}

const RiskReturnScatterPlot: React.FC<RiskReturnScatterPlotProps> = ({
  data,
  benchmarkData = [],
  title = 'Risk vs Return Analysis',
  showBubbleSize = true,
  colorBy = 'sector',
  width = 700,
  height = 500,
  className = ''
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<AssetData | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<AssetData | null>(null);
  const [filterSector, setFilterSector] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Chart dimensions and margins
  const margin = { top: 20, right: 20, bottom: 80, left: 80 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Calculate scales
  const allAssets = [...data, ...benchmarkData];
  const allRisks = allAssets.map(d => d.volatility);
  const allReturns = allAssets.map(d => d.expectedReturn);
  
  const minRisk = Math.min(...allRisks);
  const maxRisk = Math.max(...allRisks);
  const minReturn = Math.min(...allReturns);
  const maxReturn = Math.max(...allReturns);

  // Add padding to scales
  const riskPadding = (maxRisk - minRisk) * 0.1;
  const returnPadding = (maxReturn - minReturn) * 0.1;

  const xScale = (risk: number) => ((risk - minRisk + riskPadding) / (maxRisk - minRisk + 2 * riskPadding)) * chartWidth;
  const yScale = (ret: number) => chartHeight - ((ret - minReturn + returnPadding) / (maxReturn - minReturn + 2 * returnPadding)) * chartHeight;

  // Color schemes
  const sectorColors: { [key: string]: string } = {
    'Technology': '#3b82f6',
    'Healthcare': '#10b981',
    'Financial': '#f59e0b',
    'Consumer': '#ef4444',
    'Industrial': '#8b5cf6',
    'Energy': '#f97316',
    'Materials': '#06b6d4',
    'Utilities': '#84cc16',
    'Real Estate': '#ec4899',
    'Telecommunications': '#6366f1',
    'Default': '#6b7280'
  };

  // Get color for asset based on colorBy prop
  const getAssetColor = (asset: AssetData): string => {
    switch (colorBy) {
      case 'sector':
        return sectorColors[asset.sector || 'Default'] || sectorColors['Default'];
      case 'sharpe':
        if (asset.sharpeRatio > 1) return '#10b981'; // Green for good Sharpe
        if (asset.sharpeRatio > 0.5) return '#f59e0b'; // Yellow for moderate
        return '#ef4444'; // Red for poor
      case 'allocation':
        if (!asset.currentAllocation) return sectorColors['Default'];
        if (asset.currentAllocation > 0.1) return '#10b981'; // Large allocation
        if (asset.currentAllocation > 0.05) return '#f59e0b'; // Medium allocation
        return '#ef4444'; // Small allocation
      default:
        return sectorColors['Default'];
    }
  };

  // Get bubble size based on market cap or allocation
  const getBubbleSize = (asset: AssetData): number => {
    if (!showBubbleSize) return 6;
    
    if (asset.currentAllocation) {
      // Size based on allocation (3-15px radius)
      return Math.max(3, Math.min(15, asset.currentAllocation * 300));
    }
    
    if (asset.marketCap) {
      // Size based on market cap (normalized)
      const maxMarketCap = Math.max(...data.filter(d => d.marketCap).map(d => d.marketCap!));
      return Math.max(3, Math.min(15, (asset.marketCap / maxMarketCap) * 12 + 3));
    }
    
    return 6;
  };

  // Get unique sectors for legend
  const sectors = Array.from(new Set(data.map(d => d.sector).filter(Boolean)));

  // Filter data based on selected sector
  const filteredData = filterSector ? data.filter(d => d.sector === filterSector) : data;

  // Quadrant analysis
  const avgReturn = allReturns.reduce((sum, r) => sum + r, 0) / allReturns.length;
  const avgRisk = allRisks.reduce((sum, r) => sum + r, 0) / allRisks.length;

  const getQuadrant = (asset: AssetData): string => {
    if (asset.expectedReturn > avgReturn && asset.volatility < avgRisk) return 'High Return, Low Risk';
    if (asset.expectedReturn > avgReturn && asset.volatility > avgRisk) return 'High Return, High Risk';
    if (asset.expectedReturn < avgReturn && asset.volatility < avgRisk) return 'Low Return, Low Risk';
    return 'Low Return, High Risk';
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <div className={`relative ${className}`}>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <div className="flex items-center gap-4">
            {/* Color by selector */}
            <select
              value={colorBy}
              onChange={(e) => {
                setSelectedPoint(null);
                // Handle colorBy change if needed
              }}
              className="text-sm px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="sector">Color by Sector</option>
              <option value="sharpe">Color by Sharpe Ratio</option>
              <option value="allocation">Color by Allocation</option>
            </select>
            
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Info className="h-4 w-4" />
              <span>Risk vs Return</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Chart */}
          <div className="flex-1">
            <div className="relative">
              <svg
                ref={svgRef}
                width={width}
                height={height}
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

                {/* Chart area */}
                <g transform={`translate(${margin.left}, ${margin.top})`}>
                  {/* Quadrant divider lines */}
                  <line
                    x1={xScale(avgRisk)}
                    y1={0}
                    x2={xScale(avgRisk)}
                    y2={chartHeight}
                    stroke="#d1d5db"
                    strokeWidth={1}
                    strokeDasharray="5,5"
                  />
                  <line
                    x1={0}
                    y1={yScale(avgReturn)}
                    x2={chartWidth}
                    y2={yScale(avgReturn)}
                    stroke="#d1d5db"
                    strokeWidth={1}
                    strokeDasharray="5,5"
                  />

                  {/* Quadrant labels */}
                  <text x={xScale(avgRisk) - 5} y={15} textAnchor="end" className="fill-gray-400 text-xs">
                    Low Risk
                  </text>
                  <text x={xScale(avgRisk) + 5} y={15} textAnchor="start" className="fill-gray-400 text-xs">
                    High Risk
                  </text>
                  <text x={10} y={yScale(avgReturn) - 5} textAnchor="start" className="fill-gray-400 text-xs">
                    High Return
                  </text>
                  <text x={10} y={yScale(avgReturn) + 15} textAnchor="start" className="fill-gray-400 text-xs">
                    Low Return
                  </text>

                  {/* Axes */}
                  <line x1={0} y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#374151" strokeWidth={2} />
                  <line x1={0} y1={0} x2={0} y2={chartHeight} stroke="#374151" strokeWidth={2} />

                  {/* X-axis ticks and labels */}
                  {[0, 0.25, 0.5, 0.75, 1].map(t => {
                    const risk = minRisk - riskPadding + t * (maxRisk - minRisk + 2 * riskPadding);
                    const x = t * chartWidth;
                    return (
                      <g key={t}>
                        <line x1={x} y1={chartHeight} x2={x} y2={chartHeight + 5} stroke="#374151" strokeWidth={1} />
                        <text x={x} y={chartHeight + 20} textAnchor="middle" className="fill-gray-600 text-xs">
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
                        <line x1={-5} y1={y} x2={0} y2={y} stroke="#374151" strokeWidth={1} />
                        <text x={-10} y={y + 4} textAnchor="end" className="fill-gray-600 text-xs">
                          {formatPercentage(ret)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Benchmark points */}
                  {benchmarkData.map((benchmark, index) => (
                    <circle
                      key={`benchmark-${index}`}
                      cx={xScale(benchmark.volatility)}
                      cy={yScale(benchmark.expectedReturn)}
                      r={4}
                      fill="none"
                      stroke="#6b7280"
                      strokeWidth={2}
                      strokeDasharray="4,4"
                    />
                  ))}

                  {/* Asset points */}
                  {filteredData.map((asset, index) => {
                    const isSelected = selectedPoint?.symbol === asset.symbol;
                    const isHovered = hoveredPoint?.symbol === asset.symbol;
                    const bubbleSize = getBubbleSize(asset);
                    
                    return (
                      <g key={asset.symbol}>
                        <circle
                          cx={xScale(asset.volatility)}
                          cy={yScale(asset.expectedReturn)}
                          r={bubbleSize}
                          fill={getAssetColor(asset)}
                          stroke={isSelected ? '#1d4ed8' : isHovered ? '#374151' : '#ffffff'}
                          strokeWidth={isSelected ? 3 : isHovered ? 2 : 1}
                          className={`cursor-pointer transition-all duration-200 ${
                            isHovered ? 'brightness-110 drop-shadow-md' : 'hover:brightness-105'
                          }`}
                          onMouseEnter={() => setHoveredPoint(asset)}
                          onMouseLeave={() => setHoveredPoint(null)}
                          onClick={() => setSelectedPoint(selectedPoint?.symbol === asset.symbol ? null : asset)}
                        />
                        
                        {/* Asset labels for selected or large allocations */}
                        {(isSelected || (asset.currentAllocation && asset.currentAllocation > 0.08)) && (
                          <text
                            x={xScale(asset.volatility)}
                            y={yScale(asset.expectedReturn) - bubbleSize - 5}
                            textAnchor="middle"
                            className="fill-gray-700 text-xs font-medium pointer-events-none"
                          >
                            {asset.symbol}
                          </text>
                        )}
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
                <div className="absolute top-4 left-4 bg-gray-900 text-white p-3 rounded-lg shadow-lg pointer-events-none z-10 text-sm max-w-56">
                  <div className="font-medium mb-2">{hoveredPoint.symbol}</div>
                  <div className="space-y-1">
                    <div>Return: {formatPercentage(hoveredPoint.expectedReturn)}</div>
                    <div>Risk: {formatPercentage(hoveredPoint.volatility)}</div>
                    <div>Sharpe: {hoveredPoint.sharpeRatio.toFixed(2)}</div>
                    {hoveredPoint.sector && <div>Sector: {hoveredPoint.sector}</div>}
                    {hoveredPoint.currentAllocation && (
                      <div>Allocation: {formatPercentage(hoveredPoint.currentAllocation)}</div>
                    )}
                    <div className="text-xs text-gray-300 mt-1">
                      {getQuadrant(hoveredPoint)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Side panel */}
          <div className="lg:w-80">
            {/* Sector filter */}
            {colorBy === 'sector' && sectors.length > 0 && (
              <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Sectors</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => setFilterSector(null)}
                    className={`w-full text-left text-sm px-2 py-1 rounded ${
                      !filterSector ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'
                    }`}
                  >
                    All Sectors ({data.length})
                  </button>
                  {sectors.map(sector => (
                    <button
                      key={sector}
                      onClick={() => setFilterSector(sector || null)}
                      className={`w-full text-left text-sm px-2 py-1 rounded flex items-center gap-2 ${
                        filterSector === sector ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'
                      }`}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: sectorColors[sector!] }}
                      />
                      {sector} ({data.filter(d => d.sector === sector).length})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selected asset details */}
            {selectedPoint && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-lg font-semibold text-blue-900">
                    {selectedPoint.symbol}
                  </h4>
                  <button
                    onClick={() => setSelectedPoint(null)}
                    className="text-blue-600 hover:text-blue-800 p-1"
                  >
                    ×
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">Return:</span>
                    <div className="text-blue-900 font-semibold">
                      {formatPercentage(selectedPoint.expectedReturn)}
                    </div>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Risk:</span>
                    <div className="text-blue-900 font-semibold">
                      {formatPercentage(selectedPoint.volatility)}
                    </div>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Sharpe:</span>
                    <div className="text-blue-900 font-semibold">
                      {selectedPoint.sharpeRatio.toFixed(2)}
                    </div>
                  </div>
                  {selectedPoint.currentAllocation && (
                    <div>
                      <span className="text-blue-700 font-medium">Allocation:</span>
                      <div className="text-blue-900 font-semibold">
                        {formatPercentage(selectedPoint.currentAllocation)}
                      </div>
                    </div>
                  )}
                  {selectedPoint.sector && (
                    <div className="col-span-2">
                      <span className="text-blue-700 font-medium">Sector:</span>
                      <div className="text-blue-900 font-semibold">
                        {selectedPoint.sector}
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-3 text-xs text-blue-800">
                  <strong>Quadrant:</strong> {getQuadrant(selectedPoint)}
                </div>
              </div>
            )}

            {/* Risk/Return analysis */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Analysis</h4>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-gray-700">Best Risk-Adjusted</span>
                  </div>
                  <div className="text-gray-900">
                    {data.reduce((best, current) => 
                      current.sharpeRatio > best.sharpeRatio ? current : best
                    ).symbol} (Sharpe: {data.reduce((best, current) => 
                      current.sharpeRatio > best.sharpeRatio ? current : best
                    ).sharpeRatio.toFixed(2)})
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-gray-700">Highest Return</span>
                  </div>
                  <div className="text-gray-900">
                    {data.reduce((best, current) => 
                      current.expectedReturn > best.expectedReturn ? current : best
                    ).symbol} ({formatPercentage(data.reduce((best, current) => 
                      current.expectedReturn > best.expectedReturn ? current : best
                    ).expectedReturn)})
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-gray-700">Lowest Risk</span>
                  </div>
                  <div className="text-gray-900">
                    {data.reduce((best, current) => 
                      current.volatility < best.volatility ? current : best
                    ).symbol} ({formatPercentage(data.reduce((best, current) => 
                      current.volatility < best.volatility ? current : best
                    ).volatility)})
                  </div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Guide</h4>
              <div className="space-y-1 text-xs text-blue-800">
                <div><strong>Top-Left:</strong> High return, low risk (ideal)</div>
                <div><strong>Top-Right:</strong> High return, high risk</div>
                <div><strong>Bottom-Left:</strong> Low return, low risk (safe)</div>
                <div><strong>Bottom-Right:</strong> Low return, high risk (avoid)</div>
                {showBubbleSize && (
                  <div className="mt-2">
                    <strong>Bubble Size:</strong> {data.some(d => d.currentAllocation) ? 'Portfolio allocation' : 'Market cap'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskReturnScatterPlot;
