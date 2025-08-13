const API_BASE_URL = 'http://localhost:3002';

export interface SessionConfig {
  durationMinutes: 60 | 240 | 1440 | 10080;
  lossLimitAmount?: number;
  lossLimitPercentage?: number;
}

export interface TradingSession {
  sessionId: string;
  durationMinutes: number;
  lossLimitAmount: number;
  lossLimitPercentage: number;
  status: 'pending' | 'active' | 'completed' | 'stopped' | 'expired';
  startTime?: string;
  endTime?: string;
  actualDurationMinutes?: number;
  totalTrades: number;
  realizedPnl: number;
  sessionPerformancePercentage: number;
  terminationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveSessionData extends TradingSession {
  elapsedMinutes: number;
  remainingMinutes: number;
  currentPnL: number;
  progressPercentages: {
    timeElapsed: number;
    lossLimitUsed: number;
  };
}

export interface SessionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SessionHistoryQuery {
  limit?: number;
  offset?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  performanceFilter?: 'profit' | 'loss' | 'all';
}

export interface SessionHistoryResponse {
  sessions: TradingSession[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

class SessionApiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async createSession(config: SessionConfig): Promise<TradingSession> {
    const response = await fetch(`${API_BASE_URL}/sessions`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create session');
    }

    const result = await response.json();
    return result.data;
  }

  async getActiveSession(): Promise<ActiveSessionData | null> {
    const response = await fetch(`${API_BASE_URL}/sessions/active`, {
      headers: this.getAuthHeaders(),
    });

    if (response.status === 404) {
      return null; // No active session
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get active session');
    }

    const result = await response.json();
    return result.data;
  }

  async startSession(sessionId: string): Promise<TradingSession> {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/start`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to start session');
    }

    const result = await response.json();
    return result.data;
  }

  async stopSession(sessionId: string, reason = 'manual_stop'): Promise<TradingSession> {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/stop`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to stop session');
    }

    const result = await response.json();
    return result.data;
  }

  async getSessionHistory(query: SessionHistoryQuery = {}): Promise<SessionHistoryResponse> {
    const params = new URLSearchParams();
    
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.offset) params.append('offset', query.offset.toString());
    if (query.dateFrom) params.append('dateFrom', query.dateFrom);
    if (query.dateTo) params.append('dateTo', query.dateTo);
    if (query.status) params.append('status', query.status);
    if (query.performanceFilter) params.append('performanceFilter', query.performanceFilter);

    const response = await fetch(`${API_BASE_URL}/sessions/history?${params}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get session history');
    }

    const result = await response.json();
    return result.data;
  }

  async getSession(sessionId: string): Promise<TradingSession> {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get session');
    }

    const result = await response.json();
    return result.data;
  }

  async validateSessionConfig(config: SessionConfig): Promise<SessionValidationResult> {
    const response = await fetch(`${API_BASE_URL}/sessions/validate`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to validate session config');
    }

    const result = await response.json();
    return result.data;
  }
}

export const sessionApi = new SessionApiService();
