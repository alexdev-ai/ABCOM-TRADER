import React, { useState, useMemo } from 'react';

interface CorrelationMatrixProps {
  correlationMatrix: Record<string, Record<string, number>>;
}

export const CorrelationMatrix: React.FC<CorrelationMatrixProps> = ({
  correlationMatrix
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const formatCorrelation = (value: number): string => {
    return value.toFixed(2);
  };

  const getCorrelationColor = (value: number): string => {
    const absValue = Math.abs(value);
    
    if (value === 1) return 'bg-blue-600 text-white font-bold';
    
    if (value > 0) {
      // Positive correlations - blue shades
      if (absValue > 0.8) return 'bg-blue-500 text-white font-medium';
      if (absValue > 0.6) return 'bg-blue-400 text-white';
      if (absValue > 0.4) return 'bg-blue-300 text-blue-900';
      if (absValue > 0.2) return 'bg-blue-200 text-blue-800';
      return 'bg-blue-100 text-blue-700';
    } else {
      // Negative correlations - red shades
      if (absValue > 0.8) return 'bg-red-500 text-white font-medium';
      if (absValue > 0.6) return 'bg-red-400 text-white';
      if (absValue > 0.4) return 'bg-red-300 text-red-900';
      if (absValue > 0.2) return 'bg-red-200 text-red-800';
      return 'bg-red-100 text-red-700';
    }
  };

  const getCorrelationStrength = (value: number): string => {
    const absValue = Math.abs(value);
    if (absValue >= 0.8) return 'Very Strong';
    if (absValue >= 0.6) return 'Strong';
    if (absValue >= 0.4) return 'Moderate';
    if (absValue >= 0.2) return 'Weak';
    return 'Very Weak';
  };

  // Prepare matrix data
  const matrixData = useMemo(() => {
    const symbols = Object.keys(correlationMatrix);
    if (symbols.length === 0) return null;

    // Sort symbols alphabetically for consistent display
    symbols.sort();

    return {
      symbols,
      matrix: correlationMatrix
    };
  }, [correlationMatrix]);

  if (!matrixData) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Correlation Matrix</h3>
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-gray-500">No correlation data available</p>
        </div>
      </div>
    );
  }

  const { symbols, matrix } = matrixData;

  // Calculate some statistics
  const allCorrelations = symbols.flatMap(s1 => 
    symbols.map(s2 => matrix[s1]?.[s2] || 0)
  ).filter(val => val !== 1); // Exclude self-correlations

  const avgCorrelation = allCorrelations.length > 0 
    ? allCorrelations.reduce((sum, val) => sum + val, 0) / allCorrelations.length 
    : 0;

  const highestCorrelations = symbols.flatMap(s1 => 
    symbols.map(s2 => ({
      symbol1: s1,
      symbol2: s2,
      correlation: matrix[s1]?.[s2] || 0
    }))
  )
  .filter(item => item.symbol1 !== item.symbol2)
  .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
  .slice(0, 5);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Correlation Matrix</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">{symbols.length} positions</span>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>Correlation:</span>
          <div className="flex items-center space-x-1">
            <div className="w-4 h-4 bg-red-400 rounded"></div>
            <span>-1</span>
            <div className="w-4 h-4 bg-gray-100 rounded mx-2"></div>
            <span>0</span>
            <div className="w-4 h-4 bg-blue-400 rounded mx-2"></div>
            <span>+1</span>
          </div>
        </div>
        
        <div className="text-sm text-gray-600">
          Avg: {formatCorrelation(avgCorrelation)}
        </div>
      </div>

      {/* Matrix Display */}
      <div className="mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="px-2 py-2 text-left text-sm font-medium text-gray-700 bg-gray-50 sticky left-0 z-10">
                  Symbol
                </th>
                {symbols.map((symbol) => (
                  <th 
                    key={symbol} 
                    className="px-2 py-2 text-center text-sm font-medium text-gray-700 bg-gray-50 min-w-[50px] cursor-pointer hover:bg-gray-100"
                    onClick={() => setSelectedSymbol(selectedSymbol === symbol ? null : symbol)}
                    title={symbol}
                  >
                    <div className="truncate max-w-[40px]">
                      {symbol}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {symbols.map((rowSymbol) => (
                <tr 
                  key={rowSymbol}
                  className={selectedSymbol === rowSymbol ? 'bg-blue-50' : ''}
                >
                  <td 
                    className="px-2 py-2 text-sm font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 cursor-pointer hover:bg-gray-100"
                    onClick={() => setSelectedSymbol(selectedSymbol === rowSymbol ? null : rowSymbol)}
                  >
                    <div className="truncate max-w-[60px]" title={rowSymbol}>
                      {rowSymbol}
                    </div>
                  </td>
                  {symbols.map((colSymbol) => {
                    const correlation = matrix[rowSymbol]?.[colSymbol] || 0;
                    const colorClass = getCorrelationColor(correlation);
                    const isHighlighted = selectedSymbol === rowSymbol || selectedSymbol === colSymbol;
                    
                    return (
                      <td 
                        key={colSymbol} 
                        className="px-1 py-1 text-center"
                      >
                        <div 
                          className={`w-full h-8 rounded flex items-center justify-center cursor-help text-xs ${colorClass} ${
                            isHighlighted ? 'ring-2 ring-blue-400' : ''
                          }`}
                          title={`${rowSymbol} vs ${colSymbol}\nCorrelation: ${formatCorrelation(correlation)}\nStrength: ${getCorrelationStrength(correlation)}`}
                        >
                          {formatCorrelation(correlation)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Symbol Details */}
      {selectedSymbol && (
        <div className="mb-6 bg-blue-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">
            {selectedSymbol} Correlations
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {symbols
              .filter(s => s !== selectedSymbol)
              .map(symbol => ({
                symbol,
                correlation: matrix[selectedSymbol]?.[symbol] || 0
              }))
              .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
              .slice(0, 6)
              .map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-blue-700 font-medium">{item.symbol}:</span>
                  <span className={`font-medium ${
                    item.correlation > 0.5 ? 'text-blue-600' :
                    item.correlation < -0.5 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {formatCorrelation(item.correlation)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-800 mb-3">Highest Correlations</h4>
          <div className="space-y-2">
            {highestCorrelations.map((item, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-700">
                    {item.symbol1}
                  </span>
                  <span className="text-gray-400">↔</span>
                  <span className="font-medium text-gray-700">
                    {item.symbol2}
                  </span>
                </div>
                <span className={`font-medium px-2 py-1 rounded text-xs ${
                  item.correlation > 0.5 ? 'bg-blue-100 text-blue-800' :
                  item.correlation < -0.5 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {formatCorrelation(item.correlation)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-800 mb-3">Matrix Statistics</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Average Correlation:</span>
              <span className="font-medium">{formatCorrelation(avgCorrelation)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Strong Positive (&gt;0.6):</span>
              <span className="font-medium text-blue-600">
                {allCorrelations.filter(c => c > 0.6).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Strong Negative (&lt;-0.6):</span>
              <span className="font-medium text-red-600">
                {allCorrelations.filter(c => c < -0.6).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Near Zero (-0.2 to 0.2):</span>
              <span className="font-medium text-gray-600">
                {allCorrelations.filter(c => Math.abs(c) <= 0.2).length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-4 text-xs text-gray-500">
        <p>
          <strong>Tip:</strong> Click on any symbol to highlight its correlations. 
          Correlation ranges from -1 (perfect negative) to +1 (perfect positive). 
          Values near 0 indicate little linear relationship.
        </p>
      </div>
    </div>
  );
};
