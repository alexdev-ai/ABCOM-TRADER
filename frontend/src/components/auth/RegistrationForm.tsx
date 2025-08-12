import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

// Registration form validation schema based on Context7 research
const registrationSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  firstName: z.string().min(1, 'First name required').max(50),
  lastName: z.string().min(1, 'Last name required').max(50),
  dateOfBirth: z.string().refine(date => {
    const age = new Date().getFullYear() - new Date(date).getFullYear();
    return age >= 18;
  }, 'Must be 18 or older'),
  phoneNumber: z.string().regex(/^\+?1?[2-9]\d{2}[2-9]\d{2}\d{4}$/, 'Valid US phone number required'),
  riskTolerance: z.enum(['conservative', 'moderate', 'aggressive'])
});

export type RegistrationFormData = z.infer<typeof registrationSchema>;

interface RegistrationFormProps {
  onSuccess?: () => void;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ 
  onSuccess
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  // Auth store integration
  const { isLoading, error, clearError } = useAuthStore();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, touchedFields }
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    mode: 'onBlur', // Validate on blur for better UX
    reValidateMode: 'onChange' // Re-validate on change after first validation
  });

  const password = watch('password');

  // Password strength calculation
  React.useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      return;
    }

    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/\d/.test(password)) strength += 25;
    
    setPasswordStrength(strength);
  }, [password]);

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 50) return 'bg-red-500';
    if (passwordStrength < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 50) return 'Weak';
    if (passwordStrength < 75) return 'Medium';
    return 'Strong';
  };

  const handleFormSubmit = async (data: RegistrationFormData) => {
    try {
      clearError();
      
      // Register using the auth store
      const response = await fetch('http://localhost:3003/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Registration failed');
      }

      // Store token in localStorage for auth store
      localStorage.setItem('access_token', result.data.token);
      
      // Call success callback
      onSuccess?.();
      
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Join SmartTrade AI
          </h1>
          <p className="text-gray-600">
            Start trading with just $90 • Complete in under 3 minutes
          </p>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6" noValidate>
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                {...register('firstName')}
                type="text"
                id="firstName"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.firstName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="John"
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <XCircle className="w-4 h-4 mr-1" />
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                {...register('lastName')}
                type="text"
                id="lastName"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.lastName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Doe"
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <XCircle className="w-4 h-4 mr-1" />
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              {...register('email')}
              type="email"
              id="email"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="john@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <XCircle className="w-4 h-4 mr-1" />
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                id="password"
                className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter secure password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            
            {/* Password Strength Indicator */}
            {password && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Password Strength</span>
                  <span>{getPasswordStrengthText()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                    style={{ width: `${passwordStrength}%` }}
                  />
                </div>
              </div>
            )}

            {errors.password && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <XCircle className="w-4 h-4 mr-1" />
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Date of Birth */}
          <div>
            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth
            </label>
            <input
              {...register('dateOfBirth')}
              type="date"
              id="dateOfBirth"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.dateOfBirth && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <XCircle className="w-4 h-4 mr-1" />
                {errors.dateOfBirth.message}
              </p>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              {...register('phoneNumber')}
              type="tel"
              id="phoneNumber"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="(555) 123-4567"
            />
            {errors.phoneNumber && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <XCircle className="w-4 h-4 mr-1" />
                {errors.phoneNumber.message}
              </p>
            )}
          </div>

          {/* Risk Tolerance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Risk Tolerance
            </label>
            <div className="space-y-3">
              {[
                { value: 'conservative', label: 'Conservative', description: 'Lower risk, steady growth' },
                { value: 'moderate', label: 'Moderate', description: 'Balanced risk and reward' },
                { value: 'aggressive', label: 'Aggressive', description: 'Higher risk, higher potential returns' }
              ].map((option) => (
                <label key={option.value} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    {...register('riskTolerance')}
                    type="radio"
                    value={option.value}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
            {errors.riskTolerance && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <XCircle className="w-4 h-4 mr-1" />
                {errors.riskTolerance.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isSubmitting || isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>

          {/* Terms */}
          <p className="text-xs text-gray-500 text-center">
            By creating an account, you agree to our{' '}
            <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>{' '}
            and{' '}
            <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
          </p>
        </form>
      </div>
    </div>
  );
};
