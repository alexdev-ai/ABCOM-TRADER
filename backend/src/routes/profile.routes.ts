import { Router } from 'express';
import { profileService } from '../services/profile.service.js';
import { updateProfileSchema } from '../schemas/profile.schema.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { validateSchema } from '../middleware/validation.middleware.js';
import { rateLimit } from 'express-rate-limit';

const router = Router();

// Rate limiting for profile operations
const profileRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: 'Too many profile requests from this IP, please try again later.'
});

/**
 * GET /api/v1/profile
 * Get current user profile
 */
router.get('/', authenticateToken, profileRateLimit, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const profile = await profileService.getProfile(userId);
    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Get profile error:', error);
    if (error instanceof Error && error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/v1/profile
 * Update user profile
 */
router.put('/', 
  authenticateToken, 
  profileRateLimit,
  validateSchema(updateProfileSchema),
  async (req, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const ipAddress = req.ip || req.connection.remoteAddress;
      const updatedProfile = await profileService.updateProfile(
        userId, 
        req.body,
        ipAddress
      );

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedProfile
      });
    } catch (error) {
      console.error('Update profile error:', error);
      if (error instanceof Error && error.message === 'User not found') {
        return res.status(404).json({ error: 'User not found' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/v1/profile/stats
 * Get user profile statistics
 */
router.get('/stats', authenticateToken, profileRateLimit, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stats = await profileService.getProfileStats(userId);
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get profile stats error:', error);
    if (error instanceof Error && error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as profileRoutes };
