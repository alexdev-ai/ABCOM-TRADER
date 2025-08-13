import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

export interface OnboardingStep {
  step: number;
  title: string;
  completed: boolean;
  completedAt: string | null;
}

export interface OnboardingProgress {
  userId: string;
  currentStep: number;
  completed: boolean;
  completedAt: string | null;
  steps: OnboardingStep[];
  canSkip: boolean;
  totalSteps: number;
}

export interface UpdateProgressRequest {
  step: number;
  completed?: boolean;
  metadata?: Record<string, any>;
}

export interface CompleteOnboardingRequest {
  feedback?: string;
  preferences?: {
    receiveEmails?: boolean;
    showTips?: boolean;
    riskTolerance?: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  };
}

export interface SkipOnboardingRequest {
  reason: 'EXPERIENCED_USER' | 'ALREADY_FAMILIAR' | 'WANT_TO_EXPLORE' | 'TIME_CONSTRAINTS' | 'OTHER';
  feedback?: string;
}

class OnboardingApi {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Get user's current onboarding progress
   */
  async getProgress(): Promise<OnboardingProgress> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/onboarding/progress`, {
        headers: this.getAuthHeaders()
      });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching onboarding progress:', error);
      throw new Error('Failed to fetch onboarding progress');
    }
  }

  /**
   * Update onboarding progress
   */
  async updateProgress(request: UpdateProgressRequest): Promise<OnboardingProgress> {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/v1/onboarding/progress`, request, {
        headers: this.getAuthHeaders()
      });
      return response.data.data;
    } catch (error) {
      console.error('Error updating onboarding progress:', error);
      throw new Error('Failed to update onboarding progress');
    }
  }

  /**
   * Complete onboarding
   */
  async completeOnboarding(request: CompleteOnboardingRequest = {}): Promise<OnboardingProgress> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/v1/onboarding/complete`, request, {
        headers: this.getAuthHeaders()
      });
      return response.data.data;
    } catch (error) {
      console.error('Error completing onboarding:', error);
      throw new Error('Failed to complete onboarding');
    }
  }

  /**
   * Skip onboarding
   */
  async skipOnboarding(request: SkipOnboardingRequest): Promise<OnboardingProgress> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/v1/onboarding/skip`, request, {
        headers: this.getAuthHeaders()
      });
      return response.data.data;
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      throw new Error('Failed to skip onboarding');
    }
  }

  /**
   * Check if user needs onboarding
   */
  async checkOnboardingStatus(): Promise<{ needsOnboarding: boolean; userId: string }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/onboarding/check`, {
        headers: this.getAuthHeaders()
      });
      return response.data.data;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      throw new Error('Failed to check onboarding status');
    }
  }

  /**
   * Get information about all onboarding steps
   */
  async getSteps(): Promise<{ steps: any[]; totalSteps: number; estimatedTotalMinutes: number }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/onboarding/steps`, {
        headers: this.getAuthHeaders()
      });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching onboarding steps:', error);
      throw new Error('Failed to fetch onboarding steps');
    }
  }
}

export const onboardingApi = new OnboardingApi();
