import React from 'react';
import { useRealTimeMarketData } from '../../hooks/useWebSocket';

interface MarketDataWidgetProps {
  symbols?: string[];
  compact?: boolean;
  className?: string;
}

const MarketDataWidget: React.FC<MarketDataWidgetProps> = ({
  symbols = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'TSLA'],
  compact = false,
  className = ''
}) => {
  const { marketData, lastUpdate } = useRealTimeMarketData(symbols);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatChange = (change: number, changePercent: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}$${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getChangeBgColor = (change: number) => {
    return change >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
  };

  if (compact) {
    return (
      <div className={`flex items-center space-x-4 ${className}`}>
        <div className="flex items-center space-x-1 text-sm text-gray-500">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>Live</span>
        </div>
        
        <div className="flex items-center space-x-4 overflow-x-auto">
          {symbols.map(symbol => {
            const data = marketData[symbol];
            if (!data) return null;

            return (
              <div key={symbol} className="flex items-center space-x-2 whitespace-nowrap">
                <span className="font-medium text-gray-900">{symbol}</span>
                <span className="text-gray-600">{formatPrice(data.price)}</span>
                <span className={`text-sm ${getChangeColor(data.change)}`}>
                  {data.changePercent >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
        
        {lastUpdate && (
          <div className="text-xs text-gray-400">
            {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Market Data</h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-gray-500">Live</span>
            {lastUpdate && (
              <span className="text-xs text-gray-400">
                {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {symbols.map(symbol => {
            const data = marketData[symbol];
            
            if (!data) {
              return (
                <div key={symbol} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{symbol}</span>
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-300 rounded w-16"></div>
                    </div>
                  </div>
                  <div className="mt-2 animate-pulse">
                    <div className="h-3 bg-gray-300 rounded w-20"></div>
                  </div>
                </div>
              );
            }

            return (
              <div 
                key={symbol} 
                className={`rounded-lg p-4 border transition-colors ${getChangeBgColor(data.change)}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">{symbol}</span>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {formatPrice(data.price)}
                    </div>
                    <div className={`text-sm font-medium ${getChangeColor(data.change)}`}>
                      {formatChange(data.change, data.changePercent)}
                    </div>
                  </div>
                </div>
                
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>Vol: {data.volume.toLocaleString()}</span>
                  <span>{data.timestamp.toLocaleTimeString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MarketDataWidget;
