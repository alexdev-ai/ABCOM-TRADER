import React, { useState } from 'react';
import type { PerformancePeriodType } from '../../services/performanceAnalyticsApi';

interface ExportControlsProps {
  onExportCSV: (period: PerformancePeriodType) => void;
  currentPeriod: PerformancePeriodType;
  loading?: boolean;
}

export const ExportControls: React.FC<ExportControlsProps> = ({
  onExportCSV,
  currentPeriod,
  loading = false
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const exportOptions: { value: PerformancePeriodType; label: string }[] = [
    { value: '1D', label: '1 Day' },
    { value: '1W', label: '1 Week' },
    { value: '1M', label: '1 Month' },
    { value: '3M', label: '3 Months' },
    { value: '6M', label: '6 Months' },
    { value: '1Y', label: '1 Year' },
    { value: 'YTD', label: 'Year to Date' },
    { value: 'ALL', label: 'All Time' }
  ];

  const handleExport = (period: PerformancePeriodType) => {
    onExportCSV(period);
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={loading}
        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
          />
        </svg>
        Export CSV
        <svg
          className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="py-2">
              <div className="px-4 py-2 text-sm font-medium text-gray-700 border-b border-gray-100">
                Export Period
              </div>
              
              {exportOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleExport(option.value)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                    option.value === currentPeriod ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{option.label}</span>
                    {option.value === currentPeriod && (
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
              
              <div className="border-t border-gray-100 mt-2 pt-2">
                <div className="px-4 py-2 text-xs text-gray-500">
                  CSV includes: Portfolio value, returns, benchmark data, and drawdown metrics
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
