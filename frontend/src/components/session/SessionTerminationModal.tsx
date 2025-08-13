import React, { useState } from 'react';
import { sessionApi, type ActiveSession } from '../../services/sessionApi';

interface SessionTerminationModalProps {
  session: ActiveSession;
  isOpen: boolean;
  onClose: () => void;
  onSessionStopped: () => void;
}

export const SessionTerminationModal: React.FC<SessionTerminationModalProps> = ({
  session,
  isOpen,
  onClose,
  onSessionStopped
}) => {
  const [terminating, setTerminating] = useState(false);
  const [error, setError] = useState<string>('');
  const [step, setStep] = useState<'confirm' | 'terminating' | 'complete'>('confirm');
  const [terminationResult, setTerminationResult] = useState<any>(null);

  const handleTerminate = async () => {
    setTerminating(true);
    setError('');
    setStep('terminating');

    try {
      await sessionApi.stopSession(session.sessionId, 'manual_stop');
      
      // Get final session details
      const finalSession = await sessionApi.getSession(session.sessionId);
      setTerminationResult(finalSession);
      setStep('complete');
      
      // Notify parent after a brief delay to show completion
      setTimeout(() => {
        onSessionStopped();
        onClose();
        setStep('confirm');
        setTerminationResult(null);
      }, 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to terminate session');
      setStep('confirm');
    } finally {
      setTerminating(false);
    }
  };

  const calculateSessionDuration = (): string => {
    const durationMinutes = session.elapsedMinutes;
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getPerformanceColor = (pnl: number): string => {
    if (pnl > 0) return 'text-green-600';
    if (pnl < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
        
        {/* Confirmation Step */}
        {step === 'confirm' && (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">End Trading Session</h3>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Session Summary */}
            <div className="px-6 py-4">
              <div className="mb-4">
                <p className="text-gray-700 mb-3">
                  Are you sure you want to end this trading session? Here's your current session summary:
                </p>
              </div>

              {/* Current Session Stats */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Duration:</span>
                    <div className="font-medium">{calculateSessionDuration()}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Remaining:</span>
                    <div className="font-medium">{sessionApi.formatTimeRemaining(session.remainingMinutes)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Current P&L:</span>
                    <div className={`font-medium ${getPerformanceColor(session.currentPnL)}`}>
                      ${session.currentPnL >= 0 ? '+' : ''}{session.currentPnL.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Trades:</span>
                    <div className="font-medium">{session.totalTrades}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Loss Limit:</span>
                    <div className="font-medium">${session.lossLimitAmount.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Limit Used:</span>
                    <div className="font-medium">{session.progressPercentages.lossLimitUsed.toFixed(1)}%</div>
                  </div>
                </div>
              </div>

              {/* Warning Message */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Important</h3>
                    <div className="mt-1 text-sm text-yellow-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>All trading activity will stop immediately</li>
                        <li>Any pending orders will be cancelled</li>
                        <li>Your session statistics will be finalized</li>
                        <li>You can view this session in your history</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  disabled={terminating}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTerminate}
                  disabled={terminating}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {terminating ? 'Ending Session...' : 'End Session'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Terminating Step */}
        {step === 'terminating' && (
          <div className="px-6 py-8">
            <div className="text-center">
              <div className="mb-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Ending Session</h3>
              <p className="text-gray-600">
                Please wait while we safely terminate your trading session and clean up any pending orders...
              </p>
              
              <div className="mt-4 space-y-2 text-sm text-gray-500">
                <div className="flex items-center justify-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Stopping algorithm trading
                </div>
                <div className="flex items-center justify-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Cancelling pending orders
                </div>
                <div className="flex items-center justify-center">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
                  Calculating final statistics
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Completion Step */}
        {step === 'complete' && terminationResult && (
          <div className="px-6 py-6">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Session Ended Successfully</h3>
              <p className="text-gray-600 mb-4">Your trading session has been safely terminated.</p>

              {/* Final Stats */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
                <h4 className="font-medium text-gray-900 mb-2">Final Session Summary</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Total Duration:</span>
                    <div className="font-medium">{terminationResult.actualDurationMinutes}m</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Final P&L:</span>
                    <div className={`font-medium ${getPerformanceColor(terminationResult.realizedPnl)}`}>
                      ${terminationResult.realizedPnl >= 0 ? '+' : ''}{terminationResult.realizedPnl.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Trades:</span>
                    <div className="font-medium">{terminationResult.totalTrades}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Performance:</span>
                    <div className={`font-medium ${getPerformanceColor(terminationResult.sessionPerformancePercentage || 0)}`}>
                      {terminationResult.sessionPerformancePercentage >= 0 ? '+' : ''}
                      {(terminationResult.sessionPerformancePercentage || 0).toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-500">
                This session has been saved to your history. You can create a new session anytime.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionTerminationModal;
