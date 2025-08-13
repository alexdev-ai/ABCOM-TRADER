import React, { useState, useEffect, useCallback } from 'react';
import { sessionAnalyticsApi, DashboardData, SessionAnalytics, RealTimeSessionMetrics } from '../services/sessionAnalyticsApi';
import PerformanceChart from '../components/analytics/PerformanceChart';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { useRealTimeSessionStatus, useRealTimeNotifications, useRealTimeMarketData } from '../hooks/useWebSocket';
import ConnectionStatus from '../components/realtime/ConnectionStatus';
import MarketDataWidget from '../components/realtime/MarketDataWidget';

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  color?: string;
  icon?: React.ReactNode;
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  trend, 
  color = '#3B82F6',
  icon 
}) => {
  const trendColor = trend && trend > 0 ? '#10B981' : trend && trend < 0 ? '#EF4444' : '#6B7280';
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</h3>
          <div className="mt-2 flex items-baseline">
            <p className="text-2xl font-semibold" style={{ color }}>
              {value}
            </p>
            {trend !== undefined && (
              <span 
                className="ml-2 text-sm font-medium"
                style={{ color: trendColor }}
              >
                {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
              {icon}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface PerformanceGradeCardProps {
  analytics: SessionAnalytics;
}

const PerformanceGradeCard: React.FC<PerformanceGradeCardProps> = ({ analytics }) => {
  const grade = sessionAnalyticsApi.getPerformanceGrade(
    analytics.winRate,
    analytics.sharpeRatio,
    analytics.maxDrawdown
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="text-center">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
          Performance Grade
        </h3>
        <div 
          className="inline-flex items-center justify-center w-20 h-20 rounded-full text-3xl font-bold text-white mb-4"
          style={{ backgroundColor: grade.color }}
        >
          {grade.grade}
        </div>
        <p className="text-lg font-semibold text-gray-900 mb-2">{grade.description}</p>
        <div className="grid grid-cols-3 gap-4 mt-4 text-center">
          <div>
            <p className="text-sm text-gray-500">Win Rate</p>
            <p className="text-lg font-semibold">{analytics.winRate.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Sharpe Ratio</p>
            <p className="text-lg font-semibold">{analytics.sharpeRatio.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Max Drawdown</p>
            <p className="text-lg font-semibold">{(analytics.maxDrawdown * 100).toFixed(1)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

interface RealTimeMetricsProps {
  metrics: RealTimeSessionMetrics[];
}

const RealTimeMetrics: React.FC<RealTimeMetricsProps> = ({ metrics }) => {
  if (metrics.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Real-Time Sessions</h3>
        <div className="text-center py-8">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <p className="text-gray-500">No active sessions</p>
          <p className="text-sm text-gray-400 mt-2">Start a trading session to see real-time metrics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Real-Time Sessions ({metrics.length})
      </h3>
      <div className="space-y-4">
        {metrics.map((metric) => (
          <div key={metric.sessionId} className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">Session {metric.sessionId.slice(-8)}</h4>
              <div className="flex items-center space-x-2">
                <div 
                  className={`w-3 h-3 rounded-full ${
                    metric.riskScore > 70 ? 'bg-red-500' : 
                    metric.riskScore > 40 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                />
                <span className="text-sm text-gray-600">
                  Risk: {metric.riskScore.toFixed(0)}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Current P&L</p>
                <p className={`font-semibold ${metric.currentPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {sessionAnalyticsApi.formatCurrency(metric.currentPnL)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Trades</p>
                <p className="font-semibold text-gray-900">{metric.totalTrades}</p>
              </div>
              <div>
                <p className="text-gray-500">Loss Limit</p>
                <p className="font-semibold text-gray-900">
                  {metric.lossLimitUtilization.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-gray-500">Performance</p>
                <p className="font-semibold text-gray-900">{metric.performanceScore.toFixed(0)}</p>
              </div>
            </div>

            {/* Progress bars */}
            <div className="mt-4 space-y-2">
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Time Elapsed</span>
                  <span>{metric.timeElapsedPercentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, metric.timeElapsedPercentage)}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Loss Limit Usage</span>
                  <span>{metric.lossLimitUtilization.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      metric.lossLimitUtilization > 80 ? 'bg-red-500' :
                      metric.lossLimitUtilization > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, metric.lossLimitUtilization)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface TimingInsightsProps {
  analytics: SessionAnalytics;
}

const TimingInsights: React.FC<TimingInsightsProps> = ({ analytics }) => {
  const bestHour = sessionAnalyticsApi.getHourDisplay(analytics.bestPerformingHour);
  const worstHour = sessionAnalyticsApi.getHourDisplay(analytics.worstPerformingHour);
  const bestDay = sessionAnalyticsApi.getDayName(analytics.bestPerformingDayOfWeek);
  const worstDay = sessionAnalyticsApi.getDayName(analytics.worstPerformingDayOfWeek);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Timing Insights</h3>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium text-gray-700 mb-3">Best Performance</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Hour:</span>
              <span className="font-semibold text-green-600">{bestHour}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Day:</span>
              <span className="font-semibold text-green-600">{bestDay}</span>
            </div>
          </div>
        </div>
        <div>
          <h4 className="font-medium text-gray-700 mb-3">Worst Performance</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Hour:</span>
              <span className="font-semibold text-red-600">{worstHour}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Day:</span>
              <span className="font-semibold text-red-600">{worstDay}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">💡 Recommendation</h4>
        <p className="text-sm text-blue-700">
          Consider scheduling more sessions on {bestDay}s around {bestHour} for optimal performance.
          Avoid trading on {worstDay}s around {worstHour} when possible.
        </p>
      </div>
    </div>
  );
};

const SessionAnalyticsPage: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Mock user ID - in real app this would come from auth context
  const userId = 'user-123';

  // WebSocket integration
  const { connectionState, isConnected } = useWebSocketContext();
  const { notifications } = useRealTimeNotifications();
  const marketData = useRealTimeMarketData(['SPY', 'QQQ', 'AAPL', 'MSFT', 'TSLA']);

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      const data = await sessionAnalyticsApi.getDashboardData(userId, period);
      setDashboardData(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [userId, period]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Update analytics when WebSocket connection is established
  useEffect(() => {
    if (isConnected) {
      console.log('WebSocket connected, refreshing dashboard data');
      fetchDashboardData();
    }
  }, [isConnected, fetchDashboardData]);

  // Listen for analytics update notifications
  useEffect(() => {
    const analyticsUpdates = notifications.filter(n => 
      n.title === 'Analytics Updated' || 
      n.title === 'Performance Milestone' ||
      n.title === 'Session Completed'
    );
    
    if (analyticsUpdates.length > 0) {
      console.log('Analytics update notification received, refreshing data');
      fetchDashboardData();
    }
  }, [notifications, fetchDashboardData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Analytics Unavailable</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const analytics = dashboardData?.sessionAnalytics;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Session Analytics</h1>
              <p className="text-sm text-gray-600 mt-1">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <ConnectionStatus connectionState={connectionState} />
              
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Last 24 Hours</option>
                <option value="weekly">Last Week</option>
                <option value="monthly">Last Month</option>
                <option value="yearly">Last Year</option>
              </select>
              
              <button
                onClick={fetchDashboardData}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Real-time metrics section */}
        <div className="mb-8">
          <RealTimeMetrics metrics={dashboardData?.realTimeMetrics || []} />
        </div>

        {/* Live market data */}
        <div className="mb-8">
          <MarketDataWidget />
        </div>

        {analytics ? (
          <>
            {/* Key metrics cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <AnalyticsCard
                title="Total P&L"
                value={sessionAnalyticsApi.formatCurrency(analytics.totalProfitLoss)}
                subtitle={`${analytics.totalSessions} sessions`}
                color={analytics.totalProfitLoss >= 0 ? '#10B981' : '#EF4444'}
                icon={<span className="text-2xl">💰</span>}
              />
              
              <AnalyticsCard
                title="Win Rate"
                value={`${analytics.winRate.toFixed(1)}%`}
                subtitle={`${Math.round(analytics.winRate * analytics.totalSessions / 100)} wins`}
                color="#3B82F6"
                icon={<span className="text-2xl">🎯</span>}
              />
              
              <AnalyticsCard
                title="Average Session"
                value={sessionAnalyticsApi.formatDuration(analytics.averageSessionDuration)}
                subtitle={`${analytics.averageTradesPerSession.toFixed(1)} trades avg`}
                color="#8B5CF6"
                icon={<span className="text-2xl">⏱️</span>}
              />
              
              <AnalyticsCard
                title="Risk Score"
                value={`${analytics.averageLossLimitUtilization.toFixed(0)}%`}
                subtitle="Average loss limit usage"
                color="#F59E0B"
                icon={<span className="text-2xl">⚡</span>}
              />
            </div>

            {/* Performance grade and insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <PerformanceGradeCard analytics={analytics} />
              <TimingInsights analytics={analytics} />
            </div>

            {/* Performance Chart */}
            <div className="mb-8">
              <PerformanceChart analytics={analytics} period={period} />
            </div>

            {/* Detailed metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnalyticsCard
                title="Profit Factor"
                value={analytics.profitFactor.toFixed(2)}
                subtitle="Gross profit / Gross loss"
                color="#10B981"
              />
              
              <AnalyticsCard
                title="Sharpe Ratio"
                value={analytics.sharpeRatio.toFixed(2)}
                subtitle="Risk-adjusted returns"
                color="#3B82F6"
              />
              
              <AnalyticsCard
                title="Max Drawdown"
                value={`${(analytics.maxDrawdown * 100).toFixed(1)}%`}
                subtitle="Maximum decline from peak"
                color="#EF4444"
              />
              
              <AnalyticsCard
                title="Total Trading Time"
                value={sessionAnalyticsApi.formatDuration(analytics.totalTradingTime)}
                subtitle="Across all sessions"
                color="#8B5CF6"
              />
              
              <AnalyticsCard
                title="Average Trade Size"
                value={sessionAnalyticsApi.formatCurrency(analytics.averageTradeSize)}
                subtitle={`${analytics.totalTrades} total trades`}
                color="#F59E0B"
              />
              
              <AnalyticsCard
                title="Trading Frequency"
                value={`${analytics.tradingFrequency.toFixed(1)}/hr`}
                subtitle="Trades per hour"
                color="#06B6D4"
              />
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">📈</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Analytics Data</h3>
            <p className="text-gray-600 mb-4">
              Complete some trading sessions to see your performance analytics
            </p>
            <button
              onClick={() => window.location.href = '/sessions'}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Start Trading Session
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionAnalyticsPage;
