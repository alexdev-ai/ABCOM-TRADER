import React, { useState, useEffect } from 'react';
import SessionCreationForm from '../components/session/SessionCreationForm';
import ActiveSessionDashboard from '../components/session/ActiveSessionDashboard';
import tradingSessionApi, { 
  SessionSummary, 
  SessionHistoryItem,
  formatCurrency,
  formatDuration,
  getSessionStatusColor,
  getSessionStatusBg
} from '../services/tradingSessionApi';

const TradingSessionsPage: React.FC = () => {
  const [activeSession, setActiveSession] = useState<SessionSummary | null>(null);
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load active session and history in parallel
      const [activeSessionData, historyData] = await Promise.all([
        tradingSessionApi.getActiveSession(),
        tradingSessionApi.getSessionHistory(10, 0)
      ]);

      setActiveSession(activeSessionData);
      setSessionHistory(historyData.sessions);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshActiveSession = async () => {
    if (!activeSession) return;

    try {
      const updatedSession = await tradingSessionApi.getSessionSummary(activeSession.id);
      setActiveSession(updatedSession);
    } catch (error: any) {
      // If session is no longer active, refresh all data
      loadData();
    }
  };

  const handleSessionCreated = (session: any) => {
    setShowCreateForm(false);
    loadData(); // Refresh to get the new session
  };

  const handleSessionStopped = () => {
    setActiveSession(null);
    loadData(); // Refresh to update history
  };

  const loadMoreHistory = async () => {
    if (historyLoading) return;

    setHistoryLoading(true);
    try {
      const historyData = await tradingSessionApi.getSessionHistory(10, sessionHistory.length);
      setSessionHistory(prev => [...prev, ...historyData.sessions]);
    } catch (error: any) {
      console.error('Failed to load more history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPnlColor = (pnl: number): string => {
    if (pnl > 0) return 'text-green-600';
    if (pnl < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Trading Sessions</h1>
              <p className="text-gray-600 mt-2">
                Manage your bounded trading sessions with time and loss limits
              </p>
            </div>
            {!activeSession && !showCreateForm && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                New Session
              </button>
            )}
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Create Session Form */}
        {showCreateForm && (
          <div className="mb-8">
            <SessionCreationForm
              onSessionCreated={handleSessionCreated}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        )}

        {/* Active Session */}
        {activeSession && (
          <div className="mb-8">
            <ActiveSessionDashboard
              session={activeSession}
              onSessionStopped={handleSessionStopped}
              onRefresh={refreshActiveSession}
            />
          </div>
        )}

        {/* No Active Session Message */}
        {!activeSession && !showCreateForm && (
          <div className="mb-8 bg-white rounded-lg shadow-md p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Session</h3>
            <p className="text-gray-600 mb-4">
              Create a new trading session to start trading with time and loss limits.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Trading Session
            </button>
          </div>
        )}

        {/* Session History */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Session History</h2>
            <p className="text-gray-600 mt-1">View your past trading sessions and performance</p>
          </div>

          {sessionHistory.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Session History</h3>
              <p className="text-gray-500">Your completed trading sessions will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {sessionHistory.map((session) => (
                <div key={session.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSessionStatusBg(session.status)} ${getSessionStatusColor(session.status)}`}>
                          {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(session.createdAt)}
                        </span>
                        {session.terminationReason && (
                          <span className="text-xs text-gray-400">
                            ({session.terminationReason.replace('_', ' ')})
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Duration:</span>
                          <p className="font-medium text-gray-900">
                            {session.actualDurationMinutes 
                              ? formatDuration(session.actualDurationMinutes)
                              : formatDuration(session.durationMinutes)
                            }
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">P&L:</span>
                          <p className={`font-medium ${getPnlColor(session.realizedPnl)}`}>
                            {session.realizedPnl >= 0 ? '+' : ''}{formatCurrency(session.realizedPnl)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Trades:</span>
                          <p className="font-medium text-gray-900">{session.totalTrades}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Loss Limit:</span>
                          <p className="font-medium text-gray-900">
                            {formatCurrency(session.lossLimitAmount)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4 text-right">
                      <div className="text-sm text-gray-500">Session ID</div>
                      <div className="text-xs font-mono text-gray-400 truncate max-w-24">
                        {session.id}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Load More Button */}
              <div className="p-6 text-center border-t border-gray-200">
                <button
                  onClick={loadMoreHistory}
                  disabled={historyLoading}
                  className="px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
                >
                  {historyLoading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Trading Session Guidelines</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">Session Duration</h4>
              <ul className="space-y-1 text-blue-700">
                <li>• 1 Hour: Quick trading session</li>
                <li>• 4 Hours: Half-day trading</li>
                <li>• 24 Hours: Full day trading</li>
                <li>• 7 Days: Week-long session</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Loss Limits</h4>
              <ul className="space-y-1 text-blue-700">
                <li>• Set limits to protect your capital</li>
                <li>• Sessions auto-stop when limit reached</li>
                <li>• Choose percentage or fixed amount</li>
                <li>• Maximum 50% of account balance</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingSessionsPage;
