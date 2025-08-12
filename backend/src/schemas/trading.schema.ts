import { z } from 'zod';

// Trade preview schema
export const tradeOrderSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required').max(10, 'Symbol too long'),
  type: z.enum(['buy', 'sell'], { required_error: 'Type must be buy or sell' }),
  quantity: z.number().min(1, 'Quantity must be at least 1').max(10000, 'Quantity too large'),
  orderType: z.literal('market').default('market')
});

// Stock search schema
export const stockSearchSchema = z.object({
  query: z.string().optional().default('')
});

// Trading history schema
export const tradingHistorySchema = z.object({
  limit: z.number().min(1).max(100).optional().default(50),
  offset: z.number().min(0).optional().default(0)
});

// Quote request schema
export const quoteRequestSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required').max(10, 'Symbol too long')
});

export type TradeOrderInput = z.infer<typeof tradeOrderSchema>;
export type StockSearchInput = z.infer<typeof stockSearchSchema>;
export type TradingHistoryInput = z.infer<typeof tradingHistorySchema>;
export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;
