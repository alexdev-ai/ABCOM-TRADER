import React, { useState, useEffect } from 'react';
import { sessionApi, type SessionHistoryItem, type SessionHistoryResponse } from '../services/sessionApi';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter
} from 'recharts';

interface FilterOptions {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  performanceFilter?: 'profit' | 'loss' | 'all';
}

interface SortOptions {
  field: 'createdAt' | 'realizedPnl' | 'durationMinutes' | 'totalTrades';
  direction: 'asc' | 'desc';
}

export const SessionHistoryPage: React.FC = () => {
  const [sessions, setSessions] = useState<SessionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false
  });

  // Filters and sorting
  const [filters, setFilters] = useState<FilterOptions>({
    performanceFilter: 'all'
  });
  const [sortBy, setSortBy] = useState<SortOptions>({
    field: 'createdAt',
    direction: 'desc'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionHistoryItem | null>(null);

  // Load session history
  const loadSessions = async (loadMore: boolean = false) => {
    try {
      setLoading(true);
      const offset = loadMore ? pagination.offset + pagination.limit : 0;
      
      const response = await sessionApi.getSessionHistory(
        pagination.limit,
        offset,
        filters
      );

      if (loadMore) {
        setSessions(prev => [...prev, ...response.sessions]);
      } else {
        setSessions(response.sessions);
      }

      setPagination(response.pagination);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session history');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadSessions();
  }, [filters, sortBy]);

  // Filter handlers
  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const clearFilters = () => {
    setFilters({ performanceFilter: 'all' });
  };

  // Export to CSV
  const exportToCSV = () => {
    if (sessions.length === 0) return;

    const headers = [
      'Session ID',
      'Created Date',
      'Duration (Minutes)',
      'Loss Limit ($)',
      'Loss Limit (%)',
      'Status',
      'Start Time',
      'End Time',
      'Actual Duration (Minutes)',
      'Total Trades',
      'Realized P&L ($)',
      'Performance (%)',
      'Termination Reason'
    ];

    const csvData = sessions.map(session => [
      session.sessionId,
      new Date(session.createdAt).toLocaleDateString(),
      session.durationMinutes,
      session.lossLimitAmount.toFixed(2),
      session.lossLimitPercentage.toFixed(1),
      session.status,
      session.startTime ? new Date(session.startTime).toLocaleString() : 'N/A',
      session.endTime ? new Date(session.endTime).toLocaleString() : 'N/A',
      session.actualDurationMinutes || 'N/A',
      session.totalTrades,
      session.realizedPnl.toFixed(2),
      session.sessionPerformancePercentage?.toFixed(2) || '0.00',
      session.terminationReason || 'N/A'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `session-history-${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${new Date().getDate().toString().padStart(2, '0')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Format functions
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'completed': 'bg-green-100 text-green-800 border-green-200',
      'stopped': 'bg-gray-100 text-gray-800 border-gray-200',
      'expired': 'bg-red-100 text-red-800 border-red-200',
      'active': 'bg-blue-100 text-blue-800 border-blue-200',
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${statusColors[status as keyof typeof statusColors] || statusColors.stopped}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPnLColor = (pnl: number): string => {
    if (pnl > 0) return 'text-green-600 font-semibold';
    if (pnl < 0) return 'text-red-600 font-semibold';
    return 'text-gray-600 font-semibold';
  };

  // Calculate summary statistics
  const totalSessions = sessions.length;
  const totalPnL = sessions.reduce((sum, session) => sum + session.realizedPnl, 0);
  const totalTrades = sessions.reduce((sum, session) => sum + session.totalTrades, 0);
  const profitableSessions = sessions.filter(session => session.realizedPnl > 0).length;
  const winRate = totalSessions > 0 ? (profitableSessions / totalSessions) * 100 : 0;

  // Prepare chart data
  const performanceChartData = sessions
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((session, index) => ({
      sessionNumber: index + 1,
      date: new Date(session.createdAt).toLocaleDateString(),
      pnl: session.realizedPnl,
      cumulativePnL: sessions
        .slice(0, index + 1)
        .reduce((sum, s) => sum + s.realizedPnl, 0),
      trades: session.totalTrades,
      duration: session.actualDurationMinutes || session.durationMinutes,
      performance: session.sessionPerformancePercentage || 0,
      winLoss: session.realizedPnl > 0 ? 'Win' : session.realizedPnl < 0 ? 'Loss' : 'Neutral'
    }));

  const winLossData = [
    { name: 'Profitable Sessions', value: profitableSessions, color: '#22c55e' },
    { name: 'Loss Sessions', value: totalSessions - profitableSessions, color: '#ef4444' }
  ];

  const durationVsPerformanceData = sessions.map(session => ({
    duration: session.actualDurationMinutes || session.durationMinutes,
    performance: session.sessionPerformancePercentage || 0,
    pnl: session.realizedPnl,
    trades: session.totalTrades
  }));

  const monthlyPerformanceData = sessions.reduce((acc, session) => {
    const month = new Date(session.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    const existing = acc.find(item => item.month === month);
    if (existing) {
      existing.pnl += session.realizedPnl;
      existing.sessions += 1;
      existing.trades += session.totalTrades;
    } else {
      acc.push({
        month,
        pnl: session.realizedPnl,
        sessions: 1,
        trades: session.totalTrades,
        avgPnL: session.realizedPnl
      });
    }
    return acc;
  }, [] as Array<{ month: string; pnl: number; sessions: number; trades: number; avgPnL: number }>)
  .map(item => ({ ...item, avgPnL: item.pnl / item.sessions }))
  .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  const [selectedChart, setSelectedChart] = useState<'performance' | 'cumulative' | 'duration' | 'monthly'>('performance');

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Session History</h1>
            <p className="text-gray-600 mt-1">Track your trading performance and analyze session trends</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
              </svg>
              Filters
            </button>
            <button
              onClick={exportToCSV}
              disabled={sessions.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="text-2xl font-bold text-gray-900">{totalSessions}</div>
          <div className="text-sm text-gray-600">Total Sessions</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className={`text-2xl font-bold ${getPnLColor(totalPnL)}`}>
            {formatCurrency(totalPnL)}
          </div>
          <div className="text-sm text-gray-600">Total P&L</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="text-2xl font-bold text-blue-600">{totalTrades}</div>
          <div className="text-sm text-gray-600">Total Trades</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="text-2xl font-bold text-purple-600">{winRate.toFixed(1)}%</div>
          <div className="text-sm text-gray-600">Win Rate</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="text-2xl font-bold text-orange-600">
            {totalSessions > 0 ? formatCurrency(totalPnL / totalSessions) : '$0.00'}
          </div>
          <div className="text-sm text-gray-600">Avg per Session</div>
        </div>
      </div>

      {/* Performance Analytics Charts */}
      {sessions.length > 0 && (
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Performance Analytics</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedChart('performance')}
                  className={`px-3 py-1 text-sm rounded-md ${selectedChart === 'performance' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Session P&L
                </button>
                <button
                  onClick={() => setSelectedChart('cumulative')}
                  className={`px-3 py-1 text-sm rounded-md ${selectedChart === 'cumulative' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Cumulative P&L
                </button>
                <button
                  onClick={() => setSelectedChart('duration')}
                  className={`px-3 py-1 text-sm rounded-md ${selectedChart === 'duration' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Duration vs Performance
                </button>
                <button
                  onClick={() => setSelectedChart('monthly')}
                  className={`px-3 py-1 text-sm rounded-md ${selectedChart === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Monthly Trends
                </button>
              </div>
            </div>

            <div className="h-80">
              {selectedChart === 'performance' && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="sessionNumber" 
                      label={{ value: 'Session Number', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      label={{ value: 'P&L ($)', angle: -90, position: 'insideLeft' }}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                      formatter={(value, name) => [`$${value}`, 'P&L']}
                      labelFormatter={(label) => `Session ${label}`}
                    />
                    <Bar 
                      dataKey="pnl" 
                      name="Session P&L"
                    >
                      {performanceChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}

              {selectedChart === 'cumulative' && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="sessionNumber" 
                      label={{ value: 'Session Number', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      label={{ value: 'Cumulative P&L ($)', angle: -90, position: 'insideLeft' }}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                      formatter={(value, name) => [`$${value}`, 'Cumulative P&L']}
                      labelFormatter={(label) => `Session ${label}`}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cumulativePnL" 
                      stroke="#3b82f6" 
                      fill="#dbeafe"
                      name="Cumulative P&L"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {selectedChart === 'duration' && (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart data={durationVsPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      type="number" 
                      dataKey="duration" 
                      name="Duration"
                      label={{ value: 'Duration (minutes)', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="performance" 
                      name="Performance"
                      label={{ value: 'Performance (%)', angle: -90, position: 'insideLeft' }}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'Duration') return [`${value} minutes`, 'Duration'];
                        if (name === 'Performance') return [`${value}%`, 'Performance'];
                        return [value, name];
                      }}
                      cursor={{ strokeDasharray: '3 3' }}
                    />
                    <Scatter 
                      name="Sessions" 
                      dataKey="performance" 
                      fill="#8884d8"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              )}

              {selectedChart === 'monthly' && monthlyPerformanceData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      label={{ value: 'Month', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      label={{ value: 'P&L ($)', angle: -90, position: 'insideLeft' }}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'Monthly P&L') return [`$${value}`, 'Total P&L'];
                        if (name === 'Average P&L') return [`$${value}`, 'Avg per Session'];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="pnl" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Monthly P&L"
                      dot={{ fill: '#3b82f6' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="avgPnL" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Average P&L"
                      dot={{ fill: '#10b981' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Win/Loss Pie Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Win/Loss Distribution</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={winLossData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {winLossData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Performance Insights</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Best Session</span>
                    <span className={`text-sm font-semibold ${getPnLColor(Math.max(...sessions.map(s => s.realizedPnl)))}`}>
                      {formatCurrency(Math.max(...sessions.map(s => s.realizedPnl)))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Worst Session</span>
                    <span className={`text-sm font-semibold ${getPnLColor(Math.min(...sessions.map(s => s.realizedPnl)))}`}>
                      {formatCurrency(Math.min(...sessions.map(s => s.realizedPnl)))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Avg Session Duration</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatDuration(Math.round(sessions.reduce((sum, s) => sum + (s.actualDurationMinutes || s.durationMinutes), 0) / sessions.length))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Profitable Sessions</span>
                    <span className="text-sm font-semibold text-green-600">
                      {profitableSessions} of {totalSessions} ({winRate.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleFilterChange({ dateFrom: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleFilterChange({ dateTo: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange({ status: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="stopped">Stopped</option>
                <option value="expired">Expired</option>
                <option value="active">Active</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Performance</label>
              <select
                value={filters.performanceFilter || 'all'}
                onChange={(e) => handleFilterChange({ performanceFilter: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Sessions</option>
                <option value="profit">Profitable Only</option>
                <option value="loss">Loss Only</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-4 gap-2">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Clear Filters
            </button>
            <button
              onClick={() => setShowFilters(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Session List */}
      <div className="bg-white rounded-lg shadow-sm border">
        {loading && sessions.length === 0 ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading session history...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="text-red-600 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-gray-900 font-medium">Error Loading Sessions</p>
            <p className="text-gray-600 text-sm mt-1">{error}</p>
            <button
              onClick={() => loadSessions()}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Retry
            </button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-gray-900 font-medium">No Sessions Found</p>
            <p className="text-gray-600 text-sm mt-1">
              {Object.keys(filters).some(key => filters[key as keyof FilterOptions]) 
                ? 'Try adjusting your filters to see more sessions'
                : 'Start trading to see your session history here'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trades</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P&L</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sessions.map((session) => (
                  <tr key={session.sessionId} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {session.sessionId.slice(-8)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(session.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">
                        {formatDuration(session.actualDurationMinutes || session.durationMinutes)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Target: {formatDuration(session.durationMinutes)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(session.status)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {session.totalTrades}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className={`text-sm ${getPnLColor(session.realizedPnl)}`}>
                        {formatCurrency(session.realizedPnl)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className={`text-sm ${getPnLColor(session.sessionPerformancePercentage || 0)}`}>
                        {session.sessionPerformancePercentage 
                          ? `${session.sessionPerformancePercentage > 0 ? '+' : ''}${session.sessionPerformancePercentage.toFixed(2)}%`
                          : '0.00%'
                        }
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => setSelectedSession(session)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Load More Button */}
        {pagination.hasMore && (
          <div className="p-4 text-center border-t">
            <button
              onClick={() => loadSessions(true)}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load More Sessions'}
            </button>
          </div>
        )}
      </div>

      {/* Session Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Session Details - {selectedSession.sessionId.slice(-8)}
                </h3>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Session Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span>{new Date(selectedSession.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span>{getStatusBadge(selectedSession.status)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration Target:</span>
                      <span>{formatDuration(selectedSession.durationMinutes)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Actual Duration:</span>
                      <span>{selectedSession.actualDurationMinutes ? formatDuration(selectedSession.actualDurationMinutes) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Loss Limit:</span>
                      <span>{formatCurrency(selectedSession.lossLimitAmount)} ({selectedSession.lossLimitPercentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Performance</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Trades:</span>
                      <span className="font-medium">{selectedSession.totalTrades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Realized P&L:</span>
                      <span className={getPnLColor(selectedSession.realizedPnl)}>
                        {formatCurrency(selectedSession.realizedPnl)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Performance:</span>
                      <span className={getPnLColor(selectedSession.sessionPerformancePercentage || 0)}>
                        {selectedSession.sessionPerformancePercentage 
                          ? `${selectedSession.sessionPerformancePercentage > 0 ? '+' : ''}${selectedSession.sessionPerformancePercentage.toFixed(2)}%`
                          : '0.00%'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg per Trade:</span>
                      <span className={selectedSession.totalTrades > 0 ? getPnLColor(selectedSession.realizedPnl / selectedSession.totalTrades) : 'text-gray-600'}>
                        {selectedSession.totalTrades > 0 ? formatCurrency(selectedSession.realizedPnl / selectedSession.totalTrades) : 'N/A'}
                      </span>
                    </div>
                    {selectedSession.terminationReason && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ended:</span>
                        <span className="capitalize">{selectedSession.terminationReason.replace('_', ' ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setSelectedSession(null)}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionHistoryPage;
