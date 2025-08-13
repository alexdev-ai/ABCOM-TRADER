import express from 'express';
import { portfolioService } from '../services/portfolio.service';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateSchema } from '../middleware/validation.middleware';
import { generalLimiter } from '../middleware/rateLimiter.middleware';
import { z } from 'zod';

const router = express.Router();

// Apply authentication to all portfolio routes
router.use(authenticateToken);

// Apply rate limiting to portfolio routes
router.use(generalLimiter);

// Validation schemas
const getPositionSchema = z.object({
  symbol: z.string().min(1).max(10).regex(/^[A-Z]+$/, 'Symbol must be uppercase letters only')
});

const updatePositionSchema = z.object({
  symbol: z.string().min(1).max(10).regex(/^[A-Z]+$/, 'Symbol must be uppercase letters only'),
  quantity: z.number().positive('Quantity must be positive'),
  averageCost: z.number().positive('Average cost must be positive'),
  transactionType: z.enum(['BUY', 'SELL']),
  price: z.number().positive('Price must be positive')
});

const getPositionsByPerformanceSchema = z.object({
  sortBy: z.enum(['pnl', 'pnl_percent', 'market_value']).optional().default('pnl_percent'),
  order: z.enum(['asc', 'desc']).optional().default('desc')
});

/**
 * GET /api/v1/portfolio/summary
 * Get comprehensive portfolio summary
 */
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found' });
    }

    const includePositions = req.query.includePositions !== 'false';
    const summary = await portfolioService.getPortfolioSummary(userId, includePositions);

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Error getting portfolio summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve portfolio summary'
    });
  }
});

/**
 * GET /api/v1/portfolio/positions
 * Get all portfolio positions
 */
router.get('/positions', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found' });
    }

    const summary = await portfolioService.getPortfolioSummary(userId, true);

    res.json({
      success: true,
      data: {
        positions: summary.positions,
        totalValue: summary.totalValue,
        totalPnl: summary.totalPnl,
        totalPnlPercent: summary.totalPnlPercent,
        numberOfPositions: summary.numberOfPositions,
        lastUpdated: summary.lastUpdated
      }
    });

  } catch (error) {
    console.error('Error getting portfolio positions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve portfolio positions'
    });
  }
});

/**
 * GET /api/v1/portfolio/positions/:symbol
 * Get specific position details
 */
router.get('/positions/:symbol', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found' });
    }

    const { symbol } = req.params;
    const position = await portfolioService.getPosition(userId, symbol);

    if (!position) {
      return res.status(404).json({
        success: false,
        error: 'Position not found'
      });
    }

    res.json({
      success: true,
      data: position
    });

  } catch (error) {
    console.error('Error getting position:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve position'
    });
  }
});

/**
 * PUT /api/v1/portfolio/positions
 * Update portfolio position (after trade execution)
 */
router.put('/positions', validateSchema(updatePositionSchema), async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found' });
    }

    const { symbol, quantity, averageCost, transactionType, price } = req.body;

    const updatedPosition = await portfolioService.updatePosition({
      userId,
      symbol,
      quantity,
      averageCost,
      transactionType,
      price
    });

    res.json({
      success: true,
      data: updatedPosition,
      message: `Position ${symbol} updated successfully`
    });

  } catch (error) {
    console.error('Error updating position:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Cannot sell more shares than owned') {
        return res.status(400).json({
          success: false,
          error: 'Insufficient shares to sell'
        });
      }
      
      if (error.message === 'Position closed') {
        return res.json({
          success: true,
          data: null,
          message: 'Position closed successfully'
        });
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update position'
    });
  }
});

/**
 * POST /api/v1/portfolio/refresh
 * Refresh portfolio prices manually
 */
router.post('/refresh', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found' });
    }

    await portfolioService.updatePositionPrices(userId);

    res.json({
      success: true,
      message: 'Portfolio prices refreshed successfully'
    });

  } catch (error) {
    console.error('Error refreshing portfolio prices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh portfolio prices'
    });
  }
});

/**
 * GET /api/v1/portfolio/performance
 * Get positions ranked by performance
 */
router.get('/performance', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found' });
    }

    const { sortBy, order } = req.query;
    const positions = await portfolioService.getPositionsByPerformance(
      userId,
      sortBy as 'pnl' | 'pnl_percent' | 'market_value',
      order as 'asc' | 'desc'
    );

    res.json({
      success: true,
      data: {
        positions,
        sortBy,
        order
      }
    });

  } catch (error) {
    console.error('Error getting positions by performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve positions by performance'
    });
  }
});

/**
 * GET /api/v1/portfolio/analytics
 * Get portfolio analytics and recommendations
 */
router.get('/analytics', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found' });
    }

    const analytics = await portfolioService.getPortfolioAnalytics(userId);

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Error getting portfolio analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve portfolio analytics'
    });
  }
});

/**
 * GET /api/v1/portfolio/price/:symbol
 * Get current market price for a symbol
 */
router.get('/price/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const price = await portfolioService.getCurrentPrice(symbol);

    if (!price) {
      return res.status(404).json({
        success: false,
        error: 'Price data not available for symbol'
      });
    }

    res.json({
      success: true,
      data: price
    });

  } catch (error) {
    console.error('Error getting price:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve price data'
    });
  }
});

/**
 * GET /api/v1/portfolio/gainers
 * Get top gaining positions
 */
router.get('/gainers', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found' });
    }

    const positions = await portfolioService.getPositionsByPerformance(userId, 'pnl_percent', 'desc');
    const gainers = positions.filter(p => p.unrealizedPnl > 0).slice(0, 5);

    res.json({
      success: true,
      data: gainers
    });

  } catch (error) {
    console.error('Error getting top gainers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve top gainers'
    });
  }
});

/**
 * GET /api/v1/portfolio/losers
 * Get top losing positions
 */
router.get('/losers', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found' });
    }

    const positions = await portfolioService.getPositionsByPerformance(userId, 'pnl_percent', 'asc');
    const losers = positions.filter(p => p.unrealizedPnl < 0).slice(0, 5);

    res.json({
      success: true,
      data: losers
    });

  } catch (error) {
    console.error('Error getting top losers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve top losers'
    });
  }
});

/**
 * GET /api/v1/portfolio/sectors
 * Get sector allocation
 */
router.get('/sectors', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found' });
    }

    const summary = await portfolioService.getPortfolioSummary(userId, false);

    res.json({
      success: true,
      data: {
        sectorAllocation: summary.sectorAllocation,
        totalValue: summary.totalValue,
        numberOfPositions: summary.numberOfPositions
      }
    });

  } catch (error) {
    console.error('Error getting sector allocation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sector allocation'
    });
  }
});

export default router;
