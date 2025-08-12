import React, { useState, useEffect } from 'react';
import { fundingApi, FundingRequest, FundingMethod } from '../../services/fundingApi';
import { useAuthStore } from '../../stores/authStore';

interface FundingFormProps {
  onSuccess?: (newBalance: number) => void;
  onError?: (error: string) => void;
}

export const FundingForm: React.FC<FundingFormProps> = ({ onSuccess, onError }) => {
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<'demo_balance' | 'bank_transfer'>('demo_balance');
  const [reference, setReference] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [methods, setMethods] = useState<FundingMethod[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  
  const { user } = useAuthStore();

  // Load funding methods on component mount
  useEffect(() => {
    const loadFundingMethods = async () => {
      try {
        const fundingMethods = await fundingApi.getFundingMethods();
        setMethods(fundingMethods);
      } catch (error) {
        console.error('Failed to load funding methods:', error);
      }
    };

    loadFundingMethods();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setIsLoading(true);

    try {
      const amountNumber = parseFloat(amount);
      
      if (isNaN(amountNumber) || amountNumber < 90 || amountNumber > 10000) {
        setErrors(['Amount must be between $90 and $10,000']);
        setIsLoading(false);
        return;
      }

      const request: FundingRequest = {
        amount: amountNumber,
        method,
        reference: reference || undefined
      };

      // Validate request first
      const validation = await fundingApi.validateFundingRequest(request);
      if (!validation.valid) {
        setErrors(validation.errors || ['Invalid funding request']);
        setIsLoading(false);
        return;
      }

      // Process funding
      const result = await fundingApi.processFunding(request);
      
      if (result.success) {
        // Reset form
        setAmount('');
        setReference('');
        
        // Notify parent component
        onSuccess?.(result.newBalance);
        
        // Show success message
        alert(`Successfully deposited $${amountNumber}! New balance: $${result.newBalance.toFixed(2)}`);
      } else {
        setErrors(['Funding failed. Please try again.']);
        onError?.('Funding failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during funding';
      setErrors([errorMessage]);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and one decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const quickAmountButtons = [100, 500, 1000, 2500, 5000];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Fund Your Account</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Amount Input */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
            Amount (USD)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="text"
              id="amount"
              value={amount}
              onChange={handleAmountChange}
              className="block w-full pl-7 pr-12 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-lg"
              placeholder="0.00"
              required
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Minimum: $90 • Maximum: $10,000
          </p>
        </div>

        {/* Quick Amount Buttons */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Quick Select
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {quickAmountButtons.map((quickAmount) => (
              <button
                key={quickAmount}
                type="button"
                onClick={() => setAmount(quickAmount.toString())}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                ${quickAmount}
              </button>
            ))}
          </div>
        </div>

        {/* Funding Method */}
        <div>
          <label htmlFor="method" className="block text-sm font-medium text-gray-700 mb-2">
            Funding Method
          </label>
          <select
            id="method"
            value={method}
            onChange={(e) => setMethod(e.target.value as 'demo_balance' | 'bank_transfer')}
            className="block w-full py-3 px-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {methods.map((fundingMethod) => (
              <option key={fundingMethod.id} value={fundingMethod.id}>
                {fundingMethod.name} - {fundingMethod.processingTime}
              </option>
            ))}
          </select>
          {methods.find(m => m.id === method) && (
            <p className="mt-2 text-sm text-gray-500">
              {methods.find(m => m.id === method)?.description}
            </p>
          )}
        </div>

        {/* Reference (Optional) */}
        <div>
          <label htmlFor="reference" className="block text-sm font-medium text-gray-700 mb-2">
            Reference (Optional)
          </label>
          <input
            type="text"
            id="reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="block w-full py-3 px-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter a reference for this deposit"
          />
        </div>

        {/* Error Messages */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Please correct the following errors:
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <ul className="list-disc pl-5 space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Current Balance Display */}
        {user && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-800">
                  Current Balance: ${parseFloat(user.accountBalance).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !amount || parseFloat(amount) < 90 || parseFloat(amount) > 10000}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            `Fund Account with $${amount || '0'}`
          )}
        </button>
      </form>
    </div>
  );
};
