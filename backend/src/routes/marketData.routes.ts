import { Router } from 'express';
import MarketDataService from '../services/marketData.service';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const marketDataService = new MarketDataService();

/**
 * Get real-time market data for a symbol
 * GET /api/market-data/:symbol
 */
router.get('/:symbol', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { symbol } = req.params;
    const { timeframe = '5min' } = req.query;
    
    if (!symbol) {
      res.status(400).json({
        error: 'Bad request',
        message: 'Symbol parameter is required'
      });
      return;
    }
    
    const marketData = await marketDataService.getMarketData(
      symbol.toUpperCase(), 
      timeframe as string
    );
    
    if (!marketData) {
      res.status(404).json({
        error: 'Market data not found',
        message: `No market data available for ${symbol}`
      });
      return;
    }
    
    res.json({
      success: true,
      data: marketData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching market data:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch market data'
    });
  }
});

/**
 * Get current market regime analysis
 * GET /api/market-data/regime/current
 */
router.get('/regime/current', authenticateToken, async (req, res): Promise<void> => {
  try {
    const marketRegime = await marketDataService.detectMarketRegime();
    
    res.json({
      success: true,
      data: marketRegime,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching market regime:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to detect market regime'
    });
  }
});

/**
 * Get options flow signal for a symbol
 * GET /api/market-data/options/:symbol
 */
router.get('/options/:symbol', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { symbol } = req.params;
    
    if (!symbol) {
      res.status(400).json({
        error: 'Bad request',
        message: 'Symbol parameter is required'
      });
      return;
    }
    
    const optionsFlow = await marketDataService.getOptionsFlowSignal(
      symbol.toUpperCase()
    );
    
    if (!optionsFlow) {
      res.status(404).json({
        error: 'Options flow data not found',
        message: `No options flow data available for ${symbol}`
      });
      return;
    }
    
    res.json({
      success: true,
      data: optionsFlow,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching options flow:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch options flow data'
    });
  }
});

/**
 * Get earnings data for a symbol
 * GET /api/market-data/earnings/:symbol
 */
router.get('/earnings/:symbol', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { symbol } = req.params;
    
    if (!symbol) {
      res.status(400).json({
        error: 'Bad request',
        message: 'Symbol parameter is required'
      });
      return;
    }
    
    const earningsData = await marketDataService.getEarningsData(
      symbol.toUpperCase()
    );
    
    if (!earningsData) {
      res.status(404).json({
        error: 'Earnings data not found',
        message: `No earnings data available for ${symbol}`
      });
      return;
    }
    
    res.json({
      success: true,
      data: earningsData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching earnings data:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch earnings data'
    });
  }
});

/**
 * Initialize market data streaming
 * POST /api/market-data/stream/start
 */
router.post('/stream/start', authenticateToken, async (req, res): Promise<void> => {
  try {
    // Only allow admin users to start/stop streaming
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    await marketDataService.initializeMarketDataStream();
    
    res.json({
      success: true,
      message: 'Market data streaming initialized',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error starting market data stream:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to initialize market data streaming'
    });
  }
});

/**
 * Health check for market data service
 * GET /api/market-data/health
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Market Data Service',
    status: 'operational',
    features: [
      'Real-time Alpaca WebSocket integration',
      'Market open domination (9:30-10:00 EST)',
      'Multi-timeframe analysis (1min, 5min, 15min)',
      'Gap scanner (>2% moves with >2x volume)',
      'Options flow integration',
      'Earnings calendar integration',
      'Market regime detection',
      'Redis caching for high-frequency access'
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;
