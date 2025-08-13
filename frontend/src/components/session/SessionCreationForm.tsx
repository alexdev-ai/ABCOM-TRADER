import React, { useState } from 'react';
import { AlertTriangle, Clock, Shield, TrendingUp, X } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { sessionApi } from '../../services/sessionApi';

interface SessionCreationFormData {
  durationMinutes: number;
  lossLimitAmount: number;
}

interface SessionCreationFormProps {
  onClose: () => void;
  onSuccess: (sessionId: string) => void;
}

export const SessionCreationForm: React.FC<SessionCreationFormProps> = ({
  onClose,
  onSuccess
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<SessionCreationFormData>({
    durationMinutes: 60,
    lossLimitAmount: 9
  });

  const { user } = useAuthStore();
  const accountBalance = typeof user?.accountBalance === 'number' ? user.accountBalance : 90; // Default for demo

  const durationOptions = [
    { 
      label: '1 Hour', 
      value: 60, 
      description: 'Quick trading session',
      icon: <Clock className="h-5 w-5" />,
      recommended: false
    },
    { 
      label: '4 Hours', 
      value: 240, 
      description: 'Half-day trading',
      icon: <TrendingUp className="h-5 w-5" />,
      recommended: true
    },
    { 
      label: '24 Hours', 
      value: 1440, 
      description: 'Full day trading',
      icon: <Shield className="h-5 w-5" />,
      recommended: false
    },
    { 
      label: '7 Days', 
      value: 10080, 
      description: 'Week-long session',
      icon: <Shield className="h-5 w-5" />,
      recommended: false
    }
  ];

  const lossLimitOptions = [
    { 
      label: '$9', 
      value: 9, 
      percent: 10,
      description: 'Conservative approach',
      color: 'green'
    },
    { 
      label: '$18', 
      value: 18, 
      percent: 20,
      description: 'Balanced approach',
      color: 'yellow'
    },
    { 
      label: '$27', 
      value: 27, 
      percent: 30,
      description: 'Aggressive approach',
      color: 'red'
    }
  ];

  const handleCreateSession = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await sessionApi.createSession({
        durationMinutes: formData.durationMinutes as 60 | 240 | 1440 | 10080,
        lossLimitAmount: formData.lossLimitAmount
      });

      if (response.success && response.data?.session) {
        onSuccess(response.data.session.id);
      } else {
        setError(response.error || 'Failed to create session');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to create trading session');
    } finally {
      setIsCreating(false);
    }
  };

  const getEndTime = () => {
    const endTime = new Date(Date.now() + formData.durationMinutes * 60 * 1000);
    return endTime.toLocaleString();
  };

  const getColorClasses = (color: string, selected: boolean) => {
    const baseClasses = 'border-2 rounded-xl transition-all duration-200';
    
    if (selected) {
      switch (color) {
        case 'green':
          return `${baseClasses} border-green-500 bg-green-50 shadow-md`;
        case 'yellow':
          return `${baseClasses} border-yellow-500 bg-yellow-50 shadow-md`;
        case 'red':
          return `${baseClasses} border-red-500 bg-red-50 shadow-md`;
        default:
          return `${baseClasses} border-blue-500 bg-blue-50 shadow-md`;
      }
    }
    
    return `${baseClasses} border-gray-300 hover:border-gray-400 hover:shadow-sm`;
  };

  const isFormValid = accountBalance >= formData.lossLimitAmount;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Create Trading Session
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Set up your AI-powered trading session with time and loss limits
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-6 w-6 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="px-6 py-6">
          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
                <div className="text-sm text-red-800">
                  <p className="font-semibold">Error creating session</p>
                  <p>{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Configuration */}
            <div>
              {/* Duration Selection */}
              <div className="mb-8">
                <label className="block text-lg font-semibold text-gray-900 mb-4">
                  Session Duration
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {durationOptions.map((option) => (
                    <button
                      key={option.value}
                      className={getColorClasses('blue', formData.durationMinutes === option.value)}
                      onClick={() => setFormData({ ...formData, durationMinutes: option.value })}
                    >
                      <div className="p-4 text-left">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            {option.icon}
                            <span className="ml-2 font-semibold">{option.label}</span>
                          </div>
                          {option.recommended && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{option.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Loss Limit Selection */}
              <div className="mb-8">
                <label className="block text-lg font-semibold text-gray-900 mb-4">
                  Maximum Loss Limit
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {lossLimitOptions.map((option) => (
                    <button
                      key={option.value}
                      className={getColorClasses(option.color, formData.lossLimitAmount === option.value)}
                      onClick={() => setFormData({ ...formData, lossLimitAmount: option.value })}
                    >
                      <div className="p-4 text-center">
                        <div className="font-bold text-xl mb-1">{option.label}</div>
                        <div className="text-sm text-gray-600 mb-1">
                          {option.percent}% of balance
                        </div>
                        <div className="text-xs text-gray-500">
                          {option.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Preview and Information */}
            <div>
              {/* Session Preview */}
              <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="font-bold text-lg text-gray-900 mb-4">Session Preview</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-semibold text-gray-900">
                      {durationOptions.find(d => d.value === formData.durationMinutes)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">End Time:</span>
                    <span className="font-semibold text-gray-900">{getEndTime()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Maximum Loss:</span>
                    <span className="font-semibold text-red-600">
                      ${formData.lossLimitAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Account Balance:</span>
                    <span className="font-semibold text-green-600">
                      ${accountBalance.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Remaining After Max Loss:</span>
                    <span className="font-semibold text-gray-900">
                      ${(accountBalance - formData.lossLimitAmount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Risk Warning */}
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <div className="flex items-start">
                  <AlertTriangle className="h-6 w-6 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold mb-2">⚠️ Important Risk Warning</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Trading involves substantial risk of loss</li>
                      <li>• The SmartTrade AI algorithm will make decisions on your behalf</li>
                      <li>• You may lose up to ${formData.lossLimitAmount} during this session</li>
                      <li>• Session limits cannot be modified once active</li>
                      <li>• Emergency stop is available at all times</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* How It Works */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <h4 className="font-semibold text-blue-900 mb-2">How It Works</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• AI analyzes market conditions in real-time</li>
                  <li>• Makes buy/sell decisions based on your risk profile</li>
                  <li>• Automatically stops if loss limit is reached</li>
                  <li>• Session ends automatically at scheduled time</li>
                  <li>• You can monitor progress and stop anytime</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateSession}
              disabled={isCreating || !isFormValid}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isCreating ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating Session...
                </div>
              ) : (
                'Create Trading Session'
              )}
            </button>
          </div>

          {/* Validation Messages */}
          {!isFormValid && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                Insufficient balance. You need at least ${formData.lossLimitAmount} to create this session.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionCreationForm;
