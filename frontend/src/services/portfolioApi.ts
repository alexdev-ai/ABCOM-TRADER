import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = ((import.meta as any).env?.VITE_API_URL as string) || 'http://localhost:3002';

// Portfolio interfaces
export interface PortfolioPosition {
  symbol: string;
  quantity: number;
  averageCost: number;
  totalCost: number;
  currentPrice: number;
  currentValue: number;
  unrealizedGainLoss: number;
  unrealizedGainLossPercent: number;
  lastUpdated: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  availableCash: number;
  totalUnrealizedGainLoss: number;
  totalUnrealizedGainLossPercent: number;
  positions: PortfolioPosition[];
  lastUpdated: string;
}

export interface PortfolioMetrics {
  totalPortfolioValue: number;
  dailyChange: number;
  dailyChangePercent: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  positionCount: number;
  largestPosition: {
    symbol: string;
    value: number;
    percentage: number;
  } | null;
}

export interface PortfolioAllocation {
  symbol: string;
  value: number;
  percentage: number;
  color: string;
}

export interface Transaction {
  id: string;
  symbol: string;
  type: string;
  quantity: number;
  price: number;
  totalAmount: number;
  status: string;
  executedAt: string | null;
  createdAt: string;
}

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  lastUpdated: string;
}

export interface AvailableStock {
  symbol: string;
  name: string;
  basePrice: number;
}

// Create axios instance with auth interceptor
const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, logout user
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const portfolioApi = {
  /**
   * Get complete portfolio summary
   */
  async getPortfolioSummary(): Promise<PortfolioSummary> {
    try {
      const response = await api.get('/portfolio/summary');
      return response.data.data;
    } catch (error) {
      console.error('Portfolio summary error:', error);
      throw new Error('Failed to fetch portfolio summary');
    }
  },

  /**
   * Get portfolio performance metrics
   */
  async getPortfolioMetrics(): Promise<PortfolioMetrics> {
    try {
      const response = await api.get('/portfolio/metrics');
      return response.data.data;
    } catch (error) {
      console.error('Portfolio metrics error:', error);
      throw new Error('Failed to fetch portfolio metrics');
    }
  },

  /**
   * Get portfolio allocation for charts
   */
  async getPortfolioAllocation(): Promise<PortfolioAllocation[]> {
    try {
      const response = await api.get('/portfolio/allocation');
      return response.data.data;
    } catch (error) {
      console.error('Portfolio allocation error:', error);
      throw new Error('Failed to fetch portfolio allocation');
    }
  },

  /**
   * Get recent transactions
   */
  async getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
    try {
      const response = await api.get(`/portfolio/transactions?limit=${limit}`);
      return response.data.data;
    } catch (error) {
      console.error('Recent transactions error:', error);
      throw new Error('Failed to fetch recent transactions');
    }
  },

  /**
   * Get market data for specific symbol
   */
  async getMarketData(symbol: string): Promise<StockQuote> {
    try {
      const response = await api.get(`/portfolio/market-data/${symbol.toUpperCase()}`);
      return response.data.data;
    } catch (error) {
      console.error('Market data error:', error);
      throw new Error('Failed to fetch market data');
    }
  },

  /**
   * Get available stocks for trading
   */
  async getAvailableStocks(): Promise<AvailableStock[]> {
    try {
      const response = await api.get('/portfolio/available-stocks');
      return response.data.data;
    } catch (error) {
      console.error('Available stocks error:', error);
      throw new Error('Failed to fetch available stocks');
    }
  },

  /**
   * Initialize demo portfolio
   */
  async initializeDemoPortfolio(): Promise<void> {
    try {
      await api.post('/portfolio/initialize-demo');
    } catch (error) {
      console.error('Initialize demo portfolio error:', error);
      throw new Error('Failed to initialize demo portfolio');
    }
  },

  /**
   * Get complete dashboard data in one call
   */
  async getDashboardData(): Promise<{
    summary: PortfolioSummary;
    metrics: PortfolioMetrics;
    allocation: PortfolioAllocation[];
    transactions: Transaction[];
  }> {
    try {
      const [summary, metrics, allocation, transactions] = await Promise.all([
        this.getPortfolioSummary(),
        this.getPortfolioMetrics(),
        this.getPortfolioAllocation(),
        this.getRecentTransactions(5) // Get last 5 transactions for dashboard
      ]);

      return {
        summary,
        metrics,
        allocation,
        transactions
      };
    } catch (error) {
      console.error('Dashboard data error:', error);
      throw new Error('Failed to fetch dashboard data');
    }
  }
};

export default portfolioApi;
