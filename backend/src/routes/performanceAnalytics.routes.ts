import { Router } from 'express';
import { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { performanceAnalyticsService, PerformancePeriodType } from '../services/performanceAnalytics.service';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route GET /api/v1/performance/analytics
 * @desc Get comprehensive performance analytics for multiple periods
 * @access Private
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { periods = '1D,1W,1M,3M,6M,1Y,YTD,ALL', benchmark = 'SPY' } = req.query;

    // Parse periods string into array
    const periodsArray = (periods as string).split(',').map((p: string) => p.trim()) as PerformancePeriodType[];

    const analytics = await performanceAnalyticsService.getPerformanceAnalytics(
      userId,
      periodsArray,
      benchmark as string
    );

    res.json({
      success: true,
      message: 'Performance analytics retrieved successfully',
      data: analytics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Performance analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve performance analytics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/v1/performance/period/:period
 * @desc Get performance metrics for a specific period
 * @access Private
 */
router.get('/period/:period', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { period } = req.params;
    const { benchmark = 'SPY' } = req.query;

    // Calculate date ranges
    const endDate = new Date();
    let startDate: Date;

    switch (period as PerformancePeriodType) {
      case '1D':
        startDate = new Date(endDate.getTime() - (1 * 24 * 60 * 60 * 1000));
        break;
      case '1W':
        startDate = new Date(endDate.getTime() - (7 * 24 * 60 * 60 * 1000));
        break;
      case '1M':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, endDate.getDate());
        break;
      case '3M':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 3, endDate.getDate());
        break;
      case '6M':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 6, endDate.getDate());
        break;
      case '1Y':
        startDate = new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate());
        break;
      case 'YTD':
        startDate = new Date(endDate.getFullYear(), 0, 1);
        break;
      case 'ALL':
        startDate = new Date('2020-01-01');
        break;
      default:
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, endDate.getDate());
    }

    const benchmarkSymbol = typeof benchmark === 'string' ? benchmark : 'SPY';
    const periodParam = period || '1M';
    
    const performance = await performanceAnalyticsService.calculatePeriodPerformance(
      userId,
      periodParam,
      startDate,
      endDate,
      benchmarkSymbol
    );

    res.json({
      success: true,
      message: `Performance metrics for ${period} retrieved successfully`,
      data: performance,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Period performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve period performance',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/v1/performance/timeseries
 * @desc Get performance time series data for charts
 * @access Private
 */
router.get('/timeseries', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { benchmark = 'SPY', days = '365' } = req.query;

    const daysNum = parseInt(days as string) || 365;
    const clampedDays = Math.min(Math.max(daysNum, 1), 1095); // 1 to 1095 days

    const timeSeries = await performanceAnalyticsService.getPerformanceTimeSeries(
      userId,
      benchmark as string,
      clampedDays
    );

    res.json({
      success: true,
      message: 'Performance time series retrieved successfully',
      data: {
        timeSeries,
        period: `${clampedDays}D`,
        benchmark,
        totalDataPoints: timeSeries.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Time series error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve performance time series',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/v1/performance/correlation
 * @desc Get correlation matrix for portfolio positions
 * @access Private
 */
router.get('/correlation', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const correlationMatrix = await performanceAnalyticsService.calculateCorrelationMatrix(userId);

    res.json({
      success: true,
      message: 'Correlation matrix retrieved successfully',
      data: {
        correlationMatrix,
        symbolCount: Object.keys(correlationMatrix).length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Correlation matrix error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve correlation matrix',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/v1/performance/monthly-returns
 * @desc Get monthly returns breakdown
 * @access Private
 */
router.get('/monthly-returns', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { benchmark = 'SPY' } = req.query;

    const monthlyReturns = await performanceAnalyticsService.getMonthlyReturns(
      userId,
      benchmark as string
    );

    res.json({
      success: true,
      message: 'Monthly returns retrieved successfully',
      data: {
        monthlyReturns,
        benchmark,
        totalMonths: monthlyReturns.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Monthly returns error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve monthly returns',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/v1/performance/risk-metrics
 * @desc Get advanced risk metrics
 * @access Private
 */
router.get('/risk-metrics', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const riskMetrics = await performanceAnalyticsService.calculateRiskMetrics(userId);

    res.json({
      success: true,
      message: 'Risk metrics retrieved successfully',
      data: {
        riskMetrics,
        calculationDate: new Date().toISOString(),
        riskLevel: riskMetrics.var95 > 5 ? 'HIGH' : riskMetrics.var95 > 3 ? 'MEDIUM' : 'LOW'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Risk metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve risk metrics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/v1/performance/export/csv
 * @desc Export performance data to CSV
 * @access Private
 */
router.get('/export/csv', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { period = 'ALL' } = req.query;

    const csvContent = await performanceAnalyticsService.exportPerformanceCSV(
      userId,
      period as PerformancePeriodType
    );

    // Set CSV headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="portfolio-performance-${period}.csv"`);

    res.send(csvContent);

  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export performance data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/v1/performance/summary
 * @desc Get performance summary dashboard data
 * @access Private
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Get key performance metrics for dashboard
    const analytics = await performanceAnalyticsService.getPerformanceAnalytics(
      userId,
      ['1D', '1W', '1M', '1Y'],
      'SPY'
    );

    // Extract key metrics for summary
    const summary = {
      todayReturn: analytics.periods.find(p => p.period === '1D')?.metrics.totalReturnPercent || 0,
      weekReturn: analytics.periods.find(p => p.period === '1W')?.metrics.totalReturnPercent || 0,
      monthReturn: analytics.periods.find(p => p.period === '1M')?.metrics.totalReturnPercent || 0,
      yearReturn: analytics.periods.find(p => p.period === '1Y')?.metrics.totalReturnPercent || 0,
      sharpeRatio: analytics.periods.find(p => p.period === '1Y')?.metrics.sharpeRatio || 0,
      maxDrawdown: analytics.periods.find(p => p.period === '1Y')?.metrics.maxDrawdown || 0,
      volatility: analytics.periods.find(p => p.period === '1Y')?.metrics.volatility || 0,
      winRate: analytics.periods.find(p => p.period === '1Y')?.metrics.winRate || 0,
      riskMetrics: analytics.riskMetrics,
      lastUpdated: analytics.generatedAt
    };

    res.json({
      success: true,
      message: 'Performance summary retrieved successfully',
      data: summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Performance summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve performance summary',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/v1/performance/refresh
 * @desc Refresh performance calculations (manual trigger)
 * @access Private
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Trigger fresh calculation by getting new analytics
    const analytics = await performanceAnalyticsService.getPerformanceAnalytics(
      userId,
      ['1D', '1W', '1M', '3M', '6M', '1Y', 'YTD', 'ALL'],
      'SPY'
    );

    res.json({
      success: true,
      message: 'Performance data refreshed successfully',
      data: {
        refreshedAt: new Date().toISOString(),
        periodsCalculated: analytics.periods.length,
        timeSeriesPoints: analytics.timeSeries.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Performance refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh performance data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
