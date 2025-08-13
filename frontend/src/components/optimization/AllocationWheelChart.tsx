import React, { useState, useRef } from 'react';
import { PieChart, Info, Maximize2 } from 'lucide-react';

interface AllocationData {
  symbol: string;
  allocation: number;
  value: number;
  sector?: string;
  color?: string;
  percentage?: number;
}

interface AllocationWheelChartProps {
  data: AllocationData[];
  title?: string;
  showValues?: boolean;
  showPercentages?: boolean;
  groupByType?: 'none' | 'sector' | 'asset_class';
  minSliceThreshold?: number;
  width?: number;
  height?: number;
  className?: string;
}

const AllocationWheelChart: React.FC<AllocationWheelChartProps> = ({
  data,
  title = 'Portfolio Allocation',
  showValues = true,
  showPercentages = true,
  groupByType = 'none',
  minSliceThreshold = 0.02, // 2% minimum slice to show
  width = 400,
  height = 400,
  className = ''
}) => {
  const [hoveredSlice, setHoveredSlice] = useState<AllocationData | null>(null);
  const [selectedSlice, setSelectedSlice] = useState<AllocationData | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Default colors for slices
  const defaultColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
    '#14b8a6', '#eab308', '#dc2626', '#059669', '#7c3aed'
  ];

  // Process data for visualization
  const processedData = React.useMemo(() => {
    const totalValue = data.reduce((sum, item) => sum + item.value, 0);
    
    // Filter out very small allocations and group them as "Others"
    const significantItems = data.filter(item => item.allocation >= minSliceThreshold);
    const otherItems = data.filter(item => item.allocation < minSliceThreshold);
    
    let processedItems = [...significantItems];
    
    if (otherItems.length > 0) {
      const othersValue = otherItems.reduce((sum, item) => sum + item.value, 0);
      const othersAllocation = otherItems.reduce((sum, item) => sum + item.allocation, 0);
      
      processedItems.push({
        symbol: 'Others',
        allocation: othersAllocation,
        value: othersValue,
        sector: 'Mixed',
        color: '#9ca3af'
      });
    }

    // Add colors and calculate angles
    return processedItems.map((item, index) => ({
      ...item,
      color: item.color || defaultColors[index % defaultColors.length],
      percentage: (item.value / totalValue) * 100
    }));
  }, [data, minSliceThreshold]);

  // Calculate slice paths
  const generateSlicePath = (centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number, innerRadius = 0) => {
    const startAngleRad = (startAngle - 90) * Math.PI / 180;
    const endAngleRad = (endAngle - 90) * Math.PI / 180;
    
    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);
    
    const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
    
    if (innerRadius === 0) {
      // Simple pie slice
      return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    } else {
      // Donut slice
      const x3 = centerX + innerRadius * Math.cos(endAngleRad);
      const y3 = centerY + innerRadius * Math.sin(endAngleRad);
      const x4 = centerX + innerRadius * Math.cos(startAngleRad);
      const y4 = centerY + innerRadius * Math.sin(startAngleRad);
      
      return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
    }
  };

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 40;
  const innerRadius = radius * 0.4; // For donut chart

  let currentAngle = 0;
  const slices = processedData.map(item => {
    const angle = (item.allocation || 0) * 360;
    const slice = {
      ...item,
      startAngle: currentAngle,
      endAngle: currentAngle + angle,
      path: generateSlicePath(centerX, centerY, radius, currentAngle, currentAngle + angle, innerRadius),
      labelAngle: currentAngle + angle / 2,
      midAngle: (currentAngle + angle / 2) * Math.PI / 180
    };
    currentAngle += angle;
    return slice;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className={`relative ${className}`}>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Info className="h-4 w-4" />
            <span>Asset Allocation</span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Chart */}
          <div className="flex-1 flex justify-center">
            <div className="relative">
              <svg
                ref={svgRef}
                width={width}
                height={height}
                className="overflow-visible"
              >
                {/* Chart slices */}
                {slices.map((slice, index) => (
                  <g key={slice.symbol}>
                    {/* Main slice */}
                    <path
                      d={slice.path}
                      fill={slice.color}
                      stroke="#ffffff"
                      strokeWidth={2}
                      className={`cursor-pointer transition-all duration-200 ${
                        hoveredSlice?.symbol === slice.symbol || selectedSlice?.symbol === slice.symbol
                          ? 'brightness-110 drop-shadow-md' 
                          : 'hover:brightness-105'
                      }`}
                      onMouseEnter={() => setHoveredSlice(slice)}
                      onMouseLeave={() => setHoveredSlice(null)}
                      onClick={() => setSelectedSlice(selectedSlice?.symbol === slice.symbol ? null : slice)}
                    />
                    
                    {/* Label lines and text for larger slices */}
                    {slice.allocation >= 0.05 && ( // Show labels for slices >= 5%
                      <g>
                        {/* Label line */}
                        <line
                          x1={centerX + (radius + 10) * Math.cos(slice.midAngle - Math.PI / 2)}
                          y1={centerY + (radius + 10) * Math.sin(slice.midAngle - Math.PI / 2)}
                          x2={centerX + (radius + 30) * Math.cos(slice.midAngle - Math.PI / 2)}
                          y2={centerY + (radius + 30) * Math.sin(slice.midAngle - Math.PI / 2)}
                          stroke="#6b7280"
                          strokeWidth={1}
                        />
                        
                        {/* Label text */}
                        <text
                          x={centerX + (radius + 35) * Math.cos(slice.midAngle - Math.PI / 2)}
                          y={centerY + (radius + 35) * Math.sin(slice.midAngle - Math.PI / 2)}
                          textAnchor={slice.midAngle > Math.PI / 2 && slice.midAngle < 3 * Math.PI / 2 ? 'end' : 'start'}
                          className="fill-gray-700 text-xs font-medium"
                          dy="0.35em"
                        >
                          {slice.symbol}
                        </text>
                        
                        {/* Percentage text */}
                        {showPercentages && (
                          <text
                            x={centerX + (radius + 35) * Math.cos(slice.midAngle - Math.PI / 2)}
                            y={centerY + (radius + 35) * Math.sin(slice.midAngle - Math.PI / 2)}
                            textAnchor={slice.midAngle > Math.PI / 2 && slice.midAngle < 3 * Math.PI / 2 ? 'end' : 'start'}
                            className="fill-gray-500 text-xs"
                            dy="1.2em"
                          >
                            {formatPercentage(slice.percentage)}
                          </text>
                        )}
                      </g>
                    )}
                  </g>
                ))}

                {/* Center circle with total value */}
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={innerRadius - 10}
                  fill="#f9fafb"
                  stroke="#e5e7eb"
                  strokeWidth={2}
                />
                
                <text
                  x={centerX}
                  y={centerY - 10}
                  textAnchor="middle"
                  className="fill-gray-500 text-xs font-medium"
                >
                  Total Value
                </text>
                <text
                  x={centerX}
                  y={centerY + 8}
                  textAnchor="middle"
                  className="fill-gray-900 text-sm font-bold"
                >
                  {formatCurrency(data.reduce((sum, item) => sum + item.value, 0))}
                </text>
              </svg>

              {/* Tooltip */}
              {hoveredSlice && (
                <div className="absolute top-2 left-2 bg-gray-900 text-white p-3 rounded-lg shadow-lg pointer-events-none z-10 text-sm max-w-48">
                  <div className="font-medium mb-2">{hoveredSlice.symbol}</div>
                  <div className="space-y-1">
                    <div>Value: {formatCurrency(hoveredSlice.value)}</div>
                    <div>Allocation: {formatPercentage(hoveredSlice.percentage || 0)}</div>
                    {hoveredSlice.sector && hoveredSlice.sector !== 'Mixed' && (
                      <div>Sector: {hoveredSlice.sector}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="lg:w-64">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Holdings</h4>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {processedData
                .sort((a, b) => b.allocation - a.allocation)
                .map((item, index) => (
                  <div
                    key={item.symbol}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedSlice?.symbol === item.symbol
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedSlice(selectedSlice?.symbol === item.symbol ? null : item)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {item.symbol}
                        </div>
                        {item.sector && item.sector !== 'Mixed' && (
                          <div className="text-xs text-gray-500">
                            {item.sector}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatPercentage(item.percentage)}
                      </div>
                      {showValues && (
                        <div className="text-xs text-gray-500">
                          {formatCurrency(item.value)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Selected item details */}
        {selectedSlice && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-lg font-semibold text-blue-900 mb-2">
                  {selectedSlice.symbol}
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">Value:</span>
                    <span className="ml-2 text-blue-900">{formatCurrency(selectedSlice.value)}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Allocation:</span>
                    <span className="ml-2 text-blue-900">{formatPercentage(selectedSlice.percentage || 0)}</span>
                  </div>
                  {selectedSlice.sector && selectedSlice.sector !== 'Mixed' && (
                    <div>
                      <span className="text-blue-700 font-medium">Sector:</span>
                      <span className="ml-2 text-blue-900">{selectedSlice.sector}</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedSlice(null)}
                className="text-blue-600 hover:text-blue-800 p-1"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Summary stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-gray-500 font-medium">Holdings</div>
            <div className="text-xl font-bold text-gray-900">{data.length}</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-gray-500 font-medium">Largest Position</div>
            <div className="text-xl font-bold text-gray-900">
              {formatPercentage(Math.max(...processedData.map(d => d.percentage || 0)))}
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-gray-500 font-medium">Top 5 Holdings</div>
            <div className="text-xl font-bold text-gray-900">
              {formatPercentage(
                processedData
                  .sort((a, b) => b.percentage - a.percentage)
                  .slice(0, 5)
                  .reduce((sum, item) => sum + (item.percentage || 0), 0)
              )}
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-gray-500 font-medium">Diversification</div>
            <div className="text-xl font-bold text-gray-900">
              {data.length > 20 ? 'High' : data.length > 10 ? 'Medium' : 'Low'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllocationWheelChart;
