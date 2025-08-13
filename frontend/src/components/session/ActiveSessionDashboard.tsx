import React, { useState, useEffect, useCallback } from 'react';
import { sessionApi, type ActiveSession } from '../../services/sessionApi';
import SessionTerminationModal from './SessionTerminationModal';

interface ActiveSessionDashboardProps {
  onSessionStopped?: () => void;
  className?: string;
}

export const ActiveSessionDashboard: React.FC<ActiveSessionDashboardProps> = ({
  onSessionStopped,
  className = ''
}) => {
  const [sessionData, setSessionData] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [stoppingSession, setStoppingSession] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showTerminationModal, setShowTerminationModal] = useState(false);

  // Real-time countdown timer - update every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Load active session data with real-time updates
  const loadSessionData = useCallback(async () => {
    try {
      const data = await sessionApi.getActiveSession();
      setSessionData(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session data');
      setSessionData(null);
    }
  }, []);

  // Initial load and periodic updates
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await loadSessionData();
      setLoading(false);
    };

    loadInitialData();

    // Update session data every 10 seconds (for trade counts, P&L, etc.)
    const interval = setInterval(loadSessionData, 10000);
    return () => clearInterval(interval);
  }, [loadSessionData]);

  const handleStopSession = () => {
    setShowTerminationModal(true);
  };

  const handleSessionTerminated = () => {
    onSessionStopped?.();
    loadSessionData();
  };

  // Calculate real-time remaining time
  const getRealTimeRemainingMinutes = (): number => {
    if (!sessionData || sessionData.remainingMinutes <= 0) return 0;
    
    // Calculate time passed since last data update
    const now = currentTime.getTime();
    const dataTimestamp = Date.now() - 10000; // Approximate last update
    const timePassed = Math.floor((now - dataTimestamp) / (1000 * 60));
    
    return Math.max(0, sessionData.remainingMinutes - timePassed);
  };

  const formatTimeRemaining = (minutes: number): string => {
    if (minutes <= 0) return '0m 0s';
    
    const totalSeconds = minutes * 60;
    const displayMinutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    
    const days = Math.floor(displayMinutes / 1440);
    const hours = Math.floor((displayMinutes % 1440) / 60);
    const mins = displayMinutes % 60;
    
    if (days > 0) {
      return `${days}d ${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h ${mins}m ${seconds}s`;
    } else {
      return `${mins}m ${seconds}s`;
    }
  };

  const formatDuration = (minutes: number): string => {
    return sessionApi.formatDuration(minutes);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active':
        return 'text-green-700 bg-green-100 border-green-200';
      case 'pending':
        return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'completed':
        return 'text-blue-700 bg-blue-100 border-blue-200';
      case 'stopped':
        return 'text-gray-700 bg-gray-100 border-gray-200';
      case 'expired':
        return 'text-red-700 bg-red-100 border-red-200';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getPnLColor = (pnl: number): string => {
    if (pnl > 0) return 'text-green-600';
    if (pnl < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getProgressBarColor = (percentage: number, isLossLimit: boolean = false): string => {
    if (isLossLimit) {
      if (percentage > 80) return 'bg-red-500';
      if (percentage > 60) return 'bg-yellow-500';
      return 'bg-green-500';
    } else {
      if (percentage > 80) return 'bg-red-500';
      if (percentage > 60) return 'bg-yellow-500';
      return 'bg-blue-500';
    }
  };

  // Calculate additional metrics
  const calculateWinRate = (): number => {
    // This would be calculated from trade history in a real implementation
    // For now, we'll simulate based on current P&L
    if (!sessionData || sessionData.totalTrades === 0) return 0;
    return (sessionData.currentPnL || 0) > 0 ? 65 : 45; // Placeholder calculation
  };

  const calculateAverageTrade = (): number => {
    if (!sessionData || sessionData.totalTrades === 0) return 0;
    return (sessionData.currentPnL || 0) / sessionData.totalTrades;
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
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
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-600 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-gray-900 font-medium">Error Loading Session</p>
          <p className="text-gray-600 text-sm mt-1">{error}</p>
          <button
            onClick={() => {
              setError('');
              loadSessionData();
            }}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
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

  const realTimeRemaining = getRealTimeRemainingMinutes();
  const winRate = calculateWinRate();
  const avgTrade = calculateAverageTrade();

  return (
    <div className={`bg-white rounded-lg shadow-lg p-4 md:p-6 ${className}`}>
      {/* Header with Status */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div className="flex-1">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Active Trading Session</h2>
          <p className="text-gray-600 text-sm">Session ID: {sessionData.sessionId.slice(-8)}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs md:text-sm font-medium border ${getStatusColor(sessionData.status)}`}>
          {sessionData.status.charAt(0).toUpperCase() + sessionData.status.slice(1)}
        </div>
      </div>

      {/* Real-time Countdown Timer - Prominent Display */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6 border border-blue-200">
        <div className="text-center">
          <div className="text-2xl md:text-3xl font-bold text-blue-900 font-mono">
            {formatTimeRemaining(realTimeRemaining)}
          </div>
          <div className="text-sm text-blue-700 mt-1">Time Remaining</div>
        </div>
      </div>

      {/* Progress Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
        {/* Time Progress */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Time Elapsed</span>
            <span className="text-xs md:text-sm text-gray-600">
              {formatDuration(sessionData.elapsedMinutes)} / {formatDuration(sessionData.durationMinutes)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${getProgressBarColor(sessionData.progressPercentages.timeElapsed)}`}
              style={{ width: `${Math.min(sessionData.progressPercentages.timeElapsed, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
            <span>{sessionData.progressPercentages.timeElapsed.toFixed(1)}% elapsed</span>
            <span>{(100 - sessionData.progressPercentages.timeElapsed).toFixed(1)}% remaining</span>
          </div>
        </div>

        {/* Loss Limit Progress */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Risk Limit Usage</span>
            <span className="text-xs md:text-sm text-gray-600">
              ${Math.abs(sessionData.currentPnL).toFixed(2)} / ${sessionData.lossLimitAmount.toFixed(2)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${getProgressBarColor(sessionData.progressPercentages.lossLimitUsed, true)}`}
              style={{ width: `${Math.min(sessionData.progressPercentages.lossLimitUsed, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
            <span>{sessionData.progressPercentages.lossLimitUsed.toFixed(1)}% used</span>
            <span>{(100 - sessionData.progressPercentages.lossLimitUsed).toFixed(1)}% available</span>
          </div>
        </div>
      </div>

      {/* Performance Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="text-center bg-gray-50 rounded-lg p-3">
          <div className={`text-lg md:text-2xl font-bold ${getPnLColor(sessionData.currentPnL)}`}>
            ${sessionData.currentPnL >= 0 ? '+' : ''}
            {sessionData.currentPnL.toFixed(2)}
          </div>
          <div className="text-xs md:text-sm text-gray-600">Current P&L</div>
        </div>
        <div className="text-center bg-gray-50 rounded-lg p-3">
          <div className="text-lg md:text-2xl font-bold text-blue-600">
            {sessionData.totalTrades}
          </div>
          <div className="text-xs md:text-sm text-gray-600">Total Trades</div>
        </div>
        <div className="text-center bg-gray-50 rounded-lg p-3">
          <div className="text-lg md:text-2xl font-bold text-purple-600">
            {winRate.toFixed(0)}%
          </div>
          <div className="text-xs md:text-sm text-gray-600">Win Rate</div>
        </div>
        <div className="text-center bg-gray-50 rounded-lg p-3">
          <div className={`text-lg md:text-2xl font-bold ${getPnLColor(avgTrade)}`}>
            ${avgTrade >= 0 ? '+' : ''}
            {avgTrade.toFixed(2)}
          </div>
          <div className="text-xs md:text-sm text-gray-600">Avg Trade</div>
        </div>
      </div>

      {/* Warning Alerts - 80% Threshold */}
      {(sessionData.progressPercentages.timeElapsed > 80 || sessionData.progressPercentages.lossLimitUsed > 80) && (
        <div className="mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">⚠️ Session Limit Warning</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc list-inside space-y-1">
                    {sessionData.progressPercentages.timeElapsed > 80 && (
                      <li>Time limit approaching: {sessionData.progressPercentages.timeElapsed.toFixed(1)}% elapsed ({formatTimeRemaining(realTimeRemaining)} remaining)</li>
                    )}
                    {sessionData.progressPercentages.lossLimitUsed > 80 && (
                      <li>Risk limit approaching: {sessionData.progressPercentages.lossLimitUsed.toFixed(1)}% used (${(sessionData.lossLimitAmount - Math.abs(sessionData.currentPnL)).toFixed(2)} remaining)</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleStopSession}
          disabled={stoppingSession || sessionData.status !== 'active'}
          className={`flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-colors ${
            sessionData.status === 'active' && !stoppingSession
              ? 'bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {stoppingSession ? (
            <span className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Stopping Session...
            </span>
          ) : (
            '🛑 Stop Session'
          )}
        </button>
        <button
          onClick={loadSessionData}
          className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors shadow-sm hover:shadow-md"
        >
          <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Session Quick Stats */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex flex-wrap justify-between text-xs text-gray-500 gap-2">
          <span>Session: {sessionData.sessionId.slice(-12)}</span>
          <span>Duration: {formatDuration(sessionData.durationMinutes)}</span>
          <span>Risk Limit: ${sessionData.lossLimitAmount.toFixed(2)}</span>
          <span>Last Update: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Session Termination Modal */}
      {sessionData && (
        <SessionTerminationModal
          session={sessionData}
          isOpen={showTerminationModal}
          onClose={() => setShowTerminationModal(false)}
          onSessionStopped={handleSessionTerminated}
        />
      )}
    </div>
  );
};

export default ActiveSessionDashboard;
