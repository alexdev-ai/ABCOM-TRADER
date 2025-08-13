import { Router } from 'express';
import { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { generalLimiter } from '../middleware/rateLimiter.middleware';
import tradeHistoryService from '../services/tradeHistory.service';
import rateLimit from 'express-rate-limit';

// Rate limiter for trade history operations
const tradeHistoryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many trade history requests. Please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/v1/trade-history
 * Get comprehensive trade history with advanced filtering
 */
router.get('/', 
  tradeHistoryLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const {
        page = '1',
        limit = '50',
        symbol,
        tradeType, // 'buy' | 'sell'
        profitLoss, // 'profit' | 'loss' | 'breakeven'
        dateFrom,
        dateTo,
        sessionId,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search
      } = req.query;

      const filters = {
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100), // Max 100 per page
        symbol: symbol as string,
        tradeType: tradeType as 'buy' | 'sell',
        profitLoss: profitLoss as 'profit' | 'loss' | 'breakeven',
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        sessionId: sessionId as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        search: search as string
      };

      const result = await tradeHistoryService.getTradeHistory(userId, filters);
      
      res.json({
        success: true,
        data: result.trades,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / filters.limit),
          hasNext: result.hasNext,
          hasPrev: result.hasPrev
        },
        summary: result.summary
      });
    } catch (error) {
      console.error('Trade history error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get trade history'
      });
    }
  }
);

/**
 * GET /api/v1/trade-history/analytics
 * Get trading analytics and pattern recognition
 */
router.get('/analytics',
  tradeHistoryLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const {
        period = '1M',
        includePatterns = 'true'
      } = req.query;

      const analytics = await tradeHistoryService.getTradingAnalytics(
        userId, 
        period as string,
        includePatterns === 'true'
      );
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Trading analytics error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get trading analytics'
      });
    }
  }
);

/**
 * GET /api/v1/trade-history/export
 * Export trade history in various formats
 */
router.get('/export',
  tradeHistoryLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const {
        format = 'csv',
        dateFrom,
        dateTo,
        symbol,
        includeAnalytics = 'false',
        taxOptimized = 'false'
      } = req.query;

      const filters = {
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        symbol: symbol as string,
        includeAnalytics: includeAnalytics === 'true',
        taxOptimized: taxOptimized === 'true'
      };

      const exportData = await tradeHistoryService.exportTradeHistory(
        userId, 
        format as 'csv' | 'xlsx',
        filters
      );
      
      // Set appropriate headers for file download
      const filename = `trade_history_${new Date().toISOString().split('T')[0]}.${format}`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 
        format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      
      res.send(exportData);
    } catch (error) {
      console.error('Trade export error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export trade history'
      });
    }
  }
);

/**
 * GET /api/v1/trade-history/:id
 * Get detailed information for a specific trade
 */
router.get('/:id',
  tradeHistoryLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const trade = await tradeHistoryService.getTradeDetails(userId, id);
      
      if (!trade) {
        return res.status(404).json({
          success: false,
          error: 'Trade not found'
        });
      }

      res.json({
        success: true,
        data: trade
      });
    } catch (error) {
      console.error('Trade details error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get trade details'
      });
    }
  }
);

/**
 * GET /api/v1/trade-history/patterns/analysis
 * Get advanced trading pattern analysis
 */
router.get('/patterns/analysis',
  tradeHistoryLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { period = '3M' } = req.query;

      const patterns = await tradeHistoryService.analyzeTradingPatterns(userId, period as string);
      
      res.json({
        success: true,
        data: patterns
      });
    } catch (error) {
      console.error('Pattern analysis error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze trading patterns'
      });
    }
  }
);

export default router;
