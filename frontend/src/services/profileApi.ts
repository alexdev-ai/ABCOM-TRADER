import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = 'http://localhost:3002';

export interface ProfileData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber: string;
  riskTolerance: string;
  kycStatus: string;
  accountBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileUpdateRequest {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  riskTolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
}

export interface ProfileStats {
  accountBalance: number;
  totalTrades: number;
  totalPnl: number;
  successfulTrades: number;
  winRate: number;
  totalSessions: number;
  activeSessions: number;
  lastLoginAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

class ProfileApiService {
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
   * Get current user profile
   */
  async getProfile(): Promise<ProfileData> {
    const response = await fetch(`${API_BASE_URL}/api/v1/profile`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    const result = await this.handleResponse<ApiResponse<ProfileData>>(response);
    return result.data;
  }

  /**
   * Update user profile
   */
  async updateProfile(profileData: ProfileUpdateRequest): Promise<ProfileData> {
    const response = await fetch(`${API_BASE_URL}/api/v1/profile`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(profileData)
    });

    const result = await this.handleResponse<ApiResponse<ProfileData>>(response);
    return result.data;
  }

  /**
   * Get profile statistics
   */
  async getProfileStats(): Promise<ProfileStats> {
    const response = await fetch(`${API_BASE_URL}/api/v1/profile/stats`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    const result = await this.handleResponse<ApiResponse<ProfileStats>>(response);
    return result.data;
  }
}

export const profileApi = new ProfileApiService();
