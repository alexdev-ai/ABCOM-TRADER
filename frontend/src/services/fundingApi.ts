import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = 'http://localhost:3002';

export interface FundingRequest {
  amount: number;
  method: 'bank_transfer' | 'demo_balance';
  reference?: string;
}

export interface FundingTransaction {
  id: string;
  amount: number;
  method: string;
  status: string;
  referenceId: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface FundingHistory {
  transactions: FundingTransaction[];
  totalFunded: number;
  availableBalance: number;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface FundingMethod {
  id: string;
  name: string;
  description: string;
  limits: {
    min: number;
    max: number;
  };
  processingTime?: string;
  fees?: {
    fixed?: number;
    percentage?: number;
  };
}

export interface AccountBalance {
  balance: number;
  currency: string;
  lastUpdated: string;
}

class FundingApiService {
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
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Process funding request
   */
  async processFunding(request: FundingRequest): Promise<{
    success: boolean;
    message: string;
    transaction: {
      id: string;
      amount: number;
      status: string;
      referenceId: string;
      createdAt: string;
    };
    newBalance: number;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/funding/deposit`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request)
    });

    return this.handleResponse(response);
  }

  /**
   * Get funding history
   */
  async getFundingHistory(): Promise<FundingHistory> {
    const response = await fetch(`${API_BASE_URL}/api/v1/funding/history`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    return this.handleResponse(response);
  }

  /**
   * Get available funding methods
   */
  async getFundingMethods(): Promise<FundingMethod[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/funding/methods`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    return this.handleResponse(response);
  }

  /**
   * Get current account balance
   */
  async getAccountBalance(): Promise<AccountBalance> {
    const response = await fetch(`${API_BASE_URL}/api/v1/funding/balance`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    return this.handleResponse(response);
  }

  /**
   * Validate funding request
   */
  async validateFundingRequest(request: FundingRequest): Promise<{
    valid: boolean;
    errors?: string[];
    message?: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/funding/validate`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request)
    });

    return this.handleResponse(response);
  }
}

export const fundingApi = new FundingApiService();
