import React, { useState, useEffect } from 'react';
import { sessionApi, SessionConfig, SessionValidationResult } from '../../services/sessionApi';
import { fundingApi } from '../../services/fundingApi';

interface SessionCreationFormProps {
  onSessionCreated: (sessionId: string) => void;
  onCancel: () => void;
}

const DURATION_OPTIONS = [
  { value: 60 as const, label: '1 Hour', description: 'Quick focused session' },
  { value: 240 as const, label: '4 Hours', description: 'Standard trading session' },
  { value: 1440 as const, label: '1 Day', description: 'Full day trading' },
  { value: 10080 as const, label: '1 Week', description: 'Extended trading period' }
];

const LOSS_LIMIT_PERCENTAGES = [10, 20, 30];

export const SessionCreationForm: React.FC<SessionCreationFormProps> = ({
  onSessionCreated,
  onCancel
}) => {
  const [config, setConfig] = useState<SessionConfig>({
    durationMinutes: 60,
    lossLimitPercentage: 10
  });
  const [validation, setValidation] = useState<SessionValidationResult | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [estimatedEndTime, setEstimatedEndTime] = useState<Date | null>(null);

  // Load user balance on component mount
  useEffect(() => {
    const loadBalance = async () => {
      try {
        const accountBalance = await fundingApi.getAccountBalance();
        setBalance(accountBalance.balance);
      } catch (err) {
        console.error('Failed to load balance:', err);
      }
    };
    loadBalance();
  }, []);

  // Update estimated end time when duration changes
  useEffect(() => {
    if (config.durationMinutes) {
      const endTime = new Date(Date.now() + config.durationMinutes * 60 * 1000);
      setEstimatedEndTime(endTime);
    }
  }, [config.durationMinutes]);

  // Validate configuration when it changes
  useEffect(() => {
    const validateConfig = async () => {
      if (config.durationMinutes && (config.lossLimitAmount || config.lossLimitPercentage)) {
        try {
          const result = await sessionApi.validateSessionConfig(config);
          setValidation(result);
        } catch (err) {
          console.error('Validation error:', err);
        }
      }
    };

    const debounceTimer = setTimeout(validateConfig, 500);
    return () => clearTimeout(debounceTimer);
  }, [config]);

  const handleDurationChange = (durationMinutes: 60 | 240 | 1440 | 10080) => {
    setConfig(prev => ({ ...prev, durationMinutes }));
  };

  const handleLossLimitTypeChange = (type: 'percentage' | 'amount') => {
    if (type === 'percentage') {
      setConfig(prev => ({
        ...prev,
        lossLimitAmount: undefined,
        lossLimitPercentage: prev.lossLimitPercentage || 10
      }));
    } else {
      setConfig(prev => ({
        ...prev,
        lossLimitPercentage: undefined,
        lossLimitAmount: prev.lossLimitAmount || Math.min(balance * 0.1, 100)
      }));
    }
  };

  const handleLossLimitValueChange = (value: number) => {
    if (config.lossLimitPercentage !== undefined) {
      setConfig(prev => ({ ...prev, lossLimitPercentage: value }));
    } else {
      setConfig(prev => ({ ...prev, lossLimitAmount: value }));
    }
  };

  const calculateLossLimitAmount = (): number => {
    if (config.lossLimitAmount) {
      return config.lossLimitAmount;
    }
    if (config.lossLimitPercentage) {
      return balance * (config.lossLimitPercentage / 100);
    }
    return 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const session = await sessionApi.createSession(config);
      onSessionCreated(session.sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const isValid = validation?.isValid ?? false;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Create Trading Session</h2>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Duration Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Session Duration
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DURATION_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`relative p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                  config.durationMinutes === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="duration"
                  value={option.value}
                  checked={config.durationMinutes === option.value}
                  onChange={() => handleDurationChange(option.value)}
                  className="sr-only"
                />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-sm text-gray-500">{option.description}</div>
                  </div>
                  {config.durationMinutes === option.value && (
                    <div className="text-blue-500">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Loss Limit Configuration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Loss Limit Protection
          </label>
          <div className="space-y-4">
            {/* Loss Limit Type Selection */}
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="lossLimitType"
                  checked={config.lossLimitPercentage !== undefined}
                  onChange={() => handleLossLimitTypeChange('percentage')}
                  className="mr-2"
                />
                Percentage of Balance
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="lossLimitType"
                  checked={config.lossLimitAmount !== undefined}
                  onChange={() => handleLossLimitTypeChange('amount')}
                  className="mr-2"
                />
                Fixed Amount
              </label>
            </div>

            {/* Loss Limit Value Input */}
            {config.lossLimitPercentage !== undefined ? (
              <div>
                <div className="flex items-center space-x-4 mb-2">
                  {LOSS_LIMIT_PERCENTAGES.map((percentage) => (
                    <button
                      key={percentage}
                      type="button"
                      onClick={() => handleLossLimitValueChange(percentage)}
                      className={`px-3 py-1 rounded-md text-sm ${
                        config.lossLimitPercentage === percentage
                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {percentage}%
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={config.lossLimitPercentage}
                  onChange={(e) => handleLossLimitValueChange(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>5%</span>
                  <span>{config.lossLimitPercentage}%</span>
                  <span>50%</span>
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="number"
                  min="10"
                  max={balance}
                  step="10"
                  value={config.lossLimitAmount || ''}
                  onChange={(e) => handleLossLimitValueChange(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter loss limit amount"
                />
              </div>
            )}

            <div className="text-sm text-gray-600">
              <div>Current Balance: <span className="font-medium">${balance.toFixed(2)}</span></div>
              <div>Loss Limit Amount: <span className="font-medium text-red-600">${calculateLossLimitAmount().toFixed(2)}</span></div>
            </div>
          </div>
        </div>

        {/* Session Preview */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">Session Preview</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Duration:</span>
              <span>{DURATION_OPTIONS.find(o => o.value === config.durationMinutes)?.label}</span>
            </div>
            <div className="flex justify-between">
              <span>Estimated End Time:</span>
              <span>{estimatedEndTime?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Maximum Loss:</span>
              <span className="text-red-600">${calculateLossLimitAmount().toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Protected Balance:</span>
              <span className="text-green-600">${(balance - calculateLossLimitAmount()).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Validation Messages */}
        {validation && (
          <div className="space-y-2">
            {validation.warnings.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="text-sm text-yellow-800">
                  <strong>Warnings:</strong>
                  <ul className="mt-1 list-disc list-inside">
                    {validation.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {validation.errors.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="text-sm text-red-800">
                  <strong>Errors:</strong>
                  <ul className="mt-1 list-disc list-inside">
                    {validation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValid || loading}
            className={`flex-1 px-4 py-2 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isValid && !loading
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {loading ? 'Creating Session...' : 'Create Session'}
          </button>
        </div>
      </form>
    </div>
  );
};
