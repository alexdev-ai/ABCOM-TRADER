import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  AlertTriangle, 
  StopCircle, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Shield,
  Target,
  Zap
} from 'lucide-react';
import { Session, sessionApi } from '../../services/sessionApi';

interface SessionMonitoringDashboardProps {
  sessionId: string;
  onSessionEnd: () => void;
}

export const SessionMonitoringDashboard: React.FC<SessionMonitoringDashboardProps> = ({
  sessionId,
  onSessionEnd
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStoppingSession, setIsStoppingSession] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Calculate time remaining
  useEffect(() => {
    if (!session?.endTime) return;

    const calculateTimeRemaining = () => {
      const endTime = new Date(session.endTime!).getTime();
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      setTimeRemaining(remaining);
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [session?.endTime]);

  // Fetch session data
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await sessionApi.getSession(sessionId);
        if (response.success && response.data?.session) {
          setSession(response.data.session);
        } else {
          setError('Session not found');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load session');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
    
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchSession, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const handleStopSession = async () => {
    if (!session) return;
    
    setIsStoppingSession(true);
    try {
      const response = await sessionApi.stopSession(session.id);
      if (response.success) {
        onSessionEnd();
      } else {
        setError('Failed to stop session');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to stop session');
    } finally {
      setIsStoppingSession(false);
    }
  };

  const handleEmergencyStop = async () => {
    if (!session) return;
    
    if (!window.confirm('Are you sure you want to perform an emergency stop? This will immediately terminate the session.')) {
      return;
    }

    setIsStoppingSession(true);
    try {
      const response = await sessionApi.emergencyStopSession(session.id);
      if (response.success) {
        onSessionEnd();
      } else {
        setError('Failed to emergency stop session');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to emergency stop session');
    } finally {
      setIsStoppingSession(false);
    }
  };

  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getTimeProgress = (): number => {
    if (!session?.endTime || !session?.startTime) return 0;
    
    const startTime = new Date(session.startTime).getTime();
    const endTime = new Date(session.endTime).getTime();
    const now = Date.now();
    
    const totalDuration = endTime - startTime;
    const elapsed = now - startTime;
    
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  };

  const getLossProgress = (): number => {
    if (!session?.lossLimitAmount || !session?.realizedPnl) return 0;
    
    const lossUsed = Math.abs(Math.min(0, session.realizedPnl));
    return Math.min(100, (lossUsed / session.lossLimitAmount) * 100);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'ACTIVE': return 'text-green-600 bg-green-100';
      case 'PENDING': return 'text-yellow-600 bg-yellow-100';
      case 'STOPPED': return 'text-gray-600 bg-gray-100';
      case 'EXPIRED': return 'text-red-600 bg-red-100';
      case 'EMERGENCY_STOPPED': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const isSessionActive = session?.status === 'ACTIVE';
  const timeProgress = getTimeProgress();
  const lossProgress = getLossProgress();
  const isTimeWarning = timeProgress > 80;
  const isLossWarning = lossProgress > 80;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading session...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-800 font-semibold">Error: {error}</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
        <span className="text-gray-600">Session not found</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Trading Session Monitor</h1>
            <p className="text-gray-600">Session ID: {session.id.slice(0, 8)}...</p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(session.status)}`}>
              {session.status}
            </span>
            {isSessionActive && (
              <div className="flex items-center text-green-600">
                <Activity className="h-4 w-4 mr-1 animate-pulse" />
                <span className="text-sm font-medium">Live</span>
              </div>
            )}
          </div>
        </div>

        {/* Warning Alerts */}
        {(isTimeWarning || isLossWarning) && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">⚠️ Warning</p>
                <ul className="space-y-1">
                  {isTimeWarning && <li>• Session is approaching time limit ({timeProgress.toFixed(0)}% elapsed)</li>}
                  {isLossWarning && <li>• Session is approaching loss limit ({lossProgress.toFixed(0)}% used)</li>}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Time Progress */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Clock className="h-6 w-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Time Remaining</h3>
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {formatTime(timeRemaining)}
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
            <div 
              className={`h-4 rounded-full transition-all duration-500 ${
                isTimeWarning ? 'bg-red-500' : 'bg-blue-600'
              }`}
              style={{ width: `${timeProgress}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-sm text-gray-600">
            <span>Started: {session.startTime ? new Date(session.startTime).toLocaleString() : 'Not started'}</span>
            <span>{timeProgress.toFixed(1)}% elapsed</span>
          </div>
        </div>

        {/* Loss Limit Progress */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Shield className="h-6 w-6 text-red-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Loss Limit</h3>
            </div>
            <span className="text-2xl font-bold text-gray-900">
              ${Math.abs(Math.min(0, session.realizedPnl || 0)).toFixed(2)}
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
            <div 
              className={`h-4 rounded-full transition-all duration-500 ${
                isLossWarning ? 'bg-red-500' : 'bg-green-600'
              }`}
              style={{ width: `${lossProgress}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-sm text-gray-600">
            <span>Limit: ${session.lossLimitAmount.toFixed(2)}</span>
            <span>{lossProgress.toFixed(1)}% used</span>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <Target className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Realized P&L</p>
              <p className={`text-xl font-bold ${
                (session.realizedPnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                ${(session.realizedPnl || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Trades</p>
              <p className="text-xl font-bold text-gray-900">{session.totalTrades || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Duration</p>
              <p className="text-xl font-bold text-gray-900">{session.durationMinutes}m</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <Zap className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Status</p>
              <p className="text-xl font-bold text-gray-900">{session.status}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      {isSessionActive && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Controls</h3>
          <div className="flex space-x-4">
            <button
              onClick={handleStopSession}
              disabled={isStoppingSession}
              className="flex-1 flex items-center justify-center px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <StopCircle className="h-5 w-5 mr-2" />
              {isStoppingSession ? 'Stopping...' : 'Stop Session'}
            </button>
            
            <button
              onClick={handleEmergencyStop}
              disabled={isStoppingSession}
              className="flex-1 flex items-center justify-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <AlertTriangle className="h-5 w-5 mr-2" />
              Emergency Stop
            </button>
          </div>
          
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Stop Session:</strong> Orderly session termination that allows current trades to complete.
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Emergency Stop:</strong> Immediate session termination with immediate position closure.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionMonitoringDashboard;
