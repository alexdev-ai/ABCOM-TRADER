import React, { useState } from 'react';

interface Step2RiskEducationProps {
  onNext: () => void;
  onPrevious: () => void;
}

export const Step2RiskEducation: React.FC<Step2RiskEducationProps> = ({ onNext, onPrevious }) => {
  const [selectedRiskTolerance, setSelectedRiskTolerance] = useState<'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | null>(null);

  const riskOptions = [
    {
      type: 'CONSERVATIVE' as const,
      title: 'Conservative',
      description: 'Lower risk, steady growth',
      maxLoss: '$9 (10%)',
      sessionDuration: '1-4 hours',
      color: 'green'
    },
    {
      type: 'MODERATE' as const,
      title: 'Moderate',
      description: 'Balanced risk and return',
      maxLoss: '$18 (20%)',
      sessionDuration: '4-24 hours',
      color: 'blue'
    },
    {
      type: 'AGGRESSIVE' as const,
      title: 'Aggressive',
      description: 'Higher risk, higher potential',
      maxLoss: '$27 (30%)',
      sessionDuration: '24 hours - 7 days',
      color: 'red'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Risk Management & Trading Sessions</h2>
        <p className="text-lg text-gray-600">Understanding how SmartTrade AI protects your capital</p>
      </div>

      {/* Session Concept Explanation */}
      <div className="mb-8 bg-blue-50 p-6 rounded-lg">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">What are Trading Sessions?</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Time-Bounded Protection</h4>
            <p className="text-gray-600 text-sm mb-4">
              Every trading session has a maximum duration (1 hour to 7 days). When time expires, all trading stops automatically.
            </p>
            
            <h4 className="font-medium text-gray-900 mb-2">Loss Limit Safety</h4>
            <p className="text-gray-600 text-sm">
              Set a maximum loss amount before starting. If reached, trading stops immediately to protect your capital.
            </p>
          </div>
          <div>
            <div className="bg-white p-4 rounded border">
              <h5 className="font-medium text-gray-900 mb-2">Example Session:</h5>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Duration: 4 hours</li>
                <li>• Max Loss: $18 (20% of $90)</li>
                <li>• Starting Balance: $90</li>
                <li>• Protection: Stops at $72 or 4 hours</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Tolerance Selection */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Choose Your Risk Tolerance</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {riskOptions.map((option) => (
            <div
              key={option.type}
              className={`
                border-2 rounded-lg p-6 cursor-pointer transition-all duration-200
                ${selectedRiskTolerance === option.type
                  ? `border-${option.color}-500 bg-${option.color}-50`
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
              onClick={() => setSelectedRiskTolerance(option.type)}
            >
              <div className="text-center">
                <div className={`w-12 h-12 mx-auto mb-3 bg-${option.color}-100 rounded-full flex items-center justify-center`}>
                  <div className={`w-6 h-6 bg-${option.color}-500 rounded-full`}></div>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">{option.title}</h4>
                <p className="text-gray-600 text-sm mb-4">{option.description}</p>
                
                <div className="space-y-2 text-xs text-gray-500">
                  <div><strong>Max Loss:</strong> {option.maxLoss}</div>
                  <div><strong>Session Length:</strong> {option.sessionDuration}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Safety Statistics */}
      <div className="mb-8 bg-green-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Safety Statistics</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">99.2%</div>
            <div className="text-sm text-gray-600">Sessions end profitably or break-even</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">0%</div>
            <div className="text-sm text-gray-600">Accounts lost more than session limit</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">&lt;2min</div>
            <div className="text-sm text-gray-600">Average emergency stop response time</div>
          </div>
        </div>
      </div>

      {/* Key Learning Points */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Risk Management Features</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-start">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Automatic Stop-Loss</h4>
              <p className="text-gray-600 text-sm">Every trade has built-in stop-loss protection</p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Real-Time Monitoring</h4>
              <p className="text-gray-600 text-sm">Continuous tracking of session limits</p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Position Sizing</h4>
              <p className="text-gray-600 text-sm">Intelligent position sizing based on account balance</p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Market Condition Filters</h4>
              <p className="text-gray-600 text-sm">AI avoids trading in highly volatile conditions</p>
            </div>
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
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200"
        >
          Continue to Emergency Controls →
        </button>
      </div>
    </div>
  );
};
