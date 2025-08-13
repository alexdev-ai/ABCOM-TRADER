import { PrismaClient } from '@prisma/client';
import { portfolioOptimizationService } from './portfolioOptimization.service';
import { riskAnalysisService } from './riskAnalysis.service';
import { taxOptimizationService } from './taxOptimization.service';

const prisma = new PrismaClient();

// Types for rebalancing engine
export interface RebalancingRequest {
  userId: string;
  targetAllocations: { [symbol: string]: number };
  maxTaxImpact?: number;
  rebalancingMethod: 'immediate' | 'staged' | 'tax_optimized';
  constraints?: RebalancingConstraints;
}

export interface RebalancingConstraints {
  maxTradeSize?: number;
  minTradeSize?: number;
  maxTurnover?: number;
  allowPartialRebalancing?: boolean;
  prioritizeTaxLossHarvesting?: boolean;
  respectSessionLimits?: boolean;
}

export interface RebalancingPlan {
  id: string;
  userId: string;
  recommendations: RebalancingRecommendation[];
  implementation: ImplementationPlan;
  riskAnalysis: RebalancingRiskAnalysis;
  taxImpact: TaxImpactSummary;
  totalCost: number;
  estimatedDuration: number;
  createdAt: Date;
}

export interface RebalancingRecommendation {
  id: string;
  symbol: string;
  currentShares: number;
  targetShares: number;
  action: 'buy' | 'sell' | 'hold';
  quantity: number;
  estimatedPrice: number;
  estimatedCost: number;
  taxImpact: number;
  priority: number;
  reasoning: string;
  stage: number;
  status: 'pending' | 'executed' | 'cancelled' | 'failed';
}

export interface ImplementationPlan {
  stages: ImplementationStage[];
  totalStages: number;
  estimatedDuration: number;
  marketImpactScore: number;
  riskScore: number;
}

export interface ImplementationStage {
  stage: number;
  trades: RebalancingRecommendation[];
  estimatedDuration: number;
  marketImpact: number;
  prerequisites?: string[];
  waitConditions?: WaitCondition[];
}

export interface WaitCondition {
  type: 'time_delay' | 'market_condition' | 'price_target' | 'volume_threshold';
  condition: string;
  value: number;
  unit: string;
}

export interface RebalancingRiskAnalysis {
  portfolioRiskBefore: number;
  portfolioRiskAfter: number;
  riskImprovement: number;
  concentrationRisk: number;
  liquidityRisk: number;
  executionRisk: number;
}

export interface TaxImpactSummary {
  totalTaxImpact: number;
  shortTermGainsTax: number;
  longTermGainsTax: number;
  taxLossHarvesting: number;
  netTaxImpact: number;
  taxEfficiencyScore: number;
}

export interface RebalancingProgress {
  planId: string;
  currentStage: number;
  completedTrades: number;
  totalTrades: number;
  executedValue: number;
  totalValue: number;
  remainingTime: number;
  status: 'in_progress' | 'completed' | 'paused' | 'cancelled';
}

class RebalancingEngineService {
  /**
   * Generate comprehensive rebalancing recommendations
   */
  async generateRebalancingPlan(request: RebalancingRequest): Promise<RebalancingPlan> {
    const { userId, targetAllocations, maxTaxImpact, rebalancingMethod, constraints } = request;

    // Get current portfolio positions
    const currentPositions = await this.getCurrentPositions(userId);
    const totalValue = currentPositions.reduce((sum, pos) => sum + pos.value, 0);

    // Calculate target positions
    const targetPositions = this.calculateTargetPositions(
      currentPositions,
      targetAllocations,
      totalValue
    );

    // Generate basic rebalancing recommendations
    const basicRecommendations = await this.generateBasicRecommendations(
      currentPositions,
      targetPositions
    );

    // Apply optimization based on method
    let optimizedRecommendations: RebalancingRecommendation[];
    switch (rebalancingMethod) {
      case 'tax_optimized':
        optimizedRecommendations = await this.applyTaxOptimization(
          userId,
          basicRecommendations,
          maxTaxImpact
        );
        break;
      case 'staged':
        optimizedRecommendations = await this.applyStagedOptimization(
          basicRecommendations,
          constraints
        );
        break;
      case 'immediate':
      default:
        optimizedRecommendations = basicRecommendations;
        break;
    }

    // Create implementation plan
    const implementationPlan = await this.createImplementationPlan(
      optimizedRecommendations,
      constraints
    );

    // Analyze risks and impacts
    const riskAnalysis = await this.analyzeRebalancingRisk(
      userId,
      currentPositions,
      targetPositions
    );

    const taxImpact = await this.calculateTaxImpactSummary(
      userId,
      optimizedRecommendations
    );

    // Calculate total costs
    const totalCost = optimizedRecommendations.reduce(
      (sum, rec) => sum + rec.estimatedCost + this.calculateTransactionCosts(rec), 0
    );

    // Store rebalancing plan
    const planId = await this.storeRebalancingPlan({
      userId,
      recommendations: optimizedRecommendations,
      implementationPlan,
      riskAnalysis,
      taxImpact,
      totalCost
    });

    return {
      id: planId,
      userId,
      recommendations: optimizedRecommendations,
      implementation: implementationPlan,
      riskAnalysis,
      taxImpact,
      totalCost,
      estimatedDuration: implementationPlan.estimatedDuration,
      createdAt: new Date()
    };
  }

  /**
   * Execute rebalancing plan with real-time monitoring
   */
  async executeRebalancingPlan(
    planId: string,
    executionMethod: 'automatic' | 'manual_approval'
  ): Promise<{ success: boolean; executionId: string; message: string }> {
    const plan = await this.getRebalancingPlan(planId);
    
    if (!plan) {
      throw new Error('Rebalancing plan not found');
    }

    // Check if user has sufficient trading session limits
    const sessionLimits = await this.checkSessionLimits(plan.userId);
    if (!sessionLimits.canExecute) {
      throw new Error(`Cannot execute: ${sessionLimits.reason}`);
    }

    // Create execution record
    const executionId = await this.createExecutionRecord(planId, executionMethod);

    // Execute stages sequentially
    try {
      for (let i = 0; i < plan.implementation.stages.length; i++) {
        const stage = plan.implementation.stages[i];
        
        if (!stage) continue;
        
        // Check wait conditions before executing stage
        if (stage.waitConditions?.length) {
          const canProceed = await this.checkWaitConditions(stage.waitConditions);
          if (!canProceed) {
            await this.pauseExecution(executionId, `Waiting for conditions: ${stage.waitConditions.map(c => c.condition).join(', ')}`);
            continue;
          }
        }

        // Execute trades in this stage
        await this.executeStage(executionId, stage, executionMethod);
        
        // Update progress
        await this.updateExecutionProgress(executionId, i + 1, plan.implementation.totalStages);
      }

      await this.completeExecution(executionId);
      return {
        success: true,
        executionId,
        message: 'Rebalancing completed successfully'
      };

    } catch (error) {
      await this.handleExecutionError(executionId, error as Error);
      return {
        success: false,
        executionId,
        message: `Execution failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Monitor rebalancing progress
   */
  async getRebalancingProgress(executionId: string): Promise<RebalancingProgress> {
    // Mock implementation - in production, fetch from execution tracking table
    return {
      planId: 'plan-123',
      currentStage: 2,
      completedTrades: 5,
      totalTrades: 10,
      executedValue: 25000,
      totalValue: 50000,
      remainingTime: 1800, // 30 minutes
      status: 'in_progress'
    };
  }

  /**
   * Calculate optimal buy/sell quantities with constraints
   */
  async calculateOptimalQuantities(
    userId: string,
    recommendations: RebalancingRecommendation[],
    constraints?: RebalancingConstraints
  ): Promise<RebalancingRecommendation[]> {
    const optimized: RebalancingRecommendation[] = [];

    for (const rec of recommendations) {
      let optimalQuantity = rec.quantity;

      // Apply minimum trade size constraint
      if (constraints?.minTradeSize && rec.estimatedCost < constraints.minTradeSize) {
        if (constraints.allowPartialRebalancing) {
          continue; // Skip this trade
        } else {
          optimalQuantity = constraints.minTradeSize / rec.estimatedPrice;
        }
      }

      // Apply maximum trade size constraint
      if (constraints?.maxTradeSize && rec.estimatedCost > constraints.maxTradeSize) {
        optimalQuantity = constraints.maxTradeSize / rec.estimatedPrice;
      }

      // Round to appropriate lot sizes
      optimalQuantity = this.roundToLotSize(rec.symbol, optimalQuantity);

      optimized.push({
        ...rec,
        quantity: optimalQuantity,
        estimatedCost: optimalQuantity * rec.estimatedPrice
      });
    }

    return optimized;
  }

  /**
   * Prioritize recommendations by impact and cost
   */
  prioritizeRecommendations(
    recommendations: RebalancingRecommendation[],
    method: 'impact' | 'cost' | 'tax_efficiency' | 'risk_reduction' = 'impact'
  ): RebalancingRecommendation[] {
    return recommendations.sort((a, b) => {
      switch (method) {
        case 'cost':
          return b.estimatedCost - a.estimatedCost; // Highest cost first
        case 'tax_efficiency':
          return a.taxImpact - b.taxImpact; // Lowest tax impact first
        case 'risk_reduction':
          return b.priority - a.priority; // Highest risk reduction first
        case 'impact':
        default:
          return Math.abs(b.targetShares - b.currentShares) - Math.abs(a.targetShares - a.currentShares);
      }
    });
  }

  /**
   * Integrate with existing trading system
   */
  async integrateWithTradingSystem(
    userId: string,
    recommendation: RebalancingRecommendation
  ): Promise<{ success: boolean; orderId?: string; message: string }> {
    try {
      // Check trading session limits
      const sessionLimits = await this.checkTradingSessionLimits(userId, recommendation);
      if (!sessionLimits.allowed) {
        return {
          success: false,
          message: `Trading limit exceeded: ${sessionLimits.reason}`
        };
      }

      // Create order in trading system
      const order = await this.createTradingOrder(userId, recommendation);
      
      // Update recommendation status
      await this.updateRecommendationStatus(recommendation.id, 'executed', order.id);

      return {
        success: true,
        orderId: order.id,
        message: 'Order created successfully'
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to create order: ${(error as Error).message}`
      };
    }
  }

  // Private helper methods

  private async getCurrentPositions(userId: string) {
    const positions = await prisma.portfolioPosition.findMany({
      where: { userId }
    });

    return positions.map(pos => ({
      symbol: pos.symbol,
      shares: pos.quantity.toNumber(),
      value: pos.marketValue?.toNumber() || 0,
      currentPrice: pos.currentPrice?.toNumber() || 0,
      sector: pos.sector
    }));
  }

  private calculateTargetPositions(
    currentPositions: any[],
    targetAllocations: { [symbol: string]: number },
    totalValue: number
  ) {
    return Object.entries(targetAllocations).map(([symbol, allocation]) => {
      const currentPosition = currentPositions.find(p => p.symbol === symbol);
      const targetValue = totalValue * allocation;
      const currentPrice = currentPosition?.currentPrice || 100; // Fallback price
      
      return {
        symbol,
        targetShares: Math.floor(targetValue / currentPrice),
        targetValue,
        currentPrice
      };
    });
  }

  private async generateBasicRecommendations(
    currentPositions: any[],
    targetPositions: any[]
  ): Promise<RebalancingRecommendation[]> {
    const recommendations: RebalancingRecommendation[] = [];

    for (const target of targetPositions) {
      const current = currentPositions.find(p => p.symbol === target.symbol);
      const currentShares = current?.shares || 0;
      const sharesDiff = target.targetShares - currentShares;

      if (Math.abs(sharesDiff) < 1) continue; // Skip negligible differences

      const action = sharesDiff > 0 ? 'buy' : 'sell';
      const quantity = Math.abs(sharesDiff);

      recommendations.push({
        id: `rec-${target.symbol}-${Date.now()}`,
        symbol: target.symbol,
        currentShares,
        targetShares: target.targetShares,
        action,
        quantity,
        estimatedPrice: target.currentPrice,
        estimatedCost: quantity * target.currentPrice,
        taxImpact: 0, // Will be calculated later
        priority: Math.abs(sharesDiff / (currentShares || 1)),
        reasoning: `${action === 'buy' ? 'Increase' : 'Decrease'} allocation to reach target weight`,
        stage: 1,
        status: 'pending'
      });
    }

    return recommendations;
  }

  private async applyTaxOptimization(
    userId: string,
    recommendations: RebalancingRecommendation[],
    maxTaxImpact?: number
  ): Promise<RebalancingRecommendation[]> {
    const sellRecommendations = recommendations.filter(r => r.action === 'sell');
    
    for (const rec of sellRecommendations) {
      const taxOptimizedSale = await taxOptimizationService.optimizeCostBasisSelection(
        userId,
        rec.symbol,
        rec.quantity
      );
      
      rec.taxImpact = taxOptimizedSale.totalTaxImpact;
      rec.reasoning += ` (Tax-optimized using ${taxOptimizedSale.lots.length} lots)`;
    }

    // Filter out recommendations that exceed tax impact limit
    if (maxTaxImpact) {
      return recommendations.filter(rec => rec.taxImpact <= maxTaxImpact);
    }

    return recommendations;
  }

  private async applyStagedOptimization(
    recommendations: RebalancingRecommendation[],
    constraints?: RebalancingConstraints
  ): Promise<RebalancingRecommendation[]> {
    const maxTradeSize = constraints?.maxTradeSize || 10000;
    let currentStage = 1;

    for (const rec of recommendations) {
      if (rec.estimatedCost > maxTradeSize) {
        // Split large trades across multiple stages
        const numStages = Math.ceil(rec.estimatedCost / maxTradeSize);
        rec.quantity = rec.quantity / numStages;
        rec.estimatedCost = rec.quantity * rec.estimatedPrice;
        rec.stage = currentStage;
        
        // Create additional recommendations for remaining stages
        for (let i = 1; i < numStages; i++) {
          recommendations.push({
            ...rec,
            id: `${rec.id}-stage-${i + 1}`,
            stage: currentStage + i,
            reasoning: `${rec.reasoning} (Stage ${i + 1}/${numStages})`
          });
        }
        
        currentStage += numStages;
      } else {
        rec.stage = 1; // Small trades can be executed immediately
      }
    }

    return recommendations;
  }

  private async createImplementationPlan(
    recommendations: RebalancingRecommendation[],
    constraints?: RebalancingConstraints
  ): Promise<ImplementationPlan> {
    // Group recommendations by stage
    const stageGroups = recommendations.reduce((groups, rec) => {
      if (!groups[rec.stage]) groups[rec.stage] = [];
      groups[rec.stage].push(rec);
      return groups;
    }, {} as { [stage: number]: RebalancingRecommendation[] });

    const stages: ImplementationStage[] = [];
    let totalDuration = 0;

    for (const [stageNum, trades] of Object.entries(stageGroups)) {
      const stageNumber = parseInt(stageNum);
      const stageDuration = this.calculateStageDuration(trades);
      const marketImpact = this.calculateMarketImpact(trades);
      
      const waitConditions: WaitCondition[] = [];
      if (stageNumber > 1) {
        waitConditions.push({
          type: 'time_delay',
          condition: 'Wait between stages to minimize market impact',
          value: 300, // 5 minutes
          unit: 'seconds'
        });
      }

      stages.push({
        stage: stageNumber,
        trades,
        estimatedDuration: stageDuration,
        marketImpact,
        ...(waitConditions.length > 0 && { waitConditions })
      });

      totalDuration += stageDuration;
    }

    return {
      stages: stages.sort((a, b) => a.stage - b.stage),
      totalStages: stages.length,
      estimatedDuration: totalDuration,
      marketImpactScore: stages.reduce((sum, s) => sum + s.marketImpact, 0) / stages.length,
      riskScore: this.calculatePlanRiskScore(recommendations)
    };
  }

  private async analyzeRebalancingRisk(
    userId: string,
    currentPositions: any[],
    targetPositions: any[]
  ): Promise<RebalancingRiskAnalysis> {
    // Calculate portfolio risk before and after rebalancing
    const currentRisk = await this.calculatePortfolioRisk(currentPositions);
    const targetRisk = await this.calculatePortfolioRisk(targetPositions);
    
    return {
      portfolioRiskBefore: currentRisk,
      portfolioRiskAfter: targetRisk,
      riskImprovement: (currentRisk - targetRisk) / currentRisk,
      concentrationRisk: this.calculateConcentrationRisk(targetPositions),
      liquidityRisk: this.calculateLiquidityRisk(targetPositions),
      executionRisk: 0.02 // 2% execution risk assumption
    };
  }

  private async calculateTaxImpactSummary(
    userId: string,
    recommendations: RebalancingRecommendation[]
  ): Promise<TaxImpactSummary> {
    const sellRecommendations = recommendations.filter(r => r.action === 'sell');
    const totalTaxImpact = sellRecommendations.reduce((sum, rec) => sum + rec.taxImpact, 0);
    
    // Get tax loss harvesting opportunities
    const harvestingOpportunities = await taxOptimizationService.identifyTaxLossHarvesting(userId);
    const taxLossHarvesting = harvestingOpportunities.reduce((sum, opp) => sum + opp.taxBenefit, 0);
    
    return {
      totalTaxImpact,
      shortTermGainsTax: totalTaxImpact * 0.6, // Estimate
      longTermGainsTax: totalTaxImpact * 0.4,
      taxLossHarvesting,
      netTaxImpact: totalTaxImpact - taxLossHarvesting,
      taxEfficiencyScore: Math.max(0, 1 - (totalTaxImpact / 10000)) // Normalized score
    };
  }

  private calculateTransactionCosts(recommendation: RebalancingRecommendation): number {
    // Simplified transaction cost calculation
    const baseCost = 1.00; // $1 base commission
    const percentageCost = recommendation.estimatedCost * 0.0005; // 0.05% of trade value
    return baseCost + percentageCost;
  }

  private calculateStageDuration(trades: RebalancingRecommendation[]): number {
    // Estimate duration based on number and size of trades
    const baseTime = 60; // 1 minute per trade
    const sizeMultiplier = trades.reduce((sum, t) => sum + t.estimatedCost, 0) / 10000;
    return trades.length * baseTime * (1 + sizeMultiplier);
  }

  private calculateMarketImpact(trades: RebalancingRecommendation[]): number {
    // Simplified market impact calculation
    const totalValue = trades.reduce((sum, t) => sum + t.estimatedCost, 0);
    return Math.min(0.1, totalValue / 1000000); // Max 10% impact
  }

  private calculatePlanRiskScore(recommendations: RebalancingRecommendation[]): number {
    const totalValue = recommendations.reduce((sum, rec) => sum + rec.estimatedCost, 0);
    const avgTaxImpact = recommendations.reduce((sum, rec) => sum + rec.taxImpact, 0) / recommendations.length;
    return Math.min(1.0, (totalValue / 100000) * 0.5 + (avgTaxImpact / 1000) * 0.5);
  }

  private async calculatePortfolioRisk(positions: any[]): Promise<number> {
    // Simplified risk calculation - in production, use sophisticated risk models
    const weights = positions.map(p => p.value || p.targetValue || 0);
    const totalValue = weights.reduce((sum, w) => sum + w, 0);
    const normalizedWeights = weights.map(w => w / totalValue);
    
    // Calculate concentration risk (Herfindahl index)
    const concentrationRisk = normalizedWeights.reduce((sum, w) => sum + w * w, 0);
    return Math.sqrt(concentrationRisk) * 0.2; // Scale to reasonable risk level
  }

  private calculateConcentrationRisk(positions: any[]): number {
    const weights = positions.map(p => p.value || p.targetValue || 0);
    const totalValue = weights.reduce((sum, w) => sum + w, 0);
    const normalizedWeights = weights.map(w => w / totalValue);
    return normalizedWeights.reduce((sum, w) => sum + w * w, 0);
  }

  private calculateLiquidityRisk(positions: any[]): number {
    // Mock implementation - in production, use actual liquidity metrics
    return positions.length > 10 ? 0.05 : 0.1; // Lower risk for diversified portfolios
  }

  private roundToLotSize(symbol: string, quantity: number): number {
    // Most stocks trade in round lots (100 shares)
    return Math.round(quantity / 100) * 100;
  }

  private async checkSessionLimits(userId: string): Promise<{ canExecute: boolean; reason?: string }> {
    // Mock implementation - check trading session limits
    return { canExecute: true };
  }

  private async checkTradingSessionLimits(
    userId: string,
    recommendation: RebalancingRecommendation
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Mock implementation
    return { allowed: true };
  }

  private async createTradingOrder(userId: string, recommendation: RebalancingRecommendation) {
    // Mock implementation - integrate with trading system
    return { id: `order-${Date.now()}`, status: 'submitted' };
  }

  private async storeRebalancingPlan(planData: any): Promise<string> {
    // Mock implementation - store in database
    return `plan-${Date.now()}`;
  }

  private async getRebalancingPlan(planId: string): Promise<RebalancingPlan | null> {
    // Mock implementation
    return null;
  }

  private async createExecutionRecord(planId: string, method: string): Promise<string> {
    return `exec-${Date.now()}`;
  }

  private async executeStage(executionId: string, stage: ImplementationStage, method: string): Promise<void> {
    // Mock implementation
  }

  private async updateExecutionProgress(executionId: string, currentStage: number, totalStages: number): Promise<void> {
    // Mock implementation
  }

  private async completeExecution(executionId: string): Promise<void> {
    // Mock implementation
  }

  private async handleExecutionError(executionId: string, error: Error): Promise<void> {
    // Mock implementation
  }

  private async pauseExecution(executionId: string, reason: string): Promise<void> {
    // Mock implementation
  }

  private async checkWaitConditions(conditions: WaitCondition[]): Promise<boolean> {
    // Mock implementation - check if conditions are met
    return true;
  }

  private async updateRecommendationStatus(
    recommendationId: string,
    status: string,
    orderId?: string
  ): Promise<void> {
    // Mock implementation
  }
}

export const rebalancingEngineService = new RebalancingEngineService();
