import { PrismaClient, Prisma } from '@prisma/client';
import { AuditService } from './audit.service';

const prisma = new PrismaClient();

export interface TradeHistoryFilters {
  page: number;
  limit: number;
  symbol?: string | undefined;
  tradeType?: 'buy' | 'sell';
  profitLoss?: 'profit' | 'loss' | 'breakeven';
  dateFrom?: Date | undefined;
  dateTo?: Date | undefined;
  sessionId?: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  search?: string;
}

export interface TradeHistoryResult {
  trades: EnhancedTrade[];
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
  summary: TradeSummary;
}

export interface EnhancedTrade {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  totalAmount: number;
  fees: number;
  realizedPnl?: number | undefined;
  executionQuality?: number | undefined;
  algorithmConfidence?: number | undefined;
  algorithmReasoning?: string | undefined;
  sessionId?: string | undefined;
  marketConditions?: any;
  notes?: string | undefined;
  executedAt: Date;
  createdAt: Date;
  // Calculated fields
  profitLoss?: 'profit' | 'loss' | 'breakeven' | undefined;
  riskRewardRatio?: number | undefined;
  holdTimeMinutes?: number | undefined;
  tradePattern?: string | undefined;
}

export interface TradeSummary {
  totalTrades: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  totalVolume: number;
  avgTradeSize: number;
}

export interface TradingAnalytics {
  performance: {
    totalReturn: number;
    totalReturnPercent: number;
    winRate: number;
    profitFactor: number;
    sharpeRatio: number;
    avgWin: number;
    avgLoss: number;
    maxDrawdown: number;
    consecutiveWins: number;
    consecutiveLosses: number;
  };
  patterns?: {
    overtradingRisk: boolean;
    revengeTradingDetected: boolean;
    consistentWinners: string[];
    consistentLosers: string[];
    timeOfDayAnalysis: any[];
    marketConditionPerformance: any[];
  };
  riskMetrics: {
    avgRiskRewardRatio: number;
    maxAdverseExcursion: number;
    maxFavorableExcursion: number;
    positionSizingConsistency: number;
  };
}

export interface ExportFilters {
  dateFrom?: Date;
  dateTo?: Date;
  symbol?: string;
  includeAnalytics: boolean;
  taxOptimized: boolean;
}

class TradeHistoryService {
  /**
   * Get comprehensive trade history with advanced filtering
   */
  async getTradeHistory(userId: string, filters: TradeHistoryFilters): Promise<TradeHistoryResult> {
    try {
      // Build where clause
      const where: Prisma.OrderWhereInput = {
        userId,
        ...(filters.symbol && { symbol: filters.symbol }),
        ...(filters.tradeType && { type: filters.tradeType }),
        ...(filters.dateFrom && filters.dateTo && {
          createdAt: {
            gte: filters.dateFrom,
            lte: filters.dateTo
          }
        }),
        ...(filters.search && {
          OR: [
            { symbol: { contains: filters.search } },
            { id: { contains: filters.search } }
          ]
        })
      };

      // Get total count
      const total = await prisma.order.count({ where });

      // Calculate pagination
      const skip = (filters.page - 1) * filters.limit;
      const hasNext = skip + filters.limit < total;
      const hasPrev = filters.page > 1;

      // Build order by clause
      const orderBy: Prisma.OrderOrderByWithRelationInput = {};
      if (filters.sortBy === 'createdAt' || filters.sortBy === 'executedAt') {
        orderBy[filters.sortBy as keyof Prisma.OrderOrderByWithRelationInput] = filters.sortOrder;
      } else if (filters.sortBy === 'symbol' || filters.sortBy === 'type') {
        orderBy[filters.sortBy as keyof Prisma.OrderOrderByWithRelationInput] = filters.sortOrder;
      } else if (filters.sortBy === 'totalAmount' || filters.sortBy === 'price' || filters.sortBy === 'quantity') {
        orderBy[filters.sortBy as keyof Prisma.OrderOrderByWithRelationInput] = filters.sortOrder;
      } else {
        orderBy.createdAt = 'desc';
      }

      // Get trades
      const orders = await prisma.order.findMany({
        where,
        orderBy,
        skip,
        take: filters.limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      // Enhanced trades with calculated fields
      const enhancedTrades: EnhancedTrade[] = await Promise.all(
        orders.map(async (order) => {
          const basePrice = parseFloat(order.price.toString());
          const quantity = parseFloat(order.quantity.toString());
          const totalAmount = parseFloat(order.totalAmount.toString());
          
          // Calculate realized P&L for completed trades
          let realizedPnl: number | undefined;
          let profitLoss: 'profit' | 'loss' | 'breakeven' | undefined;
          
          if (order.status === 'completed') {
            // For demo purposes, simulate P&L calculation
            // In real implementation, this would be calculated based on entry/exit prices
            const simulatedPnl = order.type === 'buy' 
              ? totalAmount * (Math.random() * 0.2 - 0.1) // -10% to +10%
              : totalAmount * (Math.random() * 0.2 - 0.1);
            
            realizedPnl = simulatedPnl;
            profitLoss = simulatedPnl > 0 ? 'profit' : simulatedPnl < 0 ? 'loss' : 'breakeven';
          }

          return {
            id: order.id,
            symbol: order.symbol,
            type: order.type as 'buy' | 'sell',
            quantity,
            price: basePrice,
            totalAmount,
            fees: 0, // Commission-free trading
            realizedPnl,
            executedAt: order.executedAt || order.createdAt,
            createdAt: order.createdAt,
            profitLoss,
            // Additional fields would be populated from enhanced schema
            executionQuality: Math.random() * 0.3 + 0.7, // 0.7-1.0 demo
            algorithmConfidence: Math.random() * 0.4 + 0.6, // 0.6-1.0 demo
            riskRewardRatio: Math.random() * 2 + 0.5, // 0.5-2.5 demo
            holdTimeMinutes: Math.floor(Math.random() * 480) + 15, // 15-495 minutes demo
            tradePattern: ['momentum', 'reversal', 'breakout', 'support_resistance'][Math.floor(Math.random() * 4)]
          };
        })
      );

      // Apply profit/loss filter after enhancement
      let filteredTrades = enhancedTrades;
      if (filters.profitLoss) {
        filteredTrades = enhancedTrades.filter(trade => trade.profitLoss === filters.profitLoss);
      }

      // Calculate summary
      const summary = this.calculateTradeSummary(filteredTrades);

      return {
        trades: filteredTrades,
        total,
        hasNext,
        hasPrev,
        summary
      };

    } catch (error) {
      throw new Error(`Failed to get trade history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get detailed information for a specific trade
   */
  async getTradeDetails(userId: string, tradeId: string): Promise<EnhancedTrade | null> {
    try {
      const order = await prisma.order.findFirst({
        where: {
          id: tradeId,
          userId
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      if (!order) {
        return null;
      }

      // Get related market data and context
      const marketConditions = {
        marketTrend: ['bullish', 'bearish', 'sideways'][Math.floor(Math.random() * 3)],
        volatility: Math.random() * 30 + 10, // 10-40%
        volume: Math.floor(Math.random() * 10000000) + 1000000
      };

      return {
        id: order.id,
        symbol: order.symbol,
        type: order.type as 'buy' | 'sell',
        quantity: parseFloat(order.quantity.toString()),
        price: parseFloat(order.price.toString()),
        totalAmount: parseFloat(order.totalAmount.toString()),
        fees: 0,
        executedAt: order.executedAt || order.createdAt,
        createdAt: order.createdAt,
        marketConditions,
        algorithmReasoning: `Based on ${marketConditions.marketTrend} market conditions and technical analysis indicators`,
        executionQuality: Math.random() * 0.3 + 0.7,
        algorithmConfidence: Math.random() * 0.4 + 0.6,
        riskRewardRatio: Math.random() * 2 + 0.5,
        holdTimeMinutes: Math.floor(Math.random() * 480) + 15,
        tradePattern: ['momentum', 'reversal', 'breakout', 'support_resistance'][Math.floor(Math.random() * 4)]
      };

    } catch (error) {
      throw new Error(`Failed to get trade details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get trading analytics and performance metrics
   */
  async getTradingAnalytics(userId: string, period: string, includePatterns: boolean = true): Promise<TradingAnalytics> {
    try {
      const dateFrom = this.getPeriodStartDate(period);
      
      const trades = await this.getTradeHistory(userId, {
        page: 1,
        limit: 1000, // Get all trades for analytics
        dateFrom,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      const performance = this.calculatePerformanceMetrics(trades.trades);
      const riskMetrics = this.calculateRiskMetrics(trades.trades);
      
      let patterns;
      if (includePatterns) {
        patterns = await this.analyzeTradingPatterns(userId, period);
      }

      return {
        performance,
        patterns,
        riskMetrics
      };

    } catch (error) {
      throw new Error(`Failed to get trading analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze trading patterns and behaviors
   */
  async analyzeTradingPatterns(userId: string, period: string): Promise<any> {
    try {
      const dateFrom = this.getPeriodStartDate(period);
      
      // Get recent trading activity
      const trades = await this.getTradeHistory(userId, {
        page: 1,
        limit: 500,
        dateFrom,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      // Analyze patterns
      const patterns = {
        overtradingRisk: trades.trades.length > 100, // More than 100 trades in period
        revengeTradingDetected: this.detectRevengeTrending(trades.trades),
        consistentWinners: this.findConsistentWinners(trades.trades),
        consistentLosers: this.findConsistentLosers(trades.trades),
        timeOfDayAnalysis: this.analyzeTimeOfDay(trades.trades),
        marketConditionPerformance: this.analyzeMarketConditions(trades.trades)
      };

      return patterns;

    } catch (error) {
      throw new Error(`Failed to analyze trading patterns: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export trade history in specified format
   */
  async exportTradeHistory(userId: string, format: 'csv' | 'xlsx', filters: ExportFilters): Promise<Buffer | string> {
    try {
      const trades = await this.getTradeHistory(userId, {
        page: 1,
        limit: 10000, // Export up to 10k trades
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        symbol: filters.symbol,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      if (format === 'csv') {
        return this.generateCSVExport(trades.trades, filters);
      } else {
        // For XLSX, we'd use a library like xlsx or exceljs
        // For now, return CSV format
        return this.generateCSVExport(trades.trades, filters);
      }

    } catch (error) {
      throw new Error(`Failed to export trade history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate comprehensive trade summary
   */
  private calculateTradeSummary(trades: EnhancedTrade[]): TradeSummary {
    const completedTrades = trades.filter(t => t.realizedPnl !== undefined);
    const profits = completedTrades.filter(t => (t.realizedPnl || 0) > 0);
    const losses = completedTrades.filter(t => (t.realizedPnl || 0) < 0);

    const totalProfit = profits.reduce((sum, t) => sum + (t.realizedPnl || 0), 0);
    const totalLoss = Math.abs(losses.reduce((sum, t) => sum + (t.realizedPnl || 0), 0));
    const totalVolume = trades.reduce((sum, t) => sum + t.totalAmount, 0);

    return {
      totalTrades: trades.length,
      totalProfit,
      totalLoss,
      winRate: completedTrades.length > 0 ? (profits.length / completedTrades.length) * 100 : 0,
      profitFactor: totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 999 : 0,
      avgWin: profits.length > 0 ? totalProfit / profits.length : 0,
      avgLoss: losses.length > 0 ? totalLoss / losses.length : 0,
      largestWin: profits.length > 0 ? Math.max(...profits.map(t => t.realizedPnl || 0)) : 0,
      largestLoss: losses.length > 0 ? Math.min(...losses.map(t => t.realizedPnl || 0)) : 0,
      totalVolume,
      avgTradeSize: trades.length > 0 ? totalVolume / trades.length : 0
    };
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(trades: EnhancedTrade[]): any {
    const summary = this.calculateTradeSummary(trades);
    const completedTrades = trades.filter(t => t.realizedPnl !== undefined);
    
    // Calculate consecutive wins/losses
    let currentStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let lastResult: 'win' | 'loss' | null = null;

    completedTrades.forEach(trade => {
      const isWin = (trade.realizedPnl || 0) > 0;
      
      if (isWin && lastResult === 'win') {
        currentStreak++;
      } else if (!isWin && lastResult === 'loss') {
        currentStreak++;
      } else {
        if (lastResult === 'win') maxWinStreak = Math.max(maxWinStreak, currentStreak);
        if (lastResult === 'loss') maxLossStreak = Math.max(maxLossStreak, currentStreak);
        currentStreak = 1;
      }
      
      lastResult = isWin ? 'win' : 'loss';
    });

    // Calculate Sharpe ratio (simplified)
    const returns = completedTrades.map(t => (t.realizedPnl || 0) / t.totalAmount);
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const stdDev = returns.length > 1 ? Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1)) : 0;
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

    return {
      totalReturn: summary.totalProfit - summary.totalLoss,
      totalReturnPercent: summary.totalVolume > 0 ? ((summary.totalProfit - summary.totalLoss) / summary.totalVolume) * 100 : 0,
      winRate: summary.winRate,
      profitFactor: summary.profitFactor,
      sharpeRatio,
      avgWin: summary.avgWin,
      avgLoss: summary.avgLoss,
      maxDrawdown: Math.abs(summary.largestLoss), // Simplified
      consecutiveWins: maxWinStreak,
      consecutiveLosses: maxLossStreak
    };
  }

  /**
   * Calculate risk metrics
   */
  private calculateRiskMetrics(trades: EnhancedTrade[]): any {
    const riskRewards = trades.filter(t => t.riskRewardRatio).map(t => t.riskRewardRatio!);
    
    return {
      avgRiskRewardRatio: riskRewards.length > 0 ? riskRewards.reduce((a, b) => a + b, 0) / riskRewards.length : 0,
      maxAdverseExcursion: Math.random() * 0.1 + 0.02, // 2-12% demo
      maxFavorableExcursion: Math.random() * 0.15 + 0.05, // 5-20% demo
      positionSizingConsistency: Math.random() * 0.3 + 0.7 // 70-100% demo
    };
  }

  /**
   * Generate CSV export
   */
  private generateCSVExport(trades: EnhancedTrade[], filters: ExportFilters): string {
    const headers = filters.taxOptimized 
      ? ['Date', 'Symbol', 'Type', 'Quantity', 'Price', 'Amount', 'Realized P&L', 'Cost Basis', 'Proceeds']
      : ['Date', 'Symbol', 'Type', 'Quantity', 'Price', 'Amount', 'Fees', 'P&L', 'Execution Quality', 'Pattern'];

    const rows = trades.map(trade => {
      if (filters.taxOptimized) {
        return [
          trade.executedAt.toISOString().split('T')[0],
          trade.symbol,
          trade.type.toUpperCase(),
          trade.quantity.toString(),
          trade.price.toFixed(4),
          trade.totalAmount.toFixed(2),
          (trade.realizedPnl || 0).toFixed(2),
          trade.type === 'buy' ? trade.totalAmount.toFixed(2) : '0',
          trade.type === 'sell' ? trade.totalAmount.toFixed(2) : '0'
        ];
      } else {
        return [
          trade.executedAt.toISOString().split('T')[0],
          trade.symbol,
          trade.type.toUpperCase(),
          trade.quantity.toString(),
          trade.price.toFixed(4),
          trade.totalAmount.toFixed(2),
          trade.fees.toFixed(2),
          (trade.realizedPnl || 0).toFixed(2),
          ((trade.executionQuality || 0) * 100).toFixed(1) + '%',
          trade.tradePattern || 'N/A'
        ];
      }
    });

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Helper methods for pattern analysis
   */
  private detectRevengeTrending(trades: EnhancedTrade[]): boolean {
    // Simple heuristic: multiple large trades after losses
    let revengeTrades = 0;
    for (let i = 1; i < trades.length; i++) {
      const prevTrade = trades[i - 1];
      const currentTrade = trades[i];
      
      if (prevTrade && currentTrade && 
          (prevTrade.realizedPnl || 0) < 0 && 
          currentTrade.totalAmount > prevTrade.totalAmount * 1.5) {
        revengeTrades++;
      }
    }
    return revengeTrades > 3;
  }

  private findConsistentWinners(trades: EnhancedTrade[]): string[] {
    const symbolStats: { [symbol: string]: { wins: number; total: number } } = {};
    
    trades.forEach(trade => {
      if (!symbolStats[trade.symbol]) {
        symbolStats[trade.symbol] = { wins: 0, total: 0 };
      }
      const stats = symbolStats[trade.symbol];
      if (stats) {
        stats.total++;
        if ((trade.realizedPnl || 0) > 0) {
          stats.wins++;
        }
      }
    });

    return Object.entries(symbolStats)
      .filter(([_, stats]) => stats && stats.total >= 5 && stats.wins / stats.total > 0.7)
      .map(([symbol, _]) => symbol);
  }

  private findConsistentLosers(trades: EnhancedTrade[]): string[] {
    const symbolStats: { [symbol: string]: { losses: number; total: number } } = {};
    
    trades.forEach(trade => {
      if (!symbolStats[trade.symbol]) {
        symbolStats[trade.symbol] = { losses: 0, total: 0 };
      }
      const stats = symbolStats[trade.symbol];
      if (stats) {
        stats.total++;
        if ((trade.realizedPnl || 0) < 0) {
          stats.losses++;
        }
      }
    });

    return Object.entries(symbolStats)
      .filter(([_, stats]) => stats && stats.total >= 5 && stats.losses / stats.total > 0.7)
      .map(([symbol, _]) => symbol);
  }

  private analyzeTimeOfDay(trades: EnhancedTrade[]): any[] {
    const hourStats: { [hour: number]: { total: number; profit: number } } = {};
    
    trades.forEach(trade => {
      const hour = trade.executedAt.getHours();
      if (!hourStats[hour]) {
        hourStats[hour] = { total: 0, profit: 0 };
      }
      hourStats[hour].total++;
      hourStats[hour].profit += trade.realizedPnl || 0;
    });

    return Object.entries(hourStats).map(([hour, stats]) => ({
      hour: parseInt(hour),
      totalTrades: stats.total,
      avgProfit: stats.total > 0 ? stats.profit / stats.total : 0,
      totalProfit: stats.profit
    }));
  }

  private analyzeMarketConditions(trades: EnhancedTrade[]): any[] {
    // Demo analysis - in real implementation would use actual market data
    return [
      { condition: 'bullish', trades: Math.floor(trades.length * 0.4), avgReturn: 0.02 },
      { condition: 'bearish', trades: Math.floor(trades.length * 0.3), avgReturn: -0.01 },
      { condition: 'sideways', trades: Math.floor(trades.length * 0.3), avgReturn: 0.005 }
    ];
  }

  private getPeriodStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case '1D': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '1W': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '1M': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '3M': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '6M': return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      case '1Y': return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      case 'YTD': return new Date(now.getFullYear(), 0, 1);
      default: return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }
}

export default new TradeHistoryService();
