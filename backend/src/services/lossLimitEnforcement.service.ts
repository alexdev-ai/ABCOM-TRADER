import { PrismaClient } from '@prisma/client';
import { AuditService } from './audit.service';
import { riskManagementService } from './riskManagement.service';
import { complianceService } from './compliance.service';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface LossLimit {
  userId: string;
  limitType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SESSION' | 'POSITION';
  limitAmount: number;
  currentLoss: number;
  thresholdWarning: number; // Percentage threshold for warnings (e.g., 80%)
  thresholdHalt: number; // Percentage threshold for emergency halt (e.g., 95%)
  isActive: boolean;
  lastReset: Date;
  nextReset: Date;
  breachCount: number;
  lastBreach?: Date;
}

export interface CircuitBreaker {
  id: string;
  userId: string;
  triggerType: 'LOSS_LIMIT' | 'VOLATILITY' | 'DRAWDOWN' | 'VELOCITY' | 'MANUAL';
  triggerCondition: string;
  status: 'ARMED' | 'TRIGGERED' | 'COOLING_DOWN' | 'DISABLED';
  triggeredAt?: Date;
  cooldownUntil?: Date;
  autoResetEnabled: boolean;
  manualResetRequired: boolean;
  metadata: Record<string, any>;
}

export interface PositionSizeLimit {
  userId: string;
  symbol: string;
  maxPositionSize: number;
  maxPortfolioPercentage: number;
  currentPositionSize: number;
  currentPortfolioPercentage: number;
  riskAdjustmentFactor: number; // Based on user's risk score
  isEnforced: boolean;
}

export interface TradingHalt {
  id: string;
  userId: string;
  haltType: 'EMERGENCY' | 'RISK_LIMIT' | 'COMPLIANCE' | 'MANUAL';
  reason: string;
  haltedAt: Date;
  liftedAt?: Date;
  isActive: boolean;
  triggerData: Record<string, any>;
  overrideRequired: boolean;
  overriddenBy?: string;
}

export interface LossLimitStatus {
  userId: string;
  dailyStatus: {
    limit: number;
    currentLoss: number;
    percentageUsed: number;
    warningTriggered: boolean;
    haltTriggered: boolean;
  };
  weeklyStatus: {
    limit: number;
    currentLoss: number;
    percentageUsed: number;
    warningTriggered: boolean;
    haltTriggered: boolean;
  };
  monthlyStatus: {
    limit: number;
    currentLoss: number;
    percentageUsed: number;
    warningTriggered: boolean;
    haltTriggered: boolean;
  };
  circuitBreakers: CircuitBreaker[];
  activeTradingHalts: TradingHalt[];
  canTrade: boolean;
  restrictions: string[];
}

class LossLimitEnforcementService {

  /**
   * Initialize loss limits for a new user based on their risk assessment
   */
  async initializeLossLimits(userId: string): Promise<LossLimit[]> {
    try {
      // Get user's risk assessment
      const riskAssessment = await riskManagementService.getCurrentRiskAssessment(userId);
      
      if (!riskAssessment) {
        throw new Error('Risk assessment required before initializing loss limits');
      }

      // Calculate base limits based on risk level
      const baseLimits = this.calculateBaseLimits(riskAssessment.riskLevel, riskAssessment.riskLimits);
      
      // Create loss limit records
      const lossLimits: LossLimit[] = [
        {
          userId,
          limitType: 'DAILY',
          limitAmount: baseLimits.dailyLimit,
          currentLoss: 0,
          thresholdWarning: 80, // 80% warning threshold
          thresholdHalt: 95, // 95% emergency halt threshold
          isActive: true,
          lastReset: new Date(),
          nextReset: this.calculateNextReset('DAILY'),
          breachCount: 0
        },
        {
          userId,
          limitType: 'WEEKLY',
          limitAmount: baseLimits.weeklyLimit,
          currentLoss: 0,
          thresholdWarning: 80,
          thresholdHalt: 95,
          isActive: true,
          lastReset: new Date(),
          nextReset: this.calculateNextReset('WEEKLY'),
          breachCount: 0
        },
        {
          userId,
          limitType: 'MONTHLY',
          limitAmount: baseLimits.monthlyLimit,
          currentLoss: 0,
          thresholdWarning: 80,
          thresholdHalt: 95,
          isActive: true,
          lastReset: new Date(),
          nextReset: this.calculateNextReset('MONTHLY'),
          breachCount: 0
        },
        {
          userId,
          limitType: 'SESSION',
          limitAmount: baseLimits.sessionLimit,
          currentLoss: 0,
          thresholdWarning: 85,
          thresholdHalt: 98,
          isActive: true,
          lastReset: new Date(),
          nextReset: new Date(Date.now() + 24 * 60 * 60 * 1000), // Reset daily
          breachCount: 0
        }
      ];

      // Store in database
      for (const limit of lossLimits) {
        await this.storeLossLimit(limit);
      }

      // Initialize circuit breakers
      await this.initializeCircuitBreakers(userId, riskAssessment);

      // Log initialization
      await AuditService.log({
        userId,
        eventType: 'loss_limit',
        eventAction: 'LIMITS_INITIALIZED',
        eventData: {
          limits: lossLimits.map(l => ({
            type: l.limitType,
            amount: l.limitAmount
          })),
          riskLevel: riskAssessment.riskLevel
        }
      });

      return lossLimits;
    } catch (error) {
      console.error('Error initializing loss limits:', error);
      throw new Error('Failed to initialize loss limits');
    }
  }

  /**
   * Check trade against loss limits and circuit breakers
   */
  async checkTradeAllowed(
    userId: string,
    symbol: string,
    quantity: number,
    price: number,
    side: 'BUY' | 'SELL'
  ): Promise<{
    allowed: boolean;
    reason?: string;
    warnings: string[];
    restrictions: string[];
  }> {
    try {
      const warnings: string[] = [];
      const restrictions: string[] = [];

      // Check for active trading halts
      const activeHalts = await this.getActiveTradingHalts(userId);
      if (activeHalts.length > 0) {
        return {
          allowed: false,
          reason: `Trading halted: ${activeHalts[0]?.reason || 'Unknown reason'}`,
          warnings,
          restrictions: activeHalts.map(h => h?.reason || 'Unknown reason')
        };
      }

      // Check circuit breakers
      const circuitBreakers = await this.getActiveCircuitBreakers(userId);
      const triggeredBreakers = circuitBreakers.filter(cb => cb.status === 'TRIGGERED');
      if (triggeredBreakers.length > 0) {
        return {
          allowed: false,
          reason: `Circuit breaker triggered: ${triggeredBreakers[0]?.triggerCondition || 'Unknown trigger'}`,
          warnings,
          restrictions: triggeredBreakers.map(cb => cb?.triggerCondition || 'Unknown trigger')
        };
      }

      // Check loss limits
      const lossLimitStatus = await this.getLossLimitStatus(userId);
      if (!lossLimitStatus.canTrade) {
        return {
          allowed: false,
          reason: 'Loss limits exceeded',
          warnings,
          restrictions: lossLimitStatus.restrictions
        };
      }

      // Check position size limits
      const positionCheck = await this.checkPositionSizeLimits(userId, symbol, quantity, price);
      if (!positionCheck.allowed) {
        restrictions.push(positionCheck.reason || 'Position size limit exceeded');
      }

      // Add warnings for approaching limits
      if (lossLimitStatus.dailyStatus.percentageUsed > 70) {
        warnings.push(`Daily loss limit ${lossLimitStatus.dailyStatus.percentageUsed.toFixed(1)}% used`);
      }

      if (lossLimitStatus.weeklyStatus.percentageUsed > 70) {
        warnings.push(`Weekly loss limit ${lossLimitStatus.weeklyStatus.percentageUsed.toFixed(1)}% used`);
      }

      return {
        allowed: restrictions.length === 0,
        reason: restrictions.length > 0 ? restrictions[0] : undefined,
        warnings,
        restrictions
      };

    } catch (error) {
      console.error('Error checking trade allowed:', error);
      return {
        allowed: false,
        reason: 'Error validating trade limits',
        warnings: [],
        restrictions: ['System error - contact support']
      };
    }
  }

  /**
   * Process realized loss and update limits
   */
  async processRealizedLoss(
    userId: string,
    sessionId: string,
    lossAmount: number,
    symbol: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      if (lossAmount <= 0) return; // Only process actual losses

      // Update all applicable loss limits
      const limits = await this.getLossLimits(userId);
      
      for (const limit of limits) {
        limit.currentLoss += lossAmount;
        
        const percentageUsed = (limit.currentLoss / limit.limitAmount) * 100;
        
        // Check for warning threshold
        if (percentageUsed >= limit.thresholdWarning && percentageUsed < 100) {
          await this.triggerLossLimitWarning(limit, percentageUsed);
        }
        
        // Check for halt threshold
        if (percentageUsed >= limit.thresholdHalt) {
          await this.triggerLossLimitHalt(limit, percentageUsed, lossAmount);
        }
        
        // Update limit in database
        await this.updateLossLimit(limit);
      }

      // Check if circuit breakers should be triggered
      await this.evaluateCircuitBreakers(userId, lossAmount, symbol, metadata);

      // Log loss processing
      await AuditService.log({
        userId,
        eventType: 'loss_limit',
        eventAction: 'LOSS_PROCESSED',
        eventData: {
          sessionId,
          lossAmount,
          symbol,
          metadata,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error processing realized loss:', error);
      throw new Error('Failed to process realized loss');
    }
  }

  /**
   * Trigger emergency trading halt
   */
  async triggerEmergencyHalt(
    userId: string,
    reason: string,
    triggerType: TradingHalt['haltType'] = 'EMERGENCY',
    triggerData: Record<string, any> = {},
    overrideRequired: boolean = true
  ): Promise<TradingHalt> {
    try {
      const halt: TradingHalt = {
        id: crypto.randomUUID(),
        userId,
        haltType: triggerType,
        reason,
        haltedAt: new Date(),
        isActive: true,
        triggerData,
        overrideRequired
      };

      // Store halt in database
      await this.storeTradingHalt(halt);

      // Stop all active trading sessions
      await this.haltActiveTradingSessions(userId, halt.id);

      // Trigger compliance alert
      await complianceService.monitorUserActivity(
        userId,
        'trading_halt',
        {
          haltId: halt.id,
          reason,
          triggerType,
          triggerData
        }
      );

      // Log emergency halt
      await AuditService.log({
        userId,
        eventType: 'trading_halt',
        eventAction: 'EMERGENCY_HALT_TRIGGERED',
        eventData: {
          haltId: halt.id,
          reason,
          triggerType,
          triggerData,
          timestamp: halt.haltedAt.toISOString()
        }
      });

      return halt;
    } catch (error) {
      console.error('Error triggering emergency halt:', error);
      throw new Error('Failed to trigger emergency halt');
    }
  }

  /**
   * Calculate dynamic position size limits based on risk assessment
   */
  async calculatePositionSizeLimits(
    userId: string,
    symbol: string,
    currentPrice: number
  ): Promise<PositionSizeLimit> {
    try {
      // Get user's risk assessment
      const riskAssessment = await riskManagementService.getCurrentRiskAssessment(userId);
      if (!riskAssessment) {
        throw new Error('Risk assessment required for position sizing');
      }

      // Get portfolio summary
      const portfolioSummary = await prisma.portfolioSummary.findUnique({
        where: { userId }
      });

      const totalPortfolioValue = portfolioSummary?.totalValue.toNumber() || 10000; // Default $10k

      // Base position size limits
      let maxPositionValue = riskAssessment.riskLimits.maxPositionSize;
      let maxPortfolioPercentage = riskAssessment.riskLimits.maxPortfolioConcentration;

      // Risk adjustment factor based on user's risk score
      const riskAdjustmentFactor = this.calculateRiskAdjustmentFactor(riskAssessment.riskScore);
      
      // Adjust limits based on risk
      maxPositionValue *= riskAdjustmentFactor;
      maxPortfolioPercentage *= riskAdjustmentFactor;

      // Ensure position value doesn't exceed portfolio percentage limit
      const maxByPercentage = totalPortfolioValue * (maxPortfolioPercentage / 100);
      maxPositionValue = Math.min(maxPositionValue, maxByPercentage);

      // Calculate maximum shares based on price
      const maxPositionSize = Math.floor(maxPositionValue / currentPrice);

      // Get current position
      const currentPosition = await prisma.portfolioPosition.findFirst({
        where: { userId, symbol }
      });

      const currentPositionSize = currentPosition?.quantity.toNumber() || 0;
      const currentPositionValue = currentPositionSize * currentPrice;
      const currentPortfolioPercentage = (currentPositionValue / totalPortfolioValue) * 100;

      return {
        userId,
        symbol,
        maxPositionSize,
        maxPortfolioPercentage,
        currentPositionSize,
        currentPortfolioPercentage,
        riskAdjustmentFactor,
        isEnforced: true
      };

    } catch (error) {
      console.error('Error calculating position size limits:', error);
      throw new Error('Failed to calculate position size limits');
    }
  }

  /**
   * Get comprehensive loss limit status for user
   */
  async getLossLimitStatus(userId: string): Promise<LossLimitStatus> {
    try {
      const limits = await this.getLossLimits(userId);
      const circuitBreakers = await this.getActiveCircuitBreakers(userId);
      const activeTradingHalts = await this.getActiveTradingHalts(userId);

      const dailyLimit = limits.find(l => l.limitType === 'DAILY');
      const weeklyLimit = limits.find(l => l.limitType === 'WEEKLY');
      const monthlyLimit = limits.find(l => l.limitType === 'MONTHLY');

      const dailyStatus = dailyLimit ? {
        limit: dailyLimit.limitAmount,
        currentLoss: dailyLimit.currentLoss,
        percentageUsed: (dailyLimit.currentLoss / dailyLimit.limitAmount) * 100,
        warningTriggered: (dailyLimit.currentLoss / dailyLimit.limitAmount) * 100 >= dailyLimit.thresholdWarning,
        haltTriggered: (dailyLimit.currentLoss / dailyLimit.limitAmount) * 100 >= dailyLimit.thresholdHalt
      } : { limit: 0, currentLoss: 0, percentageUsed: 0, warningTriggered: false, haltTriggered: false };

      const weeklyStatus = weeklyLimit ? {
        limit: weeklyLimit.limitAmount,
        currentLoss: weeklyLimit.currentLoss,
        percentageUsed: (weeklyLimit.currentLoss / weeklyLimit.limitAmount) * 100,
        warningTriggered: (weeklyLimit.currentLoss / weeklyLimit.limitAmount) * 100 >= weeklyLimit.thresholdWarning,
        haltTriggered: (weeklyLimit.currentLoss / weeklyLimit.limitAmount) * 100 >= weeklyLimit.thresholdHalt
      } : { limit: 0, currentLoss: 0, percentageUsed: 0, warningTriggered: false, haltTriggered: false };

      const monthlyStatus = monthlyLimit ? {
        limit: monthlyLimit.limitAmount,
        currentLoss: monthlyLimit.currentLoss,
        percentageUsed: (monthlyLimit.currentLoss / monthlyLimit.limitAmount) * 100,
        warningTriggered: (monthlyLimit.currentLoss / monthlyLimit.limitAmount) * 100 >= monthlyLimit.thresholdWarning,
        haltTriggered: (monthlyLimit.currentLoss / monthlyLimit.limitAmount) * 100 >= monthlyLimit.thresholdHalt
      } : { limit: 0, currentLoss: 0, percentageUsed: 0, warningTriggered: false, haltTriggered: false };

      // Determine if user can trade
      const triggeredBreakers = circuitBreakers.filter(cb => cb.status === 'TRIGGERED');
      const anyLimitExceeded = dailyStatus.haltTriggered || weeklyStatus.haltTriggered || monthlyStatus.haltTriggered;
      const canTrade = activeTradingHalts.length === 0 && triggeredBreakers.length === 0 && !anyLimitExceeded;

      // Compile restrictions
      const restrictions: string[] = [];
      if (activeTradingHalts.length > 0) {
        restrictions.push(...activeTradingHalts.map(h => h.reason));
      }
      if (triggeredBreakers.length > 0) {
        restrictions.push(...triggeredBreakers.map(cb => `Circuit breaker: ${cb.triggerCondition}`));
      }
      if (dailyStatus.haltTriggered) restrictions.push('Daily loss limit exceeded');
      if (weeklyStatus.haltTriggered) restrictions.push('Weekly loss limit exceeded');
      if (monthlyStatus.haltTriggered) restrictions.push('Monthly loss limit exceeded');

      return {
        userId,
        dailyStatus,
        weeklyStatus,
        monthlyStatus,
        circuitBreakers,
        activeTradingHalts,
        canTrade,
        restrictions
      };

    } catch (error) {
      console.error('Error getting loss limit status:', error);
      throw new Error('Failed to get loss limit status');
    }
  }

  /**
   * Reset loss limits based on schedule
   */
  async resetLossLimits(userId: string, limitType?: LossLimit['limitType']): Promise<void> {
    try {
      const limits = await this.getLossLimits(userId);
      const now = new Date();

      for (const limit of limits) {
        // Skip if specific type requested and doesn't match
        if (limitType && limit.limitType !== limitType) continue;
        
        // Check if reset is due
        if (now >= limit.nextReset) {
          limit.currentLoss = 0;
          limit.lastReset = now;
          limit.nextReset = this.calculateNextReset(limit.limitType);
          
          await this.updateLossLimit(limit);

          // Log reset
          await AuditService.log({
            userId,
            eventType: 'loss_limit',
            eventAction: 'LIMIT_RESET',
            eventData: {
              limitType: limit.limitType,
              resetTime: now.toISOString(),
              nextReset: limit.nextReset.toISOString()
            }
          });
        }
      }
    } catch (error) {
      console.error('Error resetting loss limits:', error);
      throw new Error('Failed to reset loss limits');
    }
  }

  /**
   * Manual override for trading halts (requires authorization)
   */
  async overrideTradingHalt(
    haltId: string,
    overriddenBy: string,
    reason: string
  ): Promise<void> {
    try {
      const halt = await this.getTradingHalt(haltId);
      if (!halt) {
        throw new Error('Trading halt not found');
      }

      if (!halt.overrideRequired) {
        throw new Error('This halt does not require override');
      }

      // Update halt record
      halt.liftedAt = new Date();
      halt.isActive = false;
      halt.overriddenBy = overriddenBy;

      await this.updateTradingHalt(halt);

      // Log override
      await AuditService.log({
        userId: halt.userId,
        eventType: 'trading_halt',
        eventAction: 'HALT_OVERRIDDEN',
        eventData: {
          haltId,
          overriddenBy,
          reason,
          originalHaltReason: halt.reason,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error overriding trading halt:', error);
      throw new Error('Failed to override trading halt');
    }
  }

  // Private helper methods

  private calculateBaseLimits(riskLevel: string, riskLimits: any): {
    dailyLimit: number;
    weeklyLimit: number;
    monthlyLimit: number;
    sessionLimit: number;
  } {
    const baseDailyLimit = riskLimits.maxDailyLoss || 100;
    
    return {
      dailyLimit: baseDailyLimit,
      weeklyLimit: baseDailyLimit * 5,
      monthlyLimit: baseDailyLimit * 20,
      sessionLimit: baseDailyLimit * 0.5 // 50% of daily limit per session
    };
  }

  private calculateNextReset(limitType: string): Date {
    const now = new Date();
    
    switch (limitType) {
      case 'DAILY':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
      case 'WEEKLY':
        const daysUntilMonday = (8 - now.getDay()) % 7;
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilMonday, 0, 0, 0, 0);
      case 'MONTHLY':
        return new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
      case 'SESSION':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Reset daily
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  private calculateRiskAdjustmentFactor(riskScore: number): number {
    // Higher risk score = lower position size multiplier
    if (riskScore >= 80) return 0.3; // CRITICAL risk
    if (riskScore >= 60) return 0.5; // HIGH risk
    if (riskScore >= 35) return 0.7; // MEDIUM risk
    return 1.0; // LOW risk
  }

  private async initializeCircuitBreakers(userId: string, riskAssessment: any): Promise<void> {
    const circuitBreakers: CircuitBreaker[] = [
      {
        id: crypto.randomUUID(),
        userId,
        triggerType: 'LOSS_LIMIT',
        triggerCondition: 'Daily loss exceeds 95% of limit',
        status: 'ARMED',
        autoResetEnabled: true,
        manualResetRequired: false,
        metadata: { threshold: 95, limitType: 'DAILY' }
      },
      {
        id: crypto.randomUUID(),
        userId,
        triggerType: 'DRAWDOWN',
        triggerCondition: 'Portfolio drawdown exceeds 15%',
        status: 'ARMED',
        autoResetEnabled: false,
        manualResetRequired: true,
        metadata: { threshold: 15, timeWindow: '1d' }
      },
      {
        id: crypto.randomUUID(),
        userId,
        triggerType: 'VELOCITY',
        triggerCondition: 'More than 50 trades in 1 hour',
        status: 'ARMED',
        autoResetEnabled: true,
        manualResetRequired: false,
        metadata: { threshold: 50, timeWindow: '1h' }
      }
    ];

    for (const breaker of circuitBreakers) {
      await this.storeCircuitBreaker(breaker);
    }
  }

  private async triggerLossLimitWarning(limit: LossLimit, percentageUsed: number): Promise<void> {
    await AuditService.log({
      userId: limit.userId,
      eventType: 'loss_limit',
      eventAction: 'WARNING_TRIGGERED',
      eventData: {
        limitType: limit.limitType,
        percentageUsed,
        currentLoss: limit.currentLoss,
        limitAmount: limit.limitAmount
      }
    });
  }

  private async triggerLossLimitHalt(limit: LossLimit, percentageUsed: number, lossAmount: number): Promise<void> {
    limit.breachCount += 1;
    limit.lastBreach = new Date();

    // Trigger emergency halt
    await this.triggerEmergencyHalt(
      limit.userId,
      `${limit.limitType} loss limit exceeded (${percentageUsed.toFixed(1)}%)`,
      'RISK_LIMIT',
      {
        limitType: limit.limitType,
        percentageUsed,
        currentLoss: limit.currentLoss,
        limitAmount: limit.limitAmount,
        triggerLoss: lossAmount
      }
    );
  }

  private async checkPositionSizeLimits(
    userId: string,
    symbol: string,
    quantity: number,
    price: number
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const limits = await this.calculatePositionSizeLimits(userId, symbol, price);
      
      const newPositionSize = limits.currentPositionSize + quantity;
      const newPositionValue = newPositionSize * price;
      
      if (newPositionSize > limits.maxPositionSize) {
        return {
          allowed: false,
          reason: `Position size would exceed limit of ${limits.maxPositionSize} shares`
        };
      }

      // Get portfolio value for percentage check
      const portfolioSummary = await prisma.portfolioSummary.findUnique({
        where: { userId }
      });
      
      if (portfolioSummary) {
        const portfolioValue = portfolioSummary.totalValue.toNumber();
        const newPercentage = (newPositionValue / portfolioValue) * 100;
        
        if (newPercentage > limits.maxPortfolioPercentage) {
          return {
            allowed: false,
            reason: `Position would exceed ${limits.maxPortfolioPercentage}% portfolio concentration limit`
          };
        }
      }

      return { allowed: true };
    } catch (error) {
      return {
        allowed: false,
        reason: 'Error validating position size limits'
      };
    }
  }

  private async evaluateCircuitBreakers(
    userId: string,
    lossAmount: number,
    symbol: string,
    metadata: Record<string, any>
  ): Promise<void> {
    const breakers = await this.getActiveCircuitBreakers(userId);
    
    for (const breaker of breakers) {
      if (breaker.status !== 'ARMED') continue;

      let shouldTrigger = false;
      
      switch (breaker.triggerType) {
        case 'DRAWDOWN':
          shouldTrigger = await this.checkDrawdownTrigger(userId, breaker);
          break;
        case 'VELOCITY':
          shouldTrigger = await this.checkVelocityTrigger(userId, breaker);
          break;
      }

      if (shouldTrigger) {
        await this.triggerCircuitBreaker(breaker);
      }
    }
  }

  private async checkDrawdownTrigger(userId: string, breaker: CircuitBreaker): Promise<boolean> {
    // Implement drawdown calculation logic
    return false; // Simplified for now
  }

  private async checkVelocityTrigger(userId: string, breaker: CircuitBreaker): Promise<boolean> {
    // Implement velocity calculation logic
    return false; // Simplified for now
  }

  private async triggerCircuitBreaker(breaker: CircuitBreaker): Promise<void> {
    breaker.status = 'TRIGGERED';
    breaker.triggeredAt = new Date();
    
    if (breaker.autoResetEnabled) {
      breaker.cooldownUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour cooldown
    }

    await this.updateCircuitBreaker(breaker);
    
    await this.triggerEmergencyHalt(
      breaker.userId,
      `Circuit breaker triggered: ${breaker.triggerCondition}`,
      'RISK_LIMIT',
      { breakerId: breaker.id, triggerCondition: breaker.triggerCondition }
    );
  }

  private async haltActiveTradingSessions(userId: string, haltId: string): Promise<void> {
    await prisma.tradingSession.updateMany({
      where: {
        userId,
        status: 'ACTIVE'
      },
      data: {
        status: 'HALTED'
      }
    });
  }

  // Database helper methods

  private async storeLossLimit(limit: LossLimit): Promise<void> {
    // Store loss limit in audit log for now (in production, create dedicated table)
    await AuditService.log({
      userId: limit.userId,
      eventType: 'loss_limit',
      eventAction: 'LIMIT_CREATED',
      eventData: JSON.stringify(limit)
    });
  }

  private async updateLossLimit(limit: LossLimit): Promise<void> {
    await AuditService.log({
      userId: limit.userId,
      eventType: 'loss_limit',
      eventAction: 'LIMIT_UPDATED',
      eventData: JSON.stringify(limit)
    });
  }

  private async getLossLimits(userId: string): Promise<LossLimit[]> {
    // Simplified implementation - in production, use dedicated table
    const logs = await prisma.auditLog.findMany({
      where: {
        userId,
        eventType: 'loss_limit',
        eventAction: { in: ['LIMIT_CREATED', 'LIMIT_UPDATED'] }
      },
      orderBy: { createdAt: 'desc' },
      take: 4 // Get latest for each limit type
    });

    const limits: LossLimit[] = [];
    const seenTypes = new Set<string>();

    for (const log of logs) {
      try {
        const limit = JSON.parse(log.eventData || '{}') as LossLimit;
        if (!seenTypes.has(limit.limitType)) {
          limits.push(limit);
          seenTypes.add(limit.limitType);
        }
      } catch (error) {
        console.error('Error parsing loss limit data:', error);
      }
    }

    return limits;
  }

  private async storeCircuitBreaker(breaker: CircuitBreaker): Promise<void> {
    await AuditService.log({
      userId: breaker.userId,
      eventType: 'circuit_breaker',
      eventAction: 'BREAKER_CREATED',
      eventData: JSON.stringify(breaker)
    });
  }

  private async updateCircuitBreaker(breaker: CircuitBreaker): Promise<void> {
    await AuditService.log({
      userId: breaker.userId,
      eventType: 'circuit_breaker',
      eventAction: 'BREAKER_UPDATED',
      eventData: JSON.stringify(breaker)
    });
  }

  private async getActiveCircuitBreakers(userId: string): Promise<CircuitBreaker[]> {
    const logs = await prisma.auditLog.findMany({
      where: {
        userId,
        eventType: 'circuit_breaker',
        eventAction: { in: ['BREAKER_CREATED', 'BREAKER_UPDATED'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    const breakers: CircuitBreaker[] = [];
    const seenIds = new Set<string>();

    for (const log of logs) {
      try {
        const breaker = JSON.parse(log.eventData || '{}') as CircuitBreaker;
        if (!seenIds.has(breaker.id)) {
          breakers.push(breaker);
          seenIds.add(breaker.id);
        }
      } catch (error) {
        console.error('Error parsing circuit breaker data:', error);
      }
    }

    return breakers.filter(b => b.status !== 'DISABLED');
  }

  private async storeTradingHalt(halt: TradingHalt): Promise<void> {
    await AuditService.log({
      userId: halt.userId,
      eventType: 'trading_halt',
      eventAction: 'HALT_CREATED',
      eventData: JSON.stringify(halt)
    });
  }

  private async updateTradingHalt(halt: TradingHalt): Promise<void> {
    await AuditService.log({
      userId: halt.userId,
      eventType: 'trading_halt',
      eventAction: 'HALT_UPDATED',
      eventData: JSON.stringify(halt)
    });
  }

  private async getTradingHalt(haltId: string): Promise<TradingHalt | null> {
    const logs = await prisma.auditLog.findMany({
      where: {
        eventType: 'trading_halt',
        eventAction: { in: ['HALT_CREATED', 'HALT_UPDATED'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    for (const log of logs) {
      try {
        const halt = JSON.parse(log.eventData || '{}') as TradingHalt;
        if (halt.id === haltId) {
          return halt;
        }
      } catch (error) {
        console.error('Error parsing trading halt data:', error);
      }
    }

    return null;
  }

  private async getActiveTradingHalts(userId: string): Promise<TradingHalt[]> {
    const logs = await prisma.auditLog.findMany({
      where: {
        userId,
        eventType: 'trading_halt',
        eventAction: { in: ['HALT_CREATED', 'HALT_UPDATED'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    const halts: TradingHalt[] = [];
    const seenIds = new Set<string>();

    for (const log of logs) {
      try {
        const halt = JSON.parse(log.eventData || '{}') as TradingHalt;
        if (!seenIds.has(halt.id)) {
          halts.push(halt);
          seenIds.add(halt.id);
        }
      } catch (error) {
        console.error('Error parsing trading halt data:', error);
      }
    }

    return halts.filter(h => h.isActive);
  }
}

export const lossLimitEnforcementService = new LossLimitEnforcementService();
