import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { portfolioService } from '../services/portfolio.service';

const router = Router();

// Apply authentication middleware to all portfolio routes
router.use(authenticateToken);

/**
 * GET /api/v1/portfolio/positions
 * Get all portfolio positions for the authenticated user
 */
router.get('/positions', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const positions = await portfolioService.getUserPositions(userId);
    
    res.status(200).json({
      success: true,
      data: positions,
      count: positions.length
    });
  } catch (error) {
    console.error('Error fetching portfolio positions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolio positions'
    });
  }
});

/**
 * GET /api/v1/portfolio/summary
 * Get portfolio summary with total value, P&L, etc.
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const summary = await portfolioService.getPortfolioSummary(userId);
    
    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching portfolio summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolio summary'
    });
  }
});

/**
 * GET /api/v1/portfolio/positions/search?q=symbol
 * Search portfolio positions by symbol
 */
router.get('/positions/search', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const query = req.query.q as string;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const positions = await portfolioService.searchPositions(userId, query);
    
    res.status(200).json({
      success: true,
      data: positions,
      count: positions.length
    });
  } catch (error) {
    console.error('Error searching portfolio positions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search portfolio positions'
    });
  }
});

/**
 * GET /api/v1/portfolio/positions/performance?type=gainers|losers&limit=5
 * Get top performing positions (gainers or losers)
 */
router.get('/positions/performance', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const type = req.query.type as 'gainers' | 'losers';
    const limit = parseInt(req.query.limit as string) || 5;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!type || !['gainers', 'losers'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Valid type parameter required (gainers or losers)'
      });
    }

    const positions = await portfolioService.getPositionsByPerformance(userId, type, limit);
    
    res.status(200).json({
      success: true,
      data: positions,
      count: positions.length,
      type
    });
  } catch (error) {
    console.error('Error fetching positions by performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch positions by performance'
    });
  }
});

/**
 * GET /api/v1/portfolio/allocation
 * Get portfolio allocation breakdown by sector
 */
router.get('/allocation', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const allocation = await portfolioService.getSectorAllocation(userId);
    
    res.status(200).json({
      success: true,
      data: allocation
    });
  } catch (error) {
    console.error('Error fetching portfolio allocation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolio allocation'
    });
  }
});

/**
 * POST /api/v1/portfolio/positions
 * Update a position (called internally by trading system)
 */
router.post('/positions', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { symbol, quantity, price, type } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!symbol || !quantity || !price || !type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: symbol, quantity, price, type'
      });
    }

    if (!['buy', 'sell'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Type must be either "buy" or "sell"'
      });
    }

    const position = await portfolioService.updatePosition(
      userId,
      symbol.toUpperCase(),
      parseFloat(quantity),
      parseFloat(price),
      type
    );
    
    res.status(200).json({
      success: true,
      data: position,
      message: `Position ${type} completed successfully`
    });
  } catch (error) {
    console.error('Error updating position:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update position'
    });
  }
});

export default router;
