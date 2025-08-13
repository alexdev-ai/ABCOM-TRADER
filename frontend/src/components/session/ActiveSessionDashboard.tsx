import React, { useState, useEffect } from 'react';
import tradingSessionApi, { 
  SessionSummary, 
  formatCurrency, 
  formatTimeRemaining,
  formatDuration,
  getSessionStatusColor,
  getSessionStatusBg
} from '../../services/tradingSessionApi';

interface ActiveSessionDashboardProps {
  session: SessionSummary;
  onSessionStopped: () => void;
  onRefresh: () => void;
}

const ActiveSessionDashboard: React.FC<ActiveSessionDashboardProps> = ({
  session,
  onSessionStopped,
  onRefresh
}) => {
  const [showStopModal, setShowStopModal] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-refresh session data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      onRefresh();
    }, 30000);

    return () => clearInterval(interval);
  }, [onRefresh]);

  const handleStopSession = async () => {
    setStopping(true);
    setError(null);

    try {
      await tradingSessionApi.stopSession(session.id);
      setShowStopModal(false);
      onSessionStopped();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setStopping(false);
    }
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 80) return 'bg-red-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPnlColor = (pnl: number): string => {
    if (pnl > 0) return 'text-green-600';
    if (pnl < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatStartTime = (startTime: string | null): string => {
    if (!startTime) return 'Not started';
    return new Date(startTime).toLocaleString();
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Active Trading Session</h2>
            <p className="text-sm text-gray-500">Started: {formatStartTime(session.startTime)}</p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSessionStatusBg(session.status)} ${getSessionStatusColor(session.status)}`}>
              {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
            </span>
            <button
              onClick={onRefresh}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
              title="Refresh"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Session Overview */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Time Progress */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">Time Remaining</h3>
            <span className="text-sm text-gray-500">
              {Math.round(session.progress.timeRemaining)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${session.progress.timeRemaining}%` }}
            />
          </div>
          <p className="text-sm font-medium text-gray-900">
            {formatTimeRemaining(session.remainingMinutes)}
          </p>
          <p className="text-xs text-gray-500">
            of {formatDuration(session.durationMinutes)}
          </p>
        </div>

        {/* Loss Limit Progress */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">Loss Limit</h3>
            <span className="text-sm text-gray-500">
              {Math.round(session.progress.lossLimitUsed)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(session.progress.lossLimitUsed)}`}
              style={{ width: `${Math.min(100, session.progress.lossLimitUsed)}%` }}
            />
          </div>
          <p className="text-sm font-medium text-gray-900">
            {formatCurrency(session.lossLimitAmount - Math.abs(Math.min(0, session.currentPnl)))} remaining
          </p>
          <p className="text-xs text-gray-500">
            of {formatCurrency(session.lossLimitAmount)} limit
          </p>
        </div>

        {/* Current P&L */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Current P&L</h3>
          <p className={`text-2xl font-bold ${getPnlColor(session.currentPnl)}`}>
            {session.currentPnl >= 0 ? '+' : ''}{formatCurrency(session.currentPnl)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {session.totalTrades} trade{session.totalTrades !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Session Details */}
      <div className="p-6 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Session ID:</span>
            <p className="font-medium text-gray-900 truncate">{session.id}</p>
          </div>
          <div>
            <span className="text-gray-500">Duration:</span>
            <p className="font-medium text-gray-900">{formatDuration(session.durationMinutes)}</p>
          </div>
          <div>
            <span className="text-gray-500">Loss Limit:</span>
            <p className="font-medium text-gray-900">
              {formatCurrency(session.lossLimitAmount)} ({session.lossLimitPercentage.toFixed(1)}%)
            </p>
          </div>
          <div>
            <span className="text-gray-500">Total Trades:</span>
            <p className="font-medium text-gray-900">{session.totalTrades}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {(session.status === 'active' || session.status === 'pending') && (
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {session.status === 'pending' ? 
                'Session is ready to start' : 
                'Session is actively running'
              }
            </div>
            <div className="flex space-x-3">
              {session.status === 'pending' && (
                <button
                  onClick={async () => {
                    try {
                      await tradingSessionApi.activateSession(session.id);
                      onRefresh();
                    } catch (error: any) {
                      setError(error.message);
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Start Session
                </button>
              )}
              <button
                onClick={() => setShowStopModal(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Stop Session
              </button>
            </div>
          </div>
          
          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* Stop Session Modal */}
      {showStopModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Stop Trading Session</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to stop this trading session? This action cannot be undone.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Current P&L:</span>
                  <span className={`font-medium ${getPnlColor(session.currentPnl)}`}>
                    {formatCurrency(session.currentPnl)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Trades:</span>
                  <span className="font-medium text-gray-900">{session.totalTrades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Time Remaining:</span>
                  <span className="font-medium text-gray-900">
                    {formatTimeRemaining(session.remainingMinutes)}
                  </span>
                </div>
              </div>
            </div>
            
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowStopModal(false);
                  setError(null);
                }}
                disabled={stopping}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStopSession}
                disabled={stopping}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {stopping ? 'Stopping...' : 'Stop Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveSessionDashboard;
