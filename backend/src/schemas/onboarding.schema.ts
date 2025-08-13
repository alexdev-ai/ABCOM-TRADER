import { z } from 'zod';

/**
 * Schema for updating onboarding progress
 */
export const updateProgressSchema = z.object({
  step: z.number()
    .int()
    .min(0)
    .max(3)
    .describe('Current onboarding step (0-3, where 0 is not started and 3 is completed)'),
  
  completed: z.boolean()
    .optional()
    .describe('Whether the current step has been completed'),
    
  metadata: z.record(z.any())
    .optional()
    .describe('Optional metadata about step completion (e.g., user preferences, selections)')
});

/**
 * Schema for completing onboarding
 */
export const completeOnboardingSchema = z.object({
  feedback: z.string()
    .max(500)
    .optional()
    .describe('Optional user feedback about the onboarding experience'),
    
  preferences: z.object({
    receiveEmails: z.boolean().default(true),
    showTips: z.boolean().default(true),
    riskTolerance: z.enum(['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE']).optional()
  }).optional()
});

/**
 * Schema for skipping onboarding
 */
export const skipOnboardingSchema = z.object({
  reason: z.enum([
    'EXPERIENCED_USER',
    'ALREADY_FAMILIAR', 
    'WANT_TO_EXPLORE',
    'TIME_CONSTRAINTS',
    'OTHER'
  ]).describe('Reason for skipping onboarding'),
  
  feedback: z.string()
    .max(200)
    .optional()
    .describe('Optional feedback about why onboarding was skipped')
});

/**
 * Response schema for onboarding progress
 */
export const onboardingProgressResponse = z.object({
  userId: z.string(),
  currentStep: z.number().int().min(0).max(3),
  completed: z.boolean(),
  completedAt: z.string().nullable(),
  steps: z.array(z.object({
    step: z.number(),
    title: z.string(),
    completed: z.boolean(),
    completedAt: z.string().nullable()
  })),
  canSkip: z.boolean(),
  totalSteps: z.number().default(3)
});

export type UpdateProgressRequest = z.infer<typeof updateProgressSchema>;
export type CompleteOnboardingRequest = z.infer<typeof completeOnboardingSchema>;
export type SkipOnboardingRequest = z.infer<typeof skipOnboardingSchema>;
export type OnboardingProgressResponse = z.infer<typeof onboardingProgressResponse>;
