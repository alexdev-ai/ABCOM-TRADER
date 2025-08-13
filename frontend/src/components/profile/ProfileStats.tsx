import React from 'react';
import { ProfileStats as ProfileStatsType } from '../../services/profileApi';

interface ProfileStatsProps {
  stats: ProfileStatsType;
}

export const ProfileStats: React.FC<ProfileStatsProps> = ({ stats }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPerformanceColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getWinRateColor = (winRate: number) => {
    if (winRate >= 70) return 'text-green-600';
    if (winRate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const statCards = [
    {
      title: 'Account Balance',
      value: formatCurrency(stats.accountBalance),
      icon: '💰',
      color: 'text-blue-600'
    },
    {
      title: 'Total Trades',
      value: stats.totalTrades.toString(),
      icon: '📊',
      color: 'text-purple-600'
    },
    {
      title: 'Total P&L',
      value: formatCurrency(stats.totalPnl),
      icon: '📈',
      color: getPerformanceColor(stats.totalPnl)
    },
    {
      title: 'Win Rate',
      value: formatPercentage(stats.winRate),
      icon: '🎯',
      color: getWinRateColor(stats.winRate)
    },
    {
      title: 'Trading Sessions',
      value: stats.totalSessions.toString(),
      icon: '⏱️',
      color: 'text-indigo-600'
    },
    {
      title: 'Active Sessions',
      value: stats.activeSessions.toString(),
      icon: '🔄',
      color: stats.activeSessions > 0 ? 'text-green-600' : 'text-gray-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
              <div className="text-3xl">{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trading Performance */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trading Performance</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Total Trades</span>
              <span className="font-medium text-gray-900">{stats.totalTrades}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Successful Trades</span>
              <span className="font-medium text-gray-900">{stats.successfulTrades}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Win Rate</span>
              <span className={`font-medium ${getWinRateColor(stats.winRate)}`}>
                {formatPercentage(stats.winRate)}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Total P&L</span>
              <span className={`font-medium ${getPerformanceColor(stats.totalPnl)}`}>
                {formatCurrency(stats.totalPnl)}
              </span>
            </div>

            {/* Win Rate Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Win Rate Progress</span>
                <span>{formatPercentage(stats.winRate)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    stats.winRate >= 70 ? 'bg-green-500' :
                    stats.winRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(stats.winRate, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Summary</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Current Balance</span>
              <span className="font-medium text-blue-600">{formatCurrency(stats.accountBalance)}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Total Sessions</span>
              <span className="font-medium text-gray-900">{stats.totalSessions}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Active Sessions</span>
              <span className={`font-medium ${stats.activeSessions > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                {stats.activeSessions}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Last Login</span>
              <span className="font-medium text-gray-900">{formatDate(stats.lastLoginAt)}</span>
            </div>

            {/* Performance Indicator */}
            <div className="mt-4 p-3 rounded-lg bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Overall Performance</span>
                <span className={`text-sm font-semibold ${getPerformanceColor(stats.totalPnl)}`}>
                  {stats.totalPnl > 0 ? 'Profit' : stats.totalPnl < 0 ? 'Loss' : 'Neutral'}
                </span>
              </div>
              {stats.totalTrades > 0 && (
                <p className="text-xs text-gray-600 mt-1">
                  Based on {stats.totalTrades} trades with {formatPercentage(stats.winRate)} success rate
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      {stats.totalTrades > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Insights</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Trading Activity</h4>
              <p className="text-sm text-blue-800">
                You've completed {stats.totalTrades} trades across {stats.totalSessions} sessions.
                {stats.activeSessions > 0 && ` You currently have ${stats.activeSessions} active session${stats.activeSessions > 1 ? 's' : ''}.`}
              </p>
            </div>
            
            <div className={`p-4 rounded-lg border ${
              stats.winRate >= 70 ? 'bg-green-50 border-green-200' :
              stats.winRate >= 50 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
            }`}>
              <h4 className={`font-medium mb-2 ${
                stats.winRate >= 70 ? 'text-green-900' :
                stats.winRate >= 50 ? 'text-yellow-900' : 'text-red-900'
              }`}>
                Success Rate
              </h4>
              <p className={`text-sm ${
                stats.winRate >= 70 ? 'text-green-800' :
                stats.winRate >= 50 ? 'text-yellow-800' : 'text-red-800'
              }`}>
                Your win rate of {formatPercentage(stats.winRate)} is {
                  stats.winRate >= 70 ? 'excellent' :
                  stats.winRate >= 50 ? 'good' : 'below average'
                }. {stats.winRate < 50 ? 'Consider reviewing your trading strategy.' : 'Keep up the good work!'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* No Trading Activity Message */}
      {stats.totalTrades === 0 && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Trading Activity Yet</h3>
          <p className="text-gray-600 mb-4">
            Start your first trading session to see your performance statistics here.
          </p>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Start Trading
          </button>
        </div>
      )}
    </div>
  );
};
