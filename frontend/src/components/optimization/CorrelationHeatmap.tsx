import React, { useState, useRef } from 'react';
import { TrendingUp, Info, Download } from 'lucide-react';

interface CorrelationData {
  symbols: string[];
  matrix: number[][];
  lastUpdated?: string;
}

interface CorrelationHeatmapProps {
  data: CorrelationData;
  title?: string;
  showValues?: boolean;
  colorScheme?: 'blue-red' | 'green-red' | 'rainbow';
  cellSize?: number;
  fontSize?: number;
  className?: string;
}

const CorrelationHeatmap: React.FC<CorrelationHeatmapProps> = ({
  data,
  title = 'Asset Correlation Matrix',
  showValues = true,
  colorScheme = 'blue-red',
  cellSize = 40,
  fontSize = 10,
  className = ''
}) => {
  const [hoveredCell, setHoveredCell] = useState<{
    row: number;
    col: number;
    value: number;
    symbolX: string;
    symbolY: string;
  } | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { symbols, matrix } = data;

  // Color scheme configurations
  const colorSchemes = {
    'blue-red': {
      negative: '#ef4444', // red
      neutral: '#ffffff',  // white
      positive: '#3b82f6'  // blue
    },
    'green-red': {
      negative: '#ef4444', // red
      neutral: '#ffffff',  // white
      positive: '#10b981'  // green
    },
    'rainbow': {
      negative: '#ef4444', // red
      neutral: '#fbbf24',  // yellow
      positive: '#10b981'  // green
    }
  };

  // Get color for correlation value
  const getCorrelationColor = (value: number): string => {
    const scheme = colorSchemes[colorScheme];
    const absValue = Math.abs(value);
    
    if (value > 0) {
      // Positive correlation: interpolate between neutral and positive
      const intensity = absValue;
      return interpolateColor(scheme.neutral, scheme.positive, intensity);
    } else if (value < 0) {
      // Negative correlation: interpolate between neutral and negative
      const intensity = absValue;
      return interpolateColor(scheme.neutral, scheme.negative, intensity);
    } else {
      return scheme.neutral;
    }
  };

  // Helper function to interpolate between two colors
  const interpolateColor = (color1: string, color2: string, factor: number): string => {
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');
    
    const r1 = parseInt(hex1.substr(0, 2), 16);
    const g1 = parseInt(hex1.substr(2, 2), 16);
    const b1 = parseInt(hex1.substr(4, 2), 16);
    
    const r2 = parseInt(hex2.substr(0, 2), 16);
    const g2 = parseInt(hex2.substr(2, 2), 16);
    const b2 = parseInt(hex2.substr(4, 2), 16);
    
    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  // Calculate dimensions
  const labelSpace = 80;
  const chartWidth = symbols.length * cellSize;
  const chartHeight = symbols.length * cellSize;
  const totalWidth = chartWidth + labelSpace;
  const totalHeight = chartHeight + labelSpace;

  // Get correlation strength description
  const getCorrelationStrength = (value: number): string => {
    const abs = Math.abs(value);
    if (abs >= 0.8) return 'Very Strong';
    if (abs >= 0.6) return 'Strong';
    if (abs >= 0.4) return 'Moderate';
    if (abs >= 0.2) return 'Weak';
    return 'Very Weak';
  };

  // Format correlation value
  const formatCorrelation = (value: number): string => {
    return value.toFixed(3);
  };

  // Export functionality
  const exportData = () => {
    const csvContent = [
      ['Symbol', ...symbols].join(','),
      ...symbols.map((symbol, i) => 
        [symbol, ...matrix[i].map(val => val.toFixed(3))].join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'correlation-matrix.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filter correlations for selected symbol
  const getSymbolCorrelations = (symbol: string) => {
    const index = symbols.indexOf(symbol);
    if (index === -1) return [];
    
    return symbols
      .map((s, i) => ({ symbol: s, correlation: matrix[index][i] }))
      .filter(item => item.symbol !== symbol)
      .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  };

  return (
    <div className={`relative ${className}`}>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Info className="h-4 w-4" />
              <span>Correlation Analysis</span>
            </div>
            <button
              onClick={exportData}
              className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Heatmap */}
          <div className="flex-1">
            <div className="overflow-auto">
              <svg
                ref={svgRef}
                width={totalWidth}
                height={totalHeight}
                className="overflow-visible"
              >
                {/* Y-axis labels */}
                {symbols.map((symbol, i) => (
                  <text
                    key={`y-${symbol}`}
                    x={labelSpace - 10}
                    y={labelSpace + i * cellSize + cellSize / 2}
                    textAnchor="end"
                    className={`fill-gray-700 text-xs font-medium cursor-pointer ${
                      selectedSymbol === symbol ? 'fill-blue-600 font-bold' : 'hover:fill-blue-600'
                    }`}
                    dy="0.35em"
                    onClick={() => setSelectedSymbol(selectedSymbol === symbol ? null : symbol)}
                  >
                    {symbol}
                  </text>
                ))}

                {/* X-axis labels */}
                {symbols.map((symbol, i) => (
                  <text
                    key={`x-${symbol}`}
                    x={labelSpace + i * cellSize + cellSize / 2}
                    y={labelSpace - 10}
                    textAnchor="middle"
                    className={`fill-gray-700 text-xs font-medium cursor-pointer ${
                      selectedSymbol === symbol ? 'fill-blue-600 font-bold' : 'hover:fill-blue-600'
                    }`}
                    transform={`rotate(-45 ${labelSpace + i * cellSize + cellSize / 2} ${labelSpace - 10})`}
                    onClick={() => setSelectedSymbol(selectedSymbol === symbol ? null : symbol)}
                  >
                    {symbol}
                  </text>
                ))}

                {/* Heatmap cells */}
                {matrix.map((row, i) =>
                  row.map((value, j) => {
                    const isHighlighted = selectedSymbol && 
                      (symbols[i] === selectedSymbol || symbols[j] === selectedSymbol);
                    const isDiagonal = i === j;
                    
                    return (
                      <g key={`cell-${i}-${j}`}>
                        <rect
                          x={labelSpace + j * cellSize}
                          y={labelSpace + i * cellSize}
                          width={cellSize}
                          height={cellSize}
                          fill={getCorrelationColor(value)}
                          stroke={isHighlighted ? '#3b82f6' : '#e5e7eb'}
                          strokeWidth={isHighlighted ? 2 : 1}
                          className={`cursor-pointer transition-all duration-200 ${
                            hoveredCell?.row === i && hoveredCell?.col === j
                              ? 'brightness-110 drop-shadow-md'
                              : isDiagonal
                                ? 'opacity-60'
                                : 'hover:brightness-105'
                          }`}
                          onMouseEnter={() => setHoveredCell({
                            row: i,
                            col: j,
                            value,
                            symbolX: symbols[j],
                            symbolY: symbols[i]
                          })}
                          onMouseLeave={() => setHoveredCell(null)}
                        />
                        
                        {/* Cell values */}
                        {showValues && cellSize >= 30 && (
                          <text
                            x={labelSpace + j * cellSize + cellSize / 2}
                            y={labelSpace + i * cellSize + cellSize / 2}
                            textAnchor="middle"
                            className={`pointer-events-none text-xs font-medium ${
                              Math.abs(value) > 0.5 ? 'fill-white' : 'fill-gray-800'
                            }`}
                            dy="0.35em"
                            fontSize={fontSize}
                          >
                            {formatCorrelation(value)}
                          </text>
                        )}
                      </g>
                    );
                  })
                )}
              </svg>
            </div>

            {/* Color scale legend */}
            <div className="mt-4 flex items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[-1, -0.5, 0, 0.5, 1].map((value, index) => (
                    <div
                      key={value}
                      className="w-6 h-4 border-r border-gray-300 last:border-r-0"
                      style={{ backgroundColor: getCorrelationColor(value) }}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-600 w-24">
                  <span>-1</span>
                  <span>0</span>
                  <span>1</span>
                </div>
              </div>
            </div>
          </div>

          {/* Side panel */}
          <div className="lg:w-80">
            {/* Hovered cell info */}
            {hoveredCell && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">
                  {hoveredCell.symbolY} ↔ {hoveredCell.symbolX}
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Correlation:</span>
                    <span className="font-medium text-blue-900">
                      {formatCorrelation(hoveredCell.value)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Strength:</span>
                    <span className="font-medium text-blue-900">
                      {getCorrelationStrength(hoveredCell.value)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Direction:</span>
                    <span className={`font-medium ${
                      hoveredCell.value > 0 ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {hoveredCell.value > 0 ? 'Positive' : 'Negative'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Selected symbol correlations */}
            {selectedSymbol && (
              <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  {selectedSymbol} Correlations
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {getSymbolCorrelations(selectedSymbol).slice(0, 10).map(item => (
                    <div key={item.symbol} className="flex justify-between items-center text-sm">
                      <span className="font-medium text-gray-700">{item.symbol}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${
                          item.correlation > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCorrelation(item.correlation)}
                        </span>
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getCorrelationColor(item.correlation) }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setSelectedSymbol(null)}
                  className="mt-2 text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear selection
                </button>
              </div>
            )}

            {/* Summary statistics */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Correlation Summary
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Assets:</span>
                  <span className="font-medium">{symbols.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Correlation:</span>
                  <span className="font-medium">
                    {formatCorrelation(
                      matrix.flat().filter((_, i, arr) => {
                        const row = Math.floor(i / symbols.length);
                        const col = i % symbols.length;
                        return row !== col; // Exclude diagonal
                      }).reduce((sum, val) => sum + Math.abs(val), 0) / 
                      (symbols.length * (symbols.length - 1))
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Strong Correlations:</span>
                  <span className="font-medium">
                    {matrix.flat().filter((val, i) => {
                      const row = Math.floor(i / symbols.length);
                      const col = i % symbols.length;
                      return row !== col && Math.abs(val) >= 0.6;
                    }).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Diversification:</span>
                  <span className={`font-medium ${
                    matrix.flat().filter((val, i) => {
                      const row = Math.floor(i / symbols.length);
                      const col = i % symbols.length;
                      return row !== col && Math.abs(val) >= 0.6;
                    }).length / (symbols.length * (symbols.length - 1)) < 0.2 
                      ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {matrix.flat().filter((val, i) => {
                      const row = Math.floor(i / symbols.length);
                      const col = i % symbols.length;
                      return row !== col && Math.abs(val) >= 0.6;
                    }).length / (symbols.length * (symbols.length - 1)) < 0.2 
                      ? 'Good' : 'Moderate'}
                  </span>
                </div>
              </div>
            </div>

            {/* Interpretation guide */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                Interpretation Guide
              </h4>
              <div className="space-y-1 text-xs text-blue-800">
                <div><strong>+1:</strong> Perfect positive correlation</div>
                <div><strong>0:</strong> No correlation</div>
                <div><strong>-1:</strong> Perfect negative correlation</div>
                <div className="mt-2">
                  <strong>Diversification:</strong> Lower correlations indicate better diversification
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorrelationHeatmap;
