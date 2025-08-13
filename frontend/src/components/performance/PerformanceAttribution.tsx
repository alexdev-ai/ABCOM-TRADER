import React, { useState } from 'react';
import type { PerformanceAttribution as PerformanceAttributionData, PerformancePeriodType } from '../../services/performanceAnalyticsApi';

interface PerformanceAttributionProps {
  attribution: PerformanceAttributionData[];
  period: PerformancePeriodType;
}

export const PerformanceAttribution: React.FC<PerformanceAttributionProps> = ({
  attribution,
  period
}) => {
  const [sortBy, setSortBy] = useState<'contribution' | 'return' | 'weight'>('contribution');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const formatPercentage = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getPerformanceColor = (value: number): string => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getSectorColor = (sector: string): string => {
    const colors: Record<string, string> = {
      'Technology': 'bg-blue-100 text-blue-800',
      'Healthcare': 'bg-green-100 text-green-800',
      'Financial': 'bg-purple-100 text-purple-800',
      'Consumer': 'bg-orange-100 text-orange-800',
      'Energy': 'bg-red-100 text-red-800',
      'Industrial': 'bg-gray-100 text-gray-800',
      'Utilities': 'bg-yellow-100 text-yellow-800',
      'Materials': 'bg-indigo-100 text-indigo-800',
      'Real Estate': 'bg-pink-100 text-pink-800',
      'Communication': 'bg-teal-100 text-teal-800',
      'Unknown': 'bg-gray-100 text-gray-600'
    };
    return colors[sector] || colors['Unknown'];
  };

  // Sort attribution data
  const sortedAttribution = [...attribution].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'contribution':
        comparison = a.contribution - b.contribution;
        break;
      case 'return':
        comparison = a.positionReturn - b.positionReturn;
        break;
      case 'weight':
        comparison = a.weight - b.weight;
        break;
      default:
        comparison = 0;
    }
    
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  // Group by sector for sector analysis
  const sectorAttribution = attribution.reduce((acc, item) => {
    const sector = item.sector || 'Unknown';
    if (!acc[sector]) {
      acc[sector] = {
        sector,
        totalContribution: 0,
        totalWeight: 0,
        positionCount: 0,
        avgReturn: 0
      };
    }
    
    acc[sector].totalContribution += item.contribution;
    acc[sector].totalWeight += item.weight;
    acc[sector].positionCount += 1;
    acc[sector].avgReturn += item.positionReturn;
    
    return acc;
  }, {} as Record<string, {
    sector: string;
    totalContribution: number;
    totalWeight: number;
    positionCount: number;
    avgReturn: number;
  }>);

  // Calculate average returns for sectors
  Object.values(sectorAttribution).forEach(sector => {
    sector.avgReturn = sector.avgReturn / sector.positionCount;
  });

  const sortedSectors = Object.values(sectorAttribution)
    .sort((a, b) => b.totalContribution - a.totalContribution);

  const handleSort = (column: 'contribution' | 'return' | 'weight') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (column: 'contribution' | 'return' | 'weight') => {
    if (sortBy !== column) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    return sortOrder === 'desc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    );
  };

  if (!attribution || attribution.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Attribution</h3>
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-gray-500">No attribution data available for this period</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Performance Attribution</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Period: {period}</span>
          <span className="text-sm text-gray-400">•</span>
          <span className="text-sm text-gray-600">{attribution.length} positions</span>
        </div>
      </div>

      {/* Sector Summary */}
      <div className="mb-8">
        <h4 className="text-md font-medium text-gray-800 mb-4">Sector Attribution</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedSectors.map((sector, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSectorColor(sector.sector)}`}>
                  {sector.sector}
                </span>
                <span className="text-xs text-gray-500">{sector.positionCount} positions</span>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Contribution:</span>
                  <span className={`font-medium ${getPerformanceColor(sector.totalContribution)}`}>
                    {formatPercentage(sector.totalContribution)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Avg Return:</span>
                  <span className={`font-medium ${getPerformanceColor(sector.avgReturn)}`}>
                    {formatPercentage(sector.avgReturn)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Weight:</span>
                  <span className="font-medium">{formatPercentage(sector.totalWeight)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Position Attribution Table */}
      <div className="mb-4">
        <h4 className="text-md font-medium text-gray-800 mb-4">Position Attribution</h4>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sector
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('return')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Return</span>
                    {getSortIcon('return')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('weight')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Weight</span>
                    {getSortIcon('weight')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('contribution')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Contribution</span>
                    {getSortIcon('contribution')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedAttribution.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">{item.symbol}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSectorColor(item.sector)}`}>
                      {item.sector}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${getPerformanceColor(item.positionReturn)}`}>
                      {formatPercentage(item.positionReturn)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatPercentage(item.weight)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${getPerformanceColor(item.contribution)}`}>
                      {formatPercentage(item.contribution)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attribution Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-800 mb-2">Attribution Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Positions:</span>
            <span className="font-medium">{attribution.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Positive Contributors:</span>
            <span className="font-medium text-green-600">
              {attribution.filter(a => a.contribution > 0).length}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Negative Contributors:</span>
            <span className="font-medium text-red-600">
              {attribution.filter(a => a.contribution < 0).length}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Best Contributor:</span>
            <span className="font-medium text-green-600">
              {sortedAttribution[0]?.symbol || 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
