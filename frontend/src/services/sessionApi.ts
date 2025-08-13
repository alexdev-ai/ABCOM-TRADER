import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3002/api/v1';

// Types
export interface SessionConfig {
  durationMinutes: 60 | 240 | 1440 | 10080; // 1h, 4h, 1d, 7d
  lossLimitAmount?: number;
  lossLimitPercentage?: number;
}

export interface SessionCreateResponse {
  sessionId: string;
  durationMinutes: number;
  lossLimitAmount: number;
  lossLimitPercentage: number;
  estimatedEndTime: string;
  status: 'pending';
}

export interface ActiveSession {
  sessionId: string;
  status: 'active';
  durationMinutes: number;
  elapsedMinutes: number;
  remainingMinutes: number;
  lossLimitAmount: number;
  currentPnL: number;
  totalTrades: number;
  progressPercentages: {
    timeElapsed: number;
    lossLimitUsed: number;
  };
}

export interface SessionValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SessionHistoryItem {
  sessionId: string;
  durationMinutes: number;
  lossLimitAmount: number;
  lossLimitPercentage: number;
  status: string;
  startTime: string | null;
  endTime: string | null;
  actualDurationMinutes: number | null;
  totalTrades: number;
  realizedPnl: number;
  sessionPerformancePercentage: number | null;
  terminationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionHistoryResponse {
  sessions: SessionHistoryItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Get auth token
const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

// Create axios instance with auth
const createAuthHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const sessionApi = {
  /**
   * Create a new trading session
   */
  async createSession(config: SessionConfig): Promise<SessionCreateResponse> {
    try {
      const response = await axios.post(
        `${API_BASE}/sessions`,
        config,
        {
          headers: createAuthHeaders(),
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create session');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        throw new Error(errorData.message || 'Failed to create trading session');
      }
      throw error;
    }
  },

  /**
   * Get active session data
   */
  async getActiveSession(): Promise<ActiveSession | null> {
    try {
      const response = await axios.get(
        `${API_BASE}/sessions/active`,
        {
          headers: createAuthHeaders(),
        }
      );

      if (!response.data.success) {
        if (response.status === 404) {
          return null; // No active session
        }
        throw new Error(response.data.message || 'Failed to get active session');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null; // No active session
      }
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        throw new Error(errorData.message || 'Failed to get active session');
      }
      throw error;
    }
  },

  /**
   * Start a pending session
   */
  async startSession(sessionId: string): Promise<void> {
    try {
      const response = await axios.post(
        `${API_BASE}/sessions/${sessionId}/start`,
        {},
        {
          headers: createAuthHeaders(),
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to start session');
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        throw new Error(errorData.message || 'Failed to start trading session');
      }
      throw error;
    }
  },

  /**
   * Stop an active session
   */
  async stopSession(sessionId: string, reason: string = 'manual_stop'): Promise<void> {
    try {
      const response = await axios.post(
        `${API_BASE}/sessions/${sessionId}/stop`,
        { reason },
        {
          headers: createAuthHeaders(),
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to stop session');
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        throw new Error(errorData.message || 'Failed to stop trading session');
      }
      throw error;
    }
  },

  /**
   * Validate session configuration
   */
  async validateSession(config: SessionConfig): Promise<SessionValidation> {
    try {
      const response = await axios.post(
        `${API_BASE}/sessions/validate`,
        config,
        {
          headers: createAuthHeaders(),
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to validate session');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        throw new Error(errorData.message || 'Failed to validate session configuration');
      }
      throw error;
    }
  },

  /**
   * Get session history
   */
  async getSessionHistory(
    limit: number = 50,
    offset: number = 0,
    filters?: {
      dateFrom?: string;
      dateTo?: string;
      status?: string;
      performanceFilter?: 'profit' | 'loss' | 'all';
    }
  ): Promise<SessionHistoryResponse> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (filters) {
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);
        if (filters.status) params.append('status', filters.status);
        if (filters.performanceFilter) params.append('performanceFilter', filters.performanceFilter);
      }

      const response = await axios.get(
        `${API_BASE}/sessions/history?${params.toString()}`,
        {
          headers: createAuthHeaders(),
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get session history');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        throw new Error(errorData.message || 'Failed to get session history');
      }
      throw error;
    }
  },

  /**
   * Get specific session details
   */
  async getSession(sessionId: string): Promise<SessionHistoryItem> {
    try {
      const response = await axios.get(
        `${API_BASE}/sessions/${sessionId}`,
        {
          headers: createAuthHeaders(),
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get session');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        throw new Error(errorData.message || 'Failed to get session details');
      }
      throw error;
    }
  },

  /**
   * Format duration for display
   */
  formatDuration(minutes: number): string {
    if (minutes === 60) return '1 Hour';
    if (minutes === 240) return '4 Hours';
    if (minutes === 1440) return '1 Day';
    if (minutes === 10080) return '7 Days';
    
    // Fallback for custom durations
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
  },

  /**
   * Format time remaining
   */
  formatTimeRemaining(minutes: number): string {
    if (minutes <= 0) return '0m';
    
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = minutes % 60;
    
    if (days > 0) {
      return `${days}d ${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins}m`;
    }
  }
};

export default sessionApi;
