import { EventEmitter } from 'events';

export interface WebSocketMetrics {
  connectionCount: number;
  totalConnections: number;
  totalDisconnections: number;
  messagesPerSecond: number;
  totalMessagesSent: number;
  totalMessagesReceived: number;
  averageLatency: number;
  errorRate: number;
  memoryUsage: number;
  channelCount: number;
  activeChannels: string[];
  connectionDuration: Map<string, number>;
  messageBacklog: number;
}

export interface ConnectionMetrics {
  connectionId: string;
  userId: string;
  connectedAt: Date;
  lastActivity: Date;
  messagesSent: number;
  messagesReceived: number;
  averageLatency: number;
  subscribedChannels: string[];
}

export interface PerformanceAlert {
  type: 'high_connection_count' | 'high_message_rate' | 'high_latency' | 'high_error_rate' | 'memory_warning';
  threshold: number;
  currentValue: number;
  message: string;
  timestamp: Date;
}

export class WebSocketPerformanceService extends EventEmitter {
  private metrics: WebSocketMetrics;
  private connectionMetrics = new Map<string, ConnectionMetrics>();
  private messageRateBuffer: number[] = [];
  private latencyBuffer: number[] = [];
  private errorCount = 0;
  private startTime = Date.now();
  private lastMetricsUpdate = Date.now();
  
  // Performance thresholds
  private readonly THRESHOLDS = {
    MAX_CONNECTIONS: 1000,
    MAX_MESSAGE_RATE: 10000, // messages per second
    MAX_LATENCY: 100, // milliseconds
    MAX_ERROR_RATE: 0.05, // 5%
    MAX_MEMORY_MB: 512
  };

  constructor() {
    super();
    
    this.metrics = {
      connectionCount: 0,
      totalConnections: 0,
      totalDisconnections: 0,
      messagesPerSecond: 0,
      totalMessagesSent: 0,
      totalMessagesReceived: 0,
      averageLatency: 0,
      errorRate: 0,
      memoryUsage: 0,
      channelCount: 0,
      activeChannels: [],
      connectionDuration: new Map(),
      messageBacklog: 0
    };

    // Update metrics every second
    setInterval(() => this.updateMetrics(), 1000);
    
    // Clean up old data every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Record a new connection
   */
  recordConnection(connectionId: string, userId: string): void {
    const now = new Date();
    
    this.connectionMetrics.set(connectionId, {
      connectionId,
      userId,
      connectedAt: now,
      lastActivity: now,
      messagesSent: 0,
      messagesReceived: 0,
      averageLatency: 0,
      subscribedChannels: []
    });

    this.metrics.connectionCount++;
    this.metrics.totalConnections++;
    this.metrics.connectionDuration.set(connectionId, Date.now());

    this.checkPerformanceThresholds();
  }

  /**
   * Record a disconnection
   */
  recordDisconnection(connectionId: string): void {
    const connection = this.connectionMetrics.get(connectionId);
    if (connection) {
      this.connectionMetrics.delete(connectionId);
      this.metrics.connectionCount--;
      this.metrics.totalDisconnections++;
      this.metrics.connectionDuration.delete(connectionId);
    }
  }

  /**
   * Record a message sent
   */
  recordMessageSent(connectionId: string, messageSize: number): void {
    const connection = this.connectionMetrics.get(connectionId);
    if (connection) {
      connection.messagesSent++;
      connection.lastActivity = new Date();
    }
    
    this.metrics.totalMessagesSent++;
    this.messageRateBuffer.push(Date.now());
  }

  /**
   * Record a message received
   */
  recordMessageReceived(connectionId: string, messageSize: number): void {
    const connection = this.connectionMetrics.get(connectionId);
    if (connection) {
      connection.messagesReceived++;
      connection.lastActivity = new Date();
    }
    
    this.metrics.totalMessagesReceived++;
  }

  /**
   * Record message latency
   */
  recordLatency(connectionId: string, latency: number): void {
    const connection = this.connectionMetrics.get(connectionId);
    if (connection) {
      // Update rolling average
      connection.averageLatency = (connection.averageLatency + latency) / 2;
    }
    
    this.latencyBuffer.push(latency);
  }

  /**
   * Record an error
   */
  recordError(connectionId: string, error: Error): void {
    this.errorCount++;
    console.error(`WebSocket error for connection ${connectionId}:`, error);
  }

  /**
   * Record channel subscription
   */
  recordChannelSubscription(connectionId: string, channel: string): void {
    const connection = this.connectionMetrics.get(connectionId);
    if (connection && !connection.subscribedChannels.includes(channel)) {
      connection.subscribedChannels.push(channel);
    }
  }

  /**
   * Record channel unsubscription
   */
  recordChannelUnsubscription(connectionId: string, channel: string): void {
    const connection = this.connectionMetrics.get(connectionId);
    if (connection) {
      connection.subscribedChannels = connection.subscribedChannels.filter(c => c !== channel);
    }
  }

  /**
   * Update active channels
   */
  updateActiveChannels(channels: string[]): void {
    this.metrics.activeChannels = channels;
    this.metrics.channelCount = channels.length;
  }

  /**
   * Set message backlog count
   */
  setMessageBacklog(count: number): void {
    this.metrics.messageBacklog = count;
  }

  /**
   * Get current metrics
   */
  getMetrics(): WebSocketMetrics {
    return { ...this.metrics };
  }

  /**
   * Get connection metrics
   */
  getConnectionMetrics(): ConnectionMetrics[] {
    return Array.from(this.connectionMetrics.values());
  }

  /**
   * Get top connections by activity
   */
  getTopConnectionsByActivity(limit: number = 10): ConnectionMetrics[] {
    return Array.from(this.connectionMetrics.values())
      .sort((a, b) => (b.messagesSent + b.messagesReceived) - (a.messagesSent + a.messagesReceived))
      .slice(0, limit);
  }

  /**
   * Get connections with high latency
   */
  getHighLatencyConnections(threshold: number = 100): ConnectionMetrics[] {
    return Array.from(this.connectionMetrics.values())
      .filter(conn => conn.averageLatency > threshold)
      .sort((a, b) => b.averageLatency - a.averageLatency);
  }

  /**
   * Export metrics for monitoring systems
   */
  exportPrometheusMetrics(): string {
    const timestamp = Date.now();
    return `
# WebSocket Connection Metrics
websocket_connections_active ${this.metrics.connectionCount} ${timestamp}
websocket_connections_total ${this.metrics.totalConnections} ${timestamp}
websocket_disconnections_total ${this.metrics.totalDisconnections} ${timestamp}

# Message Metrics
websocket_messages_sent_total ${this.metrics.totalMessagesSent} ${timestamp}
websocket_messages_received_total ${this.metrics.totalMessagesReceived} ${timestamp}
websocket_messages_per_second ${this.metrics.messagesPerSecond} ${timestamp}
websocket_message_backlog ${this.metrics.messageBacklog} ${timestamp}

# Performance Metrics
websocket_latency_average_ms ${this.metrics.averageLatency} ${timestamp}
websocket_error_rate ${this.metrics.errorRate} ${timestamp}
websocket_memory_usage_mb ${this.metrics.memoryUsage} ${timestamp}

# Channel Metrics
websocket_channels_active ${this.metrics.channelCount} ${timestamp}
    `.trim();
  }

  /**
   * Private: Update metrics calculations
   */
  private updateMetrics(): void {
    const now = Date.now();
    const timeDiff = now - this.lastMetricsUpdate;
    
    // Calculate messages per second
    const recentMessages = this.messageRateBuffer.filter(time => now - time < 1000);
    this.metrics.messagesPerSecond = recentMessages.length;
    
    // Calculate average latency
    if (this.latencyBuffer.length > 0) {
      this.metrics.averageLatency = this.latencyBuffer.reduce((a, b) => a + b, 0) / this.latencyBuffer.length;
    }
    
    // Calculate error rate
    const totalMessages = this.metrics.totalMessagesSent + this.metrics.totalMessagesReceived;
    this.metrics.errorRate = totalMessages > 0 ? this.errorCount / totalMessages : 0;
    
    // Update memory usage
    const memUsage = process.memoryUsage();
    this.metrics.memoryUsage = Math.round(memUsage.heapUsed / 1024 / 1024); // MB
    
    this.lastMetricsUpdate = now;
    
    // Check performance thresholds
    this.checkPerformanceThresholds();
    
    // Emit metrics update
    this.emit('metrics_updated', this.metrics);
  }

  /**
   * Private: Check performance thresholds and emit alerts
   */
  private checkPerformanceThresholds(): void {
    const alerts: PerformanceAlert[] = [];
    
    // Check connection count
    if (this.metrics.connectionCount > this.THRESHOLDS.MAX_CONNECTIONS) {
      alerts.push({
        type: 'high_connection_count',
        threshold: this.THRESHOLDS.MAX_CONNECTIONS,
        currentValue: this.metrics.connectionCount,
        message: `High connection count: ${this.metrics.connectionCount} active connections`,
        timestamp: new Date()
      });
    }
    
    // Check message rate
    if (this.metrics.messagesPerSecond > this.THRESHOLDS.MAX_MESSAGE_RATE) {
      alerts.push({
        type: 'high_message_rate',
        threshold: this.THRESHOLDS.MAX_MESSAGE_RATE,
        currentValue: this.metrics.messagesPerSecond,
        message: `High message rate: ${this.metrics.messagesPerSecond} messages/second`,
        timestamp: new Date()
      });
    }
    
    // Check latency
    if (this.metrics.averageLatency > this.THRESHOLDS.MAX_LATENCY) {
      alerts.push({
        type: 'high_latency',
        threshold: this.THRESHOLDS.MAX_LATENCY,
        currentValue: this.metrics.averageLatency,
        message: `High latency: ${this.metrics.averageLatency.toFixed(2)}ms average`,
        timestamp: new Date()
      });
    }
    
    // Check error rate
    if (this.metrics.errorRate > this.THRESHOLDS.MAX_ERROR_RATE) {
      alerts.push({
        type: 'high_error_rate',
        threshold: this.THRESHOLDS.MAX_ERROR_RATE,
        currentValue: this.metrics.errorRate,
        message: `High error rate: ${(this.metrics.errorRate * 100).toFixed(2)}%`,
        timestamp: new Date()
      });
    }
    
    // Check memory usage
    if (this.metrics.memoryUsage > this.THRESHOLDS.MAX_MEMORY_MB) {
      alerts.push({
        type: 'memory_warning',
        threshold: this.THRESHOLDS.MAX_MEMORY_MB,
        currentValue: this.metrics.memoryUsage,
        message: `High memory usage: ${this.metrics.memoryUsage}MB`,
        timestamp: new Date()
      });
    }
    
    // Emit alerts
    alerts.forEach(alert => {
      this.emit('performance_alert', alert);
      console.warn(`WebSocket Performance Alert: ${alert.message}`);
    });
  }

  /**
   * Private: Clean up old data
   */
  private cleanup(): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Clean up message rate buffer (keep last minute)
    this.messageRateBuffer = this.messageRateBuffer.filter(time => time > oneMinuteAgo);
    
    // Clean up latency buffer (keep last 100 samples)
    if (this.latencyBuffer.length > 100) {
      this.latencyBuffer = this.latencyBuffer.slice(-100);
    }
    
    // Reset error count periodically
    if (now - this.startTime > 3600000) { // 1 hour
      this.errorCount = 0;
      this.startTime = now;
    }
  }
}

// Singleton instance
export const websocketPerformanceService = new WebSocketPerformanceService();
