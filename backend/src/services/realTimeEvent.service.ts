import { websocketService, WebSocketMessage, SessionStatusMessage, AlgorithmDecisionMessage, RiskAlertMessage, MarketDataMessage, SystemNotificationMessage } from './websocket.service';

export interface SessionStatus {
  sessionId: string;
  status: 'active' | 'paused' | 'completed' | 'expired' | 'emergency_stopped';
  currentPnL: number;
  totalTrades: number;
  lossLimitUtilization: number;
  timeElapsed: number;
  performanceScore: number;
}

export interface AlgorithmDecision {
  sessionId: string;
  algorithmId: string;
  decision: 'buy' | 'sell' | 'hold' | 'close_position';
  reasoning: string;
  confidence: number;
  marketData: {
    symbol: string;
    price: number;
    volume: number;
  };
}

export interface TradeExecution {
  sessionId: string;
  tradeId: string;
  symbol: string;
  action: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: Date;
  pnl?: number;
}

export interface PositionUpdate {
  sessionId: string;
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  timestamp: Date;
}

export interface RiskAlert {
  sessionId: string;
  alertLevel: 'warning' | 'critical' | 'emergency';
  alertType: 'loss_limit' | 'time_limit' | 'volatility' | 'correlation';
  message: string;
  currentValue: number;
  threshold: number;
}

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
}

export interface SessionSummary {
  sessionId: string;
  userId: string;
  totalPnL: number;
  totalTrades: number;
  winRate: number;
  duration: number;
  performanceScore: number;
}

export class RealTimeEventService {
  /**
   * Emit session started event
   */
  async emitSessionStarted(sessionId: string, userId: string): Promise<void> {
    const message: SystemNotificationMessage = {
      type: 'system_notification',
      title: 'Session Started',
      message: `Trading session ${sessionId.slice(-8)} has been started`,
      severity: 'info',
      timestamp: new Date(),
      userId
    };

    await websocketService.broadcastToUser(userId, message);
    await websocketService.broadcastToChannel(`session:${sessionId}`, message);
  }

  /**
   * Emit session status update
   */
  async emitSessionStatusUpdate(sessionId: string, status: SessionStatus): Promise<void> {
    const message: SessionStatusMessage = {
      type: 'session_status',
      sessionId,
      status: status.status,
      timestamp: new Date(),
      data: {
        currentPnL: status.currentPnL,
        totalTrades: status.totalTrades,
        lossLimitUtilization: status.lossLimitUtilization,
        timeElapsed: status.timeElapsed,
        performanceScore: status.performanceScore
      }
    };

    // Broadcast to session channel and user channel
    await websocketService.broadcastToChannel(`session:${sessionId}`, message);
    
    // Also send to session analytics channel for dashboard updates
    await websocketService.broadcastToChannel(`analytics:${sessionId}`, message);
  }

  /**
   * Emit session completed event
   */
  async emitSessionCompleted(sessionId: string, summary: SessionSummary): Promise<void> {
    const statusMessage: SessionStatusMessage = {
      type: 'session_status',
      sessionId,
      status: 'completed',
      timestamp: new Date(),
      data: {
        currentPnL: summary.totalPnL,
        totalTrades: summary.totalTrades,
        lossLimitUtilization: 0,
        timeElapsed: summary.duration,
        performanceScore: summary.performanceScore
      }
    };

    const notificationMessage: SystemNotificationMessage = {
      type: 'system_notification',
      title: 'Session Completed',
      message: `Trading session completed with ${summary.totalPnL >= 0 ? 'profit' : 'loss'} of $${Math.abs(summary.totalPnL).toFixed(2)}`,
      severity: summary.totalPnL >= 0 ? 'info' : 'warning',
      timestamp: new Date(),
      userId: summary.userId
    };

    await websocketService.broadcastToUser(summary.userId, statusMessage);
    await websocketService.broadcastToUser(summary.userId, notificationMessage);
    await websocketService.broadcastToChannel(`session:${sessionId}`, statusMessage);
  }

  /**
   * Emit algorithm decision
   */
  async emitAlgorithmDecision(decision: AlgorithmDecision): Promise<void> {
    const message: AlgorithmDecisionMessage = {
      type: 'algorithm_decision',
      sessionId: decision.sessionId,
      algorithmId: decision.algorithmId,
      decision: decision.decision,
      reasoning: decision.reasoning,
      confidence: decision.confidence,
      timestamp: new Date(),
      marketData: decision.marketData
    };

    await websocketService.broadcastToChannel(`session:${decision.sessionId}`, message);
    await websocketService.broadcastToChannel(`algorithms:${decision.algorithmId}`, message);
  }

  /**
   * Emit trade executed event
   */
  async emitTradeExecuted(trade: TradeExecution): Promise<void> {
    const notificationMessage: SystemNotificationMessage = {
      type: 'system_notification',
      title: 'Trade Executed',
      message: `${trade.action.toUpperCase()} ${trade.quantity} ${trade.symbol} @ $${trade.price.toFixed(2)}`,
      severity: 'info',
      timestamp: new Date()
    };

    await websocketService.broadcastToChannel(`session:${trade.sessionId}`, notificationMessage);
  }

  /**
   * Emit position update
   */
  async emitPositionUpdate(position: PositionUpdate): Promise<void> {
    const notificationMessage: SystemNotificationMessage = {
      type: 'system_notification',
      title: 'Position Update',
      message: `${position.symbol}: ${position.quantity} shares, P&L: $${position.unrealizedPnL.toFixed(2)}`,
      severity: position.unrealizedPnL >= 0 ? 'info' : 'warning',
      timestamp: new Date()
    };

    await websocketService.broadcastToChannel(`session:${position.sessionId}`, notificationMessage);
  }

  /**
   * Emit risk alert
   */
  async emitRiskAlert(alert: RiskAlert): Promise<void> {
    const message: RiskAlertMessage = {
      type: 'risk_alert',
      sessionId: alert.sessionId,
      alertLevel: alert.alertLevel,
      alertType: alert.alertType,
      message: alert.message,
      currentValue: alert.currentValue,
      threshold: alert.threshold,
      timestamp: new Date()
    };

    const notificationMessage: SystemNotificationMessage = {
      type: 'system_notification',
      title: `Risk Alert - ${alert.alertLevel.toUpperCase()}`,
      message: alert.message,
      severity: alert.alertLevel === 'emergency' ? 'error' : alert.alertLevel === 'critical' ? 'warning' : 'info',
      timestamp: new Date()
    };

    await websocketService.broadcastToChannel(`session:${alert.sessionId}`, message);
    await websocketService.broadcastToChannel(`session:${alert.sessionId}`, notificationMessage);
    
    // Also broadcast to risk monitoring channel
    await websocketService.broadcastToChannel('risk_alerts', message);
  }

  /**
   * Emit loss limit warning
   */
  async emitLossLimitWarning(sessionId: string, utilization: number): Promise<void> {
    const alertLevel: 'warning' | 'critical' | 'emergency' = 
      utilization >= 95 ? 'emergency' : 
      utilization >= 80 ? 'critical' : 'warning';

    const alert: RiskAlert = {
      sessionId,
      alertLevel,
      alertType: 'loss_limit',
      message: `Loss limit utilization at ${utilization.toFixed(1)}%`,
      currentValue: utilization,
      threshold: 100
    };

    await this.emitRiskAlert(alert);
  }

  /**
   * Emit emergency stop
   */
  async emitEmergencyStop(sessionId: string, reason: string): Promise<void> {
    const alert: RiskAlert = {
      sessionId,
      alertLevel: 'emergency',
      alertType: 'loss_limit',
      message: `Emergency stop triggered: ${reason}`,
      currentValue: 100,
      threshold: 100
    };

    const statusMessage: SessionStatusMessage = {
      type: 'session_status',
      sessionId,
      status: 'emergency_stopped',
      timestamp: new Date(),
      data: {
        currentPnL: 0,
        totalTrades: 0,
        lossLimitUtilization: 100,
        timeElapsed: 0,
        performanceScore: 0
      }
    };

    await this.emitRiskAlert(alert);
    await websocketService.broadcastToChannel(`session:${sessionId}`, statusMessage);
  }

  /**
   * Emit market data update
   */
  async emitMarketDataUpdate(symbol: string, data: MarketData): Promise<void> {
    const message: MarketDataMessage = {
      type: 'market_data',
      symbol: data.symbol,
      price: data.price,
      change: data.change,
      changePercent: data.changePercent,
      volume: data.volume,
      timestamp: new Date()
    };

    await websocketService.broadcastToChannel(`market:${symbol}`, message);
    await websocketService.broadcastToChannel('market_data', message);
  }

  /**
   * Emit volatility alert
   */
  async emitVolatilityAlert(symbol: string, volatility: number): Promise<void> {
    const message: SystemNotificationMessage = {
      type: 'system_notification',
      title: 'High Volatility Alert',
      message: `${symbol} showing high volatility: ${volatility.toFixed(2)}%`,
      severity: 'warning',
      timestamp: new Date()
    };

    await websocketService.broadcastToChannel(`market:${symbol}`, message);
    await websocketService.broadcastToChannel('volatility_alerts', message);
  }

  /**
   * Emit system maintenance notification
   */
  async emitSystemMaintenance(title: string, message: string, scheduledTime?: Date): Promise<void> {
    const notification: SystemNotificationMessage = {
      type: 'system_notification',
      title,
      message: scheduledTime 
        ? `${message} Scheduled for: ${scheduledTime.toLocaleString()}`
        : message,
      severity: 'info',
      timestamp: new Date()
    };

    // Broadcast to all connected users
    await websocketService.broadcastToChannel('system_notifications', notification);
  }

  /**
   * Subscribe user to session-specific events
   */
  async subscribeUserToSession(userId: string, sessionId: string): Promise<void> {
    // This would be called when a user starts monitoring a specific session
    // In practice, the WebSocket client would handle this subscription
    console.log(`User ${userId} subscribed to session ${sessionId} events`);
  }

  /**
   * Emit performance milestone alert
   */
  async emitPerformanceMilestone(sessionId: string, userId: string, milestone: string, value: number): Promise<void> {
    const message: SystemNotificationMessage = {
      type: 'system_notification',
      title: 'Performance Milestone',
      message: `${milestone}: ${value >= 0 ? '+' : ''}$${value.toFixed(2)}`,
      severity: 'info',
      timestamp: new Date(),
      userId
    };

    await websocketService.broadcastToUser(userId, message);
  }

  /**
   * Emit analytics update for dashboard
   */
  async emitAnalyticsUpdate(userId: string, data: any): Promise<void> {
    const message: SystemNotificationMessage = {
      type: 'system_notification',
      title: 'Analytics Updated',
      message: 'Performance analytics have been refreshed',
      severity: 'info',
      timestamp: new Date(),
      userId
    };

    await websocketService.broadcastToChannel(`analytics:${userId}`, message);
  }
}

// Singleton instance
export const realTimeEventService = new RealTimeEventService();
