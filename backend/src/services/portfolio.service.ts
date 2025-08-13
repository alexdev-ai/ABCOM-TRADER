import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mock market data service for now
const marketDataService = {
  async getCurrentPrices(symbols: string[]): Promise<Record<string, number>> {
    // Mock implementation - would integrate with real market data API
    const prices: Record<string, number> = {};
    symbols.forEach(symbol => {
      prices[symbol] = Math.random() * 200 + 50; // Random prices between $50-$250
    });
    return prices;
  },
  
  async getStockSector(symbol: string): Promise<string> {
    // Mock implementation - would get real sector data
    const sectors = ['Technology', 'Healthcare', 'Financial', 'Consumer', 'Industrial'];
    return sectors[Math.floor(Math.random() * sectors.length)];
  }
};

export interface PortfolioPositionWithPrice {
  id: number;
  userId: string;
  symbol: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  sector: string | null;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
  dayChange?: number;
  dayChangePercent?: number;
}

export interface PortfolioSummaryData {
  totalValue: number;
  cashBalance: number;
  totalPnl: number;
  totalPnlPercent: number;
  numberOfPositions: number;
  dayChange: number;
  dayChangePercent: number;
  positionsValue: number;
}

export class PortfolioService {
  /**
   * Get all portfolio positions for a user with real-time prices
   */
  async getUserPositions(userId: string): Promise<PortfolioPositionWithPrice[]> {
    try {
      const positions = await prisma.portfolioPosition.findMany({
        where: { userId },
        orderBy: { marketValue: 'desc' },
      });

      if (positions.length === 0) {
        return [];
      }

      // Get current prices for all symbols
      const symbols = positions.map(p => p.symbol);
      const currentPrices = await marketDataService.getCurrentPrices(symbols);

      // Calculate real-time values for each position
      const positionsWithPrices: PortfolioPositionWithPrice[] = positions.map(position => {
        const currentPrice = currentPrices[position.symbol] || Number(position.currentPrice) || 0;
        const marketValue = Number(position.quantity) * currentPrice;
        const unrealizedPnl = marketValue - (Number(position.quantity) * Number(position.averageCost));
        const unrealizedPnlPercent = Number(position.averageCost) > 0 
          ? (unrealizedPnl / (Number(position.quantity) * Number(position.averageCost))) * 100 
          : 0;

        return {
          ...position,
          currentPrice,
          marketValue,
          unrealizedPnl,
          unrealizedPnlPercent,
          quantity: Number(position.quantity),
          averageCost: Number(position.averageCost),
        };
      });

      // Update database with current prices (background update)
      this.updatePositionPricesAsync(positions, currentPrices);

      return positionsWithPrices;
    } catch (error) {
      console.error('Error fetching user positions:', error);
      throw new Error('Failed to fetch portfolio positions');
    }
  }

  /**
   * Get portfolio summary with real-time calculations
   */
  async getPortfolioSummary(userId: string): Promise<PortfolioSummaryData> {
    try {
      const positions = await this.getUserPositions(userId);
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { accountBalance: true }
      });

      const cashBalance = Number(user?.accountBalance || 0);
      const positionsValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);
      const totalValue = cashBalance + positionsValue;
      
      const totalCost = positions.reduce((sum, pos) => sum + (pos.quantity * pos.averageCost), 0);
      const totalPnl = positionsValue - totalCost;
      const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

      // Calculate day change (would need historical data)
      const dayChange = 0; // TODO: Implement with historical price data
      const dayChangePercent = 0; // TODO: Implement with historical price data

      const summaryData: PortfolioSummaryData = {
        totalValue,
        cashBalance,
        totalPnl,
        totalPnlPercent,
        numberOfPositions: positions.length,
        dayChange,
        dayChangePercent,
        positionsValue,
      };

      // Update summary in database (background update)
      this.updatePortfolioSummaryAsync(userId, summaryData);

      return summaryData;
    } catch (error) {
      console.error('Error calculating portfolio summary:', error);
      throw new Error('Failed to calculate portfolio summary');
    }
  }

  /**
   * Add or update a position (called when trades are executed)
   */
  async updatePosition(
    userId: string,
    symbol: string,
    quantity: number,
    price: number,
    type: 'buy' | 'sell'
  ): Promise<PortfolioPosition> {
    try {
      const existingPosition = await prisma.portfolioPosition.findUnique({
        where: {
          userId_symbol: { userId, symbol }
        }
      });

      if (existingPosition) {
        const currentQuantity = Number(existingPosition.quantity);
        const currentCost = Number(existingPosition.averageCost);

        if (type === 'buy') {
          // Adding to position
          const newQuantity = currentQuantity + quantity;
          const newAverageCost = ((currentQuantity * currentCost) + (quantity * price)) / newQuantity;

          return await prisma.portfolioPosition.update({
            where: { id: existingPosition.id },
            data: {
              quantity: newQuantity,
              averageCost: newAverageCost,
              lastUpdated: new Date(),
            }
          });
        } else {
          // Selling from position
          const newQuantity = currentQuantity - quantity;

          if (newQuantity <= 0) {
            // Position fully sold, remove it
            await prisma.portfolioPosition.delete({
              where: { id: existingPosition.id }
            });
            return existingPosition;
          } else {
            // Partial sale, keep same average cost
            return await prisma.portfolioPosition.update({
              where: { id: existingPosition.id },
              data: {
                quantity: newQuantity,
                lastUpdated: new Date(),
              }
            });
          }
        }
      } else if (type === 'buy') {
        // New position
        const sector = await marketDataService.getStockSector(symbol);
        
        return await prisma.portfolioPosition.create({
          data: {
            userId,
            symbol,
            quantity,
            averageCost: price,
            sector,
            lastUpdated: new Date(),
          }
        });
      } else {
        throw new Error('Cannot sell a position that does not exist');
      }
    } catch (error) {
      console.error('Error updating position:', error);
      throw new Error('Failed to update portfolio position');
    }
  }

  /**
   * Get positions by performance (gainers/losers)
   */
  async getPositionsByPerformance(userId: string, type: 'gainers' | 'losers', limit: number = 5) {
    try {
      const positions = await this.getUserPositions(userId);
      
      const sorted = positions.sort((a, b) => {
        return type === 'gainers' 
          ? b.unrealizedPnlPercent - a.unrealizedPnlPercent
          : a.unrealizedPnlPercent - b.unrealizedPnlPercent;
      });

      return sorted.slice(0, limit);
    } catch (error) {
      console.error('Error fetching positions by performance:', error);
      throw new Error('Failed to fetch positions by performance');
    }
  }

  /**
   * Search positions by symbol
   */
  async searchPositions(userId: string, query: string): Promise<PortfolioPositionWithPrice[]> {
    try {
      const positions = await this.getUserPositions(userId);
      
      return positions.filter(position => 
        position.symbol.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching positions:', error);
      throw new Error('Failed to search positions');
    }
  }

  /**
   * Get allocation breakdown by sector
   */
  async getSectorAllocation(userId: string) {
    try {
      const positions = await this.getUserPositions(userId);
      const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);

      const sectorMap = new Map<string, number>();
      
      positions.forEach(position => {
        const sector = position.sector || 'Unknown';
        const currentValue = sectorMap.get(sector) || 0;
        sectorMap.set(sector, currentValue + position.marketValue);
      });

      const allocation = Array.from(sectorMap.entries()).map(([sector, value]) => ({
        sector,
        value,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
      }));

      return allocation.sort((a, b) => b.value - a.value);
    } catch (error) {
      console.error('Error calculating sector allocation:', error);
      throw new Error('Failed to calculate sector allocation');
    }
  }

  /**
   * Background update of position prices (non-blocking)
   */
  private async updatePositionPricesAsync(
    positions: PortfolioPosition[],
    currentPrices: Record<string, number>
  ): Promise<void> {
    try {
      const updates = positions.map(position => {
        const currentPrice = currentPrices[position.symbol];
        if (!currentPrice) return null;

        const marketValue = Number(position.quantity) * currentPrice;
        const unrealizedPnl = marketValue - (Number(position.quantity) * Number(position.averageCost));
        const unrealizedPnlPercent = Number(position.averageCost) > 0 
          ? (unrealizedPnl / (Number(position.quantity) * Number(position.averageCost))) * 100 
          : 0;

        return prisma.portfolioPosition.update({
          where: { id: position.id },
          data: {
            currentPrice,
            marketValue,
            unrealizedPnl,
            unrealizedPnlPercent,
            lastUpdated: new Date(),
          }
        });
      }).filter(Boolean);

      await Promise.all(updates);
    } catch (error) {
      console.error('Error updating position prices in background:', error);
    }
  }

  /**
   * Background update of portfolio summary (non-blocking)
   */
  private async updatePortfolioSummaryAsync(
    userId: string,
    summaryData: PortfolioSummaryData
  ): Promise<void> {
    try {
      await prisma.portfolioSummary.upsert({
        where: { userId },
        update: {
          totalValue: summaryData.totalValue,
          cashBalance: summaryData.cashBalance,
          totalPnl: summaryData.totalPnl,
          totalPnlPercent: summaryData.totalPnlPercent,
          numberOfPositions: summaryData.numberOfPositions,
          lastUpdated: new Date(),
        },
        create: {
          userId,
          totalValue: summaryData.totalValue,
          cashBalance: summaryData.cashBalance,
          totalPnl: summaryData.totalPnl,
          totalPnlPercent: summaryData.totalPnlPercent,
          numberOfPositions: summaryData.numberOfPositions,
          lastUpdated: new Date(),
        }
      });
    } catch (error) {
      console.error('Error updating portfolio summary in background:', error);
    }
  }
}

export const portfolioService = new PortfolioService();
