import { z } from 'zod';

// Funding request validation schema
export const fundingRequestSchema = z.object({
  amount: z.number()
    .min(90, 'Minimum funding amount is $90')
    .max(10000, 'Maximum funding amount is $10,000')
    .positive('Amount must be positive'),
  method: z.enum(['bank_transfer', 'demo_balance'], {
    errorMap: () => ({ message: 'Method must be either bank_transfer or demo_balance' })
  }),
  reference: z.string().optional()
});

// Funding history query parameters
export const fundingHistoryQuerySchema = z.object({
  limit: z.string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : 50)
    .refine((val) => val >= 1 && val <= 100, {
      message: 'Limit must be between 1 and 100'
    }),
  offset: z.string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : 0)
    .refine((val) => val >= 0, {
      message: 'Offset must be non-negative'
    })
});

// Account balance response schema
export const accountBalanceResponseSchema = z.object({
  balance: z.number(),
  currency: z.string().default('USD'),
  lastUpdated: z.string()
});

// Funding transaction response schema
export const fundingTransactionResponseSchema = z.object({
  id: z.string(),
  amount: z.number(),
  method: z.string(),
  status: z.string(),
  referenceId: z.string().nullable(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

// Funding history response schema
export const fundingHistoryResponseSchema = z.object({
  transactions: z.array(fundingTransactionResponseSchema),
  totalFunded: z.number(),
  availableBalance: z.number(),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    hasMore: z.boolean()
  })
});

// Funding methods response schema
export const fundingMethodsResponseSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    limits: z.object({
      min: z.number(),
      max: z.number()
    }),
    processingTime: z.string().optional(),
    fees: z.object({
      fixed: z.number().optional(),
      percentage: z.number().optional()
    }).optional()
  })
);

// Error response schema
export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.array(z.string()).optional(),
  timestamp: z.string(),
  path: z.string()
});

// Success response schema for funding operations
export const fundingSuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  transaction: z.object({
    id: z.string(),
    amount: z.number(),
    status: z.string(),
    referenceId: z.string(),
    createdAt: z.string()
  }),
  newBalance: z.number()
});

export type FundingRequest = z.infer<typeof fundingRequestSchema>;
export type FundingHistoryQuery = z.infer<typeof fundingHistoryQuerySchema>;
export type AccountBalanceResponse = z.infer<typeof accountBalanceResponseSchema>;
export type FundingTransactionResponse = z.infer<typeof fundingTransactionResponseSchema>;
export type FundingHistoryResponse = z.infer<typeof fundingHistoryResponseSchema>;
export type FundingMethodsResponse = z.infer<typeof fundingMethodsResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type FundingSuccessResponse = z.infer<typeof fundingSuccessResponseSchema>;
