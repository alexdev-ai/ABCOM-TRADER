import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3002/api/v1';

export interface PortfolioPosition {
  id: number;
  userId: string;
  symbol: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  sector: string | null;
  lastUpdated: string;
  createdAt: string;
  updatedAt: string;
  dayChange?: number;
  dayChangePercent?: number;
}

export interface PortfolioSummary {
  totalValue: number;
  cashBalance: number;
  totalPnl: number;
  totalPnlPercent: number;
  numberOfPositions: number;
  dayChange: number;
  dayChangePercent: number;
  positionsValue: number;
}

export interface SectorAllocation {
  sector: string;
  value: number;
  percentage: number;
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

export const portfolioApi = {
  /**
   * Get all portfolio positions for the authenticated user
   */
  async getPositions(): Promise<{ success: boolean; data: PortfolioPosition[]; count: number }> {
    try {
      const response = await axios.get(
        `${API_BASE}/portfolio/positions`,
        {
          headers: createAuthHeaders(),
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch portfolio positions');
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        throw new Error(errorData.error || 'Failed to fetch portfolio positions');
      }
      throw error;
    }
  },

  /**
   * Get portfolio summary with total value, P&L, etc.
   */
  async getSummary(): Promise<{ success: boolean; data: PortfolioSummary }> {
    try {
      const response = await axios.get(
        `${API_BASE}/portfolio/summary`,
        {
          headers: createAuthHeaders(),
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch portfolio summary');
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        throw new Error(errorData.error || 'Failed to fetch portfolio summary');
      }
      throw error;
    }
  },

  /**
   * Search portfolio positions by symbol
   */
  async searchPositions(query: string): Promise<{ success: boolean; data: PortfolioPosition[]; count: number }> {
    try {
      const response = await axios.get(
        `${API_BASE}/portfolio/positions/search?q=${encodeURIComponent(query)}`,
        {
          headers: createAuthHeaders(),
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to search portfolio positions');
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        throw new Error(errorData.error || 'Failed to search portfolio positions');
      }
      throw error;
    }
  },

  /**
   * Get top performing positions (gainers or losers)
   */
  async getPositionsByPerformance(
    type: 'gainers' | 'losers',
    limit: number = 5
  ): Promise<{ success: boolean; data: PortfolioPosition[]; count: number; type: string }> {
    try {
      const response = await axios.get(
        `${API_BASE}/portfolio/positions/performance?type=${type}&limit=${limit}`,
        {
          headers: createAuthHeaders(),
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch positions by performance');
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        throw new Error(errorData.error || 'Failed to fetch positions by performance');
      }
      throw error;
    }
  },

  /**
   * Get portfolio allocation breakdown by sector
   */
  async getSectorAllocation(): Promise<{ success: boolean; data: SectorAllocation[] }> {
    try {
      const response = await axios.get(
        `${API_BASE}/portfolio/allocation`,
        {
          headers: createAuthHeaders(),
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch portfolio allocation');
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        throw new Error(errorData.error || 'Failed to fetch portfolio allocation');
      }
      throw error;
    }
  },

  /**
   * Update a position (usually called internally by trading system)
   */
  async updatePosition(
    symbol: string,
    quantity: number,
    price: number,
    type: 'buy' | 'sell'
  ): Promise<{ success: boolean; data: any; message: string }> {
    try {
      const response = await axios.post(
        `${API_BASE}/portfolio/positions`,
        {
          symbol,
          quantity,
          price,
          type,
        },
        {
          headers: createAuthHeaders(),
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to update position');
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        throw new Error(errorData.error || 'Failed to update position');
      }
      throw error;
    }
  },

  /**
   * Get top gainers from portfolio
   */
  async getTopGainers(limit: number = 5) {
    return this.getPositionsByPerformance('gainers', limit);
  },

  /**
   * Get top losers from portfolio
   */
  async getTopLosers(limit: number = 5) {
    return this.getPositionsByPerformance('losers', limit);
  },
};

export default portfolioApi;
