import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateSchema } from '../middleware/validation.middleware';
import rateLimit from 'express-rate-limit';
import fundingService from '../services/funding.service';
import { 
  fundingRequestSchema, 
  fundingHistoryQuerySchema,
  FundingRequest 
} from '../schemas/funding.schema';

const router = Router();

// Funding-specific rate limiters
const fundingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 funding requests per minute
  message: {
    error: 'Rate limit exceeded',
    message: 'Too many funding requests. Please try again later.'
  }
});

const fundingHistoryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    error: 'Rate limit exceeded',
    message: 'Too many requests. Please try again later.'
  }
});

const generalFundingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    error: 'Rate limit exceeded',
    message: 'Too many requests. Please try again later.'
  }
});

// Apply authentication to all funding routes
router.use(authenticateToken);

/**
 * @route POST /api/v1/funding/deposit
 * @description Process funding request
 * @access Private
 */
router.post('/deposit', 
  fundingLimiter,
  validateSchema(fundingRequestSchema),
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

      const fundingData = {
        amount: req.body.amount,
        method: req.body.method,
        reference: req.body.reference || undefined
      };
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      const result = await fundingService.processFunding(
        userId,
        fundingData,
        ipAddress,
        userAgent
      );

      if (!result.success) {
        return res.status(400).json({
          error: 'Funding Failed',
          message: result.error || 'Unknown error occurred',
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }

      // Get updated balance for response
      const newBalance = await fundingService.getAccountBalance(userId);

      return res.status(200).json({
        success: true,
        message: `Successfully deposited $${fundingData.amount}`,
        transaction: {
          id: result.transaction.id,
          amount: parseFloat(result.transaction.amount.toString()),
          status: result.transaction.status,
          referenceId: result.transaction.referenceId,
          createdAt: result.transaction.createdAt.toISOString()
        },
        newBalance
      });

    } catch (error) {
      console.error('Funding deposit error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred processing the funding request',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }
  }
);

/**
 * @route GET /api/v1/funding/history
 * @description Get user's funding history
 * @access Private
 */
router.get('/history',
  fundingHistoryLimiter,
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

      const history = await fundingService.getFundingHistory(userId);

      // Format transactions for response
      const formattedTransactions = history.transactions.map((transaction: any) => ({
        id: transaction.id,
        amount: parseFloat(transaction.amount.toString()),
        method: JSON.parse(transaction.metadata || '{}').method || 'unknown',
        status: transaction.status,
        referenceId: transaction.referenceId,
        description: transaction.description,
        createdAt: transaction.createdAt.toISOString(),
        updatedAt: transaction.updatedAt.toISOString()
      }));

      return res.status(200).json({
        transactions: formattedTransactions,
        totalFunded: history.totalFunded,
        availableBalance: history.availableBalance,
        pagination: {
          total: history.transactions.length,
          limit: 50,
          offset: 0,
          hasMore: false
        }
      });

    } catch (error) {
      console.error('Funding history error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred retrieving funding history',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }
  }
);

/**
 * @route GET /api/v1/funding/methods
 * @description Get available funding methods
 * @access Private
 */
router.get('/methods',
  generalFundingLimiter,
  async (req: Request, res: Response) => {
    try {
      const methods = fundingService.getFundingMethods();
      
      // Enhance methods with additional information
      const enhancedMethods = methods.map(method => ({
        ...method,
        processingTime: method.id === 'demo_balance' ? 'Instant' : 'Instant (Demo)',
        fees: {
          fixed: 0,
          percentage: 0
        }
      }));

      return res.status(200).json(enhancedMethods);

    } catch (error) {
      console.error('Funding methods error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred retrieving funding methods',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }
  }
);

/**
 * @route GET /api/v1/funding/balance
 * @description Get current account balance
 * @access Private
 */
router.get('/balance',
  generalFundingLimiter,
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

      const balance = await fundingService.getAccountBalance(userId);

      return res.status(200).json({
        balance,
        currency: 'USD',
        lastUpdated: new Date().toISOString()
      });

    } catch (error) {
      console.error('Account balance error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred retrieving account balance',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }
  }
);

/**
 * @route POST /api/v1/funding/validate
 * @description Validate funding request without processing
 * @access Private
 */
router.post('/validate',
  generalFundingLimiter,
  async (req: Request, res: Response) => {
    try {
      const validation = fundingService.validateFundingRequest(req.body);

      if (!validation.valid) {
        return res.status(400).json({
          valid: false,
          errors: validation.errors,
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }

      return res.status(200).json({
        valid: true,
        message: 'Funding request is valid',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Funding validation error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred validating the funding request',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }
  }
);

export default router;
