import React, { useState, useEffect } from 'react';
import { RegistrationForm } from './components/auth/RegistrationForm';
import LoginForm from './components/auth/LoginForm';
import { FundingPage } from './pages/FundingPage';
import PortfolioPage from './pages/PortfolioPage';
import EnhancedPortfolioPage from './pages/EnhancedPortfolioPage';
import TradingPage from './pages/TradingPage';
import SessionsPage from './pages/SessionsPage';
import TradingSessionsPage from './pages/TradingSessionsPage';
import TradeHistoryPage from './pages/TradeHistoryPage';
import { ProfilePage } from './pages/ProfilePage';
import { OnboardingPage } from './pages/OnboardingPage';
import PerformanceAnalyticsPage from './pages/PerformanceAnalyticsPage';
import PortfolioOptimizationPage from './pages/PortfolioOptimizationPage';
import { useAuthStore } from './stores/authStore';
import { onboardingApi } from './services/onboardingApi';

type AuthView = 'login' | 'registration' | 'onboarding' | 'dashboard';
type DashboardView = 'overview' | 'portfolio' | 'enhanced-portfolio' | 'trading' | 'trade-history' | 'sessions' | 'trading-sessions' | 'funding' | 'profile' | 'analytics' | 'optimization';

function App() {
  const [view, setView] = useState<AuthView>('login');
  const [dashboardView, setDashboardView] = useState<DashboardView>('portfolio');
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);
  const { isAuthenticated, user, logout, isLoading } = useAuthStore();

  // Check authentication status and onboarding status on app load
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (isAuthenticated && user) {
        setCheckingOnboarding(true);
        try {
          const status = await onboardingApi.checkOnboardingStatus();
          if (status.needsOnboarding) {
            setView('onboarding');
          } else {
            setView('dashboard');
          }
        } catch (error) {
          console.error('Error checking onboarding status:', error);
          // If there's an error, proceed to dashboard
          setView('dashboard');
        } finally {
          setCheckingOnboarding(false);
        }
      } else {
        setView('login');
      }
    };

    checkOnboardingStatus();
  }, [isAuthenticated, user]);

  const handleLoginSuccess = () => {
    setView('dashboard');
  };

  const handleRegistrationSuccess = () => {
    // After registration, they will need onboarding
    setView('onboarding');
  };

  const handleLogout = async () => {
    await logout();
    setView('login');
  };

  const switchToLogin = () => {
    setView('login');
  };

  const switchToRegistration = () => {
    setView('registration');
  };

  const handleOnboardingComplete = () => {
    setView('dashboard');
  };

  const handleOnboardingSkip = () => {
    setView('dashboard');
  };

  // Show loading state while checking authentication or onboarding
  if (isLoading || checkingOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Render dashboard for authenticated users
  if (view === 'dashboard' && isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Navigation Bar */}
        <nav className="bg-white shadow border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">
                  SmartTrade AI
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  Welcome, {user.firstName}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Dashboard Navigation Tabs */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-4 overflow-x-auto">
              <button
                onClick={() => setDashboardView('overview')}
                className={`py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
                  dashboardView === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🏠 Overview
              </button>
              <button
                onClick={() => setDashboardView('portfolio')}
                className={`py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
                  dashboardView === 'portfolio'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📊 Portfolio
              </button>
              <button
                onClick={() => setDashboardView('enhanced-portfolio')}
                className={`py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
                  dashboardView === 'enhanced-portfolio'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📈 Enhanced Portfolio
              </button>
              <button
                onClick={() => setDashboardView('trading')}
                className={`py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
                  dashboardView === 'trading'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                💹 Trading
              </button>
              <button
                onClick={() => setDashboardView('trade-history')}
                className={`py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
                  dashboardView === 'trade-history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📋 Trade History
              </button>
              <button
                onClick={() => setDashboardView('trading-sessions')}
                className={`py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
                  dashboardView === 'trading-sessions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ⏰ Trading Sessions
              </button>
              <button
                onClick={() => setDashboardView('sessions')}
                className={`py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
                  dashboardView === 'sessions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📅 Sessions
              </button>
              <button
                onClick={() => setDashboardView('analytics')}
                className={`py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
                  dashboardView === 'analytics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📊 Analytics
              </button>
              <button
                onClick={() => setDashboardView('optimization')}
                className={`py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
                  dashboardView === 'optimization'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🎯 Optimization
              </button>
              <button
                onClick={() => setDashboardView('funding')}
                className={`py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
                  dashboardView === 'funding'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                💰 Funding
              </button>
              <button
                onClick={() => setDashboardView('profile')}
                className={`py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
                  dashboardView === 'profile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                👤 Profile
              </button>
            </nav>
          </div>
        </div>

        {/* Dashboard Content */}
        {dashboardView === 'portfolio' && <PortfolioPage />}
        {dashboardView === 'enhanced-portfolio' && <EnhancedPortfolioPage />}
        {dashboardView === 'trading' && <TradingPage />}
        {dashboardView === 'trade-history' && <TradeHistoryPage />}
        {dashboardView === 'sessions' && <SessionsPage />}
        {dashboardView === 'trading-sessions' && <TradingSessionsPage />}
        {dashboardView === 'funding' && <FundingPage />}
        {dashboardView === 'profile' && <ProfilePage />}
        {dashboardView === 'analytics' && <PerformanceAnalyticsPage />}
        {dashboardView === 'optimization' && <PortfolioOptimizationPage />}
        
        {dashboardView === 'overview' && (
          <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Overview</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* User Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Name:</span> {user.firstName} {user.lastName}</p>
                    <p><span className="font-medium">Email:</span> {user.email}</p>
                    <p><span className="font-medium">Phone:</span> {user.phoneNumber}</p>
                    <p><span className="font-medium">Account Balance:</span> ${user.accountBalance}</p>
                    <p><span className="font-medium">Risk Tolerance:</span> {user.riskTolerance}</p>
                    <p><span className="font-medium">KYC Status:</span> 
                      <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                        user.kycStatus === 'approved' ? 'bg-green-100 text-green-800' :
                        user.kycStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {user.kycStatus}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <button 
                      onClick={() => setDashboardView('portfolio')}
                      className="w-full text-left px-3 py-2 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                    >
                      📊 View Portfolio
                    </button>
                    <button 
                      onClick={() => setDashboardView('trading')}
                      className="w-full text-left px-3 py-2 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                    >
                      💹 Start Trading
                    </button>
                    <button 
                      onClick={() => setDashboardView('trading-sessions')}
                      className="w-full text-left px-3 py-2 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                    >
                      ⏰ New Trading Session
                    </button>
                    <button 
                      onClick={() => setDashboardView('optimization')}
                      className="w-full text-left px-3 py-2 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                    >
                      🎯 Optimize Portfolio
                    </button>
                    <button 
                      onClick={() => setDashboardView('analytics')}
                      className="w-full text-left px-3 py-2 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                    >
                      📊 View Analytics
                    </button>
                    <button 
                      onClick={() => setDashboardView('funding')}
                      className="w-full text-left px-3 py-2 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                    >
                      💰 Add Funds
                    </button>
                  </div>
                </div>
              </div>

              {/* Welcome Message */}
              <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-blue-900 mb-2">Welcome to SmartTrade AI!</h3>
                <p className="text-blue-700 text-sm">
                  Your account is set up and ready to go. Start by viewing your portfolio or adding funds to begin trading. 
                  If you have any questions, our support team is here to help.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render onboarding flow
  if (view === 'onboarding' && isAuthenticated && user) {
    return (
      <OnboardingPage
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    );
  }

  // Render authentication forms
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {view === 'login' && (
          <LoginForm 
            onSuccess={handleLoginSuccess}
            onRegisterClick={switchToRegistration}
          />
        )}
        
        {view === 'registration' && (
          <div>
            <RegistrationForm onSuccess={handleRegistrationSuccess} />
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  onClick={switchToLogin}
                  className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
