import React from 'react';

interface PortfolioSummaryCardProps {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  cashBalance: number;
  numberOfPositions: number;
  isLoading?: boolean;
}

const PortfolioSummaryCard: React.FC<PortfolioSummaryCardProps> = ({
  totalValue,
  dayChange,
  dayChangePercent,
  cashBalance,
  numberOfPositions,
  isLoading = false
}) => {
  // Format currency with appropriate precision
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Format percentage with appropriate precision
  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  // Determine color based on performance
  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  // Get emoji indicator for performance (UX enhancement from competitive analysis)
  const getPerformanceEmoji = (change: number) => {
    if (change > 0) return '😊';
    if (change < 0) return '😞';
    return '😐';
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="h-6 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200">
      {/* Main Portfolio Value - Prominent display inspired by banking apps */}
      <div className="mb-4">
        <h2 className="text-sm font-medium text-gray-600 mb-1">Total Portfolio Value</h2>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold text-gray-900">
            {formatCurrency(totalValue)}
          </span>
          {/* Performance emoji for emotional connection (Acorns-style) */}
          <span className="text-2xl" role="img" aria-label="performance indicator">
            {getPerformanceEmoji(dayChange)}
          </span>
        </div>
      </div>

      {/* Daily Change - Color-coded for immediate understanding */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">Today's Change</span>
          <div className="text-right">
            <div className={`text-lg font-semibold ${getChangeColor(dayChange)}`}>
              {formatCurrency(dayChange)}
            </div>
            <div className={`text-sm font-medium ${getChangeColor(dayChange)}`}>
              {formatPercent(dayChangePercent)}
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio Details - Progressive disclosure approach */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Cash Balance</span>
          <div className="font-semibold text-gray-900">
            {formatCurrency(cashBalance)}
          </div>
        </div>
        <div>
          <span className="text-gray-600">Positions</span>
          <div className="font-semibold text-gray-900">
            {numberOfPositions} {numberOfPositions === 1 ? 'stock' : 'stocks'}
          </div>
        </div>
      </div>

      {/* Educational Tooltip Integration - Inspired by our UX principles */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
          💡 What does this mean?
        </button>
      </div>
    </div>
  );
};

export default PortfolioSummaryCard;
