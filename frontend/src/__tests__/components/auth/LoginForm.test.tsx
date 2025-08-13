import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import LoginForm from '../../../components/auth/LoginForm';

// Mock the auth API
const mockLogin = vi.fn();
vi.mock('../../../services/authApi', () => ({
  authApi: {
    login: mockLogin
  }
}));

// Mock the auth store
const mockSetAuth = vi.fn();
vi.mock('../../../stores/authStore', () => ({
  useAuthStore: () => ({
    setAuth: mockSetAuth,
    isLoading: false
  })
}));

describe('LoginForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnRegisterClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form with all required fields', () => {
    render(
      <LoginForm 
        onSuccess={mockOnSuccess} 
        onRegisterClick={mockOnRegisterClick} 
      />
    );

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
  });

  it('displays validation errors for empty fields', async () => {
    const user = userEvent.setup();
    
    render(
      <LoginForm 
        onSuccess={mockOnSuccess} 
        onRegisterClick={mockOnRegisterClick} 
      />
    );

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('displays validation error for invalid email format', async () => {
    const user = userEvent.setup();
    
    render(
      <LoginForm 
        onSuccess={mockOnSuccess} 
        onRegisterClick={mockOnRegisterClick} 
      />
    );

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid credentials', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      success: true,
      data: {
        user: { id: '1', email: 'test@example.com', firstName: 'Test' },
        token: 'mock-token'
      }
    };

    mockLogin.mockResolvedValue(mockResponse);

    render(
      <LoginForm 
        onSuccess={mockOnSuccess} 
        onRegisterClick={mockOnRegisterClick} 
      />
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'validpassword123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'validpassword123'
      });
      expect(mockSetAuth).toHaveBeenCalledWith(
        mockResponse.data.user,
        mockResponse.data.token
      );
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('displays error message on login failure', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Invalid credentials';
    
    mockLogin.mockRejectedValue(new Error(errorMessage));

    render(
      <LoginForm 
        onSuccess={mockOnSuccess} 
        onRegisterClick={mockOnRegisterClick} 
      />
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('calls onRegisterClick when register link is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <LoginForm 
        onSuccess={mockOnSuccess} 
        onRegisterClick={mockOnRegisterClick} 
      />
    );

    const registerLink = screen.getByText(/sign up/i);
    await user.click(registerLink);

    expect(mockOnRegisterClick).toHaveBeenCalled();
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    let resolveLogin: (value: any) => void;
    const loginPromise = new Promise(resolve => {
      resolveLogin = resolve;
    });
    mockLogin.mockReturnValue(loginPromise);

    render(
      <LoginForm 
        onSuccess={mockOnSuccess} 
        onRegisterClick={mockOnRegisterClick} 
      />
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'validpassword123');
    await user.click(submitButton);

    // Should show loading state
    expect(screen.getByText(/signing in/i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    // Resolve the promise
    resolveLogin!({
      success: true,
      data: {
        user: { id: '1', email: 'test@example.com', firstName: 'Test' },
        token: 'mock-token'
      }
    });

    await waitFor(() => {
      expect(screen.queryByText(/signing in/i)).not.toBeInTheDocument();
    });
  });
});
