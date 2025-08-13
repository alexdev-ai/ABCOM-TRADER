import { PrismaClient } from '@prisma/client';
import { AuditService } from './audit.service.js';
import {
  UpdateProgressRequest,
  CompleteOnboardingRequest,
  SkipOnboardingRequest,
  OnboardingProgressResponse
} from '../schemas/onboarding.schema.js';

const prisma = new PrismaClient();

interface OnboardingStep {
  step: number;
  title: string;
  description: string;
  estimatedMinutes: number;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    step: 1,
    title: 'Platform Overview',
    description: 'Learn about SmartTrade AI and our safety-first approach',
    estimatedMinutes: 3
  },
  {
    step: 2,
    title: 'Risk Management',
    description: 'Understand trading sessions and loss limits',
    estimatedMinutes: 4
  },
  {
    step: 3,
    title: 'Emergency Controls',
    description: 'Learn how to use emergency stop features',
    estimatedMinutes: 2
  }
];

class OnboardingService {
  /**
   * Get user's onboarding progress
   */
  async getProgress(userId: string): Promise<OnboardingProgressResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        onboardingCompleted: true,
        onboardingStep: true,
        onboardingCompletedAt: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Build steps array with completion status
    const steps = ONBOARDING_STEPS.map(stepInfo => ({
      step: stepInfo.step,
      title: stepInfo.title,
      completed: user.onboardingStep >= stepInfo.step,
      completedAt: user.onboardingStep >= stepInfo.step && user.onboardingCompletedAt 
        ? user.onboardingCompletedAt.toISOString() 
        : null
    }));

    return {
      userId: user.id,
      currentStep: user.onboardingStep,
      completed: user.onboardingCompleted,
      completedAt: user.onboardingCompletedAt?.toISOString() || null,
      steps,
      canSkip: !user.onboardingCompleted && user.onboardingStep < 3,
      totalSteps: ONBOARDING_STEPS.length
    };
  }

  /**
   * Update user's onboarding progress
   */
  async updateProgress(
    userId: string, 
    request: UpdateProgressRequest,
    ipAddress?: string
  ): Promise<OnboardingProgressResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        onboardingCompleted: true,
        onboardingStep: true,
        email: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.onboardingCompleted) {
      throw new Error('Onboarding already completed');
    }

    // Validate step progression (can't jump ahead)
    if (request.step > user.onboardingStep + 1) {
      throw new Error('Cannot skip onboarding steps');
    }

    // Update user's progress
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingStep: Math.max(user.onboardingStep, request.step),
        updatedAt: new Date()
      }
    });

    // Log the progress update
    await AuditService.log({
      userId,
      eventType: 'ONBOARDING_PROGRESS',
      eventAction: 'UPDATE_STEP',
      eventData: {
        step: request.step,
        previousStep: user.onboardingStep,
        completed: request.completed,
        metadata: request.metadata
      },
      ipAddress
    });

    return this.getProgress(userId);
  }

  /**
   * Mark onboarding as completed
   */
  async completeOnboarding(
    userId: string,
    request: CompleteOnboardingRequest,
    ipAddress?: string
  ): Promise<OnboardingProgressResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        onboardingCompleted: true,
        onboardingStep: true,
        email: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.onboardingCompleted) {
      throw new Error('Onboarding already completed');
    }

    // Ensure user has completed all steps
    if (user.onboardingStep < ONBOARDING_STEPS.length) {
      throw new Error('Must complete all onboarding steps before finishing');
    }

    const completedAt = new Date();

    // Mark onboarding as completed
    await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingCompleted: true,
        onboardingCompletedAt: completedAt,
        onboardingStep: ONBOARDING_STEPS.length,
        updatedAt: completedAt,
        // Apply any risk tolerance preference from onboarding
        ...(request.preferences?.riskTolerance && {
          riskTolerance: request.preferences.riskTolerance
        })
      }
    });

    // Log completion
    await AuditService.log({
      userId,
      eventType: 'ONBOARDING_COMPLETE',
      eventAction: 'COMPLETE',
      eventData: {
        feedback: request.feedback,
        preferences: request.preferences,
        completedAt: completedAt.toISOString()
      },
      ipAddress
    });

    return this.getProgress(userId);
  }

  /**
   * Skip onboarding (for experienced users)
   */
  async skipOnboarding(
    userId: string,
    request: SkipOnboardingRequest,
    ipAddress?: string
  ): Promise<OnboardingProgressResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        onboardingCompleted: true,
        email: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.onboardingCompleted) {
      throw new Error('Onboarding already completed');
    }

    const completedAt = new Date();

    // Mark onboarding as completed (skipped)
    await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingCompleted: true,
        onboardingCompletedAt: completedAt,
        onboardingStep: ONBOARDING_STEPS.length,
        updatedAt: completedAt
      }
    });

    // Log the skip action
    await AuditService.log({
      userId,
      eventType: 'ONBOARDING_SKIPPED',
      eventAction: 'SKIP',
      eventData: {
        reason: request.reason,
        feedback: request.feedback,
        skippedAt: completedAt.toISOString()
      },
      ipAddress
    });

    return this.getProgress(userId);
  }

  /**
   * Check if user needs onboarding
   */
  async needsOnboarding(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingCompleted: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return !user.onboardingCompleted;
  }

  /**
   * Get onboarding step information
   */
  getStepInfo(step: number): OnboardingStep | null {
    return ONBOARDING_STEPS.find(s => s.step === step) || null;
  }

  /**
   * Get all step information
   */
  getAllSteps(): OnboardingStep[] {
    return ONBOARDING_STEPS;
  }
}

export const onboardingService = new OnboardingService();
