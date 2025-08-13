import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Types for tax optimization
export interface TaxLossHarvestingResult {
  symbol: string;
  currentPosition: number;
  unrealizedLoss: number;
  taxBenefit: number;
  harvestableShares: number;
  washSaleRisk: boolean;
  replacementSuggestions?: string[];
}

export interface WashSaleViolation {
  symbol: string;
  transactionDate: Date;
  violationType: 'purchase_before' | 'purchase_after';
  daysFromSale: number;
  affectedShares: number;
  lossDisallowed: number;
}

export interface TaxImpactAnalysis {
  totalTaxImpact: number;
  shortTermGains: number;
  longTermGains: number;
  shortTermLosses: number;
  longTermLosses: number;
  netShortTerm: number;
  netLongTerm: number;
  taxRate: TaxRates;
  estimatedTaxOwed: number;
}

export interface TaxRates {
  shortTermRate: number;
  longTermRate: number;
  ordinaryIncomeRate: number;
  netInvestmentIncomeRate: number;
}

export interface CostBasisLot {
  symbol: string;
  shares: number;
  costBasis: number;
  purchaseDate: Date;
  isLongTerm: boolean;
  unrealizedGainLoss: number;
}

export interface TaxOptimizedRebalancing {
  recommendations: TaxOptimizedRecommendation[];
  totalTaxImpact: number;
  taxSavingsFromOptimization: number;
  harvestingOpportunities: TaxLossHarvestingResult[];
}

export interface TaxOptimizedRecommendation {
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  shares: number;
  taxImpact: number;
  isLongTerm: boolean;
  costBasisUsed: number;
  reasoning: string;
  priority: number;
}

class TaxOptimizationService {
  /**
   * Identify tax-loss harvesting opportunities
   */
  async identifyTaxLossHarvesting(
    userId: string,
    harvestingThreshold: number = 1000 // Minimum loss to consider
  ): Promise<TaxLossHarvestingResult[]> {
    const positions = await this.getUserPositions(userId);
    const results: TaxLossHarvestingResult[] = [];

    for (const position of positions) {
      const costBasisLots = await this.getCostBasisLots(userId, position.symbol);
      const currentPrice = position.currentPrice || 0;
      
      for (const lot of costBasisLots) {
        const unrealizedLoss = (lot.costBasis - currentPrice) * lot.shares;
        
        if (unrealizedLoss > harvestingThreshold) {
          const washSaleRisk = await this.checkWashSaleRisk(userId, position.symbol);
          const taxBenefit = this.calculateTaxBenefit(unrealizedLoss, lot.isLongTerm);
          const replacementSuggestions = await this.findReplacementSecurities(position.symbol);

          results.push({
            symbol: position.symbol,
            currentPosition: position.quantity,
            unrealizedLoss,
            taxBenefit,
            harvestableShares: lot.shares,
            washSaleRisk,
            replacementSuggestions
          });
        }
      }
    }

    return results.sort((a, b) => b.taxBenefit - a.taxBenefit);
  }

  /**
   * Check for wash sale violations
   */
  async checkWashSaleViolations(userId: string): Promise<WashSaleViolation[]> {
    const transactions = await this.getRecentTransactions(userId, 61); // 30 days before + 30 days after + 1
    const violations: WashSaleViolation[] = [];

    if (!transactions.length) return violations;

    // Group transactions by symbol
    const transactionsBySymbol = transactions.reduce((acc, txn) => {
      if (!acc[txn.symbol]) acc[txn.symbol] = [];
      acc[txn.symbol].push(txn);
      return acc;
    }, {} as { [symbol: string]: any[] });

    for (const symbol in transactionsBySymbol) {
      const symbolTransactions = transactionsBySymbol[symbol].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      for (let i = 0; i < symbolTransactions.length; i++) {
        const saleTransaction = symbolTransactions[i];
        
        if (saleTransaction.type !== 'sell' || saleTransaction.realizedLoss <= 0) continue;

        // Check for purchases within 30 days before or after
        for (let j = 0; j < symbolTransactions.length; j++) {
          if (i === j) continue;
          
          const otherTransaction = symbolTransactions[j];
          if (otherTransaction.type !== 'buy') continue;

          const daysDiff = Math.abs(
            (new Date(saleTransaction.date).getTime() - new Date(otherTransaction.date).getTime()) 
            / (1000 * 60 * 60 * 24)
          );

          if (daysDiff <= 30) {
            const violationType = new Date(otherTransaction.date) < new Date(saleTransaction.date) 
              ? 'purchase_before' 
              : 'purchase_after';

            violations.push({
              symbol,
              transactionDate: new Date(saleTransaction.date),
              violationType,
              daysFromSale: Math.floor(daysDiff),
              affectedShares: Math.min(saleTransaction.shares, otherTransaction.shares),
              lossDisallowed: saleTransaction.realizedLoss
            });
          }
        }
      }
    }

    return violations;
  }

  /**
   * Calculate tax impact of rebalancing recommendations
   */
  async calculateTaxImpact(
    userId: string,
    recommendations: any[],
    userTaxRates?: TaxRates
  ): Promise<TaxImpactAnalysis> {
    const taxRates = userTaxRates || await this.getUserTaxRates(userId);
    
    let shortTermGains = 0;
    let longTermGains = 0;
    let shortTermLosses = 0;
    let longTermLosses = 0;

    for (const rec of recommendations) {
      if (rec.action === 'sell') {
        const costBasisLots = await this.getCostBasisLots(userId, rec.symbol);
        const currentPrice = await this.getCurrentPrice(rec.symbol);
        
        let sharesRemaining = rec.shares;
        
        // Use FIFO method for tax lot selection
        const sortedLots = costBasisLots.sort(
          (a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()
        );

        for (const lot of sortedLots) {
          if (sharesRemaining <= 0) break;
          
          const sharesToSell = Math.min(sharesRemaining, lot.shares);
          const gainLoss = (currentPrice - lot.costBasis) * sharesToSell;
          
          if (lot.isLongTerm) {
            if (gainLoss > 0) {
              longTermGains += gainLoss;
            } else {
              longTermLosses += Math.abs(gainLoss);
            }
          } else {
            if (gainLoss > 0) {
              shortTermGains += gainLoss;
            } else {
              shortTermLosses += Math.abs(gainLoss);
            }
          }
          
          sharesRemaining -= sharesToSell;
        }
      }
    }

    const netShortTerm = shortTermGains - shortTermLosses;
    const netLongTerm = longTermGains - longTermLosses;
    
    const shortTermTax = Math.max(0, netShortTerm) * taxRates.shortTermRate;
    const longTermTax = Math.max(0, netLongTerm) * taxRates.longTermRate;
    const estimatedTaxOwed = shortTermTax + longTermTax;
    const totalTaxImpact = estimatedTaxOwed;

    return {
      totalTaxImpact,
      shortTermGains,
      longTermGains,
      shortTermLosses,
      longTermLosses,
      netShortTerm,
      netLongTerm,
      taxRate: taxRates,
      estimatedTaxOwed
    };
  }

  /**
   * Generate tax-optimized rebalancing recommendations
   */
  async generateTaxOptimizedRebalancing(
    userId: string,
    targetAllocations: { [symbol: string]: number },
    maxTaxImpact?: number
  ): Promise<TaxOptimizedRebalancing> {
    const positions = await this.getUserPositions(userId);
    const harvestingOpportunities = await this.identifyTaxLossHarvesting(userId);
    
    const recommendations: TaxOptimizedRecommendation[] = [];
    let totalTaxImpact = 0;

    // Calculate total portfolio value
    const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);

    for (const position of positions) {
      const currentWeight = position.value / totalValue;
      const targetWeight = targetAllocations[position.symbol] || 0;
      const weightDiff = targetWeight - currentWeight;
      
      if (Math.abs(weightDiff) < 0.01) continue; // Skip small adjustments
      
      const targetValue = targetWeight * totalValue;
      const currentValue = position.value;
      const dollarDiff = targetValue - currentValue;
      const shares = Math.abs(dollarDiff / position.currentPrice);
      
      if (dollarDiff < 0) {
        // Need to sell - optimize for tax efficiency
        const taxOptimizedSale = await this.optimizeSaleForTaxes(
          userId,
          position.symbol,
          shares
        );
        
        recommendations.push({
          symbol: position.symbol,
          action: 'sell',
          shares: taxOptimizedSale.shares,
          taxImpact: taxOptimizedSale.taxImpact,
          isLongTerm: taxOptimizedSale.isLongTerm,
          costBasisUsed: taxOptimizedSale.costBasisUsed,
          reasoning: taxOptimizedSale.reasoning,
          priority: this.calculatePriority(weightDiff, taxOptimizedSale.taxImpact)
        });
        
        totalTaxImpact += taxOptimizedSale.taxImpact;
      } else {
        // Need to buy - no tax impact
        recommendations.push({
          symbol: position.symbol,
          action: 'buy',
          shares,
          taxImpact: 0,
          isLongTerm: false,
          costBasisUsed: position.currentPrice * shares,
          reasoning: `Increase allocation to reach target weight of ${(targetWeight * 100).toFixed(1)}%`,
          priority: Math.abs(weightDiff) * 100
        });
      }
    }

    // Calculate potential tax savings from harvesting
    const totalHarvestingBenefit = harvestingOpportunities.reduce(
      (sum, opp) => sum + opp.taxBenefit, 0
    );

    return {
      recommendations: recommendations.sort((a, b) => b.priority - a.priority),
      totalTaxImpact,
      taxSavingsFromOptimization: totalHarvestingBenefit,
      harvestingOpportunities
    };
  }

  /**
   * Optimize cost basis selection for tax efficiency
   */
  async optimizeCostBasisSelection(
    userId: string,
    symbol: string,
    sharesToSell: number,
    method: 'fifo' | 'lifo' | 'highest_cost' | 'lowest_cost' | 'tax_loss_first' = 'tax_loss_first'
  ): Promise<{ lots: CostBasisLot[]; totalTaxImpact: number }> {
    const availableLots = await this.getCostBasisLots(userId, symbol);
    const currentPrice = await this.getCurrentPrice(symbol);
    
    let sortedLots: CostBasisLot[];
    
    switch (method) {
      case 'fifo':
        sortedLots = availableLots.sort(
          (a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()
        );
        break;
      case 'lifo':
        sortedLots = availableLots.sort(
          (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
        );
        break;
      case 'highest_cost':
        sortedLots = availableLots.sort((a, b) => b.costBasis - a.costBasis);
        break;
      case 'lowest_cost':
        sortedLots = availableLots.sort((a, b) => a.costBasis - b.costBasis);
        break;
      case 'tax_loss_first':
        sortedLots = availableLots.sort((a, b) => {
          const aGainLoss = (currentPrice - a.costBasis) * a.shares;
          const bGainLoss = (currentPrice - b.costBasis) * b.shares;
          return aGainLoss - bGainLoss; // Losses first (negative values)
        });
        break;
      default:
        sortedLots = availableLots;
    }

    const selectedLots: CostBasisLot[] = [];
    let remainingShares = sharesToSell;
    let totalTaxImpact = 0;

    for (const lot of sortedLots) {
      if (remainingShares <= 0) break;
      
      const sharesToUse = Math.min(remainingShares, lot.shares);
      const gainLoss = (currentPrice - lot.costBasis) * sharesToUse;
      
      selectedLots.push({
        ...lot,
        shares: sharesToUse,
        unrealizedGainLoss: gainLoss
      });
      
      // Calculate tax impact
      const taxRate = lot.isLongTerm ? 0.15 : 0.24; // Simplified rates
      totalTaxImpact += Math.max(0, gainLoss) * taxRate;
      
      remainingShares -= sharesToUse;
    }

    return { lots: selectedLots, totalTaxImpact };
  }

  /**
   * Calculate wash sale prevention recommendations
   */
  async getWashSalePreventionGuidance(
    userId: string,
    symbol: string
  ): Promise<{
    canSell: boolean;
    waitUntil?: Date;
    alternativeStrategies: string[];
  }> {
    const recentPurchases = await this.getRecentPurchases(userId, symbol, 30);
    const futureRestrictions = await this.checkPlannedPurchases(userId, symbol, 30);

    const canSell = recentPurchases.length === 0 && futureRestrictions.length === 0;
    let waitUntil: Date | undefined;

    if (!canSell && recentPurchases.length > 0) {
      const latestPurchase = recentPurchases.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];
      if (latestPurchase) {
        waitUntil = new Date(latestPurchase.date);
        waitUntil.setDate(waitUntil.getDate() + 31);
      }
    }

    const alternativeStrategies = [
      "Consider selling a substantially similar security instead",
      "Wait 31 days after the last purchase to sell",
      "Use tax-loss harvesting on different positions",
      "Implement a tax-efficient rebalancing strategy",
      "Consider donating appreciated shares to charity instead"
    ];

    return {
      canSell,
      ...(waitUntil && { waitUntil }),
      alternativeStrategies
    };
  }

  // Private helper methods

  private async getUserPositions(userId: string) {
    const positions = await prisma.portfolioPosition.findMany({
      where: { userId }
    });

    return positions.map(pos => ({
      symbol: pos.symbol,
      quantity: pos.quantity.toNumber(),
      currentPrice: pos.currentPrice?.toNumber() || 0,
      value: pos.marketValue?.toNumber() || 0,
      sector: pos.sector
    }));
  }

  private async getCostBasisLots(userId: string, symbol: string): Promise<CostBasisLot[]> {
    // Mock implementation - in production, fetch from transactions/holdings
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    return [
      {
        symbol,
        shares: 100,
        costBasis: 150,
        purchaseDate: oneYearAgo,
        isLongTerm: true,
        unrealizedGainLoss: 0
      },
      {
        symbol,
        shares: 50,
        costBasis: 180,
        purchaseDate: new Date(),
        isLongTerm: false,
        unrealizedGainLoss: 0
      }
    ];
  }

  private async getCurrentPrice(symbol: string): Promise<number> {
    const stockPrice = await prisma.stockPrice.findUnique({
      where: { symbol }
    });
    return stockPrice?.price.toNumber() || 100; // Mock fallback
  }

  private async checkWashSaleRisk(userId: string, symbol: string): Promise<boolean> {
    const recentPurchases = await this.getRecentPurchases(userId, symbol, 30);
    return recentPurchases.length > 0;
  }

  private calculateTaxBenefit(loss: number, isLongTerm: boolean): number {
    const taxRate = isLongTerm ? 0.15 : 0.24; // Simplified rates
    return Math.abs(loss) * taxRate;
  }

  private async findReplacementSecurities(symbol: string): Promise<string[]> {
    // Mock implementation - in production, use sector/industry mapping
    const replacements: { [key: string]: string[] } = {
      'AAPL': ['MSFT', 'GOOGL', 'AMZN'],
      'TSLA': ['GM', 'F', 'NIO'],
      'default': ['SPY', 'VTI', 'QQQ']
    };
    
    return replacements[symbol] || replacements['default'] || [];
  }

  private async getRecentTransactions(userId: string, days: number): Promise<{
    symbol: string;
    type: 'buy' | 'sell';
    shares: number;
    date: Date;
    realizedLoss?: number;
  }[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Mock implementation - in production, fetch from transactions table
    return [];
  }

  private async getUserTaxRates(userId: string): Promise<TaxRates> {
    // Mock implementation - in production, fetch from user profile or calculate based on income
    return {
      shortTermRate: 0.24,
      longTermRate: 0.15,
      ordinaryIncomeRate: 0.24,
      netInvestmentIncomeRate: 0.038
    };
  }

  private async optimizeSaleForTaxes(
    userId: string,
    symbol: string,
    shares: number
  ): Promise<{
    shares: number;
    taxImpact: number;
    isLongTerm: boolean;
    costBasisUsed: number;
    reasoning: string;
  }> {
    const optimization = await this.optimizeCostBasisSelection(
      userId,
      symbol,
      shares,
      'tax_loss_first'
    );

    const avgIsLongTerm = optimization.lots.reduce((sum, lot) => 
      sum + (lot.isLongTerm ? lot.shares : 0), 0
    ) > shares / 2;

    const totalCostBasisUsed = optimization.lots.reduce((sum, lot) => 
      sum + (lot.costBasis * lot.shares), 0
    );

    return {
      shares,
      taxImpact: optimization.totalTaxImpact,
      isLongTerm: avgIsLongTerm,
      costBasisUsed: totalCostBasisUsed,
      reasoning: `Tax-optimized sale using ${optimization.lots.length} lots to minimize tax impact`
    };
  }

  private calculatePriority(weightDiff: number, taxImpact: number): number {
    // Higher priority for larger weight differences and lower tax impact
    const weightScore = Math.abs(weightDiff) * 100;
    const taxPenalty = taxImpact / 1000; // Normalize tax impact
    return weightScore - taxPenalty;
  }

  private async getRecentPurchases(userId: string, symbol: string, days: number): Promise<{
    symbol: string;
    date: Date;
    shares: number;
  }[]> {
    // Mock implementation
    return [];
  }

  private async checkPlannedPurchases(userId: string, symbol: string, days: number): Promise<{
    symbol: string;
    date: Date;
    shares: number;
  }[]> {
    // Mock implementation
    return [];
  }
}

export const taxOptimizationService = new TaxOptimizationService();
