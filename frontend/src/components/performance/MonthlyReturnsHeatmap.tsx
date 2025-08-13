import React, { useMemo } from 'react';
import type { MonthlyReturn } from '../../services/performanceAnalyticsApi';

interface MonthlyReturnsHeatmapProps {
  monthlyReturns: MonthlyReturn[];
  benchmark: string;
}

export const MonthlyReturnsHeatmap: React.FC<MonthlyReturnsHeatmapProps> = ({
  monthlyReturns,
  benchmark
}) => {
  const formatPercentage = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getColorIntensity = (value: number, maxValue: number, minValue: number): string => {
    if (value === 0) return 'bg-gray-100 text-gray-700';
    
    const absMax = Math.max(Math.abs(maxValue), Math.abs(minValue));
    const intensity = Math.min(Math.abs(value) / absMax, 1);
    
    if (value > 0) {
      // Green shades for positive returns
      if (intensity > 0.8) return 'bg-green-600 text-white font-bold';
      if (intensity > 0.6) return 'bg-green-500 text-white font-medium';
      if (intensity > 0.4) return 'bg-green-400 text-white';
      if (intensity > 0.2) return 'bg-green-300 text-green-900';
      return 'bg-green-100 text-green-800';
    } else {
      // Red shades for negative returns
      if (intensity > 0.8) return 'bg-red-600 text-white font-bold';
      if (intensity > 0.6) return 'bg-red-500 text-white font-medium';
      if (intensity > 0.4) return 'bg-red-400 text-white';
      if (intensity > 0.2) return 'bg-red-300 text-red-900';
      return 'bg-red-100 text-red-800';
    }
  };

  // Organize data by year and month
  const heatmapData = useMemo(() => {
    if (!monthlyReturns || monthlyReturns.length === 0) return null;

    // Group by year
    const yearGroups = monthlyReturns.reduce((acc, item) => {
      if (!acc[item.year]) {
        acc[item.year] = {};
      }
      acc[item.year][item.month] = item;
      return acc;
    }, {} as Record<number, Record<number, MonthlyReturn>>);

    // Calculate min/max for color scaling
    const allReturns = monthlyReturns.map(r => r.return);
    const minReturn = Math.min(...allReturns);
    const maxReturn = Math.max(...allReturns);

    const years = Object.keys(yearGroups).map(Number).sort((a, b) => b - a); // Most recent first
    
    return {
      yearGroups,
      years,
      minReturn,
      maxReturn
    };
  }, [monthlyReturns]);

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  if (!heatmapData) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Returns Heatmap</h3>
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-gray-500">No monthly returns data available</p>
        </div>
      </div>
    );
  }

  // Calculate yearly totals
  const yearlyTotals = heatmapData.years.map(year => {
    const monthsData = Object.values(heatmapData.yearGroups[year]);
    const totalReturn = monthsData.reduce((sum, month) => sum + month.return, 0);
    const benchmarkTotal = monthsData.reduce((sum, month) => sum + month.benchmark, 0);
    return {
      year,
      totalReturn,
      benchmarkTotal,
      monthCount: monthsData.length
    };
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Monthly Returns Heatmap</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">vs {benchmark}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>Performance:</span>
          <div className="flex items-center space-x-1">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>Poor</span>
            <div className="w-4 h-4 bg-gray-100 rounded mx-2"></div>
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Excellent</span>
          </div>
        </div>
        
        <div className="text-sm text-gray-600">
          Range: {formatPercentage(heatmapData.minReturn)} to {formatPercentage(heatmapData.maxReturn)}
        </div>
      </div>

      {/* Heatmap Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-sm font-medium text-gray-700 bg-gray-50">Year</th>
              {monthNames.map((month, index) => (
                <th key={index} className="px-2 py-2 text-center text-sm font-medium text-gray-700 bg-gray-50 min-w-[60px]">
                  {month}
                </th>
              ))}
              <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 bg-gray-50">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {heatmapData.years.map((year) => {
              const yearTotal = yearlyTotals.find(y => y.year === year);
              return (
                <tr key={year}>
                  <td className="px-3 py-2 text-sm font-medium text-gray-900 bg-gray-50">
                    {year}
                  </td>
                  {Array.from({ length: 12 }, (_, monthIndex) => {
                    const month = monthIndex + 1;
                    const monthData = heatmapData.yearGroups[year]?.[month];
                    
                    if (!monthData) {
                      return (
                        <td key={month} className="px-2 py-2 text-center">
                          <div className="w-full h-8 bg-gray-100 rounded flex items-center justify-center">
                            <span className="text-xs text-gray-400">-</span>
                          </div>
                        </td>
                      );
                    }

                    const colorClass = getColorIntensity(monthData.return, heatmapData.maxReturn, heatmapData.minReturn);
                    
                    return (
                      <td key={month} className="px-2 py-2 text-center">
                        <div 
                          className={`w-full h-8 rounded flex items-center justify-center cursor-help ${colorClass}`}
                          title={`${monthNames[monthIndex]} ${year}\nPortfolio: ${formatPercentage(monthData.return)}\n${benchmark}: ${formatPercentage(monthData.benchmark)}`}
                        >
                          <span className="text-xs">
                            {formatPercentage(monthData.return)}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center">
                    <div className={`px-2 py-1 rounded text-sm font-medium ${
                      yearTotal && yearTotal.totalReturn >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {yearTotal ? formatPercentage(yearTotal.totalReturn) : '-'}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Statistics Summary */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-800 mb-2">Best Months</h4>
          <div className="space-y-1">
            {monthlyReturns
              .sort((a, b) => b.return - a.return)
              .slice(0, 3)
              .map((month, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {monthNames[month.month - 1]} {month.year}
                  </span>
                  <span className="font-medium text-green-600">
                    {formatPercentage(month.return)}
                  </span>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-800 mb-2">Worst Months</h4>
          <div className="space-y-1">
            {monthlyReturns
              .sort((a, b) => a.return - b.return)
              .slice(0, 3)
              .map((month, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {monthNames[month.month - 1]} {month.year}
                  </span>
                  <span className="font-medium text-red-600">
                    {formatPercentage(month.return)}
                  </span>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-800 mb-2">Statistics</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Positive Months:</span>
              <span className="font-medium">
                {monthlyReturns.filter(m => m.return > 0).length} / {monthlyReturns.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Win Rate:</span>
              <span className="font-medium">
                {((monthlyReturns.filter(m => m.return > 0).length / monthlyReturns.length) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Month:</span>
              <span className="font-medium">
                {formatPercentage(monthlyReturns.reduce((sum, m) => sum + m.return, 0) / monthlyReturns.length)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
