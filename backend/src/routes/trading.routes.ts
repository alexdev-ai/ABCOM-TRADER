import { Router } from 'express';
import { Request, Response } from 'express';
import tradingService from '../services/trading.service';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateSchema } from '../middleware/validation.middleware';
import { generalLimiter } from '../middleware/rateLimiter.middleware';
import rateLimit from 'express-rate-limit';
import { 
  tradeOrderSchema, 
  stockSearchSchema, 
  tradingHistorySchema, 
  quoteRequestSchema 
} from '../schemas/trading.schema';

// Custom rate limiter for trading operations
const tradingLimiter = (max: number, windowMs: number) => rateLimit({
  windowMs,
  max,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many trading requests. Please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

// All trading routes require authentication
router.use(authenticateToken);

/**
 * GET /api/v1/trading/quotes/:symbol
 * Get real-time price quote for a stock symbol
 */
router.get('/quotes/:symbol', 
  tradingLimiter(60, 15 * 60 * 1000), // 60 requests per 15 minutes
  async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      
      // Validate symbol
      const validatedInput = quoteRequestSchema.parse({ symbol });
      
      const quote = await tradingService.getQuote(validatedInput.symbol);
      
      res.json({
        success: true,
        data: quote
      });
    } catch (error) {
      console.error('Quote request error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get quote'
      });
    }
  }
);

/**
 * GET /api/v1/trading/search
 * Search available stocks for trading
 */
router.get('/search',
  tradingLimiter(30, 60 * 1000), // 30 requests per minute
  async (req: Request, res: Response) => {
    try {
      const validatedInput = stockSearchSchema.parse(req.query);
      
      const stocks = await tradingService.searchStocks(validatedInput.query);
      
      res.json({
        success: true,
        data: stocks
      });
    } catch (error) {
      console.error('Stock search error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search stocks'
      });
    }
  }
);

/**
 * POST /api/v1/trading/preview
 * Preview a trade before execution
 */
router.post('/preview',
  tradingLimiter(30, 60 * 1000), // 30 requests per minute
  validateSchema(tradeOrderSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const tradeOrder = {
        userId,
        ...req.body
      };
      
      const preview = await tradingService.previewTrade(userId, tradeOrder);
      
      res.json({
        success: true,
        data: preview
      });
    } catch (error) {
      console.error('Trade preview error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to preview trade'
      });
    }
  }
);

/**
 * POST /api/v1/trading/execute
 * Execute a trade order
 */
router.post('/execute',
  tradingLimiter(10, 60 * 1000), // 10 requests per minute
  validateSchema(tradeOrderSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const tradeOrder = {
        userId,
        ...req.body
      };
      
      const executedTrade = await tradingService.executeTrade(userId, tradeOrder);
      
      res.json({
        success: true,
        data: executedTrade,
        message: `${tradeOrder.type.toUpperCase()} order executed successfully`
      });
    } catch (error) {
      console.error('Trade execution error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute trade'
      });
    }
  }
);

/**
 * GET /api/v1/trading/history
 * Get user's trading history
 */
router.get('/history',
  tradingLimiter(20, 60 * 1000), // 20 requests per minute
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const validatedInput = tradingHistorySchema.parse(req.query);
      
      const history = await tradingService.getTradingHistory(
        userId, 
        validatedInput.limit, 
        validatedInput.offset
      );
      
      res.json({
        success: true,
        data: history,
        pagination: {
          limit: validatedInput.limit,
          offset: validatedInput.offset,
          hasMore: history.length === validatedInput.limit
        }
      });
    } catch (error) {
      console.error('Trading history error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get trading history'
      });
    }
  }
);

/**
 * GET /api/v1/trading/available-stocks
 * Get list of all available stocks for trading
 */
router.get('/available-stocks',
  tradingLimiter(10, 60 * 1000), // 10 requests per minute
  async (req: Request, res: Response) => {
    try {
      const stocks = await tradingService.searchStocks('');
      
      res.json({
        success: true,
        data: stocks
      });
    } catch (error) {
      console.error('Available stocks error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get available stocks'
      });
    }
  }
);

export default router;
