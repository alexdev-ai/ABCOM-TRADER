import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3003/api/v1';

export interface SessionConfig {
  durationMinutes: 60 | 240 | 1440 | 10080;
  lossLimitAmount: number;
}

export interface Session {
  id: string;
  durationMinutes: number;
  lossLimitAmount: number;
  lossLimitPercentage?: number;
  status: string;
  startTime?: string;
  endTime?: string;
  realizedPnl?: number;
  totalTrades?: number;
  terminationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionCreateResponse {
  success: boolean;
  data?: {
    session: Session;
  };
  error?: string;
}

export interface SessionUpdateData {
  currentPnL?: number;
  tradeCount?: number;
}

export interface SessionHistoryResponse {
  success: boolean;
  data?: {
    sessions: Session[];
    pagination: {
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
  error?: string;
}

export interface SessionStatsResponse {
  success: boolean;
  data?: {
    stats: {
      totalSessions: number;
      averageDuration?: number;
      averagePnL?: number;
      averageTradeCount?: number;
      statusBreakdown: Record<string, number>;
    };
  };
  error?: string;
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

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        return {
          success: false,
          error: errorData.error || 'Failed to create trading session'
        };
      }
      return {
        success: false,
        error: 'Failed to create trading session'
      };
    }
  },

  /**
   * Start a pending trading session
   */
  async startSession(sessionId: string): Promise<SessionCreateResponse> {
    try {
      const response = await axios.post(
        `${API_BASE}/sessions/${sessionId}/start`,
        {},
        {
          headers: createAuthHeaders(),
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        return {
          success: false,
          error: errorData.error || 'Failed to start trading session'
        };
      }
      return {
        success: false,
        error: 'Failed to start trading session'
      };
    }
  },

  /**
   * Stop an active trading session
   */
  async stopSession(sessionId: string): Promise<SessionCreateResponse> {
    try {
      const response = await axios.post(
        `${API_BASE}/sessions/${sessionId}/stop`,
        {},
        {
          headers: createAuthHeaders(),
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        return {
          success: false,
          error: errorData.error || 'Failed to stop trading session'
        };
      }
      return {
        success: false,
        error: 'Failed to stop trading session'
      };
    }
  },

  /**
   * Emergency stop a trading session
   */
  async emergencyStopSession(sessionId: string): Promise<SessionCreateResponse> {
    try {
      const response = await axios.post(
        `${API_BASE}/sessions/${sessionId}/emergency-stop`,
        {},
        {
          headers: createAuthHeaders(),
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        return {
          success: false,
          error: errorData.error || 'Failed to emergency stop trading session'
        };
      }
      return {
        success: false,
        error: 'Failed to emergency stop trading session'
      };
    }
  },

  /**
   * Get active trading session for user
   */
  async getActiveSession(): Promise<SessionCreateResponse> {
    try {
      const response = await axios.get(
        `${API_BASE}/sessions/active`,
        {
          headers: createAuthHeaders(),
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        return {
          success: false,
          error: errorData.error || 'Failed to get active session'
        };
      }
      return {
        success: false,
        error: 'Failed to get active session'
      };
    }
  },

  /**
   * Update session performance data
   */
  async updateSessionPerformance(
    sessionId: string, 
    data: SessionUpdateData
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await axios.put(
        `${API_BASE}/sessions/${sessionId}/performance`,
        data,
        {
          headers: createAuthHeaders(),
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        return {
          success: false,
          error: errorData.error || 'Failed to update session performance'
        };
      }
      return {
        success: false,
        error: 'Failed to update session performance'
      };
    }
  },

  /**
   * Get session history
   */
  async getSessionHistory(
    limit: number = 10, 
    offset: number = 0
  ): Promise<SessionHistoryResponse> {
    try {
      const response = await axios.get(
        `${API_BASE}/sessions/history?limit=${limit}&offset=${offset}`,
        {
          headers: createAuthHeaders(),
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        return {
          success: false,
          error: errorData.error || 'Failed to get session history'
        };
      }
      return {
        success: false,
        error: 'Failed to get session history'
      };
    }
  },

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<SessionStatsResponse> {
    try {
      const response = await axios.get(
        `${API_BASE}/sessions/stats`,
        {
          headers: createAuthHeaders(),
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        return {
          success: false,
          error: errorData.error || 'Failed to get session statistics'
        };
      }
      return {
        success: false,
        error: 'Failed to get session statistics'
      };
    }
  },

  /**
   * Get specific session details
   */
  async getSession(sessionId: string): Promise<SessionCreateResponse> {
    try {
      const response = await axios.get(
        `${API_BASE}/sessions/${sessionId}`,
        {
          headers: createAuthHeaders(),
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        return {
          success: false,
          error: errorData.error || 'Failed to get session details'
        };
      }
      return {
        success: false,
        error: 'Failed to get session details'
      };
    }
  }
};

export default sessionApi;
