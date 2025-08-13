import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { websocketPerformanceService } from './websocketPerformance.service';

// WebSocket Message Types
export type WebSocketMessage = 
  | SessionStatusMessage
  | AlgorithmDecisionMessage
  | MarketDataMessage
  | RiskAlertMessage
  | SystemNotificationMessage
  | HeartbeatMessage
  | SubscriptionMessage;

export interface SessionStatusMessage {
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

export interface AlgorithmDecisionMessage {
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

export interface MarketDataMessage {
  type: 'market_data';
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
}

export interface RiskAlertMessage {
  type: 'risk_alert';
  sessionId: string;
  alertLevel: 'warning' | 'critical' | 'emergency';
  alertType: 'loss_limit' | 'time_limit' | 'volatility' | 'correlation';
  message: string;
  currentValue: number;
  threshold: number;
  timestamp: Date;
}

export interface SystemNotificationMessage {
  type: 'system_notification';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: Date;
  userId?: string;
}

export interface HeartbeatMessage {
  type: 'heartbeat';
  timestamp: Date;
}

export interface SubscriptionMessage {
  type: 'subscribe' | 'unsubscribe';
  channels: string[];
}

// WebSocket Connection Interface
export interface WebSocketConnection {
  id: string;
  userId: string;
  socket: WebSocket;
  sessionId?: string;
  subscribedChannels: Set<string>;
  lastHeartbeat: Date;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
}

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private connections = new Map<string, WebSocketConnection>();
  private channels = new Map<string, Set<string>>(); // channel -> connection IDs
  private messageQueue = new Map<string, WebSocketMessage[]>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly MAX_QUEUED_MESSAGES = 100;

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server: Server): void {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this)
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    console.log('WebSocket server initialized on /ws');
  }

  /**
   * Verify client connection (authentication)
   */
  private verifyClient(info: any): boolean {
    try {
      const url = new URL(info.req.url, `http://${info.req.headers.host}`);
      const token = url.searchParams.get('token');
      
      if (!token) {
        console.log('WebSocket connection rejected: No token provided');
        return false;
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
      
      // Store user info in request for later use
      info.req.userId = decoded.userId;
      return true;
    } catch (error) {
      console.log('WebSocket connection rejected: Invalid token', error);
      return false;
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(socket: WebSocket, request: any): Promise<void> {
    const connectionId = uuidv4();
    const userId = request.userId;

    const connection: WebSocketConnection = {
      id: connectionId,
      userId,
      socket,
      subscribedChannels: new Set(),
      lastHeartbeat: new Date(),
      connectionState: 'connected'
    };

    this.connections.set(connectionId, connection);

    // Record connection in performance service
    websocketPerformanceService.recordConnection(connectionId, userId);

    // Auto-subscribe to user-specific channel
    await this.subscribeToChannel(connectionId, `user:${userId}`);

    console.log(`WebSocket connected: ${connectionId} (User: ${userId})`);

    // Handle messages
    socket.on('message', (data) => {
      this.handleMessage(connectionId, data);
    });

    // Handle disconnection
    socket.on('close', () => {
      this.handleDisconnection(connectionId);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`WebSocket error for ${connectionId}:`, error);
      connection.connectionState = 'error';
    });

    // Send queued messages if any
    await this.sendQueuedMessages(connectionId);

    // Send welcome message
    await this.sendMessage(connectionId, {
      type: 'system_notification',
      title: 'Connected',
      message: 'WebSocket connection established successfully',
      severity: 'info',
      timestamp: new Date()
    });
  }

  /**
   * Handle incoming messages from clients
   */
  private handleMessage(connectionId: string, data: any): void {
    try {
      const message = JSON.parse(data.toString()) as WebSocketMessage;
      
      switch (message.type) {
        case 'subscribe':
        case 'unsubscribe':
          this.handleSubscriptionMessage(connectionId, message as SubscriptionMessage);
          break;
        case 'heartbeat':
          this.handleHeartbeat(connectionId);
          break;
        default:
          console.log(`Unhandled message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`Error handling message from ${connectionId}:`, error);
    }
  }

  /**
   * Handle subscription/unsubscription messages
   */
  private async handleSubscriptionMessage(connectionId: string, message: SubscriptionMessage): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    for (const channel of message.channels) {
      if (message.type === 'subscribe') {
        await this.subscribeToChannel(connectionId, channel);
      } else {
        await this.unsubscribeFromChannel(connectionId, channel);
      }
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    console.log(`WebSocket disconnected: ${connectionId} (User: ${connection.userId})`);

    // Remove from all channels
    for (const channel of connection.subscribedChannels) {
      const channelConnections = this.channels.get(channel);
      if (channelConnections) {
        channelConnections.delete(connectionId);
        if (channelConnections.size === 0) {
          this.channels.delete(channel);
        }
      }
    }

    // Record disconnection in performance service
    websocketPerformanceService.recordDisconnection(connectionId);

    // Remove connection
    this.connections.delete(connectionId);
  }

  /**
   * Subscribe connection to a channel
   */
  async subscribeToChannel(connectionId: string, channel: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Add to connection's subscribed channels
    connection.subscribedChannels.add(channel);

    // Add to channel's connections
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel)!.add(connectionId);

    console.log(`Connection ${connectionId} subscribed to channel: ${channel}`);
  }

  /**
   * Unsubscribe connection from a channel
   */
  async unsubscribeFromChannel(connectionId: string, channel: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Remove from connection's subscribed channels
    connection.subscribedChannels.delete(channel);

    // Remove from channel's connections
    const channelConnections = this.channels.get(channel);
    if (channelConnections) {
      channelConnections.delete(connectionId);
      if (channelConnections.size === 0) {
        this.channels.delete(channel);
      }
    }

    console.log(`Connection ${connectionId} unsubscribed from channel: ${channel}`);
  }

  /**
   * Send message to specific connection
   */
  async sendMessage(connectionId: string, message: WebSocketMessage): Promise<boolean> {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.socket.readyState !== WebSocket.OPEN) {
      // Queue message if connection is not available
      await this.queueMessage(connectionId, message);
      return false;
    }

    const startTime = Date.now();
    
    try {
      const messageStr = JSON.stringify(message);
      const messageSize = Buffer.byteLength(messageStr, 'utf8');
      
      connection.socket.send(messageStr);
      
      // Record performance metrics
      const latency = Date.now() - startTime;
      websocketPerformanceService.recordMessageSent(connectionId, messageSize);
      websocketPerformanceService.recordLatency(connectionId, latency);
      
      return true;
    } catch (error) {
      console.error(`Error sending message to ${connectionId}:`, error);
      websocketPerformanceService.recordError(connectionId, error as Error);
      await this.queueMessage(connectionId, message);
      return false;
    }
  }

  /**
   * Broadcast message to all connections in a channel
   */
  async broadcastToChannel(channel: string, message: WebSocketMessage): Promise<number> {
    const channelConnections = this.channels.get(channel);
    if (!channelConnections) return 0;

    let successCount = 0;
    for (const connectionId of channelConnections) {
      const success = await this.sendMessage(connectionId, message);
      if (success) successCount++;
    }

    return successCount;
  }

  /**
   * Broadcast message to all connections of a specific user
   */
  async broadcastToUser(userId: string, message: WebSocketMessage): Promise<number> {
    return await this.broadcastToChannel(`user:${userId}`, message);
  }

  /**
   * Queue message for offline/disconnected clients
   */
  async queueMessage(connectionId: string, message: WebSocketMessage): Promise<void> {
    if (!this.messageQueue.has(connectionId)) {
      this.messageQueue.set(connectionId, []);
    }

    const queue = this.messageQueue.get(connectionId)!;
    queue.push(message);

    // Limit queue size
    if (queue.length > this.MAX_QUEUED_MESSAGES) {
      queue.shift(); // Remove oldest message
    }
  }

  /**
   * Send queued messages to a connection
   */
  private async sendQueuedMessages(connectionId: string): Promise<void> {
    const queue = this.messageQueue.get(connectionId);
    if (!queue || queue.length === 0) return;

    console.log(`Sending ${queue.length} queued messages to ${connectionId}`);

    for (const message of queue) {
      await this.sendMessage(connectionId, message);
    }

    // Clear queue
    this.messageQueue.delete(connectionId);
  }

  /**
   * Handle heartbeat from client
   */
  private handleHeartbeat(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastHeartbeat = new Date();
      
      // Send heartbeat response
      this.sendMessage(connectionId, {
        type: 'heartbeat',
        timestamp: new Date()
      });
    }
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Clean up stale connections
   */
  private cleanupStaleConnections(): void {
    const now = new Date();
    const staleThreshold = 60000; // 60 seconds

    for (const [connectionId, connection] of this.connections) {
      const timeSinceLastHeartbeat = now.getTime() - connection.lastHeartbeat.getTime();
      
      if (timeSinceLastHeartbeat > staleThreshold) {
        console.log(`Cleaning up stale connection: ${connectionId}`);
        connection.socket.terminate();
        this.handleDisconnection(connectionId);
      }
    }
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      totalConnections: this.connections.size,
      totalChannels: this.channels.size,
      queuedMessages: Array.from(this.messageQueue.values()).reduce((sum, queue) => sum + queue.length, 0),
      connections: Array.from(this.connections.values()).map(conn => ({
        id: conn.id,
        userId: conn.userId,
        sessionId: conn.sessionId,
        channels: Array.from(conn.subscribedChannels),
        state: conn.connectionState,
        lastHeartbeat: conn.lastHeartbeat
      }))
    };
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all connections
    for (const connection of this.connections.values()) {
      connection.socket.close();
    }

    if (this.wss) {
      this.wss.close();
    }

    console.log('WebSocket server shut down');
  }
}

// Singleton instance
export const websocketService = new WebSocketService();
