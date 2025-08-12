import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = 'http://localhost:3003';

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  lastUpdated: Date;
}

export interface TradeOrder {
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  orderType: 'market';
}

export interface TradePreview {
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  currentPrice: number;
  estimatedTotal: number;
  fees: number;
  netAmount: number;
  availableCash: number;
  availableShares?: number;
  riskValidation: {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  };
}

export interface ExecutedTrade {
  id: string;
  userId: string;
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  totalAmount: number;
  fees: number;
  netAmount: number;
  status: 'completed' | 'failed';
  executedAt: Date;
  createdAt: Date;
}

export interface AvailableStock {
  symbol: string;
  name: string;
  basePrice: number;
}

export interface TradingHistory {
  id: string;
  symbol: string;
  type: string;
  quantity: number;
  price: number;
  totalAmount: number;
  fees: number;
  status: string;
  executedAt: Date | null;
  createdAt: Date;
}

class TradingApi {
  /**
   * Get authentication headers
   */
  private getAuthHeaders(): HeadersInit {
    const token = useAuthStore.getState().token;
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Handle API response
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    return result.data || result;
  }

  /**
   * Get real-time quote for a stock symbol
   */
  async getQuote(symbol: string): Promise<StockQuote> {
    const response = await fetch(`${API_BASE_URL}/api/v1/trading/quotes/${symbol}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    const data = await this.handleResponse<StockQuote>(response);
    return {
      ...data,
      lastUpdated: new Date(data.lastUpdated)
    };
  }

  /**
   * Search available stocks
   */
  async searchStocks(query: string = ''): Promise<AvailableStock[]> {
    const url = new URL(`${API_BASE_URL}/api/v1/trading/search`);
    if (query) {
      url.searchParams.append('query', query);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    return this.handleResponse<AvailableStock[]>(response);
  }

  /**
   * Get all available stocks
   */
  async getAvailableStocks(): Promise<AvailableStock[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/trading/available-stocks`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    return this.handleResponse<AvailableStock[]>(response);
  }

  /**
   * Preview a trade before execution
   */
  async previewTrade(order: TradeOrder): Promise<TradePreview> {
    const response = await fetch(`${API_BASE_URL}/api/v1/trading/preview`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(order)
    });

    return this.handleResponse<TradePreview>(response);
  }

  /**
   * Execute a trade order
   */
  async executeTrade(order: TradeOrder): Promise<ExecutedTrade> {
    const response = await fetch(`${API_BASE_URL}/api/v1/trading/execute`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(order)
    });

    const data = await this.handleResponse<ExecutedTrade>(response);
    return {
      ...data,
      executedAt: new Date(data.executedAt),
      createdAt: new Date(data.createdAt)
    };
  }

  /**
   * Get trading history
   */
  async getTradingHistory(limit: number = 50, offset: number = 0): Promise<{
    data: TradingHistory[];
    pagination: {
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }> {
    const url = new URL(`${API_BASE_URL}/api/v1/trading/history`);
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('offset', offset.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    const result = await response.json();
    
    return {
      data: result.data.map((trade: any) => ({
        ...trade,
        executedAt: trade.executedAt ? new Date(trade.executedAt) : null,
        createdAt: new Date(trade.createdAt)
      })),
      pagination: result.pagination
    };
  }
}

export const tradingApi = new TradingApi();
