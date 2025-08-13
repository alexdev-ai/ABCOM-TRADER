import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  BarChart3,
  Eye,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { 
  tradeHistoryApi, 
  TradeHistoryFilters, 
  EnhancedTrade, 
  TradeSummary,
  TradingAnalytics 
} from '../services/tradeHistoryApi';

interface TradeHistoryPageProps {}

const TradeHistoryPage: React.FC<TradeHistoryPageProps> = () => {
  const [trades, setTrades] = useState<EnhancedTrade[]>([]);
  const [summary, setSummary] = useState<TradeSummary | null>(null);
  const [analytics, setAnalytics] = useState<TradingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<EnhancedTrade | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTrades, setTotalTrades] = useState(0);

  // Filter state
  const [filters, setFilters] = useState<TradeHistoryFilters>({
    page: 1,
    limit: 25,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Quick filter presets
  const quickFilters = [
    { label: 'All Trades', filter: {} },
    { label: 'This Month', filter: { dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0] } },
    { label: 'Profitable', filter: { profitLoss: 'profit' as const } },
    { label: 'Losses', filter: { profitLoss: 'loss' as const } },
    { label: 'Buy Orders', filter: { tradeType: 'buy' as const } },
    { label: 'Sell Orders', filter: { tradeType: 'sell' as const } }
  ];

  // Load trade history
  const loadTradeHistory = async (newFilters?: TradeHistoryFilters) => {
    try {
      setLoading(true);
      setError(null);

      const filtersToUse = newFilters || filters;
      const response = await tradeHistoryApi.getTradeHistory(filtersToUse);

      setTrades(response.data);
      setSummary(response.summary);
      setCurrentPage(response.pagination.page);
      setTotalPages(response.pagination.totalPages);
      setTotalTrades(response.pagination.total);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trade history');
    } finally {
      setLoading(false);
    }
  };

  // Load analytics
  const loadAnalytics = async () => {
    try {
      const response = await tradeHistoryApi.getTradingAnalytics('1M', true);
      setAnalytics(response.data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    }
  };

  // Initialize data
  useEffect(() => {
    loadTradeHistory();
    loadAnalytics();
  }, []);

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<TradeHistoryFilters>) => {
    const updatedFilters = { 
      ...filters, 
      ...newFilters, 
      page: newFilters.page || 1 
    };
    setFilters(updatedFilters);
    loadTradeHistory(updatedFilters);
  };

  // Handle quick filter
  const handleQuickFilter = (quickFilter: any) => {
    const newFilters = {
      ...filters,
      ...quickFilter.filter,
      page: 1
    };
    setFilters(newFilters);
    loadTradeHistory(newFilters);
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    handleFilterChange({ page });
  };

  // Handle export
  const handleExport = async (format: 'csv' | 'xlsx' = 'csv', taxOptimized: boolean = false) => {
    try {
      await tradeHistoryApi.downloadExport(format, {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        symbol: filters.symbol,
        taxOptimized,
        includeAnalytics: true
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get profit/loss color
  const getPnLColor = (pnl?: number) => {
    if (!pnl) return 'text-gray-600';
    return pnl > 0 ? 'text-green-600' : pnl < 0 ? 'text-red-600' : 'text-gray-600';
  };

  const getPnLBgColor = (pnl?: number) => {
    if (!pnl) return 'bg-gray-50';
    return pnl > 0 ? 'bg-green-50' : pnl < 0 ? 'bg-red-50' : 'bg-gray-50';
  };

  if (loading && trades.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="animate-spin h-8 w-8 text-blue-600" />
            <span className="ml-2 text-gray-600">Loading trade history...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Trade History</h1>
              <p className="text-gray-600 mt-1">
                Comprehensive analysis of your trading activity and patterns
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <BarChart3 className="h-4 w-4" />
                Analytics
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Filter className="h-4 w-4" />
                Filters
              </button>
              <div className="relative">
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                  <Download className="h-4 w-4" />
                  Export
                </button>
                {/* Export dropdown would go here */}
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <div className="text-red-600 font-medium">Error</div>
            </div>
            <div className="text-red-600 mt-1">{error}</div>
          </div>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Trades</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalTrades}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Win Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.winRate.toFixed(1)}%</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total P&L</p>
                  <p className={`text-2xl font-bold ${getPnLColor(summary.totalProfit - summary.totalLoss)}`}>
                    {formatCurrency(summary.totalProfit - summary.totalLoss)}
                  </p>
                </div>
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                  summary.totalProfit - summary.totalLoss >= 0 ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {summary.totalProfit - summary.totalLoss >= 0 ? 
                    <TrendingUp className="h-6 w-6 text-green-600" /> :
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  }
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Trade Size</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.avgTradeSize)}</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-wrap gap-2">
            {quickFilters.map((quickFilter, index) => (
              <button
                key={index}
                onClick={() => handleQuickFilter(quickFilter)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {quickFilter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search and Advanced Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by symbol, trade ID..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange({ search: e.target.value, page: 1 })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filters.sortBy || 'createdAt'}
                onChange={(e) => handleFilterChange({ sortBy: e.target.value, page: 1 })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="createdAt">Date</option>
                <option value="symbol">Symbol</option>
                <option value="totalAmount">Amount</option>
                <option value="realizedPnl">P&L</option>
              </select>
              <select
                value={filters.sortOrder || 'desc'}
                onChange={(e) => handleFilterChange({ sortOrder: e.target.value as 'asc' | 'desc', page: 1 })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Trade List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Side</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">P&L</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Quality</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trades.map((trade) => (
                  <tr 
                    key={trade.id} 
                    className={`hover:bg-gray-50 transition-colors ${getPnLBgColor(trade.realizedPnl)}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(trade.executedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{trade.symbol}</div>
                      {trade.tradePattern && (
                        <div className="text-xs text-gray-500">{trade.tradePattern}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        trade.type === 'buy' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {trade.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {trade.quantity.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(trade.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(trade.totalAmount)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${getPnLColor(trade.realizedPnl)}`}>
                      {trade.realizedPnl ? formatCurrency(trade.realizedPnl) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {trade.executionQuality && (
                        <span className="text-sm text-gray-600">
                          {formatPercentage(trade.executionQuality)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => setSelectedTrade(trade)}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <p className="text-sm text-gray-700">
                    Showing {((currentPage - 1) * (filters.limit || 25)) + 1} to{' '}
                    {Math.min(currentPage * (filters.limit || 25), totalTrades)} of{' '}
                    <span className="font-medium">{totalTrades}</span> trades
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Trade Details Modal */}
        {selectedTrade && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Trade Details</h3>
                  <button
                    onClick={() => setSelectedTrade(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Symbol</label>
                      <p className="text-lg font-semibold text-gray-900">{selectedTrade.symbol}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Side</label>
                      <p className={`text-lg font-semibold ${
                        selectedTrade.type === 'buy' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {selectedTrade.type.toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Quantity</label>
                      <p className="text-lg font-semibold text-gray-900">{selectedTrade.quantity.toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Price</label>
                      <p className="text-lg font-semibold text-gray-900">{formatCurrency(selectedTrade.price)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Total Amount</label>
                      <p className="text-lg font-semibold text-gray-900">{formatCurrency(selectedTrade.totalAmount)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Realized P&L</label>
                      <p className={`text-lg font-semibold ${getPnLColor(selectedTrade.realizedPnl)}`}>
                        {selectedTrade.realizedPnl ? formatCurrency(selectedTrade.realizedPnl) : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {selectedTrade.algorithmReasoning && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Algorithm Reasoning</label>
                      <p className="text-sm text-gray-700 mt-1">{selectedTrade.algorithmReasoning}</p>
                    </div>
                  )}

                  {selectedTrade.executionQuality && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Execution Quality</label>
                      <p className="text-sm text-gray-700 mt-1">{formatPercentage(selectedTrade.executionQuality)}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Executed At</label>
                      <p className="text-sm text-gray-700">{new Date(selectedTrade.executedAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Trade Pattern</label>
                      <p className="text-sm text-gray-700">{selectedTrade.tradePattern || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TradeHistoryPage;
