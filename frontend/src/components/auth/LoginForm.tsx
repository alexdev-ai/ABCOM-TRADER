import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

// Login form validation schema
const loginSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
  password: z
    .string()
    .min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false)
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess?: () => void;
  onRegisterClick?: () => void;
}

export default function LoginForm({ onSuccess, onRegisterClick }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error, clearError } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setError,
    clearErrors
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange'
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      clearError();
      clearErrors();
      
      await login(data.email, data.password, data.rememberMe);
      onSuccess?.();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Invalid email or password')) {
          setError('email', { message: 'Invalid email or password' });
          setError('password', { message: 'Invalid email or password' });
        } else if (error.message.includes('Account temporarily locked')) {
          setError('email', { message: error.message });
        } else {
          setError('email', { message: 'Login failed. Please try again.' });
        }
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600">
            Sign in to your SmartTrade AI account
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                {...register('email')}
                type="email"
                id="email"
                autoComplete="email"
                className={`
                  block w-full pl-10 pr-3 py-3 border rounded-lg shadow-sm
                  placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  transition-colors duration-200
                  ${errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'}
                `}
                placeholder="Enter your email"
              />
            </div>
            {errors.email && (
              <div className="mt-2 flex items-center text-sm text-red-600">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.email.message}
              </div>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                className={`
                  block w-full pl-10 pr-10 py-3 border rounded-lg shadow-sm
                  placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  transition-colors duration-200
                  ${errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'}
                `}
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <div className="mt-2 flex items-center text-sm text-red-600">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.password.message}
              </div>
            )}
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                {...register('rememberMe')}
                id="rememberMe"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
                Remember me for 30 days
              </label>
            </div>
            <button
              type="button"
              className="text-sm text-blue-600 hover:text-blue-500 font-medium"
            >
              Forgot password?
            </button>
          </div>

          {/* General Error */}
          {error && !errors.email && !errors.password && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !isValid}
            className="
              w-full flex justify-center items-center py-3 px-4 border border-transparent 
              rounded-lg shadow-sm text-sm font-medium text-white 
              bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600
              transition-all duration-200
            "
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Registration Link */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onRegisterClick}
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              Create account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
