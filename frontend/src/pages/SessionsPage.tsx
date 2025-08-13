import React, { useState, useEffect } from 'react';
import { SessionCreationForm } from '../components/session/SessionCreationForm';
import { ActiveSessionDashboard } from '../components/session/ActiveSessionDashboard';
import { sessionApi, ActiveSessionData } from '../services/sessionApi';

const SessionsPage: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeSession, setActiveSession] = useState<ActiveSessionData | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for active session on component mount
  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        setLoading(true);
        const session = await sessionApi.getActiveSession();
        setActiveSession(session);
      } catch (err) {
        console.error('Failed to check active session:', err);
      } finally {
        setLoading(false);
      }
    };

    checkActiveSession();
  }, []);

  const handleSessionCreated = (sessionId: string) => {
    setShowCreateForm(false);
    // Refresh to show the new active session
    window.location.reload();
  };

  const handleSessionStopped = () => {
    setActiveSession(null);
    setShowCreateForm(false);
  };

  const handleCreateNewSession = () => {
    setShowCreateForm(true);
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Trading Sessions</h1>
              <p className="mt-2 text-gray-600">
                Manage your time-bounded trading sessions with automatic risk controls
              </p>
            </div>
            {!activeSession && !showCreateForm && (
              <button
                onClick={handleCreateNewSession}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Session
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        {showCreateForm ? (
          /* Session Creation Form */
          <div className="mb-8">
            <SessionCreationForm
              onSessionCreated={handleSessionCreated}
              onCancel={handleCancelCreate}
            />
          </div>
        ) : activeSession ? (
          /* Active Session Dashboard */
          <div className="space-y-8">
            <ActiveSessionDashboard onSessionStopped={handleSessionStopped} />
            
            {/* Session Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-blue-900 mb-3">Session Management Tips</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <strong>Time Management:</strong> Sessions automatically stop when time limits are reached to promote disciplined trading.
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <strong>Loss Protection:</strong> Automatic session termination prevents losses beyond your defined limits.
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <strong>Performance Tracking:</strong> Monitor your real-time P&L and session performance metrics.
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <strong>Manual Control:</strong> You can stop sessions early if you've reached your trading goals.
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* No Active Session - Welcome State */
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="text-gray-400 mb-6">
                <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">No Active Session</h2>
              <p className="text-gray-600 mb-8">
                Start a new trading session to begin trading with time and loss limit protection.
                Sessions help you maintain discipline and manage risk effectively.
              </p>
              <button
                onClick={handleCreateNewSession}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-md font-medium text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Create Your First Session
              </button>
            </div>

            {/* Features Overview */}
            <div className="mt-16 max-w-4xl mx-auto">
              <h3 className="text-xl font-semibold text-gray-900 mb-8">Why Use Trading Sessions?</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Time Discipline</h4>
                  <p className="text-gray-600 text-sm">
                    Set specific time limits to prevent overtrading and maintain focus during your trading activities.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Risk Protection</h4>
                  <p className="text-gray-600 text-sm">
                    Automatic loss limit enforcement protects your account from excessive losses during volatile periods.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Performance Insights</h4>
                  <p className="text-gray-600 text-sm">
                    Track your session performance and analyze trading patterns to improve your strategy over time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionsPage;
