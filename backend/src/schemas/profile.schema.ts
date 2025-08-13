import { z } from 'zod';

export const updateProfileSchema = z.object({
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),
  
  lastName: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),
  
  phoneNumber: z.string()
    .regex(/^\+?[\d\s-()]+$/, 'Invalid phone number format')
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number must not exceed 20 characters'),
  
  riskTolerance: z.enum(['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'], {
    errorMap: () => ({ message: 'Risk tolerance must be CONSERVATIVE, MODERATE, or AGGRESSIVE' })
  })
});

export const profileResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  dateOfBirth: z.date(),
  phoneNumber: z.string(),
  riskTolerance: z.string(),
  kycStatus: z.string(),
  accountBalance: z.number(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const profileStatsSchema = z.object({
  accountBalance: z.number(),
  totalTrades: z.number(),
  totalPnl: z.number(),
  successfulTrades: z.number(),
  winRate: z.number(),
  totalSessions: z.number(),
  activeSessions: z.number(),
  lastLoginAt: z.date().optional()
});

export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>;
export type ProfileResponse = z.infer<typeof profileResponseSchema>;
export type ProfileStatsResponse = z.infer<typeof profileStatsSchema>;
