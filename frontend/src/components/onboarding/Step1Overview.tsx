import React from 'react';

interface Step1OverviewProps {
  onNext: () => void;
}

export const Step1Overview: React.FC<Step1OverviewProps> = ({ onNext }) => {
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to SmartTrade AI</h2>
        <p className="text-lg text-gray-600">Your intelligent trading companion with institutional-grade protection</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Left Column - Key Features */}
        <div className="space-y-6">
          <div className="bg-green-50 p-6 rounded-lg">
            <div className="flex items-start">
              <div className="w-8 h-8 bg-green-500 rounded-full flex-shrink-0 flex items-center justify-center mr-4">
                <span className="text-white font-bold text-sm">65%</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Proven Algorithm Performance</h3>
                <p className="text-gray-600 text-sm">
                  Our SmartTrade AI achieves a 65% win rate with 5-12% monthly returns through advanced market analysis.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-6 rounded-lg">
            <div className="flex items-start">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex-shrink-0 flex items-center justify-center mr-4">
                <span className="text-white font-bold text-sm">$90</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Ultra-Low Minimum</h3>
                <p className="text-gray-600 text-sm">
                  Start trading with just $90 - making institutional-quality algorithms accessible to everyone.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 p-6 rounded-lg">
            <div className="flex items-start">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex-shrink-0 flex items-center justify-center mr-4">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Session-Based Safety</h3>
                <p className="text-gray-600 text-sm">
                  Set time and loss limits for each trading session to protect your capital automatically.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - How It Works */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">How SmartTrade AI Works</h3>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Create Trading Session</h4>
                <p className="text-gray-600 text-sm">Set your time limit (1 hour to 7 days) and maximum loss amount.</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">
                2
              </div>
              <div>
                <h4 className="font-medium text-gray-900">AI Analyzes Markets</h4>
                <p className="text-gray-600 text-sm">Our algorithm analyzes real-time market conditions and identifies opportunities.</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Smart Trades Execute</h4>
                <p className="text-gray-600 text-sm">Trades execute automatically with built-in risk management and stop-losses.</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">
                4
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Monitor & Control</h4>
                <p className="text-gray-600 text-sm">Track performance in real-time and use emergency stop if needed.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Safety First Message */}
      <div className="mt-8 bg-yellow-50 border-l-4 border-yellow-400 p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Safety First Approach</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                SmartTrade AI is designed with multiple safety layers to protect your capital. You're always in control
                with session limits, emergency stops, and transparent performance tracking.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-8 text-center">
        <button
          onClick={onNext}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200"
        >
          Continue to Risk Management →
        </button>
      </div>
    </div>
  );
};
