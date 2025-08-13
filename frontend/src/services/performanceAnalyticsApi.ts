import axios from 'axios';

const API_BASE_URL = (import.meta.env?.VITE_API_URL as string) || 'http://localhost:3000';

export interface PerformanceMetrics {
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  largestGain: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  totalTrades: number;
}

export interface BenchmarkComparison {
  benchmarkReturn: number;
  benchmarkReturnPercent: number;
  alpha: number;
  beta: number;
  correlation: number;
  trackingError: number;
  informationRatio: number;
}

export interface PerformancePeriod {
  period: string;
  startDate: string;
  endDate: string;
  metrics: PerformanceMetrics;
  benchmark: BenchmarkComparison;
  attribution: PerformanceAttribution[];
}

export interface PerformanceAttribution {
  symbol: string;
  sector: string;
  positionReturn: number;
  contribution: number;
  weight: number;
}

export interface PerformanceTimeSeries {
  date: string;
  portfolioValue: number;
  dailyReturn: number;
  cumulativeReturn: number;
  benchmarkReturn: number;
  drawdown: number;
}

export interface PerformanceReport {
  userId: string;
  periods: PerformancePeriod[];
  timeSeries: PerformanceTimeSeries[];
  correlationMatrix: Record<string, Record<string, number>>;
  monthlyReturns: MonthlyReturn[];
  riskMetrics: RiskMetrics;
  generatedAt: string;
}

export interface MonthlyReturn {
  year: number;
  month: number;
  return: number;
  benchmark: number;
}

export interface RiskMetrics {
  var95: number;
  var99: number;
  expectedShortfall: number;
  calmarRatio: number;
  omega: number;
  gainToPainRatio: number;
}

export interface PerformanceSummary {
  todayReturn: number;
  weekReturn: number;
  monthReturn: number;
  yearReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
  winRate: number;
  riskMetrics: RiskMetrics;
  lastUpdated: string;
}

export type PerformancePeriodType = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'YTD' | 'ALL';

class PerformanceAnalyticsApi {
  private getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    };
  }

  /**
   * Get comprehensive performance analytics for multiple periods
   */
  async getPerformanceAnalytics(
    periods: PerformancePeriodType[] = ['1D', '1W', '1M', '3M', '6M', '1Y', 'YTD', 'ALL'],
    benchmark: string = 'SPY'
  ): Promise<PerformanceReport> {
    try {
      const periodsString = periods.join(',');
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/performance/analytics`,
        {
          headers: this.getAuthHeaders(),
          params: { periods: periodsString, benchmark }
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch performance analytics');
      }

      return response.data.data;
    } catch (error) {
      console.error('Error fetching performance analytics:', error);
      throw new Error('Failed to load performance analytics');
    }
  }

  /**
   * Get performance metrics for a specific period
   */
  async getPeriodPerformance(
    period: PerformancePeriodType,
    benchmark: string = 'SPY'
  ): Promise<PerformancePeriod> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/performance/period/${period}`,
        {
          headers: this.getAuthHeaders(),
          params: { benchmark }
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch period performance');
      }

      return response.data.data;
    } catch (error) {
      console.error('Error fetching period performance:', error);
      throw new Error('Failed to load period performance');
    }
  }

  /**
   * Get performance time series data for charts
   */
  async getPerformanceTimeSeries(
    benchmark: string = 'SPY',
    days: number = 365
  ): Promise<{ timeSeries: PerformanceTimeSeries[]; period: string; benchmark: string }> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/performance/timeseries`,
        {
          headers: this.getAuthHeaders(),
          params: { benchmark, days }
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch time series data');
      }

      return response.data.data;
    } catch (error) {
      console.error('Error fetching time series data:', error);
      throw new Error('Failed to load performance time series');
    }
  }

  /**
   * Get correlation matrix for portfolio positions
   */
  async getCorrelationMatrix(): Promise<{ correlationMatrix: Record<string, Record<string, number>>; symbolCount: number }> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/performance/correlation`,
        {
          headers: this.getAuthHeaders()
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch correlation matrix');
      }

      return response.data.data;
    } catch (error) {
      console.error('Error fetching correlation matrix:', error);
      throw new Error('Failed to load correlation matrix');
    }
  }

  /**
   * Get monthly returns breakdown
   */
  async getMonthlyReturns(benchmark: string = 'SPY'): Promise<{ monthlyReturns: MonthlyReturn[]; benchmark: string }> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/performance/monthly-returns`,
        {
          headers: this.getAuthHeaders(),
          params: { benchmark }
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch monthly returns');
      }

      return response.data.data;
    } catch (error) {
      console.error('Error fetching monthly returns:', error);
      throw new Error('Failed to load monthly returns');
    }
  }

  /**
   * Get advanced risk metrics
   */
  async getRiskMetrics(): Promise<{ riskMetrics: RiskMetrics; riskLevel: string }> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/performance/risk-metrics`,
        {
          headers: this.getAuthHeaders()
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch risk metrics');
      }

      return response.data.data;
    } catch (error) {
      console.error('Error fetching risk metrics:', error);
      throw new Error('Failed to load risk metrics');
    }
  }

  /**
   * Get performance summary for dashboard
   */
  async getPerformanceSummary(): Promise<PerformanceSummary> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/performance/summary`,
        {
          headers: this.getAuthHeaders()
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch performance summary');
      }

      return response.data.data;
    } catch (error) {
      console.error('Error fetching performance summary:', error);
      throw new Error('Failed to load performance summary');
    }
  }

  /**
   * Export performance data to CSV
   */
  async exportPerformanceCSV(period: PerformancePeriodType = 'ALL'): Promise<Blob> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/performance/export/csv`,
        {
          headers: this.getAuthHeaders(),
          params: { period },
          responseType: 'blob'
        }
      );

      return new Blob([response.data], { type: 'text/csv' });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      throw new Error('Failed to export performance data');
    }
  }

  /**
   * Refresh performance calculations
   */
  async refreshPerformanceData(): Promise<{ refreshedAt: string; periodsCalculated: number }> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/performance/refresh`,
        {},
        {
          headers: this.getAuthHeaders()
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to refresh performance data');
      }

      return response.data.data;
    } catch (error) {
      console.error('Error refreshing performance data:', error);
      throw new Error('Failed to refresh performance data');
    }
  }
}

export const performanceAnalyticsApi = new PerformanceAnalyticsApi();
