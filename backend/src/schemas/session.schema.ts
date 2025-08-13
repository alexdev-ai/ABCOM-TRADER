import { z } from 'zod';

// Session duration options (in minutes)
export const SessionDurationSchema = z.enum(['60', '240', '1440', '10080']).transform(Number);

// Session configuration for creation
export const SessionConfigSchema = z.object({
  durationMinutes: SessionDurationSchema,
  lossLimitAmount: z.number()
    .min(9, 'Loss limit must be at least $9')
    .max(100000, 'Loss limit cannot exceed $100,000')
    .optional(),
  lossLimitPercentage: z.number()
    .min(1, 'Loss limit percentage must be at least 1%')
    .max(30, 'Loss limit percentage cannot exceed 30%')
    .optional()
}).refine(
  (data) => data.lossLimitAmount || data.lossLimitPercentage,
  {
    message: 'Either loss limit amount or percentage must be provided',
    path: ['lossLimitAmount']
  }
);

// Session creation request
export const CreateSessionSchema = z.object({
  body: SessionConfigSchema
});

// Session ID parameter
export const SessionIdSchema = z.object({
  params: z.object({
    sessionId: z.string().min(1, 'Session ID is required')
  })
});

// Session history query parameters
export const SessionHistoryQuerySchema = z.object({
  query: z.object({
    limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional().default('50'),
    offset: z.string().transform(Number).pipe(z.number().min(0)).optional().default('0'),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    status: z.enum(['pending', 'active', 'completed', 'stopped', 'expired']).optional(),
    performanceFilter: z.enum(['profit', 'loss', 'all']).optional().default('all')
  })
});

// Session status update
export const UpdateSessionStatusSchema = z.object({
  body: z.object({
    reason: z.string().optional()
  })
});

// Response schemas
export const SessionResponseSchema = z.object({
  sessionId: z.string(),
  userId: z.string(),
  durationMinutes: z.number(),
  lossLimitAmount: z.number(),
  lossLimitPercentage: z.number(),
  status: z.enum(['pending', 'active', 'completed', 'stopped', 'expired']),
  startTime: z.date().nullable(),
  endTime: z.date().nullable(),
  actualDurationMinutes: z.number().nullable(),
  totalTrades: z.number(),
  realizedPnl: z.number(),
  sessionPerformancePercentage: z.number(),
  terminationReason: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const ActiveSessionResponseSchema = z.object({
  sessionId: z.string(),
  status: z.literal('active'),
  durationMinutes: z.number(),
  elapsedMinutes: z.number(),
  remainingMinutes: z.number(),
  lossLimitAmount: z.number(),
  currentPnL: z.number(),
  totalTrades: z.number(),
  progressPercentages: z.object({
    timeElapsed: z.number(),
    lossLimitUsed: z.number()
  })
});

export const SessionHistoryResponseSchema = z.object({
  sessions: z.array(SessionResponseSchema),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    hasMore: z.boolean()
  })
});

export const SessionValidationResponseSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string())
});

// Type exports
export type SessionConfig = z.infer<typeof SessionConfigSchema>;
export type CreateSessionRequest = z.infer<typeof CreateSessionSchema>;
export type SessionHistoryQuery = z.infer<typeof SessionHistoryQuerySchema>;
export type SessionResponse = z.infer<typeof SessionResponseSchema>;
export type ActiveSessionResponse = z.infer<typeof ActiveSessionResponseSchema>;
export type SessionHistoryResponse = z.infer<typeof SessionHistoryResponseSchema>;
export type SessionValidationResponse = z.infer<typeof SessionValidationResponseSchema>;
