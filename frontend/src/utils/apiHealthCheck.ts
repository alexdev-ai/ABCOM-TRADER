/**
 * API Health Check Utilities
 * Tests backend connectivity and provides fallback handling
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds

export interface HealthCheckResult {
  isHealthy: boolean;
  url: string;
  environment: 'production' | 'development' | 'unknown';
  responseTime: number;
  error?: string;
}

/**
 * Test if the backend API is responsive
 */
export async function checkApiHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);
    
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      return {
        isHealthy: true,
        url: API_BASE_URL,
        environment: data.environment || 'unknown',
        responseTime,
      };
    } else {
      return {
        isHealthy: false,
        url: API_BASE_URL,
        environment: 'unknown',
        responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      isHealthy: false,
      url: API_BASE_URL,
      environment: 'unknown',
      responseTime,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Check if we're in development mode
 */
export function isDevelopmentMode(): boolean {
  return import.meta.env.DEV || API_BASE_URL.includes('localhost');
}

/**
 * Get appropriate error message for API connectivity issues
 */
export function getConnectivityErrorMessage(healthCheck: HealthCheckResult): string {
  if (isDevelopmentMode()) {
    return `Development backend not running on ${healthCheck.url}. Please start the backend server with 'npm run dev' in the backend directory.`;
  } else {
    return `Production backend not available. The backend service may be starting up or experiencing issues. Please try again in a few moments.`;
  }
}

/**
 * Perform health check and log results (for debugging)
 */
export async function performHealthCheckWithLogging(): Promise<HealthCheckResult> {
  console.log('🔍 Checking API health...');
  const result = await checkApiHealth();
  
  if (result.isHealthy) {
    console.log('✅ API is healthy:', {
      url: result.url,
      environment: result.environment,
      responseTime: `${result.responseTime}ms`,
    });
  } else {
    console.warn('❌ API health check failed:', {
      url: result.url,
      error: result.error,
      responseTime: `${result.responseTime}ms`,
    });
    console.log('💡 Suggestion:', getConnectivityErrorMessage(result));
  }
  
  return result;
}
