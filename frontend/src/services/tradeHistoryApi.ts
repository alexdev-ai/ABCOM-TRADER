import { useAuthStore } from '../stores/authStore';

export interface TradeHistoryFilters {
  page?: number;
  limit?: number;
  symbol?: string;
  tradeType?: 'buy' | 'sell';
  profitLoss?: 'profit' | 'loss' | 'breakeven';
  dateFrom?: string;
  dateTo?: string;
  sessionId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface EnhancedTrade {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  totalAmount: number;
  fees: number;
  realizedPnl?: number;
  executionQuality?: number;
  algorithmConfidence?: number;
  algorithmReasoning?: string;
  sessionId?: string;
  marketConditions?: any;
  notes?: string;
  executedAt: string;
  createdAt: string;
  profitLoss?: 'profit' | 'loss' | 'breakeven';
  riskRewardRatio?: number;
  holdTimeMinutes?: number;
  tradePattern?: string;
}

export interface TradeSummary {
  totalTrades: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  totalVolume: number;
  avgTradeSize: number;
}

export interface TradeHistoryResponse {
  success: boolean;
  data: EnhancedTrade[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  summary: TradeSummary;
}

export interface TradingAnalytics {
  performance: {
    totalReturn: number;
    totalReturnPercent: number;
    winRate: number;
    profitFactor: number;
    sharpeRatio: number;
    avgWin: number;
    avgLoss: number;
    maxDrawdown: number;
    consecutiveWins: number;
    consecutiveLosses: number;
  };
  patterns?: {
    overtradingRisk: boolean;
    revengeTradingDetected: boolean;
    consistentWinners: string[];
    consistentLosers: string[];
    timeOfDayAnalysis: any[];
    marketConditionPerformance: any[];
  };
  riskMetrics: {
    avgRiskRewardRatio: number;
    maxAdverseExcursion: number;
    maxFavorableExcursion: number;
    positionSizingConsistency: number;
  };
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

class TradeHistoryApi {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = useAuthStore.getState().token;
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get trade history with advanced filtering
   */
  async getTradeHistory(filters: TradeHistoryFilters = {}): Promise<TradeHistoryResponse> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const queryString = queryParams.toString();
    const endpoint = `/api/v1/trade-history${queryString ? `?${queryString}` : ''}`;
    
    return this.request<TradeHistoryResponse>(endpoint);
  }

  /**
   * Get detailed information for a specific trade
   */
  async getTradeDetails(tradeId: string): Promise<{ success: boolean; data: EnhancedTrade }> {
    return this.request<{ success: boolean; data: EnhancedTrade }>(`/api/v1/trade-history/${tradeId}`);
  }

  /**
   * Get trading analytics and pattern recognition
   */
  async getTradingAnalytics(period: string = '1M', includePatterns: boolean = true): Promise<{ success: boolean; data: TradingAnalytics }> {
    const queryParams = new URLSearchParams({
      period,
      includePatterns: includePatterns.toString()
    });

    return this.request<{ success: boolean; data: TradingAnalytics }>(`/api/v1/trade-history/analytics?${queryParams}`);
  }

  /**
   * Get advanced trading pattern analysis
   */
  async getTradingPatterns(period: string = '3M'): Promise<{ success: boolean; data: any }> {
    return this.request<{ success: boolean; data: any }>(`/api/v1/trade-history/patterns/analysis?period=${period}`);
  }

  /**
   * Export trade history
   */
  async exportTradeHistory(
    format: 'csv' | 'xlsx' = 'csv',
    filters: {
      dateFrom?: string;
      dateTo?: string;
      symbol?: string;
      includeAnalytics?: boolean;
      taxOptimized?: boolean;
    } = {}
  ): Promise<Blob> {
    const queryParams = new URLSearchParams();
    queryParams.append('format', format);
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const token = useAuthStore.getState().token;
    
    const response = await fetch(`${API_BASE_URL}/api/v1/trade-history/export?${queryParams}`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Download export file
   */
  async downloadExport(
    format: 'csv' | 'xlsx' = 'csv',
    filters: {
      dateFrom?: string;
      dateTo?: string;
      symbol?: string;
      includeAnalytics?: boolean;
      taxOptimized?: boolean;
    } = {}
  ): Promise<void> {
    try {
      const blob = await this.exportTradeHistory(format, filters);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const today = new Date().toISOString().split('T')[0];
      const filename = `trade_history_${today}.${format}`;
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export download failed:', error);
      throw error;
    }
  }
}

export const tradeHistoryApi = new TradeHistoryApi();
