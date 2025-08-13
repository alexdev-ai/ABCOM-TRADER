// WebSocket Message Types
export interface WebSocketMessage {
  type: string;
  timestamp?: Date;
  [key: string]: any;
}

export interface SessionStatusMessage extends WebSocketMessage {
  type: 'session_status';
  sessionId: string;
  status: 'active' | 'paused' | 'completed' | 'expired' | 'emergency_stopped';
  timestamp: Date;
  data: {
    currentPnL: number;
    totalTrades: number;
    lossLimitUtilization: number;
    timeElapsed: number;
    performanceScore: number;
  };
}

export interface AlgorithmDecisionMessage extends WebSocketMessage {
  type: 'algorithm_decision';
  sessionId: string;
  algorithmId: string;
  decision: 'buy' | 'sell' | 'hold' | 'close_position';
  reasoning: string;
  confidence: number;
  timestamp: Date;
  marketData: {
    symbol: string;
    price: number;
    volume: number;
  };
}

export interface MarketDataMessage extends WebSocketMessage {
  type: 'market_data';
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
}

export interface RiskAlertMessage extends WebSocketMessage {
  type: 'risk_alert';
  sessionId: string;
  alertLevel: 'warning' | 'critical' | 'emergency';
  alertType: 'loss_limit' | 'time_limit' | 'volatility' | 'correlation';
  message: string;
  currentValue: number;
  threshold: number;
  timestamp: Date;
}

export interface SystemNotificationMessage extends WebSocketMessage {
  type: 'system_notification';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: Date;
  userId?: string;
}

export interface HeartbeatMessage extends WebSocketMessage {
  type: 'heartbeat';
  timestamp: Date;
}

export interface SubscriptionMessage extends WebSocketMessage {
  type: 'subscribe' | 'unsubscribe';
  channels: string[];
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  userId?: string;
}

export interface RealTimeSessionMetrics {
  sessionId: string;
  currentPnL: number;
  totalTrades: number;
  lossLimitUtilization: number;
  timeElapsed: number;
  performanceScore: number;
  riskScore: number;
  status: 'active' | 'paused' | 'completed' | 'expired' | 'emergency_stopped';
}

export interface MarketDataUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
}
