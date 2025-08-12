import { z } from 'zod';

// Registration form validation schema
export const registrationSchema = z.object({
  email: z
    .string()
    .email('Valid email required')
    .min(1, 'Email is required')
    .max(255, 'Email too long'),
  
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name contains invalid characters'),
  
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name contains invalid characters'),
  
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine((date) => {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        return age - 1 >= 18;
      }
      return age >= 18;
    }, 'Must be 18 years or older'),
  
  phoneNumber: z
    .string()
    .regex(
      /^\+?1?[2-9]\d{2}[2-9]\d{2}\d{4}$/,
      'Valid US phone number required (e.g., +1234567890 or 2345678901)'
    ),
  
  riskTolerance: z.enum(['conservative', 'moderate', 'aggressive'], {
    errorMap: () => ({ message: 'Risk tolerance must be conservative, moderate, or aggressive' })
  })
});

// Login validation schema
export const loginSchema = z.object({
  email: z
    .string()
    .email('Valid email required')
    .min(1, 'Email is required'),
  
  password: z
    .string()
    .min(1, 'Password is required'),
  
  rememberMe: z.boolean().optional().default(false)
});

// Password reset request schema
export const passwordResetRequestSchema = z.object({
  email: z
    .string()
    .email('Valid email required')
    .min(1, 'Email is required')
});

// Password reset schema
export const passwordResetSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    )
});

// Type exports
export type RegistrationData = z.infer<typeof registrationSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type PasswordResetRequestData = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetData = z.infer<typeof passwordResetSchema>;
