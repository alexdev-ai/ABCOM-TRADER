import React, { useState, useEffect } from 'react';
import { sessionApi, type SessionConfig, type SessionValidation } from '../../services/sessionApi';
import { profileApi } from '../../services/profileApi';

interface SessionCreationFormProps {
  onSessionCreated?: (sessionId: string) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

const DURATION_OPTIONS = [
  { minutes: 60, label: '1 Hour', description: 'Perfect for quick trades' },
  { minutes: 240, label: '4 Hours', description: 'Half-day trading session' },
  { minutes: 1440, label: '1 Day', description: 'Full day trading' },
  { minutes: 10080, label: '7 Days', description: 'Week-long session' }
];

const LOSS_LIMIT_OPTIONS = [
  { percentage: 10, amount: 9, label: '10% ($9)', description: 'Conservative approach' },
  { percentage: 20, amount: 18, label: '20% ($18)', description: 'Moderate risk' },
  { percentage: 30, amount: 27, label: '30% ($27)', description: 'Aggressive strategy' }
];

export const SessionCreationForm: React.FC<SessionCreationFormProps> = ({
  onSessionCreated,
  onCancel,
  isModal = false
}) => {
  const [config, setConfig] = useState<SessionConfig>({
    durationMinutes: 60,
    lossLimitPercentage: 10
  });
  
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<SessionValidation | null>(null);
  const [error, setError] = useState<string>('');
  const [accountBalance, setAccountBalance] = useState<number>(90);
  
  // Load user profile to get account balance
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await profileApi.getProfile();
        setAccountBalance(profile.accountBalance);
        
        // Update loss limit amounts based on actual balance
        const newConfig = { ...config };
        if (config.lossLimitPercentage && !config.lossLimitAmount) {
          newConfig.lossLimitAmount = (profile.accountBalance * config.lossLimitPercentage) / 100;
        }
        setConfig(newConfig);
      } catch (err) {
        console.error('Failed to load profile:', err);
      }
    };
    
    loadProfile();
  }, []);

  // Validate configuration when it changes
  useEffect(() => {
    if (config.durationMinutes && (config.lossLimitAmount || config.lossLimitPercentage)) {
      validateConfiguration();
    }
  }, [config]);

  const validateConfiguration = async () => {
    setValidating(true);
    try {
      const result = await sessionApi.validateSession(config);
      setValidation(result);
      setError(result.isValid ? '' : result.errors.join(', '));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
      setValidation(null);
    } finally {
      setValidating(false);
    }
  };

  const handleDurationChange = (minutes: number) => {
    setConfig(prev => ({ ...prev, durationMinutes: minutes as any }));
    setShowPreview(false);
  };

  const handleLossLimitChange = (percentage: number, amount: number) => {
    const actualAmount = (accountBalance * percentage) / 100;
    setConfig(prev => ({
      ...prev,
      lossLimitPercentage: percentage,
      lossLimitAmount: actualAmount
    }));
    setShowPreview(false);
  };

  const handleCustomLossLimit = (amount: number) => {
    const percentage = (amount / accountBalance) * 100;
    setConfig(prev => ({
      ...prev,
      lossLimitAmount: amount,
      lossLimitPercentage: percentage
    }));
    setShowPreview(false);
  };

  const handlePreview = () => {
    if (validation?.isValid) {
      setShowPreview(true);
    }
  };

  const handleCreateSession = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await sessionApi.createSession(config);
      onSessionCreated?.(response.sessionId);
      setShowConfirmation(false);
      setShowPreview(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const calculateEndTime = () => {
    const endTime = new Date(Date.now() + config.durationMinutes * 60 * 1000);
    return endTime.toLocaleString();
  };

  const getDurationLabel = () => {
    return DURATION_OPTIONS.find(opt => opt.minutes === config.durationMinutes)?.label || 'Custom';
  };

  const containerClass = isModal 
    ? "bg-white rounded-lg shadow-xl p-6 max-w-2xl mx-auto"
    : "bg-white rounded-lg shadow-md p-6";

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Create Trading Session</h2>
          <p className="text-gray-600 mt-1">Set your time and loss limits for safe trading</p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Account Balance Display */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">Account Balance</span>
          <span className="text-lg font-bold text-blue-900">${accountBalance.toFixed(2)}</span>
        </div>
      </div>

      {/* Duration Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Session Duration
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {DURATION_OPTIONS.map((option) => (
            <button
              key={option.minutes}
              onClick={() => handleDurationChange(option.minutes)}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                config.durationMinutes === option.minutes
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-gray-900">{option.label}</div>
              <div className="text-sm text-gray-600">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Loss Limit Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Loss Limit
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {LOSS_LIMIT_OPTIONS.map((option) => {
            const actualAmount = (accountBalance * option.percentage) / 100;
            const isSelected = config.lossLimitPercentage === option.percentage;
            
            return (
              <button
                key={option.percentage}
                onClick={() => handleLossLimitChange(option.percentage, option.amount)}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-900">
                  {option.percentage}% (${actualAmount.toFixed(2)})
                </div>
                <div className="text-sm text-gray-600">{option.description}</div>
              </button>
            );
          })}
        </div>

        {/* Custom Loss Limit */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Loss Limit ($)
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="9"
              max={accountBalance}
              step="0.01"
              value={config.lossLimitAmount || ''}
              onChange={(e) => {
                const amount = parseFloat(e.target.value) || 0;
                if (amount >= 9 && amount <= accountBalance) {
                  handleCustomLossLimit(amount);
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter custom amount"
            />
            <span className="text-sm text-gray-600">
              ({((config.lossLimitAmount || 0) / accountBalance * 100).toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Validation Results */}
      {validating && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
            <span className="text-sm text-yellow-800">Validating configuration...</span>
          </div>
        </div>
      )}

      {validation && !validating && (
        <div className="mb-4">
          {validation.warnings.length > 0 && (
            <div className="mb-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="text-sm font-medium text-yellow-800 mb-1">Warnings:</div>
              {validation.warnings.map((warning, index) => (
                <div key={index} className="text-sm text-yellow-700">• {warning}</div>
              ))}
            </div>
          )}
          
          {!validation.isValid && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="text-sm font-medium text-red-800 mb-1">Validation Errors:</div>
              {validation.errors.map((error, index) => (
                <div key={index} className="text-sm text-red-700">• {error}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Preview Button */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {validation?.isValid ? (
            <span className="text-green-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Configuration valid
            </span>
          ) : (
            'Please fix validation errors'
          )}
        </div>
        
        <button
          onClick={handlePreview}
          disabled={!validation?.isValid || validating}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Preview Session
        </button>
      </div>

      {/* Session Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Session Preview</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium">{getDurationLabel()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Loss Limit:</span>
                <span className="font-medium">
                  ${config.lossLimitAmount?.toFixed(2)} ({config.lossLimitPercentage?.toFixed(1)}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Estimated End Time:</span>
                <span className="font-medium">{calculateEndTime()}</span>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mb-6">
              <div className="text-sm text-blue-800">
                <strong>Important:</strong> Your session will automatically stop when the time limit is reached 
                or when your losses exceed ${config.lossLimitAmount?.toFixed(2)}.
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Back to Edit
              </button>
              <button
                onClick={() => {
                  setShowPreview(false);
                  setShowConfirmation(true);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Confirm & Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Confirm Session Creation</h3>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                Are you ready to create this trading session? Once created, the session will be active 
                and your trading will be subject to the configured limits.
              </p>
              
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="text-sm text-yellow-800">
                  <strong>Remember:</strong> You can only have one active session at a time. 
                  You can manually stop the session early if needed.
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmation(false)}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSession}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  'Create Session'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionCreationForm;
