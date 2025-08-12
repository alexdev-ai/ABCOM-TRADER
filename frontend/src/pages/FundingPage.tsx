import React, { useState, useEffect } from 'react';
import { FundingForm } from '../components/funding/FundingForm';
import { fundingApi, AccountBalance } from '../services/fundingApi';
import { useAuthStore } from '../stores/authStore';

export const FundingPage: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  const [accountBalance, setAccountBalance] = useState<AccountBalance | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Show login message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-4">
            Please log in to access the funding page.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Load account balance
  useEffect(() => {
    const loadBalance = async () => {
      if (!isAuthenticated) return;
      
      setIsLoadingBalance(true);
      try {
        const balance = await fundingApi.getAccountBalance();
        setAccountBalance(balance);
      } catch (error) {
        console.error('Failed to load account balance:', error);
      } finally {
        setIsLoadingBalance(false);
      }
    };

    loadBalance();
  }, [isAuthenticated]);

  const handleFundingSuccess = async (newBalance: number) => {
    // Refresh account balance
    try {
      const balance = await fundingApi.getAccountBalance();
      setAccountBalance(balance);
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    }
  };

  const handleFundingError = (error: string) => {
    console.error('Funding error:', error);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Account Funding</h1>
              <p className="mt-1 text-sm text-gray-500">
                Add funds to your SmartTrade AI trading account
              </p>
            </div>
            
            {/* Account Balance Card */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
              <div className="text-sm font-medium opacity-90">Available Balance</div>
              <div className="text-2xl font-bold">
                {isLoadingBalance ? (
                  <div className="animate-pulse">Loading...</div>
                ) : accountBalance ? (
                  `$${accountBalance.balance.toFixed(2)}`
                ) : user ? (
                  `$${parseFloat(user.accountBalance).toFixed(2)}`
                ) : (
                  '$0.00'
                )}
              </div>
              {accountBalance && (
                <div className="text-xs opacity-75 mt-1">
                  Updated: {new Date(accountBalance.lastUpdated).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Funding Form */}
          <div className="lg:col-span-2">
            <FundingForm 
              onSuccess={handleFundingSuccess}
              onError={handleFundingError}
            />
          </div>

          {/* Information Sidebar */}
          <div className="space-y-6">
            {/* How it Works */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">How Funding Works</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm font-semibold">1</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-700">
                      <strong>Choose Amount:</strong> Select between $90 - $10,000
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm font-semibold">2</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-700">
                      <strong>Select Method:</strong> Demo balance or simulated bank transfer
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm font-semibold">3</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-700">
                      <strong>Instant Processing:</strong> Funds are available immediately
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-7-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Secure Demo Environment
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>
                      This is a demo trading environment. All transactions are simulated 
                      and no real money is involved.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Support */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Having trouble with funding? Our support team is here to help.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    support@smarttradeai.com
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Live Chat Available 24/7
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
