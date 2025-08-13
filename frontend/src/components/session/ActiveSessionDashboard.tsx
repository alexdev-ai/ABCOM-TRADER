import React, { useState, useEffect } from 'react';
import { sessionApi, ActiveSessionData } from '../../services/sessionApi';

interface ActiveSessionDashboardProps {
  onSessionStopped: () => void;
}

export const ActiveSessionDashboard: React.FC<ActiveSessionDashboardProps> = ({
  onSessionStopped
}) => {
  const [sessionData, setSessionData] = useState<ActiveSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [stoppingSession, setStoppingSession] = useState(false);

  // Load active session data
  useEffect(() => {
    const loadSessionData = async () => {
      try {
        setLoading(true);
        const data = await sessionApi.getActiveSession();
        setSessionData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load session data');
      } finally {
        setLoading(false);
      }
    };

    loadSessionData();

    // Set up real-time updates every 30 seconds
    const interval = setInterval(loadSessionData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleStopSession = async () => {
    if (!sessionData) return;

    setStoppingSession(true);
    try {
      await sessionApi.stopSession(sessionData.sessionId, 'manual_stop');
      onSessionStopped();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop session');
    } finally {
      setStoppingSession(false);
    }
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatTime = (date: string | undefined): string => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleTimeString();
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'completed':
        return 'text-blue-600 bg-blue-100';
      case 'stopped':
        return 'text-gray-600 bg-gray-100';
      case 'expired':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getPnLColor = (pnl: number): string => {
    if (pnl > 0) return 'text-green-600';
    if (pnl < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="text-red-600 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-gray-900 font-medium">Error Loading Session</p>
          <p className="text-gray-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-900 font-medium">No Active Session</p>
          <p className="text-gray-600 text-sm mt-1">Create a new trading session to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Active Trading Session</h2>
          <p className="text-gray-600">Session ID: {sessionData.sessionId.slice(-8)}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(sessionData.status)}`}>
          {sessionData.status.charAt(0).toUpperCase() + sessionData.status.slice(1)}
        </div>
      </div>

      {/* Progress Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Time Progress */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Time Elapsed</span>
            <span className="text-sm text-gray-600">
              {formatDuration(sessionData.elapsedMinutes)} / {formatDuration(sessionData.durationMinutes)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                sessionData.progressPercentages.timeElapsed > 80
                  ? 'bg-red-500'
                  : sessionData.progressPercentages.timeElapsed > 60
                  ? 'bg-yellow-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(sessionData.progressPercentages.timeElapsed, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
            <span>Started: {formatTime(sessionData.startTime)}</span>
            <span>Remaining: {formatDuration(sessionData.remainingMinutes)}</span>
          </div>
        </div>

        {/* Loss Limit Progress */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Loss Limit Usage</span>
            <span className="text-sm text-gray-600">
              ${Math.abs(sessionData.currentPnL).toFixed(2)} / ${sessionData.lossLimitAmount.toFixed(2)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                sessionData.progressPercentages.lossLimitUsed > 80
                  ? 'bg-red-500'
                  : sessionData.progressPercentages.lossLimitUsed > 60
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(sessionData.progressPercentages.lossLimitUsed, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
            <span>{sessionData.progressPercentages.lossLimitUsed.toFixed(1)}% used</span>
            <span>{sessionData.lossLimitPercentage}% limit</span>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className={`text-2xl font-bold ${getPnLColor(sessionData.currentPnL)}`}>
            ${sessionData.currentPnL >= 0 ? '+' : ''}
            {sessionData.currentPnL.toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">Current P&L</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {sessionData.totalTrades}
          </div>
          <div className="text-sm text-gray-600">Total Trades</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${getPnLColor(sessionData.sessionPerformancePercentage)}`}>
            {sessionData.sessionPerformancePercentage >= 0 ? '+' : ''}
            {sessionData.sessionPerformancePercentage.toFixed(2)}%
          </div>
          <div className="text-sm text-gray-600">Performance</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            ${sessionData.realizedPnl.toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">Realized P&L</div>
        </div>
      </div>

      {/* Warnings */}
      {(sessionData.progressPercentages.timeElapsed > 80 || sessionData.progressPercentages.lossLimitUsed > 80) && (
        <div className="mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Session Limit Warning</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc list-inside space-y-1">
                    {sessionData.progressPercentages.timeElapsed > 80 && (
                      <li>Time limit approaching: {sessionData.progressPercentages.timeElapsed.toFixed(1)}% elapsed</li>
                    )}
                    {sessionData.progressPercentages.lossLimitUsed > 80 && (
                      <li>Loss limit approaching: {sessionData.progressPercentages.lossLimitUsed.toFixed(1)}% used</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Controls */}
      <div className="flex space-x-4">
        <button
          onClick={handleStopSession}
          disabled={stoppingSession || sessionData.status !== 'active'}
          className={`flex-1 px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-red-500 ${
            sessionData.status === 'active' && !stoppingSession
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {stoppingSession ? 'Stopping Session...' : 'Stop Session'}
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>
    </div>
  );
};
