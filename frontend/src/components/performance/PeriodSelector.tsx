import React from 'react';
import { PerformancePeriodType } from '../../services/performanceAnalyticsApi';

interface PeriodSelectorProps {
  periods: PerformancePeriodType[];
  selectedPeriod: PerformancePeriodType;
  onPeriodChange: (period: PerformancePeriodType) => void;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  periods,
  selectedPeriod,
  onPeriodChange
}) => {
  const periodLabels: Record<PerformancePeriodType, string> = {
    '1D': '1 Day',
    '1W': '1 Week',
    '1M': '1 Month',
    '3M': '3 Months',
    '6M': '6 Months',
    '1Y': '1 Year',
    'YTD': 'Year to Date',
    'ALL': 'All Time'
  };

  const periodDescriptions: Record<PerformancePeriodType, string> = {
    '1D': 'Last 24 hours',
    '1W': 'Last 7 days',
    '1M': 'Last 30 days',
    '3M': 'Last 3 months',
    '6M': 'Last 6 months',
    '1Y': 'Last 12 months',
    'YTD': 'Since January 1st',
    'ALL': 'Complete history'
  };

  return (
    <div className="flex flex-wrap gap-2">
      {periods.map((period) => (
        <button
          key={period}
          onClick={() => onPeriodChange(period)}
          className={`
            px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200
            ${selectedPeriod === period
              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm'
            }
          `}
          title={periodDescriptions[period]}
        >
          {periodLabels[period]}
        </button>
      ))}
    </div>
  );
};
