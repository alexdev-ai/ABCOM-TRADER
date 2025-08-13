import React, { useState, useEffect } from 'react';
import { RegistrationForm } from './components/auth/RegistrationForm';
import LoginForm from './components/auth/LoginForm';
import { FundingPage } from './pages/FundingPage';
import PortfolioPage from './pages/PortfolioPage';
import TradingPage from './pages/TradingPage';
import SessionsPage from './pages/SessionsPage';
import { ProfilePage } from './pages/ProfilePage';
import { useAuthStore } from './stores/authStore';

type AuthView = 'login' | 'registration' | 'dashboard';
type DashboardView = 'overview' | 'portfolio' | 'trading' | 'sessions' | 'funding' | 'profile';

function App() {
  const [view, setView] = useState<AuthView>('login');
  const [dashboardView, setDashboardView] = useState<DashboardView>('portfolio');
  const { isAuthenticated, user, logout, isLoading } = useAuthStore();

  // Check authentication status on app load
  useEffect(() => {
    if (isAuthenticated && user) {
      setView('dashboard');
    } else {
      setView('login');
    }
  }, [isAuthenticated, user]);

  const handleLoginSuccess = () => {
    setView('dashboard');
  };

  const handleRegistrationSuccess = () => {
    setView('dashboard');
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

  // Show loading state while checking authentication
  if (isLoading) {
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
            <nav className="flex space-x-8">
              <button
                onClick={() => setDashboardView('portfolio')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  dashboardView === 'portfolio'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📊 Portfolio
              </button>
              <button
                onClick={() => setDashboardView('trading')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  dashboardView === 'trading'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📈 Trading
              </button>
              <button
                onClick={() => setDashboardView('sessions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  dashboardView === 'sessions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ⏱️ Sessions
              </button>
              <button
                onClick={() => setDashboardView('funding')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  dashboardView === 'funding'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                💰 Funding
              </button>
              <button
                onClick={() => setDashboardView('profile')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  dashboardView === 'profile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                👤 Profile
              </button>
              <button
                onClick={() => setDashboardView('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  dashboardView === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🏠 Overview
              </button>
            </nav>
          </div>
        </div>

        {/* Dashboard Content */}
        {dashboardView === 'portfolio' && <PortfolioPage />}
        {dashboardView === 'trading' && <TradingPage />}
        {dashboardView === 'sessions' && <SessionsPage />}
        {dashboardView === 'funding' && <FundingPage />}
        {dashboardView === 'profile' && <ProfilePage />}
        
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
                      onClick={() => setDashboardView('funding')}
                      className="w-full text-left px-3 py-2 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                    >
                      💰 Add Funds
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors">
                      📈 Place Trade
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors">
                      📋 Transaction History
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
