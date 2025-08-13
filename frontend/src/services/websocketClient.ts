import { WebSocketMessage } from '../types/websocket';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WebSocketClientConfig {
  url: string;
  token?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export class WebSocketClient {
  private socket: WebSocket | null = null;
  private config: WebSocketClientConfig;
  private reconnectAttempts = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private messageHandlers = new Map<string, Function[]>();
  private connectionState: ConnectionState = 'disconnected';
  private reconnectTimer: NodeJS.Timeout | null = null;

  // Event listeners
  private onConnectionStateChange: ((state: ConnectionState) => void) | null = null;
  private onMessage: ((message: WebSocketMessage) => void) | null = null;
  private onError: ((error: Event) => void) | null = null;

  constructor(config: WebSocketClientConfig) {
    this.config = {
      reconnectInterval: 1000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      ...config
    };
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    this.setConnectionState('connecting');

    try {
      const wsUrl = new URL(this.config.url);
      if (this.config.token) {
        wsUrl.searchParams.set('token', this.config.token);
      }

      this.socket = new WebSocket(wsUrl.toString());
      
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);

    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.setConnectionState('error');
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.setConnectionState('disconnected');
  }

  /**
   * Send message to server
   */
  sendMessage(message: WebSocketMessage): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot send message:', message);
      return false;
    }

    try {
      this.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }

  /**
   * Subscribe to channel
   */
  subscribe(channels: string | string[]): void {
    const channelArray = Array.isArray(channels) ? channels : [channels];
    this.sendMessage({
      type: 'subscribe',
      channels: channelArray
    });
  }

  /**
   * Unsubscribe from channel
   */
  unsubscribe(channels: string | string[]): void {
    const channelArray = Array.isArray(channels) ? channels : [channels];
    this.sendMessage({
      type: 'unsubscribe',
      channels: channelArray
    });
  }

  /**
   * Add message handler for specific message type
   */
  addMessageHandler(type: string, handler: Function): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }

  /**
   * Remove message handler
   */
  removeMessageHandler(type: string, handler: Function): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Set connection state change listener
   */
  setConnectionStateListener(listener: (state: ConnectionState) => void): void {
    this.onConnectionStateChange = listener;
  }

  /**
   * Set general message listener
   */
  setMessageListener(listener: (message: WebSocketMessage) => void): void {
    this.onMessage = listener;
  }

  /**
   * Set error listener
   */
  setErrorListener(listener: (error: Event) => void): void {
    this.onError = listener;
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      connectionState: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      messageHandlers: this.messageHandlers.size,
      socketState: this.socket?.readyState
    };
  }

  // Private methods
  private handleOpen(): void {
    console.log('WebSocket connected');
    this.reconnectAttempts = 0;
    this.setConnectionState('connected');
    this.startHeartbeat();
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      // Handle heartbeat messages
      if (message.type === 'heartbeat') {
        return;
      }

      // Call general message listener
      if (this.onMessage) {
        this.onMessage(message);
      }

      // Call specific message handlers
      const handlers = this.messageHandlers.get(message.type);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(message);
          } catch (error) {
            console.error(`Error in message handler for ${message.type}:`, error);
          }
        });
      }

    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log('WebSocket disconnected:', event.code, event.reason);
    this.setConnectionState('disconnected');
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Attempt reconnection if not manually closed
    if (event.code !== 1000 && this.reconnectAttempts < this.config.maxReconnectAttempts!) {
      this.scheduleReconnect();
    }
  }

  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    this.setConnectionState('error');
    
    if (this.onError) {
      this.onError(event);
    }
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(state);
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    const delay = Math.min(
      this.config.reconnectInterval! * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    );

    console.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;
      
      try {
        await this.connect();
      } catch (error) {
        console.error('Reconnection failed:', error);
        // scheduleReconnect will be called again from handleClose
      }
    }, delay);
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.sendMessage({
          type: 'heartbeat',
          timestamp: new Date()
        });
      }
    }, this.config.heartbeatInterval!);
  }
}

// Singleton instance for app-wide use
let globalWebSocketClient: WebSocketClient | null = null;

export const getGlobalWebSocketClient = (): WebSocketClient | null => {
  return globalWebSocketClient;
};

export const initializeGlobalWebSocketClient = (config: WebSocketClientConfig): WebSocketClient => {
  if (globalWebSocketClient) {
    globalWebSocketClient.disconnect();
  }
  
  globalWebSocketClient = new WebSocketClient(config);
  return globalWebSocketClient;
};

export const disconnectGlobalWebSocketClient = (): void => {
  if (globalWebSocketClient) {
    globalWebSocketClient.disconnect();
    globalWebSocketClient = null;
  }
};
