import React, { useState, useEffect, useMemo } from 'react';
import {
  performanceAnalyticsApi,
  PerformanceReport,
  PerformanceSummary,
  PerformancePeriodType
} from '../services/performanceAnalyticsApi';
import { PerformanceOverviewCards } from '../components/performance/PerformanceOverviewCards';
import { PerformanceChart } from '../components/performance/PerformanceChart';
import { PeriodSelector } from '../components/performance/PeriodSelector';
import { BenchmarkComparison } from '../components/performance/BenchmarkComparison';
import { RiskMetricsPanel } from '../components/performance/RiskMetricsPanel';
import { PerformanceAttribution } from '../components/performance/PerformanceAttribution';
import { MonthlyReturnsHeatmap } from '../components/performance/MonthlyReturnsHeatmap';
import { CorrelationMatrix } from '../components/performance/CorrelationMatrix';
import { ExportControls } from '../components/performance/ExportControls';

export const PerformanceAnalyticsPage: React.FC = () => {
  // State management
  const [performanceReport, setPerformanceReport] = useState<PerformanceReport | null>(null);
  const [performanceSummary, setPerformanceSummary] = useState<PerformanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Chart settings
  const [selectedPeriod, setSelectedPeriod] = useState<PerformancePeriodType>('1Y');
  const [selectedBenchmark, setSelectedBenchmark] = useState('SPY');
  const [chartDays, setChartDays] = useState(365);

  // Available periods for selection
  const availablePeriods: PerformancePeriodType[] = ['1D', '1W', '1M', '3M', '6M', '1Y', 'YTD', 'ALL'];
  const availableBenchmarks = [
    { value: 'SPY', label: 'S&P 500 (SPY)' },
    { value: 'QQQ', label: 'NASDAQ (QQQ)' },
    { value: 'IWM', label: 'Russell 2000 (IWM)' },
    { value: 'DIA', label: 'Dow Jones (DIA)' }
  ];

  // Load initial data
  useEffect(() => {
    loadPerformanceData();
  }, []);

  // Load performance data based on current selections
  useEffect(() => {
    if (selectedPeriod || selectedBenchmark) {
      loadPerformanceData();
    }
  }, [selectedPeriod, selectedBenchmark]);

  const loadPerformanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load both comprehensive analytics and summary in parallel
      const [analyticsData, summaryData] = await Promise.all([
        performanceAnalyticsApi.getPerformanceAnalytics(availablePeriods, selectedBenchmark),
        performanceAnalyticsApi.getPerformanceSummary()
      ]);

      setPerformanceReport(analyticsData);
      setPerformanceSummary(summaryData);

      // Update chart days based on selected period
      const periodToDays: Record<PerformancePeriodType, number> = {
        '1D': 1,
        '1W': 7,
        '1M': 30,
        '3M': 90,
        '6M': 180,
        '1Y': 365,
        'YTD': Math.ceil((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24)),
        'ALL': 1095 // 3 years max
      };
      setChartDays(periodToDays[selectedPeriod] || 365);

    } catch (err) {
      console.error('Error loading performance data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshData = async () => {
    try {
      setRefreshing(true);
      await performanceAnalyticsApi.refreshPerformanceData();
      await loadPerformanceData();
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError('Failed to refresh performance data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportCSV = async (period: PerformancePeriodType) => {
    try {
      const blob = await performanceAnalyticsApi.exportPerformanceCSV(period);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `portfolio-performance-${period}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      setError('Failed to export performance data');
    }
  };

  // Get current period data for detailed display
  const currentPeriodData = useMemo(() => {
    if (!performanceReport) return null;
    return performanceReport.periods.find(p => p.period === selectedPeriod) || performanceReport.periods[0];
  }, [performanceReport, selectedPeriod]);

  if (loading && !performanceReport) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-6 w-1/3"></div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded"></div>
                ))}
              </div>
              <div className="h-96 bg-gray-200 rounded mb-8"></div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="h-64 bg-gray-200 rounded"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !performanceReport) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center">
              <div className="text-red-600 text-lg font-medium mb-4">
                Error Loading Performance Data
              </div>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={loadPerformanceData}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Performance Analytics</h1>
              <p className="text-gray-600 mt-1">
                Comprehensive portfolio performance analysis and reporting
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <ExportControls
                onExportCSV={handleExportCSV}
                currentPeriod={selectedPeriod}
                loading={refreshing}
              />
              
              <button
                onClick={handleRefreshData}
                disabled={refreshing}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg
                  className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {refreshing ? 'Refreshing...' : 'Refresh Data'}
              </button>
            </div>
          </div>
        </div>

        {/* Performance Overview Cards */}
        {performanceSummary && (
          <PerformanceOverviewCards summary={performanceSummary} />
        )}

        {/* Period Selection and Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Performance Chart</h2>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <PeriodSelector
                periods={availablePeriods}
                selectedPeriod={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
              />
              
              <select
                value={selectedBenchmark}
                onChange={(e) => setSelectedBenchmark(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {availableBenchmarks.map(benchmark => (
                  <option key={benchmark.value} value={benchmark.value}>
                    {benchmark.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {performanceReport && (
            <PerformanceChart
              timeSeries={performanceReport.timeSeries}
              selectedPeriod={selectedPeriod}
              benchmark={selectedBenchmark}
              days={chartDays}
            />
          )}
        </div>

        {/* Benchmark Comparison and Risk Metrics */}
        {currentPeriodData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <BenchmarkComparison
              periodData={currentPeriodData}
              benchmark={selectedBenchmark}
            />
            
            <RiskMetricsPanel
              riskMetrics={performanceReport?.riskMetrics}
              periodMetrics={currentPeriodData.metrics}
            />
          </div>
        )}

        {/* Performance Attribution */}
        {currentPeriodData && currentPeriodData.attribution.length > 0 && (
          <PerformanceAttribution
            attribution={currentPeriodData.attribution}
            period={selectedPeriod}
          />
        )}

        {/* Monthly Returns Heatmap and Correlation Matrix */}
        {performanceReport && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <MonthlyReturnsHeatmap
              monthlyReturns={performanceReport.monthlyReturns}
              benchmark={selectedBenchmark}
            />
            
            <CorrelationMatrix
              correlationMatrix={performanceReport.correlationMatrix}
            />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-800 font-medium">Error</span>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        )}

        {/* Footer info */}
        {performanceReport && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-center text-sm text-gray-500">
              Last updated: {new Date(performanceReport.generatedAt).toLocaleString()} | 
              Data points: {performanceReport.timeSeries.length} | 
              Benchmark: {selectedBenchmark}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceAnalyticsPage;
