import React, { useState } from 'react';

interface Step3EmergencyProps {
  onNext: () => void;
  onPrevious: () => void;
}

export const Step3Emergency: React.FC<Step3EmergencyProps> = ({ onNext, onPrevious }) => {
  const [showEmergencyDemo, setShowEmergencyDemo] = useState(false);
  const [demoStep, setDemoStep] = useState(0);

  const handleEmergencyDemo = () => {
    setShowEmergencyDemo(true);
    setDemoStep(1);
    
    // Simulate demo progression
    setTimeout(() => setDemoStep(2), 2000);
    setTimeout(() => setDemoStep(3), 4000);
    setTimeout(() => setDemoStep(4), 6000);
    setTimeout(() => {
      setShowEmergencyDemo(false);
      setDemoStep(0);
    }, 8000);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Emergency Controls & Safety</h2>
        <p className="text-lg text-gray-600">Your ultimate protection when you need it most</p>
      </div>

      {/* Emergency Stop Overview */}
      <div className="mb-8 bg-red-50 border-l-4 border-red-400 p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-red-800">Emergency Stop - Your Safety Net</h3>
            <div className="mt-2 text-red-700">
              <p>
                The Emergency Stop button immediately halts all trading activity and cancels pending orders. 
                Use it whenever you feel uncomfortable or need to stop trading immediately.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* When to Use Emergency Stop */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">When to Use Emergency Stop</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-white text-xs font-bold">1</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Market Volatility</h4>
                <p className="text-gray-600 text-sm">Sudden market crashes or extreme volatility that makes you uncomfortable</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-white text-xs font-bold">2</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Personal Emergency</h4>
                <p className="text-gray-600 text-sm">Life emergencies where you need to focus elsewhere and stop trading</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-white text-xs font-bold">3</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Unexpected Losses</h4>
                <p className="text-gray-600 text-sm">If losses are approaching your comfort zone faster than expected</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-white text-xs font-bold">4</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Technical Issues</h4>
                <p className="text-gray-600 text-sm">Platform connectivity issues or suspicious activity</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-white text-xs font-bold">5</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Change of Mind</h4>
                <p className="text-gray-600 text-sm">Simply decided you want to stop trading for any reason</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-white text-xs font-bold">6</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Preserving Gains</h4>
                <p className="text-gray-600 text-sm">Lock in profits when you're satisfied with session performance</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Demo */}
      <div className="mb-8 bg-gray-50 p-6 rounded-lg">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Try the Emergency Stop Demo</h3>
        <p className="text-gray-600 mb-6">
          Click the button below to see exactly how the Emergency Stop works. This is just a simulation - no real trading occurs.
        </p>

        {/* Demo Container */}
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 mb-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="font-medium text-gray-900">Demo Trading Session</h4>
              <p className="text-sm text-gray-500">Balance: $90.00 • Session: 4 hours remaining</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-green-600 font-semibold">+$5.40 (6%)</div>
              <button
                onClick={handleEmergencyDemo}
                disabled={showEmergencyDemo}
                className={`
                  px-6 py-2 rounded-lg font-semibold transition-all duration-200
                  ${showEmergencyDemo
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 text-white hover:shadow-lg'
                  }
                `}
              >
                {showEmergencyDemo ? 'STOPPING...' : '🚨 EMERGENCY STOP'}
              </button>
            </div>
          </div>

          {/* Demo Progress */}
          {showEmergencyDemo && (
            <div className="border-t pt-4">
              <div className="space-y-2">
                <div className={`flex items-center ${demoStep >= 1 ? 'text-green-600' : 'text-gray-400'}`}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Emergency stop signal sent
                </div>
                <div className={`flex items-center ${demoStep >= 2 ? 'text-green-600' : 'text-gray-400'}`}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  All pending orders canceled
                </div>
                <div className={`flex items-center ${demoStep >= 3 ? 'text-green-600' : 'text-gray-400'}`}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Algorithm trading halted
                </div>
                <div className={`flex items-center ${demoStep >= 4 ? 'text-green-600' : 'text-gray-400'}`}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Session ended safely - Final balance: $95.40
                </div>
              </div>
            </div>
          )}
        </div>

        {!showEmergencyDemo && (
          <p className="text-sm text-gray-500 text-center">
            💡 In real trading, the Emergency Stop is always visible and takes &lt;2 seconds to execute
          </p>
        )}
      </div>

      {/* What Happens After Emergency Stop */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">What Happens After Emergency Stop?</h3>
        <div className="bg-blue-50 p-6 rounded-lg">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Immediate Actions</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• All trading stops immediately</li>
                <li>• Pending orders are canceled</li>
                <li>• Current positions are closed safely</li>
                <li>• Session marked as "Emergency Stopped"</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">What You Can Do Next</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Review session performance</li>
                <li>• Start a new session anytime</li>
                <li>• Contact support if needed</li>
                <li>• Withdraw funds if desired</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Support Information */}
      <div className="mb-8 bg-green-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Need Help? We're Here 24/7</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">Live Chat</div>
            <div className="text-sm text-gray-600">Available 24/7 in app</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">Email Support</div>
            <div className="text-sm text-gray-600">support@smarttrade.ai</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">Phone Support</div>
            <div className="text-sm text-gray-600">1-800-SMART-AI</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onPrevious}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
        >
          ← Previous
        </button>
        <button
          onClick={onNext}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200"
        >
          Complete Onboarding ✅
        </button>
      </div>
    </div>
  );
};
