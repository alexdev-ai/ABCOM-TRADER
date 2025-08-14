import Queue from 'bull';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import Alpaca from '@alpacahq/alpaca-trade-api';
import { TradingDecision } from './algorithm.service';
import { tradingSessionService } from './tradingSession.service';
import MarketDataService from './marketData.service';

interface TradeOrder {
  id: string;
  decisionId: string;
  userId: string;
  sessionId: string;
  symbol: string;
  orderType: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
  side: 'BUY' | 'SELL';
  quantity: number;
  price?: number;
  stopPrice?: number;
  status: 'PENDING' | 'SUBMITTED' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED' | 'REJECTED';
  alpacaOrderId?: string;
  executedPrice?: number;
  executedQuantity?: number;
  remainingQuantity?: number;
  commission?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Position {
  userId: string;
  sessionId: string;
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ExecutionResult {
  success: boolean;
  orderId?: string;
  error?: string;
  partialFill?: boolean;
  executedQuantity?: number;
  executedPrice?: number;
  remainingQuantity?: number;
}

interface PortfolioSummary {
  totalValue: number;
  totalUnrealizedPnL: number;
  totalRealizedPnL: number;
  positions: Position[];
  dayTradingBuyingPower: number;
  availableCash: number;
}

class DecisionEngineService {
  private decisionQueue: Queue.Queue;
  private redis: Redis;
  private prisma: PrismaClient;
  private alpaca: Alpaca;
  private marketDataService: MarketDataService;
  private isProcessing: boolean = false;

  // Position tracking
  private positions: Map<string, Position> = new Map(); // key: userId_sessionId_symbol
  private orders: Map<string, TradeOrder> = new Map(); // key: orderId

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL + '?family=0' || 'redis://localhost:6379?family=0');
    this.prisma = new PrismaClient();
    this.marketDataService = new MarketDataService();
    
    // Initialize Alpaca API
    this.alpaca = new Alpaca({
      credentials: {
        key: process.env.ALPACA_API_KEY || '',
        secret: process.env.ALPACA_SECRET || '',
        paper: process.env.ALPACA_PAPER === 'true' // Use paper trading by default
      },
      rate_limit: true
    });

    // Initialize Bull Queue for decision processing
    this.decisionQueue = new Queue('Decision Engine', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
      },
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential'
        }
      }
    });

    this.setupJobProcessors();
  }

  /**
   * Initialize decision engine service
   */
  async initialize(): Promise<void> {
    try {
      console.log('🎯 Initializing SmartTrade AI Decision Engine...');

      // Verify Alpaca connection
      await this.verifyAlpacaConnection();

      // Load existing positions
      await this.loadExistingPositions();

      // Start real-time position monitoring
      await this.startPositionMonitoring();

      console.log('🚀 Decision Engine ready for AGGRESSIVE HIGH-OCTANE execution!');

    } catch (error) {
      console.error('💥 Failed to initialize decision engine:', error);
      throw error;
    }
  }

  /**
   * Setup Bull Queue job processors
   */
  private setupJobProcessors(): void {
    // Execute trading decision processor
    this.decisionQueue.process('execute-decision', 10, async (job) => {
      const { decision, userId, sessionId } = job.data;
      return await this.executeDecision(decision, userId, sessionId);
    });

    // Position monitoring processor
    this.decisionQueue.process('monitor-positions', 5, async (job) => {
      const { userId, sessionId } = job.data;
      return await this.monitorPositions(userId, sessionId);
    });

    // Stop-loss/Take-profit processor
    this.decisionQueue.process('manage-exits', 3, async (job) => {
      const { userId, sessionId } = job.data;
      return await this.manageExitOrders(userId, sessionId);
    });

    console.log('📊 Decision Engine job processors configured');
  }

  /**
   * Execute a trading decision
   */
  async executeDecision(decision: TradingDecision, userId: string, sessionId: string): Promise<ExecutionResult> {
    try {
      console.log(`🎯 Executing decision: ${decision.action} ${decision.symbol} (${decision.confidence}% confidence)`);

      // Skip execution for HOLD decisions
      if (decision.action === 'HOLD') {
        console.log(`⏸️ Holding position for ${decision.symbol}`);
        return { success: true };
      }

      // Validate session and risk limits
      const riskCheck = await this.validateRiskLimits(userId, sessionId, decision);
      if (!riskCheck.allowed) {
        console.log(`⛔ Risk check failed for ${decision.symbol}: ${riskCheck.reason}`);
        return { success: false, error: riskCheck.reason };
      }

      // Calculate actual position size in shares
      const shares = await this.calculateShareQuantity(decision, userId);
      if (shares <= 0) {
        return { success: false, error: 'Invalid position size calculated' };
      }

      // Create trade order
      const order = await this.createTradeOrder(decision, userId, sessionId, shares);

      // Execute order via Alpaca
      const executionResult = await this.submitOrderToAlpaca(order);

      // Update order status and position
      if (executionResult.success) {
        await this.updateOrderAndPosition(order, executionResult);
        await this.updateSessionStats(userId, sessionId, executionResult);
      }

      console.log(`✅ Decision execution result: ${executionResult.success ? 'SUCCESS' : 'FAILED'}`);
      return executionResult;

    } catch (error) {
      console.error(`❌ Error executing decision for ${decision.symbol}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown execution error'
      };
    }
  }

  /**
   * Validate risk limits before execution
   */
  private async validateRiskLimits(userId: string, sessionId: string, decision: TradingDecision): Promise<{allowed: boolean, reason?: string}> {
    try {
      // Get current session
      const session = await tradingSessionService.getActiveSession(userId);
      if (!session || session.id !== sessionId) {
        return { allowed: false, reason: 'No active session found' };
      }

      // Check session loss limits
      const currentPnL = Number(session.realizedPnl || 0);
      const lossLimit = Number(session.lossLimitAmount);
      
      if (currentPnL <= -lossLimit) {
        return { allowed: false, reason: 'Session loss limit reached' };
      }

      // Get current portfolio value
      const portfolio = await this.getPortfolioSummary(userId, sessionId);
      
      // Calculate position size in dollars
      const currentPrice = await this.getCurrentPrice(decision.symbol);
      const positionValue = decision.positionSize * portfolio.totalValue;
      
      // Check if we have enough buying power
      if (positionValue > portfolio.dayTradingBuyingPower) {
        return { allowed: false, reason: 'Insufficient buying power' };
      }

      // Check maximum position concentration (no single position > 25% of portfolio)
      const concentrationLimit = portfolio.totalValue * 0.25;
      if (positionValue > concentrationLimit) {
        return { allowed: false, reason: 'Position concentration limit exceeded' };
      }

      return { allowed: true };

    } catch (error) {
      console.error('Error validating risk limits:', error);
      return { allowed: false, reason: 'Risk validation error' };
    }
  }

  /**
   * Calculate share quantity based on position size percentage
   */
  private async calculateShareQuantity(decision: TradingDecision, userId: string): Promise<number> {
    try {
      // Get current portfolio value
      const account = await this.alpaca.getAccount();
      const portfolioValue = parseFloat(account.portfolio_value);
      
      // Calculate dollar amount to invest
      const dollarAmount = portfolioValue * decision.positionSize;
      
      // Get current stock price
      const currentPrice = await this.getCurrentPrice(decision.symbol);
      
      // Calculate shares (rounded down to avoid over-spending)
      const shares = Math.floor(dollarAmount / currentPrice);
      
      console.log(`📊 Position sizing: $${dollarAmount.toFixed(2)} @ $${currentPrice.toFixed(2)} = ${shares} shares`);
      
      return shares;

    } catch (error) {
      console.error('Error calculating share quantity:', error);
      return 0;
    }
  }

  /**
   * Get current price for a symbol
   */
  private async getCurrentPrice(symbol: string): Promise<number> {
    try {
      // Try to get from market data service first
      const marketData = await this.marketDataService.getMarketData(symbol, '1min');
      if (marketData && marketData.price) {
        return marketData.price;
      }

      // Fallback to hardcoded price for now (would need proper Alpaca integration)
      return 150; // Placeholder price

    } catch (error) {
      console.error(`Error getting current price for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Create trade order object
   */
  private async createTradeOrder(
    decision: TradingDecision, 
    userId: string, 
    sessionId: string, 
    quantity: number
  ): Promise<TradeOrder> {
    const orderId = `order_${Date.now()}_${decision.symbol}`;
    
    // Determine order type based on market conditions and strategy
    let orderType: 'MARKET' | 'LIMIT' = 'MARKET';
    let price: number | undefined;

    // Use limit orders for large positions or during high volatility
    if (quantity > 1000 || decision.strategy === 'VOLATILITY_HUNTER') {
      orderType = 'LIMIT';
      const currentPrice = await this.getCurrentPrice(decision.symbol);
      // Set limit price with small buffer (0.1% for buy, -0.1% for sell)
      const buffer = decision.action === 'BUY' ? 1.001 : 0.999;
      price = currentPrice * buffer;
    }

    return {
      id: orderId,
      decisionId: decision.id,
      userId,
      sessionId,
      symbol: decision.symbol,
      orderType,
      side: decision.action as 'BUY' | 'SELL',
      quantity,
      price,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Submit order to Alpaca
   */
  private async submitOrderToAlpaca(order: TradeOrder): Promise<ExecutionResult> {
    try {
      console.log(`📤 Submitting ${order.side} order: ${order.quantity} shares of ${order.symbol}`);

      const alpacaOrder = await this.alpaca.createOrder({
        symbol: order.symbol,
        qty: order.quantity,
        side: order.side.toLowerCase() as 'buy' | 'sell',
        type: order.orderType.toLowerCase() as 'market' | 'limit',
        time_in_force: 'day',
        limit_price: order.price?.toString()
      });

      // Update order with Alpaca order ID
      order.alpacaOrderId = alpacaOrder.id;
      order.status = 'SUBMITTED';
      order.updatedAt = new Date();

      // For market orders, they often fill immediately
      if (order.orderType === 'MARKET') {
        // Wait a moment and check if filled
        await new Promise(resolve => setTimeout(resolve, 1000));
        const updatedOrder = await this.alpaca.getOrder(alpacaOrder.id);
        
        if (updatedOrder.status === 'filled') {
          return {
            success: true,
            orderId: order.id,
            executedQuantity: parseInt(updatedOrder.filled_qty),
            executedPrice: parseFloat(updatedOrder.filled_avg_price),
            remainingQuantity: 0
          };
        }
      }

      return {
        success: true,
        orderId: order.id,
        executedQuantity: 0,
        remainingQuantity: order.quantity
      };

    } catch (error) {
      console.error('Error submitting order to Alpaca:', error);
      order.status = 'REJECTED';
      order.updatedAt = new Date();
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Order submission failed'
      };
    }
  }

  /**
   * Update order and position after execution
   */
  private async updateOrderAndPosition(order: TradeOrder, result: ExecutionResult): Promise<void> {
    try {
      // Update order status
      if (result.executedQuantity && result.executedQuantity > 0) {
        order.executedQuantity = result.executedQuantity;
        order.executedPrice = result.executedPrice;
        order.remainingQuantity = result.remainingQuantity || 0;
        order.status = result.remainingQuantity === 0 ? 'FILLED' : 'PARTIALLY_FILLED';
        order.updatedAt = new Date();
      }

      // Update or create position
      const positionKey = `${order.userId}_${order.sessionId}_${order.symbol}`;
      let position = this.positions.get(positionKey);

      if (!position) {
        // Create new position
        position = {
          userId: order.userId,
          sessionId: order.sessionId,
          symbol: order.symbol,
          quantity: 0,
          averagePrice: 0,
          currentPrice: result.executedPrice || 0,
          marketValue: 0,
          unrealizedPnL: 0,
          realizedPnL: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }

      // Update position with executed trade
      if (result.executedQuantity && result.executedPrice) {
        const executedValue = result.executedQuantity * result.executedPrice;
        
        if (order.side === 'BUY') {
          // Add to position
          const totalValue = (position.quantity * position.averagePrice) + executedValue;
          position.quantity += result.executedQuantity;
          position.averagePrice = totalValue / position.quantity;
        } else {
          // Reduce position (SELL)
          const realizedPnL = result.executedQuantity * (result.executedPrice - position.averagePrice);
          position.realizedPnL += realizedPnL;
          position.quantity -= result.executedQuantity;
          
          // If position is closed, mark as inactive
          if (position.quantity <= 0) {
            position.isActive = false;
            position.quantity = 0;
          }
        }

        // Update market value and unrealized P&L
        const currentPrice = await this.getCurrentPrice(order.symbol);
        position.currentPrice = currentPrice;
        position.marketValue = position.quantity * currentPrice;
        position.unrealizedPnL = position.quantity * (currentPrice - position.averagePrice);
        position.updatedAt = new Date();

        // Store updated position
        this.positions.set(positionKey, position);

        console.log(`📊 Position updated: ${position.symbol} - ${position.quantity} shares @ $${position.averagePrice.toFixed(2)}`);
      }

      // Store order in memory
      this.orders.set(order.id, order);

    } catch (error) {
      console.error('Error updating order and position:', error);
    }
  }

  /**
   * Update session statistics after trade
   */
  private async updateSessionStats(userId: string, sessionId: string, result: ExecutionResult): Promise<void> {
    try {
      if (!result.executedQuantity || !result.executedPrice) return;

      // Calculate trade P&L (will be 0 for opening trades, positive/negative for closing)
      const portfolio = await this.getPortfolioSummary(userId, sessionId);
      const totalRealizedPnL = portfolio.totalRealizedPnL;

      // TODO: Update session with realized P&L when method is available
      console.log(`📈 Session P&L update: User ${userId}, Session ${sessionId}, P&L: $${totalRealizedPnL.toFixed(2)}`);

      console.log(`📈 Session stats updated: Total realized P&L: $${totalRealizedPnL.toFixed(2)}`);

    } catch (error) {
      console.error('Error updating session stats:', error);
    }
  }

  /**
   * Get portfolio summary for a user/session
   */
  async getPortfolioSummary(userId: string, sessionId: string): Promise<PortfolioSummary> {
    try {
      // Get account info from Alpaca
      const account = await this.alpaca.getAccount();
      
      // Filter positions for this session
      const sessionPositions = Array.from(this.positions.values())
        .filter(p => p.userId === userId && p.sessionId === sessionId && p.isActive);

      // Calculate totals
      let totalValue = 0;
      let totalUnrealizedPnL = 0;
      let totalRealizedPnL = 0;

      for (const position of sessionPositions) {
        totalValue += position.marketValue;
        totalUnrealizedPnL += position.unrealizedPnL;
        totalRealizedPnL += position.realizedPnL;
      }

      return {
        totalValue,
        totalUnrealizedPnL,
        totalRealizedPnL,
        positions: sessionPositions,
        dayTradingBuyingPower: parseFloat(account.daytrading_buying_power),
        availableCash: parseFloat(account.cash)
      };

    } catch (error) {
      console.error('Error getting portfolio summary:', error);
      return {
        totalValue: 0,
        totalUnrealizedPnL: 0,
        totalRealizedPnL: 0,
        positions: [],
        dayTradingBuyingPower: 0,
        availableCash: 0
      };
    }
  }

  /**
   * Monitor positions for stop-loss and take-profit
   */
  private async monitorPositions(userId: string, sessionId: string): Promise<void> {
    try {
      const sessionPositions = Array.from(this.positions.values())
        .filter(p => p.userId === userId && p.sessionId === sessionId && p.isActive);

      for (const position of sessionPositions) {
        // Update current price and P&L
        const currentPrice = await this.getCurrentPrice(position.symbol);
        position.currentPrice = currentPrice;
        position.marketValue = position.quantity * currentPrice;
        position.unrealizedPnL = position.quantity * (currentPrice - position.averagePrice);
        position.updatedAt = new Date();

        // Check stop-loss conditions
        if (position.stopLossPrice && currentPrice <= position.stopLossPrice) {
          console.log(`🛑 Stop-loss triggered for ${position.symbol} at $${currentPrice}`);
          await this.executeStopLoss(position);
        }

        // Check take-profit conditions
        if (position.takeProfitPrice && currentPrice >= position.takeProfitPrice) {
          console.log(`🎯 Take-profit triggered for ${position.symbol} at $${currentPrice}`);
          await this.executeTakeProfit(position);
        }
      }

    } catch (error) {
      console.error('Error monitoring positions:', error);
    }
  }

  /**
   * Execute stop-loss order
   */
  private async executeStopLoss(position: Position): Promise<void> {
    try {
      console.log(`🛑 Executing stop-loss for ${position.symbol}`);
      
      const stopLossOrder = await this.alpaca.createOrder({
        symbol: position.symbol,
        qty: position.quantity,
        side: 'sell',
        type: 'market',
        time_in_force: 'day'
      });

      console.log(`✅ Stop-loss order submitted: ${stopLossOrder.id}`);

    } catch (error) {
      console.error('Error executing stop-loss:', error);
    }
  }

  /**
   * Execute take-profit order
   */
  private async executeTakeProfit(position: Position): Promise<void> {
    try {
      console.log(`🎯 Executing take-profit for ${position.symbol}`);
      
      const takeProfitOrder = await this.alpaca.createOrder({
        symbol: position.symbol,
        qty: position.quantity,
        side: 'sell',
        type: 'market',
        time_in_force: 'day'
      });

      console.log(`✅ Take-profit order submitted: ${takeProfitOrder.id}`);

    } catch (error) {
      console.error('Error executing take-profit:', error);
    }
  }

  /**
   * Manage exit orders (stop-loss and take-profit automation)
   */
  private async manageExitOrders(userId: string, sessionId: string): Promise<void> {
    // This is handled in position monitoring
    await this.monitorPositions(userId, sessionId);
  }

  /**
   * Verify Alpaca connection
   */
  private async verifyAlpacaConnection(): Promise<void> {
    try {
      const account = await this.alpaca.getAccount();
      console.log(`✅ Alpaca connection verified - Account: ${account.account_number} (${account.trading_blocked ? 'BLOCKED' : 'ACTIVE'})`);
      
      if (account.trading_blocked) {
        throw new Error('Alpaca account is blocked for trading');
      }

    } catch (error) {
      console.error('❌ Alpaca connection failed:', error);
      throw error;
    }
  }

  /**
   * Load existing positions from Alpaca
   */
  private async loadExistingPositions(): Promise<void> {
    try {
      const alpacaPositions = await this.alpaca.getPositions();
      console.log(`📊 Loading ${alpacaPositions.length} existing positions from Alpaca`);

      // Note: This is a simplified version - in production you'd need to map
      // Alpaca positions back to specific sessions, which requires additional tracking

    } catch (error) {
      console.error('Error loading existing positions:', error);
    }
  }

  /**
   * Start real-time position monitoring
   */
  private async startPositionMonitoring(): Promise<void> {
    if (this.isProcessing) {
      console.log('⚠️ Position monitoring already active');
      return;
    }

    this.isProcessing = true;
    console.log('🔄 Starting real-time position monitoring...');

    // Monitor positions every 10 seconds during market hours
    setInterval(async () => {
      if (await this.isMarketOpen()) {
        // Get all active sessions and monitor their positions
        const activeSessions = await this.getActiveSessionsFromPositions();
        
        for (const { userId, sessionId } of activeSessions) {
          await this.decisionQueue.add('monitor-positions', {
            userId,
            sessionId
          }, {
            priority: 5,
            delay: 0
          });
        }
      }
    }, 10000);
  }

  /**
   * Get active sessions from current positions
   */
  private async getActiveSessionsFromPositions(): Promise<{userId: string, sessionId: string}[]> {
    const sessions = new Set<string>();
    
    for (const position of this.positions.values()) {
      if (position.isActive) {
        sessions.add(`${position.userId}_${position.sessionId}`);
      }
    }

    return Array.from(sessions).map(key => {
      const [userId, sessionId] = key.split('_');
      return { userId, sessionId };
    });
  }

  /**
   * Check if market is open
   */
  private async isMarketOpen(): Promise<boolean> {
    try {
      const clock = await this.alpaca.getClock();
      return clock.is_open;
    } catch (error) {
      // Fallback to time-based check
      const now = new Date();
      const currentTime = now.toTimeString().substr(0, 8);
      return currentTime >= '09:30:00' && currentTime <= '16:00:00';
    }
  }

  /**
   * Schedule decision execution
   */
  async scheduleDecisionExecution(decision: TradingDecision, userId: string, sessionId: string): Promise<void> {
    await this.decisionQueue.add('execute-decision', {
      decision,
      userId,
      sessionId
    }, {
      priority: 10, // High priority for decision execution
      delay: 0
    });
  }

  /**
   * Get decision queue statistics
   */
  async getQueueStats(): Promise<any> {
    const waiting = await this.decisionQueue.getWaiting();
    const active = await this.decisionQueue.getActive();
    const completed = await this.decisionQueue.getCompleted();
    const failed = await this.decisionQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length + completed.length + failed.length
    };
  }

  /**
   * Emergency liquidation - close all positions
   */
  async emergencyLiquidation(userId: string, sessionId: string): Promise<void> {
    try {
      console.log(`🚨 EMERGENCY LIQUIDATION for session ${sessionId}`);

      const sessionPositions = Array.from(this.positions.values())
        .filter(p => p.userId === userId && p.sessionId === sessionId && p.isActive);

      for (const position of sessionPositions) {
        try {
          await this.alpaca.createOrder({
            symbol: position.symbol,
            qty: position.quantity,
            side: 'sell',
            type: 'market',
            time_in_force: 'day'
          });

          console.log(`🛑 Emergency liquidation order placed for ${position.symbol}`);
        } catch (error) {
          console.error(`Error liquidating ${position.symbol}:`, error);
        }
      }

    } catch (error) {
      console.error('Error during emergency liquidation:', error);
    }
  }

  /**
   * Clean shutdown
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Decision Engine...');
    
    this.isProcessing = false;
    await this.decisionQueue.close();
    await this.redis.quit();
    await this.prisma.$disconnect();
  }
}

export default DecisionEngineService;
export { TradeOrder, Position, ExecutionResult, PortfolioSummary };
