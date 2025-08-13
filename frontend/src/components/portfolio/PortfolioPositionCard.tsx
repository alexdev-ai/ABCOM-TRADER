import React, { useState } from 'react';
import { PortfolioPosition } from '../../services/portfolioApi';

interface PortfolioPositionCardProps {
  position: PortfolioPosition;
  onExpandDetails?: (position: PortfolioPosition) => void;
  isExpanded?: boolean;
}

const PortfolioPositionCard: React.FC<PortfolioPositionCardProps> = ({
  position,
  onExpandDetails,
  isExpanded = false
}) => {
  const [showDetails, setShowDetails] = useState(isExpanded);

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

  // Format large numbers for market value
  const formatLargeNumber = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return formatCurrency(amount);
  };

  // Determine color based on performance
  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600 bg-green-50';
    if (change < 0) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  // Get performance emoji (from competitive analysis - Acorns pattern)
  const getPerformanceEmoji = (change: number) => {
    if (change > 0) return '📈';
    if (change < 0) return '📉';
    return '➡️';
  };

  // Get sector emoji for visual identification
  const getSectorEmoji = (sector: string | null) => {
    const sectorEmojis: { [key: string]: string } = {
      'Technology': '💻',
      'Healthcare': '🏥',
      'Financial': '🏦',
      'Consumer': '🛍️',
      'Energy': '⚡',
      'Industrial': '🏭',
      'Real Estate': '🏠',
      'Materials': '🔧',
      'Utilities': '💡',
      'Communication': '📡'
    };
    return sectorEmojis[sector || ''] || '📊';
  };

  const handleToggleDetails = () => {
    const newShowDetails = !showDetails;
    setShowDetails(newShowDetails);
    if (newShowDetails && onExpandDetails) {
      onExpandDetails(position);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
      {/* Main Position Info - Card-stack pattern from competitive analysis */}
      <div 
        className="p-4 cursor-pointer"
        onClick={handleToggleDetails}
      >
        <div className="flex items-center justify-between mb-3">
          {/* Stock Symbol and Company Info */}
          <div className="flex items-center gap-3">
            <span className="text-2xl" role="img" aria-label="sector">
              {getSectorEmoji(position.sector)}
            </span>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">
                {position.symbol}
              </h3>
              <p className="text-sm text-gray-600">
                {position.quantity} shares
              </p>
            </div>
          </div>

          {/* Performance Indicator */}
          <div className="text-right">
            <div className="flex items-center gap-1">
              <span className="text-lg" role="img" aria-label="trend">
                {getPerformanceEmoji(position.unrealizedPnl)}
              </span>
              <span className={`px-2 py-1 rounded-full text-sm font-medium ${getChangeColor(position.unrealizedPnl)}`}>
                {formatPercent(position.unrealizedPnlPercent)}
              </span>
            </div>
          </div>
        </div>

        {/* Current Value and P&L */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Current Value</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(position.marketValue)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Unrealized P&L</p>
            <p className={`text-lg font-semibold ${position.unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(position.unrealizedPnl)}
            </p>
          </div>
        </div>

        {/* Expand/Collapse Indicator */}
        <div className="flex items-center justify-center mt-3 pt-3 border-t border-gray-100">
          <span className="text-sm text-gray-500 flex items-center gap-1">
            {showDetails ? '↑ Less details' : '↓ More details'}
          </span>
        </div>
      </div>

      {/* Expanded Details - Progressive disclosure pattern */}
      {showDetails && (
        <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
          <div className="py-3 space-y-3">
            {/* Detailed Financial Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Current Price</span>
                <div className="font-semibold text-gray-900">
                  {formatCurrency(position.currentPrice)}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Average Cost</span>
                <div className="font-semibold text-gray-900">
                  {formatCurrency(position.averageCost)}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Total Invested</span>
                <div className="font-semibold text-gray-900">
                  {formatCurrency(position.averageCost * position.quantity)}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Sector</span>
                <div className="font-semibold text-gray-900">
                  {position.sector || 'Unknown'}
                </div>
              </div>
            </div>

            {/* Day Change if available */}
            {position.dayChange !== undefined && (
              <div className="pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Today's Change</span>
                  <span className={`text-sm font-medium ${position.dayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(position.dayChange)} ({formatPercent(position.dayChangePercent || 0)})
                  </span>
                </div>
              </div>
            )}

            {/* Educational Element - "Why AI chose this" placeholder */}
            <div className="pt-2 border-t border-gray-200">
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                🧠 Why did AI choose this stock?
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioPositionCard;
