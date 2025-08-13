import axios from 'axios';

const API_BASE_URL = 'http://localhost:3003/api/v1';

// Types
export interface RealTimeSessionMetrics {
  userId: string;
  sessionId: string;
  timestamp: Date;
  currentPnL: number;
  unrealizedPnL: number;
  realizedPnL: number;
  totalTrades: number;
  averageTradeSize: number;
  lossLimitUtilization: number;
  timeElapsedPercentage: number;
  tradingVelocity: number;
  riskScore: number;
  performanceScore: number;
  confidenceLevel: number;
}

export interface SessionAnalytics {
  id: string;
  userId: string;
  periodType: 'daily' | 'weekly' | 'monthly' | 'yearly';
  periodStart: Date;
  periodEnd: Date;
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  expiredSessions: number;
  emergencyStoppedSessions: number;
  totalProfitLoss: number;
  averageProfitLoss: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  averageSessionDuration: number;
  shortestSession: number;
  longestSession: number;
  totalTradingTime: number;
  averageLossLimitUtilization: number;
  maxLossLimitReached: number;
  riskAdjustedReturn: number;
  volatility: number;
  totalTrades: number;
  averageTradesPerSession: number;
  averageTradeSize: number;
  tradingFrequency: number;
  bestPerformingHour: number;
  worstPerformingHour: number;
  bestPerformingDayOfWeek: number;
  worstPerformingDayOfWeek: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PerformanceComparison {
  userId: string;
  comparisonType: 'self_historical' | 'market_benchmark' | 'peer_group';
  baselineMetrics: Partial<SessionAnalytics>;
  currentMetrics: Partial<SessionAnalytics>;
  relativeProfitLoss: number;
  relativeWinRate: number;
  relativeDrawdown: number;
  relativeSharpeRatio: number;
  outperformanceScore: number;
  confidenceInterval: number;
  statisticalSignificance: number;
  recommendations: string[];
  insights: string[];
}

export interface OptimalTimingRecommendation {
  userId: string;
  optimalHours: number[];
  optimalDaysOfWeek: number[];
  avgPerformanceByHour: Record<number, number>;
  avgPerformanceByDay: Record<number, number>;
  confidence: number;
  sampleSize: number;
}

export interface OutcomePrediction {
  predictedProfitLoss: number;
  winProbability: number;
  riskScore: number;
  expectedDuration: number;
  confidence: number;
  factors: Array<{
    factor: string;
    impact: number;
    description: string;
  }>;
}

export interface DashboardData {
  realTimeMetrics: RealTimeSessionMetrics[];
  sessionAnalytics: SessionAnalytics | null;
  performanceComparison: PerformanceComparison | null;
  optimalTiming: OptimalTimingRecommendation | null;
  period: string;
  generatedAt: Date;
}

class SessionAnalyticsApi {
  private apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  constructor() {
    // Add request interceptor for authentication
    this.apiClient.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized access
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get real-time metrics for active sessions
   */
  async getRealTimeMetrics(userId: string): Promise<RealTimeSessionMetrics[]> {
    try {
      const response = await this.apiClient.get(`/analytics/real-time/${userId}`);
      return response.data.data.metrics;
    } catch (error) {
      console.error('Failed to get real-time metrics:', error);
      throw new Error('Failed to retrieve real-time metrics');
    }
  }

  /**
   * Update real-time metrics for a session
   */
  async updateRealTimeMetrics(sessionId: string, metrics: Partial<RealTimeSessionMetrics>): Promise<void> {
    try {
      await this.apiClient.post(`/analytics/real-time/${sessionId}`, metrics);
    } catch (error) {
      console.error('Failed to update real-time metrics:', error);
      throw new Error('Failed to update real-time metrics');
    }
  }

  /**
   * Get session analytics for a specific period
   */
  async getSessionAnalytics(
    userId: string,
    periodType: 'daily' | 'weekly' | 'monthly' | 'yearly',
    startDate: Date,
    endDate: Date
  ): Promise<SessionAnalytics> {
    try {
      const response = await this.apiClient.get(`/analytics/session/${userId}`, {
        params: {
          periodType,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to get session analytics:', error);
      throw new Error('Failed to retrieve session analytics');
    }
  }

  /**
   * Compare performance against different baselines
   */
  async comparePerformance(
    userId: string,
    comparisonType: 'self_historical' | 'market_benchmark' | 'peer_group',
    timeframe: string
  ): Promise<PerformanceComparison> {
    try {
      const response = await this.apiClient.get(`/analytics/comparison/${userId}`, {
        params: {
          comparisonType,
          timeframe,
        },
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to get performance comparison:', error);
      throw new Error('Failed to retrieve performance comparison');
    }
  }

  /**
   * Get optimal session timing recommendations
   */
  async getOptimalSessionTiming(userId: string): Promise<OptimalTimingRecommendation> {
    try {
      const response = await this.apiClient.get(`/analytics/timing/${userId}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to get optimal timing:', error);
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        throw new Error('Insufficient historical data for timing analysis. At least 10 completed sessions are required.');
      }
      throw new Error('Failed to retrieve optimal timing recommendations');
    }
  }

  /**
   * Predict session outcome based on parameters
   */
  async predictSessionOutcome(sessionParams: {
    userId: string;
    durationMinutes: number;
    lossLimitAmount: number;
  }): Promise<OutcomePrediction> {
    try {
      const response = await this.apiClient.post('/analytics/prediction', sessionParams);
      return response.data.data;
    } catch (error) {
      console.error('Failed to predict session outcome:', error);
      throw new Error('Failed to generate session outcome prediction');
    }
  }

  /**
   * Aggregate session data for analytics
   */
  async aggregateSessionData(userId: string, aggregationType: 'daily' | 'weekly' | 'monthly'): Promise<void> {
    try {
      await this.apiClient.post(`/analytics/aggregate/${userId}`, { aggregationType });
    } catch (error) {
      console.error('Failed to aggregate session data:', error);
      throw new Error('Failed to aggregate session data');
    }
  }

  /**
   * Refresh analytics cache
   */
  async refreshAnalyticsCache(userId?: string): Promise<void> {
    try {
      await this.apiClient.post('/analytics/cache/refresh', {}, {
        params: userId ? { userId } : {},
      });
    } catch (error) {
      console.error('Failed to refresh analytics cache:', error);
      throw new Error('Failed to refresh analytics cache');
    }
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(userId: string, period: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly'): Promise<DashboardData> {
    try {
      const response = await this.apiClient.get(`/analytics/dashboard/${userId}`, {
        params: { period },
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to get dashboard data:', error);
      throw new Error('Failed to retrieve dashboard data');
    }
  }

  /**
   * Get performance metrics for display
   */
  getPerformanceGrade(winRate: number, sharpeRatio: number, maxDrawdown: number): {
    grade: string;
    color: string;
    description: string;
  } {
    let score = 0;
    
    // Win rate component (0-40 points)
    if (winRate >= 70) score += 40;
    else if (winRate >= 60) score += 30;
    else if (winRate >= 50) score += 20;
    else if (winRate >= 40) score += 10;
    
    // Sharpe ratio component (0-35 points)
    if (sharpeRatio >= 2.0) score += 35;
    else if (sharpeRatio >= 1.5) score += 25;
    else if (sharpeRatio >= 1.0) score += 15;
    else if (sharpeRatio >= 0.5) score += 10;
    
    // Max drawdown component (0-25 points, lower is better)
    if (maxDrawdown <= 0.05) score += 25;
    else if (maxDrawdown <= 0.10) score += 20;
    else if (maxDrawdown <= 0.15) score += 15;
    else if (maxDrawdown <= 0.25) score += 10;
    
    if (score >= 90) return { grade: 'A+', color: '#10B981', description: 'Excellent Performance' };
    if (score >= 80) return { grade: 'A', color: '#059669', description: 'Very Good Performance' };
    if (score >= 70) return { grade: 'B+', color: '#65A30D', description: 'Good Performance' };
    if (score >= 60) return { grade: 'B', color: '#CA8A04', description: 'Above Average Performance' };
    if (score >= 50) return { grade: 'C+', color: '#D97706', description: 'Average Performance' };
    if (score >= 40) return { grade: 'C', color: '#EA580C', description: 'Below Average Performance' };
    if (score >= 30) return { grade: 'D', color: '#DC2626', description: 'Poor Performance' };
    return { grade: 'F', color: '#991B1B', description: 'Very Poor Performance' };
  }

  /**
   * Format currency values
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  /**
   * Format percentage values
   */
  formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Format duration in minutes to human readable format
   */
  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    } else {
      const days = Math.floor(minutes / 1440);
      const hours = Math.floor((minutes % 1440) / 60);
      return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
    }
  }

  /**
   * Get day name from day of week number
   */
  getDayName(dayOfWeek: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek] || 'Unknown';
  }

  /**
   * Get hour display format
   */
  getHourDisplay(hour: number): string {
    if (hour === 0) return '12:00 AM';
    if (hour < 12) return `${hour}:00 AM`;
    if (hour === 12) return '12:00 PM';
    return `${hour - 12}:00 PM`;
  }
}

// Export singleton instance
export const sessionAnalyticsApi = new SessionAnalyticsApi();
export default sessionAnalyticsApi;
