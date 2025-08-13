import React, { useMemo, useRef, useEffect } from 'react';
import { PerformanceTimeSeries, PerformancePeriodType } from '../../services/performanceAnalyticsApi';

interface PerformanceChartProps {
  timeSeries: PerformanceTimeSeries[];
  selectedPeriod: PerformancePeriodType;
  benchmark: string;
  days: number;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  timeSeries,
  selectedPeriod,
  benchmark,
  days
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter and prepare data based on selected period
  const chartData = useMemo(() => {
    if (!timeSeries || timeSeries.length === 0) return [];
    
    // Get the most recent 'days' worth of data
    const sortedData = [...timeSeries]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-days);

    return sortedData.map(item => ({
      date: new Date(item.date),
      portfolioValue: item.portfolioValue,
      cumulativeReturn: item.cumulativeReturn,
      benchmarkReturn: item.benchmarkReturn,
      dailyReturn: item.dailyReturn,
      drawdown: item.drawdown
    }));
  }, [timeSeries, days]);

  // Calculate chart dimensions and scales
  const chartMetrics = useMemo(() => {
    if (chartData.length === 0) return null;

    const portfolioReturns = chartData.map(d => d.cumulativeReturn);
    const benchmarkReturns = chartData.map(d => d.benchmarkReturn);
    const allReturns = [...portfolioReturns, ...benchmarkReturns];

    const minReturn = Math.min(...allReturns);
    const maxReturn = Math.max(...allReturns);
    const returnRange = maxReturn - minReturn;
    const padding = returnRange * 0.1;

    return {
      minReturn: minReturn - padding,
      maxReturn: maxReturn + padding,
      portfolioReturns,
      benchmarkReturns,
      dataCount: chartData.length
    };
  }, [chartData]);

  // Draw the chart
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    if (!canvas || !container || !chartMetrics || chartData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = 400 * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = '400px';
    
    ctx.scale(dpr, dpr);

    // Chart dimensions
    const width = rect.width;
    const height = 400;
    const padding = { top: 20, right: 60, bottom: 60, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Helper functions
    const xScale = (index: number) => padding.left + (index / (chartData.length - 1)) * chartWidth;
    const yScale = (value: number) => padding.top + ((chartMetrics.maxReturn - value) / (chartMetrics.maxReturn - chartMetrics.minReturn)) * chartHeight;

    // Draw grid lines
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1;

    // Horizontal grid lines (performance levels)
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const value = chartMetrics.minReturn + (i / gridLines) * (chartMetrics.maxReturn - chartMetrics.minReturn);
      const y = yScale(value);
      
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();

      // Y-axis labels
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${value >= 0 ? '+' : ''}${value.toFixed(1)}%`, padding.left - 10, y + 4);
    }

    // Vertical grid lines (time)
    const timeGridLines = Math.min(6, chartData.length);
    for (let i = 0; i <= timeGridLines; i++) {
      const index = Math.floor((i / timeGridLines) * (chartData.length - 1));
      const x = xScale(index);
      
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();

      // X-axis labels
      if (chartData[index]) {
        ctx.fillStyle = '#6b7280';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        const date = chartData[index].date;
        const label = selectedPeriod === '1D' 
          ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        ctx.fillText(label, x, padding.top + chartHeight + 20);
      }
    }

    // Draw zero line
    if (chartMetrics.minReturn <= 0 && chartMetrics.maxReturn >= 0) {
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 2;
      const zeroY = yScale(0);
      ctx.beginPath();
      ctx.moveTo(padding.left, zeroY);
      ctx.lineTo(padding.left + chartWidth, zeroY);
      ctx.stroke();
    }

    // Draw benchmark line
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    
    chartData.forEach((point, index) => {
      const x = xScale(index);
      const y = yScale(point.benchmarkReturn);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw portfolio performance line
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    chartData.forEach((point, index) => {
      const x = xScale(index);
      const y = yScale(point.cumulativeReturn);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw area under portfolio line
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.beginPath();
    
    chartData.forEach((point, index) => {
      const x = xScale(index);
      const y = yScale(point.cumulativeReturn);
      
      if (index === 0) {
        ctx.moveTo(x, yScale(0));
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    // Close the area
    ctx.lineTo(xScale(chartData.length - 1), yScale(0));
    ctx.lineTo(xScale(0), yScale(0));
    ctx.fill();

    // Draw chart border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.strokeRect(padding.left, padding.top, chartWidth, chartHeight);

  }, [chartData, chartMetrics, selectedPeriod]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-gray-500">No performance data available</p>
        </div>
      </div>
    );
  }

  const latestData = chartData[chartData.length - 1];
  const firstData = chartData[0];
  const totalReturn = latestData ? latestData.cumulativeReturn : 0;
  const benchmarkTotalReturn = latestData ? latestData.benchmarkReturn : 0;

  return (
    <div className="space-y-4">
      {/* Chart Legend and Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-0.5 bg-blue-600"></div>
            <span className="text-sm text-gray-700">Portfolio</span>
            <span className={`text-sm font-medium ${totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-3 h-0.5 bg-gray-400 border-dashed border-t"></div>
            <span className="text-sm text-gray-700">{benchmark}</span>
            <span className={`text-sm font-medium ${benchmarkTotalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {benchmarkTotalReturn >= 0 ? '+' : ''}{benchmarkTotalReturn.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>Period: {selectedPeriod}</span>
          <span>•</span>
          <span>Data Points: {chartData.length}</span>
        </div>
      </div>

      {/* Chart Container */}
      <div ref={containerRef} className="relative">
        <canvas
          ref={canvasRef}
          className="w-full border border-gray-200 rounded-lg bg-white"
          style={{ height: '400px' }}
        />
        
        {/* Loading overlay */}
        {chartData.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-500 text-sm">Loading chart data...</p>
            </div>
          </div>
        )}
      </div>

      {/* Performance Summary */}
      {latestData && firstData && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Start Value</div>
              <div className="font-medium">${firstData.portfolioValue.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-600">Current Value</div>
              <div className="font-medium">${latestData.portfolioValue.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-600">Total Return</div>
              <div className={`font-medium ${totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-gray-600">vs {benchmark}</div>
              <div className={`font-medium ${(totalReturn - benchmarkTotalReturn) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(totalReturn - benchmarkTotalReturn) >= 0 ? '+' : ''}{(totalReturn - benchmarkTotalReturn).toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
