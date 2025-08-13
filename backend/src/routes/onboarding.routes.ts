import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { validateSchema } from '../middleware/validation.middleware.js';
import { onboardingService } from '../services/onboarding.service.js';
import {
  updateProgressSchema,
  completeOnboardingSchema,
  skipOnboardingSchema
} from '../schemas/onboarding.schema.js';

const router = express.Router();

// Rate limiting for onboarding endpoints
const onboardingRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window
  message: {
    error: 'Too many onboarding requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * GET /api/v1/onboarding/progress
 * Get user's onboarding progress
 */
router.get('/progress', authenticateToken, onboardingRateLimit, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const progress = await onboardingService.getProgress(userId);
    
    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('Error getting onboarding progress:', error);
    res.status(500).json({
      error: 'Failed to retrieve onboarding progress'
    });
  }
});

/**
 * PUT /api/v1/onboarding/progress
 * Update user's onboarding progress
 */
router.put('/progress', 
  authenticateToken, 
  onboardingRateLimit,
  validateSchema(updateProgressSchema),
  async (req, res) => {
    try {
      const userId = req.user!.userId;
      const ipAddress = req.ip;
      
      const progress = await onboardingService.updateProgress(
        userId, 
        req.body,
        ipAddress
      );
      
      res.json({
        success: true,
        data: progress,
        message: 'Onboarding progress updated successfully'
      });
    } catch (error) {
      console.error('Error updating onboarding progress:', error);
      
      if (error instanceof Error) {
        if (error.message === 'User not found') {
          return res.status(404).json({ error: 'User not found' });
        }
        if (error.message === 'Onboarding already completed') {
          return res.status(400).json({ error: 'Onboarding already completed' });
        }
        if (error.message === 'Cannot skip onboarding steps') {
          return res.status(400).json({ error: 'Cannot skip onboarding steps' });
        }
      }
      
      return res.status(500).json({
        error: 'Failed to update onboarding progress'
      });
    }
  }
);

/**
 * POST /api/v1/onboarding/complete
 * Mark onboarding as completed
 */
router.post('/complete',
  authenticateToken,
  onboardingRateLimit,
  validateSchema(completeOnboardingSchema),
  async (req, res) => {
    try {
      const userId = req.user!.userId;
      const ipAddress = req.ip;
      
      const progress = await onboardingService.completeOnboarding(
        userId,
        req.body,
        ipAddress
      );
      
      res.json({
        success: true,
        data: progress,
        message: 'Onboarding completed successfully! Welcome to SmartTrade AI.'
      });
    } catch (error) {
      console.error('Error completing onboarding:', error);
      
      if (error instanceof Error) {
        if (error.message === 'User not found') {
          return res.status(404).json({ error: 'User not found' });
        }
        if (error.message === 'Onboarding already completed') {
          return res.status(400).json({ error: 'Onboarding already completed' });
        }
        if (error.message === 'Must complete all onboarding steps before finishing') {
          return res.status(400).json({ 
            error: 'Must complete all onboarding steps before finishing',
            details: 'Please complete all 3 onboarding steps first'
          });
        }
      }
      
      res.status(500).json({
        error: 'Failed to complete onboarding'
      });
    }
  }
);

/**
 * POST /api/v1/onboarding/skip
 * Skip onboarding (for experienced users)
 */
router.post('/skip',
  authenticateToken,
  onboardingRateLimit,
  validateSchema(skipOnboardingSchema),
  async (req, res) => {
    try {
      const userId = req.user!.userId;
      const ipAddress = req.ip;
      
      const progress = await onboardingService.skipOnboarding(
        userId,
        req.body,
        ipAddress
      );
      
      res.json({
        success: true,
        data: progress,
        message: 'Onboarding skipped successfully. You can access all features immediately.'
      });
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      
      if (error instanceof Error) {
        if (error.message === 'User not found') {
          return res.status(404).json({ error: 'User not found' });
        }
        if (error.message === 'Onboarding already completed') {
          return res.status(400).json({ error: 'Onboarding already completed' });
        }
      }
      
      res.status(500).json({
        error: 'Failed to skip onboarding'
      });
    }
  }
);

/**
 * GET /api/v1/onboarding/check
 * Check if user needs onboarding (utility endpoint)
 */
router.get('/check', authenticateToken, onboardingRateLimit, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const needsOnboarding = await onboardingService.needsOnboarding(userId);
    
    res.json({
      success: true,
      data: {
        needsOnboarding,
        userId
      }
    });
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    res.status(500).json({
      error: 'Failed to check onboarding status'
    });
  }
});

/**
 * GET /api/v1/onboarding/steps
 * Get information about all onboarding steps
 */
router.get('/steps', authenticateToken, onboardingRateLimit, async (req, res) => {
  try {
    const steps = onboardingService.getAllSteps();
    
    res.json({
      success: true,
      data: {
        steps,
        totalSteps: steps.length,
        estimatedTotalMinutes: steps.reduce((total, step) => total + step.estimatedMinutes, 0)
      }
    });
  } catch (error) {
    console.error('Error getting onboarding steps:', error);
    res.status(500).json({
      error: 'Failed to retrieve onboarding steps'
    });
  }
});

export default router;
