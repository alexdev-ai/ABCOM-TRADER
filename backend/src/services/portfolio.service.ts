import { PrismaClient } from '@prisma/client';
import { AuditService } from './audit.service';
import { riskManagementService } from './riskManagement.service';
import { lossLimitEnforcementService } from './lossLimitEnforcement.service';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface PortfolioPosition {
  id: number;
  userId: string;
  symbol: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  sector?: string;
  allocation: number; // Percentage of total portfolio
  dayChange: number;
  dayChangePercent: number;
  lastUpdated: Date;
}

export interface PortfolioSummary {
  userId: string;
  totalValue: number;
  cashBalance: number;
  investedValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  dayChange: number;
  dayChangePercent: number;
  numberOfPositions: number;
  positions: PortfolioPosition[];
  topGainer?: PortfolioPosition | undefined;
  topLoser?: PortfolioPosition | undefined;
  sectorAllocation: Record<string, number>;
  riskMetrics: {
    portfolioVolatility: number;
    concentrationRisk: number;
    riskScore: number;
  };
  lastUpdated: Date;
}

export interface MarketPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  lastUpdated: Date;
}

export interface PositionUpdate {
  userId: string;
  symbol: string;
  quantity: number;
  averageCost: number;
  transactionType: 'BUY' | 'SELL';
  price: number;
}

class PortfolioService {

  /**
   * Get comprehensive portfolio summary for a user
   */
  async getPortfolioSummary(userId: string, includePositions: boolean = true): Promise<PortfolioSummary> {
    try {
      // Get user cash balance
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { accountBalance: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const cashBalance = user.accountBalance.toNumber();

      // Get all portfolio positions
      const dbPositions = await prisma.portfolioPosition.findMany({
        where: { userId },
        orderBy: { marketValue: 'desc' }
      });

      // Update positions with current market prices
      await this.updatePositionPrices(userId);

      // Get updated positions after price refresh
      const updatedDbPositions = await prisma.portfolioPosition.findMany({
        where: { userId },
        orderBy: { marketValue: 'desc' }
      });

      // Calculate portfolio metrics
      const positions: PortfolioPosition[] = [];
      let totalInvestedValue = 0;
      let totalMarketValue = 0;
      let totalPnl = 0;

      for (const pos of updatedDbPositions) {
        const position: PortfolioPosition = {
          id: pos.id,
          userId: pos.userId,
          symbol: pos.symbol,
          quantity: pos.quantity.toNumber(),
          averageCost: pos.averageCost.toNumber(),
          currentPrice: pos.currentPrice?.toNumber() || 0,
          marketValue: pos.marketValue?.toNumber() || 0,
          unrealizedPnl: pos.unrealizedPnl?.toNumber() || 0,
          unrealizedPnlPercent: pos.unrealizedPnlPercent?.toNumber() || 0,
          sector: pos.sector || 'Unknown',
          allocation: 0, // Will calculate after total
          dayChange: 0, // Will calculate from price data
          dayChangePercent: 0,
          lastUpdated: pos.lastUpdated
        };

        totalInvestedValue += position.quantity * position.averageCost;
        totalMarketValue += position.marketValue;
        totalPnl += position.unrealizedPnl;

        positions.push(position);
      }

      const totalPortfolioValue = totalMarketValue + cashBalance;
      const totalPnlPercent = totalInvestedValue > 0 ? (totalPnl / totalInvestedValue) * 100 : 0;

      // Calculate position allocations
      positions.forEach(position => {
        position.allocation = totalPortfolioValue > 0 
          ? (position.marketValue / totalPortfolioValue) * 100 
          : 0;
      });

      // Find top gainer and loser
      const gainers = positions.filter(p => p.unrealizedPnl > 0).sort((a, b) => b.unrealizedPnlPercent - a.unrealizedPnlPercent);
      const losers = positions.filter(p => p.unrealizedPnl < 0).sort((a, b) => a.unrealizedPnlPercent - b.unrealizedPnlPercent);

      // Calculate sector allocation
      const sectorAllocation = this.calculateSectorAllocation(positions);

      // Get risk metrics
      const riskMetrics = await this.calculateRiskMetrics(userId, positions);

      // Update portfolio summary in database
      await this.updatePortfolioSummary(userId, {
        totalValue: totalPortfolioValue,
        cashBalance,
        totalPnl,
        totalPnlPercent,
        numberOfPositions: positions.length
      });

      const summary: PortfolioSummary = {
        userId,
        totalValue: totalPortfolioValue,
        cashBalance,
        investedValue: totalInvestedValue,
        totalPnl,
        totalPnlPercent,
        dayChange: 0, // TODO: Implement day change calculation
        dayChangePercent: 0,
        numberOfPositions: positions.length,
        positions: includePositions ? positions : [],
        topGainer: gainers[0],
        topLoser: losers[0],
        sectorAllocation,
        riskMetrics,
        lastUpdated: new Date()
      };

      // Log portfolio access
      await AuditService.log({
        userId,
        eventType: 'portfolio',
        eventAction: 'PORTFOLIO_VIEWED',
        eventData: {
          totalValue: totalPortfolioValue,
          numberOfPositions: positions.length,
          totalPnl,
          timestamp: new Date().toISOString()
        }
      });

      return summary;

    } catch (error) {
      console.error('Error getting portfolio summary:', error);
      throw new Error('Failed to retrieve portfolio summary');
    }
  }

  /**
   * Get individual position details
   */
  async getPosition(userId: string, symbol: string): Promise<PortfolioPosition | null> {
    try {
      const position = await prisma.portfolioPosition.findFirst({
        where: { userId, symbol }
      });

      if (!position) {
        return null;
      }

      // Update with current price
      await this.updatePositionPrice(userId, symbol);

      // Get updated position
      const updatedPosition = await prisma.portfolioPosition.findFirst({
        where: { userId, symbol }
      });

      if (!updatedPosition) {
        return null;
      }

      // Get portfolio total for allocation calculation
      const summary = await this.getPortfolioSummary(userId, false);

      return {
        id: updatedPosition.id,
        userId: updatedPosition.userId,
        symbol: updatedPosition.symbol,
        quantity: updatedPosition.quantity.toNumber(),
        averageCost: updatedPosition.averageCost.toNumber(),
        currentPrice: updatedPosition.currentPrice?.toNumber() || 0,
        marketValue: updatedPosition.marketValue?.toNumber() || 0,
        unrealizedPnl: updatedPosition.unrealizedPnl?.toNumber() || 0,
        unrealizedPnlPercent: updatedPosition.unrealizedPnlPercent?.toNumber() || 0,
        sector: updatedPosition.sector || 'Unknown',
        allocation: summary.totalValue > 0 
          ? ((updatedPosition.marketValue?.toNumber() || 0) / summary.totalValue) * 100 
          : 0,
        dayChange: 0, // TODO: Implement day change
        dayChangePercent: 0,
        lastUpdated: updatedPosition.lastUpdated
      };

    } catch (error) {
      console.error('Error getting position:', error);
      throw new Error('Failed to retrieve position');
    }
  }

  /**
   * Update position after trade execution
   */
  async updatePosition(update: PositionUpdate): Promise<PortfolioPosition> {
    try {
      const { userId, symbol, quantity, averageCost, transactionType, price } = update;

      // Get existing position
      let existingPosition = await prisma.portfolioPosition.findFirst({
        where: { userId, symbol }
      });

      let newQuantity: number;
      let newAverageCost: number;

      if (existingPosition) {
        const existingQty = existingPosition.quantity.toNumber();
        const existingAvgCost = existingPosition.averageCost.toNumber();

        if (transactionType === 'BUY') {
          // Add to existing position
          newQuantity = existingQty + quantity;
          newAverageCost = ((existingQty * existingAvgCost) + (quantity * price)) / newQuantity;
        } else {
          // SELL - reduce position
          newQuantity = existingQty - quantity;
          newAverageCost = existingAvgCost; // Keep same average cost basis

          if (newQuantity < 0) {
            throw new Error('Cannot sell more shares than owned');
          }
        }

        if (newQuantity === 0) {
          // Position closed - delete record
          await prisma.portfolioPosition.delete({
            where: { id: existingPosition.id }
          });

          // Log position closure
          await AuditService.log({
            userId,
            eventType: 'portfolio',
            eventAction: 'POSITION_CLOSED',
            eventData: {
              symbol,
              finalQuantity: 0,
              realizedPnl: (price - existingAvgCost) * quantity,
              timestamp: new Date().toISOString()
            }
          });

          throw new Error('Position closed');
        }

        // Update existing position
        existingPosition = await prisma.portfolioPosition.update({
          where: { id: existingPosition.id },
          data: {
            quantity: newQuantity,
            averageCost: newAverageCost,
            lastUpdated: new Date()
          }
        });

      } else {
        // Create new position (only for BUY transactions)
        if (transactionType !== 'BUY') {
          throw new Error('Cannot sell shares for non-existing position');
        }

        newQuantity = quantity;
        newAverageCost = price;

        existingPosition = await prisma.portfolioPosition.create({
          data: {
            userId,
            symbol,
            quantity: newQuantity,
            averageCost: newAverageCost,
            sector: await this.getSymbolSector(symbol)
          }
        });
      }

      // Update position with current market price and recalculate metrics
      await this.updatePositionPrice(userId, symbol);

      // Get updated position for return
      const updatedPosition = await this.getPosition(userId, symbol);

      if (!updatedPosition) {
        throw new Error('Failed to retrieve updated position');
      }

      // Log position update
      await AuditService.log({
        userId,
        eventType: 'portfolio',
        eventAction: 'POSITION_UPDATED',
        eventData: {
          symbol,
          transactionType,
          quantity,
          price,
          newQuantity,
          newAverageCost,
          timestamp: new Date().toISOString()
        }
      });

      return updatedPosition;

    } catch (error) {
      console.error('Error updating position:', error);
      throw new Error('Failed to update position');
    }
  }

  /**
   * Update all positions with current market prices
   */
  async updatePositionPrices(userId: string): Promise<void> {
    try {
      const positions = await prisma.portfolioPosition.findMany({
        where: { userId }
      });

      for (const position of positions) {
        await this.updatePositionPrice(userId, position.symbol);
      }

    } catch (error) {
      console.error('Error updating position prices:', error);
      throw new Error('Failed to update position prices');
    }
  }

  /**
   * Update single position with current market price
   */
  async updatePositionPrice(userId: string, symbol: string): Promise<void> {
    try {
      // Get current market price
      const currentPrice = await this.getCurrentPrice(symbol);
      
      if (!currentPrice) {
        console.warn(`No price data available for ${symbol}`);
        return;
      }

      // Get existing position to calculate new values
      const position = await prisma.portfolioPosition.findFirst({
        where: { userId, symbol }
      });

      if (!position) {
        return;
      }

      const quantity = position.quantity.toNumber();
      const averageCost = position.averageCost.toNumber();
      const price = currentPrice.price;

      // Calculate new values
      const marketValue = quantity * price;
      const unrealizedPnl = marketValue - (quantity * averageCost);
      const unrealizedPnlPercent = averageCost > 0 ? (unrealizedPnl / (quantity * averageCost)) * 100 : 0;

      // Update position with calculated values
      await prisma.portfolioPosition.updateMany({
        where: { userId, symbol },
        data: {
          currentPrice: price,
          marketValue: marketValue,
          unrealizedPnl: unrealizedPnl,
          unrealizedPnlPercent: unrealizedPnlPercent,
          lastUpdated: new Date()
        }
      });

    } catch (error) {
      console.error(`Error updating price for ${symbol}:`, error);
      // Don't throw - continue with other positions
    }
  }

  /**
   * Get current market price for symbol
   */
  async getCurrentPrice(symbol: string): Promise<MarketPrice | null> {
    try {
      // Try to get from database cache first
      const cachedPrice = await prisma.stockPrice.findUnique({
        where: { symbol }
      });

      // If cached price is recent (within 1 minute), use it
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      if (cachedPrice && cachedPrice.lastUpdated > oneMinuteAgo) {
        return {
          symbol: cachedPrice.symbol,
          price: cachedPrice.price.toNumber(),
          change: cachedPrice.change.toNumber(),
          changePercent: cachedPrice.changePercent.toNumber(),
          volume: cachedPrice.volume,
          lastUpdated: cachedPrice.lastUpdated
        };
      }

      // Fetch fresh price data (simplified - in production, use real market data API)
      const freshPrice = await this.fetchMarketPrice(symbol);
      
      if (freshPrice) {
        // Update cache
        await prisma.stockPrice.upsert({
          where: { symbol },
          update: {
            price: freshPrice.price,
            change: freshPrice.change,
            changePercent: freshPrice.changePercent,
            volume: freshPrice.volume,
            lastUpdated: new Date()
          },
          create: {
            symbol,
            price: freshPrice.price,
            change: freshPrice.change,
            changePercent: freshPrice.changePercent,
            volume: freshPrice.volume,
            lastUpdated: new Date()
          }
        });
      }

      return freshPrice;

    } catch (error) {
      console.error(`Error getting price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get positions with performance ranking
   */
  async getPositionsByPerformance(
    userId: string,
    sortBy: 'pnl' | 'pnl_percent' | 'market_value' = 'pnl_percent',
    order: 'asc' | 'desc' = 'desc'
  ): Promise<PortfolioPosition[]> {
    try {
      await this.updatePositionPrices(userId);

      const orderBy: any = {};
      switch (sortBy) {
        case 'pnl':
          orderBy.unrealizedPnl = order;
          break;
        case 'pnl_percent':
          orderBy.unrealizedPnlPercent = order;
          break;
        case 'market_value':
          orderBy.marketValue = order;
          break;
      }

      const positions = await prisma.portfolioPosition.findMany({
        where: { userId },
        orderBy
      });

      const summary = await this.getPortfolioSummary(userId, false);

      return positions.map(pos => ({
        id: pos.id,
        userId: pos.userId,
        symbol: pos.symbol,
        quantity: pos.quantity.toNumber(),
        averageCost: pos.averageCost.toNumber(),
        currentPrice: pos.currentPrice?.toNumber() || 0,
        marketValue: pos.marketValue?.toNumber() || 0,
        unrealizedPnl: pos.unrealizedPnl?.toNumber() || 0,
        unrealizedPnlPercent: pos.unrealizedPnlPercent?.toNumber() || 0,
        sector: pos.sector || 'Unknown',
        allocation: summary.totalValue > 0 
          ? ((pos.marketValue?.toNumber() || 0) / summary.totalValue) * 100 
          : 0,
        dayChange: 0,
        dayChangePercent: 0,
        lastUpdated: pos.lastUpdated
      }));

    } catch (error) {
      console.error('Error getting positions by performance:', error);
      throw new Error('Failed to retrieve positions by performance');
    }
  }

  /**
   * Calculate portfolio diversity and risk metrics
   */
  async getPortfolioAnalytics(userId: string): Promise<{
    diversityScore: number;
    concentrationRisk: number;
    sectorExposure: Record<string, number>;
    correlationRisk: number;
    volatilityRisk: number;
    recommendations: string[];
  }> {
    try {
      const positions = await this.getPositionsByPerformance(userId);
      const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);

      // Calculate concentration risk (Herfindahl-Hirschman Index)
      const concentrationRisk = positions.reduce((sum, pos) => {
        const weight = pos.marketValue / totalValue;
        return sum + (weight * weight);
      }, 0);

      // Calculate sector exposure
      const sectorExposure: Record<string, number> = {};
      positions.forEach(pos => {
        const sector = pos.sector || 'Unknown';
        sectorExposure[sector] = (sectorExposure[sector] || 0) + pos.allocation;
      });

      // Calculate diversity score (inverse of concentration)
      const diversityScore = Math.max(0, 100 - (concentrationRisk * 100));

      // Generate recommendations
      const recommendations: string[] = [];
      
      if (concentrationRisk > 0.3) {
        recommendations.push('Consider diversifying your portfolio - high concentration risk detected');
      }

      const maxSectorExposure = Math.max(...Object.values(sectorExposure));
      if (maxSectorExposure > 50) {
        recommendations.push('Consider reducing sector concentration - over 50% in single sector');
      }

      if (positions.length < 5) {
        recommendations.push('Consider adding more positions to improve diversification');
      }

      return {
        diversityScore,
        concentrationRisk: concentrationRisk * 100,
        sectorExposure,
        correlationRisk: 0, // Simplified - would need correlation data
        volatilityRisk: 0, // Simplified - would need volatility calculations
        recommendations
      };

    } catch (error) {
      console.error('Error getting portfolio analytics:', error);
      throw new Error('Failed to retrieve portfolio analytics');
    }
  }

  // Private helper methods

  private async updatePortfolioSummary(userId: string, data: {
    totalValue: number;
    cashBalance: number;
    totalPnl: number;
    totalPnlPercent: number;
    numberOfPositions: number;
  }): Promise<void> {
    await prisma.portfolioSummary.upsert({
      where: { userId },
      update: {
        totalValue: data.totalValue,
        cashBalance: data.cashBalance,
        totalPnl: data.totalPnl,
        totalPnlPercent: data.totalPnlPercent,
        numberOfPositions: data.numberOfPositions,
        lastUpdated: new Date()
      },
      create: {
        userId,
        totalValue: data.totalValue,
        cashBalance: data.cashBalance,
        totalPnl: data.totalPnl,
        totalPnlPercent: data.totalPnlPercent,
        numberOfPositions: data.numberOfPositions
      }
    });
  }

  private calculateSectorAllocation(positions: PortfolioPosition[]): Record<string, number> {
    const sectorAllocation: Record<string, number> = {};
    
    positions.forEach(position => {
      const sector = position.sector || 'Unknown';
      sectorAllocation[sector] = (sectorAllocation[sector] || 0) + position.allocation;
    });

    return sectorAllocation;
  }

  private async calculateRiskMetrics(userId: string, positions: PortfolioPosition[]): Promise<{
    portfolioVolatility: number;
    concentrationRisk: number;
    riskScore: number;
  }> {
    try {
      // Get risk assessment if available
      const riskAssessment = await riskManagementService.getCurrentRiskAssessment(userId);
      
      // Calculate concentration risk
      const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);
      const concentrationRisk = positions.reduce((sum, pos) => {
        const weight = totalValue > 0 ? pos.marketValue / totalValue : 0;
        return sum + (weight * weight);
      }, 0) * 100;

      return {
        portfolioVolatility: 0, // Simplified - would calculate from historical data
        concentrationRisk,
        riskScore: riskAssessment?.riskScore || 0
      };

    } catch (error) {
      console.error('Error calculating risk metrics:', error);
      return {
        portfolioVolatility: 0,
        concentrationRisk: 0,
        riskScore: 0
      };
    }
  }

  private async getSymbolSector(symbol: string): Promise<string> {
    // Simplified sector mapping - in production, use real sector data
    const sectorMap: Record<string, string> = {
      'AAPL': 'Technology',
      'GOOGL': 'Technology',
      'MSFT': 'Technology',
      'AMZN': 'Consumer Discretionary',
      'TSLA': 'Consumer Discretionary',
      'JPM': 'Financial Services',
      'BAC': 'Financial Services',
      'JNJ': 'Healthcare',
      'PFE': 'Healthcare',
      'XOM': 'Energy',
      'CVX': 'Energy'
    };

    return sectorMap[symbol] || 'Unknown';
  }

  private async fetchMarketPrice(symbol: string): Promise<MarketPrice | null> {
    try {
      // Simplified mock price data - in production, use real market data API (Alpaca, IEX, etc.)
      const basePrice = this.getMockBasePrice(symbol);
      const randomVariation = (Math.random() - 0.5) * 0.1; // ±5% variation
      const price = basePrice * (1 + randomVariation);
      const change = price - basePrice;
      const changePercent = (change / basePrice) * 100;

      return {
        symbol,
        price: Math.round(price * 100) / 100, // Round to 2 decimal places
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        volume: Math.floor(Math.random() * 1000000) + 100000,
        lastUpdated: new Date()
      };

    } catch (error) {
      console.error(`Error fetching market price for ${symbol}:`, error);
      return null;
    }
  }

  private getMockBasePrice(symbol: string): number {
    // Mock base prices for common stocks
    const basePrices: Record<string, number> = {
      'AAPL': 180.00,
      'GOOGL': 140.00,
      'MSFT': 380.00,
      'AMZN': 145.00,
      'TSLA': 250.00,
      'JPM': 155.00,
      'BAC': 35.00,
      'JNJ': 165.00,
      'PFE': 30.00,
      'XOM': 110.00,
      'CVX': 150.00,
      'NVDA': 450.00,
      'META': 320.00,
      'NFLX': 420.00,
      'DIS': 95.00
    };

    return basePrices[symbol] || 100.00; // Default $100 for unknown symbols
  }
}

export const portfolioService = new PortfolioService();
