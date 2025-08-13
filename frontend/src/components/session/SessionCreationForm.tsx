import React, { useState, useEffect } from 'react';
import tradingSessionApi, { 
  CreateSessionRequest, 
  CanCreateResponse,
  durationOptions,
  lossLimitOptions,
  formatCurrency
} from '../../services/tradingSessionApi';

interface SessionCreationFormProps {
  onSessionCreated: (session: any) => void;
  onCancel: () => void;
}

const SessionCreationForm: React.FC<SessionCreationFormProps> = ({
  onSessionCreated,
  onCancel
}) => {
  const [formData, setFormData] = useState<CreateSessionRequest>({
    durationMinutes: 60,
    lossLimitAmount: 9
  });
  const [canCreate, setCanCreate] = useState<CanCreateResponse>({ canCreate: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkCanCreate();
  }, []);

  const checkCanCreate = async () => {
    try {
      const result = await tradingSessionApi.canCreateSession();
      setCanCreate(result);
      if (!result.canCreate) {
        setError(result.reason || 'Cannot create session');
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate.canCreate) return;

    setLoading(true);
    setError(null);

    try {
      const session = await tradingSessionApi.createSession(formData);
      onSessionCreated(session);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDurationChange = (durationMinutes: number) => {
    setFormData(prev => ({ ...prev, durationMinutes }));
  };

  const handleLossLimitChange = (lossLimitAmount: number) => {
    setFormData(prev => ({ 
      ...prev, 
      lossLimitAmount,
      lossLimitPercentage: undefined 
    }));
  };

  const handleCustomLossLimit = (value: string) => {
    const amount = parseFloat(value);
    if (!isNaN(amount) && amount > 0) {
      setFormData(prev => ({ 
        ...prev, 
        lossLimitAmount: amount,
        lossLimitPercentage: undefined 
      }));
    }
  };

  if (!canCreate.canCreate) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Cannot Create Session</h3>
          <p className="text-gray-600 mb-4">{canCreate.reason}</p>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Create Trading Session</h2>
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
            {durationOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => handleDurationChange(option.value)}
                className={`
                  p-4 border rounded-lg cursor-pointer transition-colors
                  ${formData.durationMinutes === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <div className="font-medium text-gray-900">{option.label}</div>
                <div className="text-sm text-gray-500">{option.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Loss Limit Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Loss Limit
          </label>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {lossLimitOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => handleLossLimitChange(option.value)}
                className={`
                  p-3 border rounded-lg cursor-pointer text-center transition-colors
                  ${formData.lossLimitAmount === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <div className="font-medium text-gray-900">{option.label}</div>
                <div className="text-xs text-gray-500">{option.percentage}%</div>
              </div>
            ))}
          </div>
          
          {/* Custom Loss Limit */}
          <div className="mt-3">
            <label className="block text-sm text-gray-600 mb-2">Custom Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                min="1"
                max="45"
                step="0.01"
                placeholder="Enter custom amount"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onChange={(e) => handleCustomLossLimit(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Session Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Session Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Duration:</span>
              <span className="font-medium">
                {durationOptions.find(opt => opt.value === formData.durationMinutes)?.label}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Loss Limit:</span>
              <span className="font-medium">
                {formatCurrency(formData.lossLimitAmount || 0)}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !canCreate.canCreate}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating...' : 'Create Session'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SessionCreationForm;
