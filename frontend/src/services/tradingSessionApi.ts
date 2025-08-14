import axios from 'axios';

const API_BASE_URL = 'http://localhost:3003/api/v1';

// Types
export interface CreateSessionRequest {
  durationMinutes: number;
  lossLimitAmount?: number;
  lossLimitPercentage?: number;
}

export interface SessionSummary {
  id: string;
  status: string;
  durationMinutes: number;
  remainingMinutes: number;
  lossLimitAmount: number;
  lossLimitPercentage: number;
  currentPnl: number;
  totalTrades: number;
  startTime: string | null;
  endTime: string | null;
  progress: {
    timeElapsed: number;
    timeRemaining: number;
    lossLimitUsed: number;
  };
}

export interface SessionHistoryItem {
  id: string;
  durationMinutes: number;
  actualDurationMinutes: number | null;
  lossLimitAmount: number;
  lossLimitPercentage: number;
  status: string;
  startTime: string | null;
  endTime: string | null;
  terminationReason: string | null;
  realizedPnl: number;
  totalTrades: number;
  sessionPerformancePercentage: number;
  createdAt: string;
}

export interface CanCreateResponse {
  canCreate: boolean;
  reason?: string;
}

class TradingSessionApi {
  private getAuthHeaders() {
    const token = localStorage.getItem('access_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Check if user can create a new session
   */
  async canCreateSession(): Promise<CanCreateResponse> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/trading/sessions/can-create`,
        { headers: this.getAuthHeaders() }
      );
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Failed to check session eligibility');
    }
  }

  /**
   * Create a new trading session
   */
  async createSession(sessionData: CreateSessionRequest): Promise<any> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/trading/sessions`,
        sessionData,
        { headers: this.getAuthHeaders() }
      );
      return response.data.data.session;
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Failed to create trading session');
    }
  }

  /**
   * Activate a pending session
   */
  async activateSession(sessionId: string): Promise<any> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/trading/sessions/${sessionId}/activate`,
        {},
        { headers: this.getAuthHeaders() }
      );
      return response.data.data.session;
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Failed to activate session');
    }
  }

  /**
   * Get active session for user
   */
  async getActiveSession(): Promise<SessionSummary | null> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/trading/sessions/active`,
        { headers: this.getAuthHeaders() }
      );
      return response.data.data.session;
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Failed to get active session');
    }
  }

  /**
   * Get session summary with real-time data
   */
  async getSessionSummary(sessionId: string): Promise<SessionSummary> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/trading/sessions/${sessionId}`,
        { headers: this.getAuthHeaders() }
      );
      return response.data.data.session;
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Failed to get session data');
    }
  }

  /**
   * Stop an active session manually
   */
  async stopSession(sessionId: string): Promise<any> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/trading/sessions/${sessionId}/stop`,
        {},
        { headers: this.getAuthHeaders() }
      );
      return response.data.data.session;
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Failed to stop session');
    }
  }

  /**
   * Get session history
   */
  async getSessionHistory(limit: number = 10, offset: number = 0): Promise<{
    sessions: SessionHistoryItem[];
    pagination: { limit: number; offset: number; hasMore: boolean };
  }> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/trading/sessions/history?limit=${limit}&offset=${offset}`,
        { headers: this.getAuthHeaders() }
      );
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Failed to get session history');
    }
  }

  /**
   * Update session performance (internal use)
   */
  async updateSessionPerformance(sessionId: string, pnlChange: number, tradeCount: number = 1): Promise<void> {
    try {
      await axios.put(
        `${API_BASE_URL}/trading/sessions/${sessionId}/performance`,
        { pnlChange, tradeCount },
        { headers: this.getAuthHeaders() }
      );
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Failed to update session performance');
    }
  }
}

// Utility functions
export const formatDuration = (minutes: number): string => {
  if (minutes === 60) return '1 Hour';
  if (minutes === 240) return '4 Hours';
  if (minutes === 1440) return '24 Hours';
  if (minutes === 10080) return '7 Days';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

export const formatTimeRemaining = (minutes: number): string => {
  if (minutes <= 0) return 'Expired';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}m remaining`;
  if (mins === 0) return `${hours}h remaining`;
  return `${hours}h ${mins}m remaining`;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const getSessionStatusColor = (status: string): string => {
  switch (status) {
    case 'pending': return 'text-yellow-600';
    case 'active': return 'text-green-600';
    case 'completed': return 'text-blue-600';
    case 'stopped': return 'text-red-600';
    case 'expired': return 'text-gray-600';
    default: return 'text-gray-600';
  }
};

export const getSessionStatusBg = (status: string): string => {
  switch (status) {
    case 'pending': return 'bg-yellow-100';
    case 'active': return 'bg-green-100';
    case 'completed': return 'bg-blue-100';
    case 'stopped': return 'bg-red-100';
    case 'expired': return 'bg-gray-100';
    default: return 'bg-gray-100';
  }
};

export const durationOptions = [
  { value: 60, label: '1 Hour', description: 'Quick trading session' },
  { value: 240, label: '4 Hours', description: 'Half-day trading' },
  { value: 1440, label: '24 Hours', description: 'Full day trading' },
  { value: 10080, label: '7 Days', description: 'Week-long session' }
];

export const lossLimitOptions = [
  { value: 9, label: '$9', percentage: 10 },
  { value: 18, label: '$18', percentage: 20 },
  { value: 27, label: '$27', percentage: 30 }
];

export default new TradingSessionApi();
