import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// API Base URL - consistent with tradingApi.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

// Types
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber: string;
  accountBalance: string;
  riskTolerance: string;
  kycStatus: string;
  isActive: boolean;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

// Token management utilities
const tokenManager = {
  getToken: () => localStorage.getItem('access_token'),
  setToken: (token: string) => localStorage.setItem('access_token', token),
  removeToken: () => localStorage.removeItem('access_token'),
  isTokenExpired: (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }
};

// API client with automatic token refresh
const apiClient = {
  async request(endpoint: string, options: RequestInit = {}) {
    const token = tokenManager.getToken();
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      credentials: 'include', // Include cookies for refresh tokens
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    // If token expired, try to refresh
    if (response.status === 401 && token) {
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          tokenManager.setToken(refreshData.data.token);
          
          // Retry original request with new token
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${refreshData.data.token}`,
          };
          
          return fetch(`${API_BASE_URL}${endpoint}`, config);
        }
      } catch (error) {
        // Refresh failed, let the original 401 response be handled
      }
    }
    
    return response;
  }
};

// Create the authentication store
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      clearError: () => {
        set({ error: null });
      },

      login: async (email: string, password: string, rememberMe: boolean = false) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.request('/api/v1/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password, rememberMe }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error?.message || 'Login failed');
          }

          // Store token and user data
          tokenManager.setToken(data.data.token);
          
          set({
            user: data.data.user,
            token: data.data.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

        } catch (error) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed',
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        
        try {
          // Call logout endpoint to revoke refresh token
          await apiClient.request('/api/v1/auth/logout', {
            method: 'POST',
          });
        } catch (error) {
          // Continue with logout even if API call fails
          console.error('Logout API call failed:', error);
        }

        // Clear local storage and state
        tokenManager.removeToken();
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      refreshToken: async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error('Token refresh failed');
          }

          const data = await response.json();
          tokenManager.setToken(data.data.token);
          
          set({
            token: data.data.token,
            isAuthenticated: true,
          });

        } catch (error) {
          // Refresh failed, logout user
          get().logout();
          throw error;
        }
      },

      checkAuthStatus: async () => {
        const token = tokenManager.getToken();
        
        if (!token) {
          set({ isAuthenticated: false, user: null, token: null });
          return;
        }

        // Check if token is expired
        if (tokenManager.isTokenExpired(token)) {
          try {
            await get().refreshToken();
          } catch (error) {
            set({ isAuthenticated: false, user: null, token: null });
            return;
          }
        }

        // Fetch current user data
        try {
          const response = await apiClient.request('/api/v1/auth/me');
          
          if (!response.ok) {
            throw new Error('Failed to fetch user data');
          }

          const data = await response.json();
          
          set({
            user: data.data.user,
            token,
            isAuthenticated: true,
          });

        } catch (error) {
          // Failed to fetch user data, logout
          get().logout();
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Initialize auth check on store creation
if (typeof window !== 'undefined') {
  useAuthStore.getState().checkAuthStatus();
}
