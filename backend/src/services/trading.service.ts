import { PrismaClient, Prisma } from '@prisma/client';
import marketDataService from './marketData.service';
import portfolioService from './portfolio.service';
import { AuditService } from './audit.service';

const prisma = new PrismaClient();

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  lastUpdated: Date;
}

export interface TradeOrder {
  userId: string;
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  orderType: 'market';
  estimatedPrice?: number;
  estimatedTotal?: number;
}

export interface TradePreview {
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  currentPrice: number;
  estimatedTotal: number;
  fees: number;
  netAmount: number;
  availableCash: number;
  availableShares?: number;
  riskValidation: {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  };
}

export interface ExecutedTrade {
  id: string;
  userId: string;
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  totalAmount: number;
  fees: number;
  netAmount: number;
  status: 'completed' | 'failed';
  executedAt: Date;
  createdAt: Date;
}

class TradingService {
  private readonly TRADING_FEE = 0; // Commission-free trading for demo

  /**
   * Get real-time price quote for a symbol
   */
  async getQuote(symbol: string): Promise<StockQuote> {
    try {
      const response = await marketDataService.getStockPrice(symbol);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to get quote');
      }
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get quote for ${symbol}`);
    }
  }

  /**
   * Search available stocks for trading
   */
  async searchStocks(query: string) {
    try {
      const availableStocks = marketDataService.getAvailableStocks();
      
      if (!query || query.length < 1) {
        return availableStocks.slice(0, 10); // Return first 10 if no query
      }

      const queryLower = query.toLowerCase();
      return availableStocks.filter((stock: any) => 
        stock.symbol.toLowerCase().includes(queryLower) ||
        stock.name.toLowerCase().includes(queryLower)
      ).slice(0, 10);
    } catch (error) {
      throw new Error('Failed to search stocks');
    }
  }

  /**
   * Preview a trade before execution
   */
  async previewTrade(userId: string, order: TradeOrder): Promise<TradePreview> {
    try {
      // Get current market price
      const quote = await this.getQuote(order.symbol);
      const currentPrice = quote.price;

      // Calculate trade amounts
      const estimatedTotal = currentPrice * order.quantity;
      const fees = this.calculateFees(estimatedTotal);
      const netAmount = order.type === 'buy' 
        ? estimatedTotal + fees 
        : estimatedTotal - fees;

      // Get user's current portfolio
      const portfolioSummary = await portfolioService.getPortfolioSummary(userId);
      const availableCash = portfolioSummary.availableCash;

      // For sell orders, check available shares
      let availableShares = 0;
      if (order.type === 'sell') {
        const position = portfolioSummary.positions.find((p: any) => p.symbol === order.symbol);
        availableShares = position ? position.quantity : 0;
      }

      // Risk validation
      const riskValidation = await this.validateTrade(userId, {
        ...order,
        estimatedPrice: currentPrice,
        estimatedTotal: netAmount
      }, availableCash, availableShares);

      const result: TradePreview = {
        symbol: order.symbol,
        type: order.type,
        quantity: order.quantity,
        currentPrice,
        estimatedTotal,
        fees,
        netAmount,
        availableCash,
        riskValidation
      };

      if (order.type === 'sell') {
        result.availableShares = availableShares;
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to preview trade: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute a trade order
   */
  async executeTrade(userId: string, order: TradeOrder): Promise<ExecutedTrade> {
    try {
      // Get preview to validate the trade
      const preview = await this.previewTrade(userId, order);

      // Check if trade is valid
      if (!preview.riskValidation.isValid) {
        throw new Error(`Trade validation failed: ${preview.riskValidation.errors.join(', ')}`);
      }

      // Execute the trade in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create the order record
        const orderRecord = await tx.order.create({
          data: {
            userId,
            symbol: order.symbol,
            type: order.type,
            quantity: order.quantity,
            price: new Prisma.Decimal(preview.currentPrice),
            totalAmount: new Prisma.Decimal(preview.estimatedTotal),
            status: 'completed',
            executedAt: new Date(),
          }
        });

        // Update user's account balance
        const user = await tx.user.findUnique({
          where: { id: userId }
        });

        if (!user) {
          throw new Error('User not found');
        }

        const currentBalance = parseFloat(user.accountBalance.toString());
        let newBalance: number;

        if (order.type === 'buy') {
          newBalance = currentBalance - preview.netAmount;
        } else {
          newBalance = currentBalance + preview.netAmount;
        }

        await tx.user.update({
          where: { id: userId },
          data: {
            accountBalance: new Prisma.Decimal(newBalance)
          }
        });

        // Update or create holding
        if (order.type === 'buy') {
          await this.updateHoldingAfterBuy(tx, userId, order.symbol, order.quantity, preview.currentPrice);
        } else {
          await this.updateHoldingAfterSell(tx, userId, order.symbol, order.quantity, preview.currentPrice);
        }

        return orderRecord;
      });

      // Log the trade execution
      await AuditService.log({
        userId,
        eventType: 'trading',
        eventAction: 'trade_executed',
        eventData: {
          orderId: result.id,
          symbol: order.symbol,
          type: order.type,
          quantity: order.quantity,
          price: preview.currentPrice,
          totalAmount: preview.estimatedTotal
        }
      });

      return {
        id: result.id,
        userId: result.userId,
        symbol: result.symbol,
        type: result.type as 'buy' | 'sell',
        quantity: parseFloat(result.quantity.toString()),
        price: parseFloat(result.price.toString()),
        totalAmount: parseFloat(result.totalAmount.toString()),
        fees: preview.fees,
        netAmount: preview.netAmount,
        status: 'completed',
        executedAt: result.executedAt!,
        createdAt: result.createdAt
      };

    } catch (error) {
      // Log failed trade attempt
      await AuditService.log({
        userId,
        eventType: 'trading',
        eventAction: 'trade_failed',
        eventData: {
          symbol: order.symbol,
          type: order.type,
          quantity: order.quantity,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      throw new Error(`Failed to execute trade: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user's trading history
   */
  async getTradingHistory(userId: string, limit: number = 50, offset: number = 0) {
    try {
      const orders = await prisma.order.findMany({
        where: { userId },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit
      });

      return orders.map(order => ({
        id: order.id,
        symbol: order.symbol,
        type: order.type,
        quantity: parseFloat(order.quantity.toString()),
        price: parseFloat(order.price.toString()),
        totalAmount: parseFloat(order.totalAmount.toString()),
        fees: this.TRADING_FEE,
        status: order.status,
        executedAt: order.executedAt,
        createdAt: order.createdAt
      }));
    } catch (error) {
      throw new Error('Failed to get trading history');
    }
  }

  /**
   * Calculate trading fees (commission-free for demo)
   */
  private calculateFees(tradeAmount: number): number {
    return this.TRADING_FEE;
  }

  /**
   * Validate trade against risk limits and account constraints
   */
  private async validateTrade(
    userId: string, 
    order: TradeOrder, 
    availableCash: number, 
    availableShares: number
  ) {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Basic validations
    if (order.quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }

    if (!order.estimatedTotal || order.estimatedTotal <= 0) {
      errors.push('Invalid trade amount');
    }

    // Buy order validations
    if (order.type === 'buy') {
      if (!order.estimatedTotal) {
        errors.push('Cannot calculate trade amount');
      } else if (order.estimatedTotal > availableCash) {
        errors.push(`Insufficient funds. Available: $${availableCash.toFixed(2)}, Required: $${order.estimatedTotal.toFixed(2)}`);
      }

      // Position size warnings (warn if single position > 20% of portfolio)
      const portfolioValue = availableCash; // Simplified for demo
      if (order.estimatedTotal && order.estimatedTotal > portfolioValue * 0.2) {
        warnings.push('This trade represents more than 20% of your portfolio value');
      }
    }

    // Sell order validations
    if (order.type === 'sell') {
      if (order.quantity > availableShares) {
        errors.push(`Insufficient shares. Available: ${availableShares}, Requested: ${order.quantity}`);
      }
    }

    // Additional risk checks could go here (daily trading limits, etc.)

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }

  /**
   * Update holding after buy order
   */
  private async updateHoldingAfterBuy(
    tx: any, 
    userId: string, 
    symbol: string, 
    quantity: number, 
    price: number
  ) {
    const existingHolding = await tx.holding.findFirst({
      where: {
        userId,
        symbol
      }
    });

    if (existingHolding) {
      // Update existing holding - calculate new average cost
      const currentQuantity = parseFloat(existingHolding.quantity.toString());
      const currentCost = parseFloat(existingHolding.averageCost.toString());
      const newQuantity = currentQuantity + quantity;
      const newAverageCost = ((currentQuantity * currentCost) + (quantity * price)) / newQuantity;

      await tx.holding.update({
        where: { id: existingHolding.id },
        data: {
          quantity: new Prisma.Decimal(newQuantity),
          averageCost: new Prisma.Decimal(newAverageCost),
          totalCost: new Prisma.Decimal(newQuantity * newAverageCost),
          updatedAt: new Date()
        }
      });
    } else {
      // Create new holding
      await tx.holding.create({
        data: {
          userId,
          symbol,
          quantity: new Prisma.Decimal(quantity),
          averageCost: new Prisma.Decimal(price),
          totalCost: new Prisma.Decimal(quantity * price)
        }
      });
    }
  }

  /**
   * Update holding after sell order
   */
  private async updateHoldingAfterSell(
    tx: any, 
    userId: string, 
    symbol: string, 
    quantity: number, 
    price: number
  ) {
    const existingHolding = await tx.holding.findFirst({
      where: {
        userId,
        symbol
      }
    });

    if (!existingHolding) {
      throw new Error('Holding not found for sell order');
    }

    const currentQuantity = parseFloat(existingHolding.quantity.toString());
    const newQuantity = currentQuantity - quantity;

    if (newQuantity === 0) {
      // Remove holding entirely
      await tx.holding.delete({
        where: { id: existingHolding.id }
      });
    } else {
      // Update holding with reduced quantity
      const averageCost = parseFloat(existingHolding.averageCost.toString());
      await tx.holding.update({
        where: { id: existingHolding.id },
        data: {
          quantity: new Prisma.Decimal(newQuantity),
          totalCost: new Prisma.Decimal(newQuantity * averageCost),
          updatedAt: new Date()
        }
      });
    }
  }
}

export default new TradingService();
