import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import rateLimit from 'express-rate-limit';
import portfolioService from '../services/portfolio.service';
import marketDataService from '../services/marketData.service';

const router = Router();

// Portfolio-specific rate limiters
const portfolioLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    error: 'Rate limit exceeded',
    message: 'Too many portfolio requests. Please try again later.'
  }
});

const marketDataLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute for market data
  message: {
    error: 'Rate limit exceeded',
    message: 'Too many market data requests. Please try again later.'
  }
});

// Apply authentication to all portfolio routes
router.use(authenticateToken);

/**
 * @route GET /api/v1/portfolio/summary
 * @description Get complete portfolio summary
 * @access Private
 */
router.get('/summary',
  portfolioLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated',
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }

      const portfolio = await portfolioService.getPortfolioSummary(userId);

      return res.status(200).json({
        success: true,
        data: portfolio,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Portfolio summary error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred retrieving portfolio summary',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }
  }
);

/**
 * @route GET /api/v1/portfolio/metrics
 * @description Get portfolio performance metrics
 * @access Private
 */
router.get('/metrics',
  portfolioLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated',
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }

      const metrics = await portfolioService.getPortfolioMetrics(userId);

      return res.status(200).json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Portfolio metrics error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred retrieving portfolio metrics',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }
  }
);

/**
 * @route GET /api/v1/portfolio/allocation
 * @description Get portfolio allocation data for charts
 * @access Private
 */
router.get('/allocation',
  portfolioLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated',
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }

      const allocation = await portfolioService.getPortfolioAllocation(userId);

      return res.status(200).json({
        success: true,
        data: allocation,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Portfolio allocation error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred retrieving portfolio allocation',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }
  }
);

/**
 * @route GET /api/v1/portfolio/transactions
 * @description Get recent portfolio transactions
 * @access Private
 */
router.get('/transactions',
  portfolioLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated',
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const transactions = await portfolioService.getRecentTransactions(userId, limit);

      return res.status(200).json({
        success: true,
        data: transactions,
        pagination: {
          limit,
          total: transactions.length,
          hasMore: transactions.length === limit
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Portfolio transactions error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred retrieving portfolio transactions',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }
  }
);

/**
 * @route GET /api/v1/portfolio/market-data/:symbol
 * @description Get current market data for a specific symbol
 * @access Private
 */
router.get('/market-data/:symbol',
  marketDataLimiter,
  async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      
      if (!symbol) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Symbol parameter is required',
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }

      const marketData = await marketDataService.getStockPrice(symbol.toUpperCase());

      if (!marketData.success) {
        return res.status(404).json({
          error: 'Not Found',
          message: marketData.error || 'Symbol not found',
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }

      return res.status(200).json({
        success: true,
        data: marketData.data,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Market data error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred retrieving market data',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }
  }
);

/**
 * @route GET /api/v1/portfolio/available-stocks
 * @description Get list of available demo stocks
 * @access Private
 */
router.get('/available-stocks',
  marketDataLimiter,
  async (req: Request, res: Response) => {
    try {
      const stocks = marketDataService.getAvailableStocks();

      return res.status(200).json({
        success: true,
        data: stocks,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Available stocks error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred retrieving available stocks',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }
  }
);

/**
 * @route POST /api/v1/portfolio/initialize-demo
 * @description Initialize demo portfolio for testing
 * @access Private
 */
router.post('/initialize-demo',
  portfolioLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated',
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }

      await portfolioService.initializeDemoPortfolio(userId);

      return res.status(200).json({
        success: true,
        message: 'Demo portfolio initialized successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Initialize demo portfolio error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred initializing demo portfolio',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }
  }
);

export default router;
