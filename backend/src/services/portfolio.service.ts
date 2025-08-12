import { PrismaClient } from '@prisma/client';
import marketDataService from './marketData.service';
import fundingService from './funding.service';

const prisma = new PrismaClient();

interface PortfolioPosition {
  symbol: string;
  quantity: number;
  averageCost: number;
  totalCost: number;
  currentPrice: number;
  currentValue: number;
  unrealizedGainLoss: number;
  unrealizedGainLossPercent: number;
  lastUpdated: Date;
}

interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  availableCash: number;
  totalUnrealizedGainLoss: number;
  totalUnrealizedGainLossPercent: number;
  positions: PortfolioPosition[];
  lastUpdated: Date;
}

interface PortfolioMetrics {
  totalPortfolioValue: number;
  dailyChange: number;
  dailyChangePercent: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  positionCount: number;
  largestPosition: {
    symbol: string;
    value: number;
    percentage: number;
  } | null;
}

class PortfolioService {
  /**
   * Get complete portfolio summary for a user
   */
  async getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
    try {
      // Get user's holdings
      const holdings = await prisma.holding.findMany({
        where: { userId },
        orderBy: { symbol: 'asc' }
      });

      // Get available cash balance
      const availableCash = await fundingService.getAccountBalance(userId);

      // If no holdings, return empty portfolio with cash balance
      if (holdings.length === 0) {
        return {
          totalValue: availableCash,
          totalCost: 0,
          availableCash,
          totalUnrealizedGainLoss: 0,
          totalUnrealizedGainLossPercent: 0,
          positions: [],
          lastUpdated: new Date()
        };
      }

      // Get current market prices for all held symbols
      const symbols = holdings.map((h: any) => h.symbol);
      const currentPrices = await marketDataService.getMultipleStockPrices(symbols);

      // Calculate positions with current values
      const positions: PortfolioPosition[] = [];
      let totalValue = 0;
      let totalCost = 0;

      for (const holding of holdings) {
        const currentPrice = currentPrices[holding.symbol]?.price || 0;
        const quantity = parseFloat(holding.quantity.toString());
        const averageCost = parseFloat(holding.averageCost.toString());
        const holdingTotalCost = parseFloat(holding.totalCost.toString());
        
        const currentValue = quantity * currentPrice;
        const unrealizedGainLoss = currentValue - holdingTotalCost;
        const unrealizedGainLossPercent = holdingTotalCost > 0 
          ? (unrealizedGainLoss / holdingTotalCost) * 100 
          : 0;

        positions.push({
          symbol: holding.symbol,
          quantity,
          averageCost,
          totalCost: holdingTotalCost,
          currentPrice,
          currentValue,
          unrealizedGainLoss,
          unrealizedGainLossPercent,
          lastUpdated: currentPrices[holding.symbol]?.lastUpdated || new Date()
        });

        totalValue += currentValue;
        totalCost += holdingTotalCost;
      }

      // Calculate overall metrics
      const totalUnrealizedGainLoss = totalValue - totalCost;
      const totalUnrealizedGainLossPercent = totalCost > 0 
        ? (totalUnrealizedGainLoss / totalCost) * 100 
        : 0;

      return {
        totalValue: totalValue + availableCash, // Include cash in total portfolio value
        totalCost,
        availableCash,
        totalUnrealizedGainLoss,
        totalUnrealizedGainLossPercent,
        positions: positions.sort((a, b) => b.currentValue - a.currentValue), // Sort by value descending
        lastUpdated: new Date()
      };

    } catch (error) {
      console.error('Portfolio service error:', error);
      throw new Error('Failed to retrieve portfolio summary');
    }
  }

  /**
   * Get portfolio performance metrics
   */
  async getPortfolioMetrics(userId: string): Promise<PortfolioMetrics> {
    try {
      const portfolio = await this.getPortfolioSummary(userId);
      
      // Find largest position
      let largestPosition = null;
      if (portfolio.positions.length > 0) {
        const largest = portfolio.positions[0]; // Already sorted by value
        if (largest) {
          largestPosition = {
            symbol: largest.symbol,
            value: largest.currentValue,
            percentage: portfolio.totalValue > 0 
              ? (largest.currentValue / portfolio.totalValue) * 100 
              : 0
          };
        }
      }

      // Calculate daily change (simplified - would need historical data for real calculation)
      const dailyChange = portfolio.totalUnrealizedGainLoss * 0.1; // Simplified estimate
      const dailyChangePercent = portfolio.totalValue > 0 
        ? (dailyChange / portfolio.totalValue) * 100 
        : 0;

      return {
        totalPortfolioValue: portfolio.totalValue,
        dailyChange,
        dailyChangePercent,
        totalGainLoss: portfolio.totalUnrealizedGainLoss,
        totalGainLossPercent: portfolio.totalUnrealizedGainLossPercent,
        positionCount: portfolio.positions.length,
        largestPosition
      };

    } catch (error) {
      console.error('Portfolio metrics error:', error);
      throw new Error('Failed to calculate portfolio metrics');
    }
  }

  /**
   * Get portfolio allocation (by position size)
   */
  async getPortfolioAllocation(userId: string): Promise<Array<{
    symbol: string;
    value: number;
    percentage: number;
    color: string;
  }>> {
    try {
      const portfolio = await this.getPortfolioSummary(userId);
      
      if (portfolio.positions.length === 0) {
        return [{
          symbol: 'CASH',
          value: portfolio.availableCash,
          percentage: 100,
          color: '#10B981' // Green for cash
        }];
      }

      // Generate colors for positions
      const colors = [
        '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
        '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
      ];

      const allocation = portfolio.positions.map((position, index) => ({
        symbol: position.symbol,
        value: position.currentValue,
        percentage: portfolio.totalValue > 0 
          ? (position.currentValue / portfolio.totalValue) * 100 
          : 0,
        color: colors[index % colors.length] || '#6B7280' // Default gray color
      }));

      // Add cash if significant
      if (portfolio.availableCash > 0) {
        const cashPercentage = (portfolio.availableCash / portfolio.totalValue) * 100;
        if (cashPercentage >= 1) { // Only show cash if >= 1%
          allocation.push({
            symbol: 'CASH',
            value: portfolio.availableCash,
            percentage: cashPercentage,
            color: '#10B981'
          });
        }
      }

      return allocation.sort((a, b) => b.percentage - a.percentage);

    } catch (error) {
      console.error('Portfolio allocation error:', error);
      throw new Error('Failed to calculate portfolio allocation');
    }
  }

  /**
   * Get recent transactions (orders) for portfolio history
   */
  async getRecentTransactions(userId: string, limit: number = 10): Promise<Array<{
    id: string;
    symbol: string;
    type: string;
    quantity: number;
    price: number;
    totalAmount: number;
    status: string;
    executedAt: Date | null;
    createdAt: Date;
  }>> {
    try {
      const orders = await prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      return orders.map(order => ({
        id: order.id,
        symbol: order.symbol,
        type: order.type,
        quantity: parseFloat(order.quantity.toString()),
        price: parseFloat(order.price.toString()),
        totalAmount: parseFloat(order.totalAmount.toString()),
        status: order.status,
        executedAt: order.executedAt,
        createdAt: order.createdAt
      }));

    } catch (error) {
      console.error('Recent transactions error:', error);
      throw new Error('Failed to retrieve recent transactions');
    }
  }

  /**
   * Initialize demo portfolio for testing
   */
  async initializeDemoPortfolio(userId: string): Promise<void> {
    try {
      // Check if user already has holdings
      const existingHoldings = await prisma.holding.findFirst({
        where: { userId }
      });

      if (existingHoldings) {
        console.log('User already has holdings, skipping demo portfolio creation');
        return;
      }

      // Create some demo holdings
      const demoHoldings = [
        { symbol: 'AAPL', quantity: 10, averageCost: 170.00 },
        { symbol: 'GOOGL', quantity: 5, averageCost: 120.00 },
        { symbol: 'MSFT', quantity: 8, averageCost: 340.00 }
      ];

      for (const holding of demoHoldings) {
        const totalCost = holding.quantity * holding.averageCost;
        
        await prisma.holding.create({
          data: {
            userId,
            symbol: holding.symbol,
            quantity: holding.quantity,
            averageCost: holding.averageCost,
            totalCost
          }
        });

        // Create corresponding buy order record
        await prisma.order.create({
          data: {
            userId,
            symbol: holding.symbol,
            type: 'buy',
            quantity: holding.quantity,
            price: holding.averageCost,
            totalAmount: totalCost,
            status: 'completed',
            executedAt: new Date()
          }
        });
      }

      console.log(`✅ Demo portfolio created for user ${userId}`);

    } catch (error) {
      console.error('Failed to initialize demo portfolio:', error);
      throw new Error('Failed to initialize demo portfolio');
    }
  }
}

export default new PortfolioService();
