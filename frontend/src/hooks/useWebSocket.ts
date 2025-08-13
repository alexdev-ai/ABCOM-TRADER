import { useState, useEffect, useCallback, useRef } from 'react';
import { WebSocketClient, ConnectionState, initializeGlobalWebSocketClient, getGlobalWebSocketClient } from '../services/websocketClient';
import { 
  WebSocketMessage, 
  SessionStatusMessage, 
  SystemNotificationMessage, 
  NotificationData, 
  RealTimeSessionMetrics,
  MarketDataMessage,
  RiskAlertMessage,
  AlgorithmDecisionMessage
} from '../types/websocket';

/**
 * Hook for managing WebSocket connection
 */
export const useWebSocket = (url?: string, token?: string) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<WebSocketClient | null>(null);

  // Initialize WebSocket client
  useEffect(() => {
    if (!url) return;

    try {
      const client = initializeGlobalWebSocketClient({
        url,
        token
      });

      client.setConnectionStateListener(setConnectionState);
      client.setMessageListener(setLastMessage);
      client.setErrorListener((event) => {
        setError(event.type || 'WebSocket error');
      });

      clientRef.current = client;

      // Connect
      client.connect().catch((err) => {
        console.error('Failed to connect WebSocket:', err);
        setError(err.message || 'Connection failed');
      });

      return () => {
        client.disconnect();
      };
    } catch (err) {
      console.error('Failed to initialize WebSocket:', err);
      setError(err instanceof Error ? err.message : 'Initialization failed');
    }
  }, [url, token]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    const client = getGlobalWebSocketClient();
    if (client) {
      return client.sendMessage(message);
    }
    return false;
  }, []);

  const subscribe = useCallback((channels: string | string[]) => {
    const client = getGlobalWebSocketClient();
    if (client) {
      client.subscribe(channels);
    }
  }, []);

  const unsubscribe = useCallback((channels: string | string[]) => {
    const client = getGlobalWebSocketClient();
    if (client) {
      client.unsubscribe(channels);
    }
  }, []);

  return {
    connectionState,
    lastMessage,
    error,
    sendMessage,
    subscribe,
    unsubscribe,
    isConnected: connectionState === 'connected'
  };
};

/**
 * Hook for real-time session status updates
 */
export const useRealTimeSessionStatus = (sessionId: string | null) => {
  const [sessionMetrics, setSessionMetrics] = useState<RealTimeSessionMetrics | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const client = getGlobalWebSocketClient();

  useEffect(() => {
    if (!client || !sessionId) return;

    const handleSessionStatus = (message: SessionStatusMessage) => {
      if (message.sessionId === sessionId) {
        setSessionMetrics({
          sessionId: message.sessionId,
          currentPnL: message.data.currentPnL,
          totalTrades: message.data.totalTrades,
          lossLimitUtilization: message.data.lossLimitUtilization,
          timeElapsed: message.data.timeElapsed,
          performanceScore: message.data.performanceScore,
          riskScore: Math.min(100, message.data.lossLimitUtilization + (message.data.performanceScore < 50 ? 20 : 0)),
          status: message.status
        });
        setLastUpdate(new Date());
      }
    };

    client.addMessageHandler('session_status', handleSessionStatus);

    // Subscribe to session channel
    client.subscribe(`session:${sessionId}`);

    return () => {
      client.removeMessageHandler('session_status', handleSessionStatus);
      client.unsubscribe(`session:${sessionId}`);
    };
  }, [client, sessionId]);

  return {
    sessionMetrics,
    lastUpdate,
    isLoading: sessionMetrics === null
  };
};

/**
 * Hook for real-time notifications
 */
export const useRealTimeNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const client = getGlobalWebSocketClient();

  useEffect(() => {
    if (!client) return;

    const handleSystemNotification = (message: SystemNotificationMessage) => {
      const notification: NotificationData = {
        id: `${Date.now()}-${Math.random()}`,
        title: message.title,
        message: message.message,
        severity: message.severity,
        timestamp: new Date(message.timestamp),
        read: false,
        userId: message.userId
      };

      setNotifications(prev => [notification, ...prev.slice(0, 99)]); // Keep last 100
      setUnreadCount(prev => prev + 1);
    };

    const handleRiskAlert = (message: RiskAlertMessage) => {
      const notification: NotificationData = {
        id: `risk-${Date.now()}-${Math.random()}`,
        title: `Risk Alert - ${message.alertLevel.toUpperCase()}`,
        message: message.message,
        severity: message.alertLevel === 'emergency' ? 'error' : message.alertLevel === 'critical' ? 'warning' : 'info',
        timestamp: new Date(message.timestamp),
        read: false
      };

      setNotifications(prev => [notification, ...prev.slice(0, 99)]);
      setUnreadCount(prev => prev + 1);
    };

    client.addMessageHandler('system_notification', handleSystemNotification);
    client.addMessageHandler('risk_alert', handleRiskAlert);

    return () => {
      client.removeMessageHandler('system_notification', handleSystemNotification);
      client.removeMessageHandler('risk_alert', handleRiskAlert);
    };
  }, [client]);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll
  };
};

/**
 * Hook for real-time market data
 */
export const useRealTimeMarketData = (symbols: string[]) => {
  const [marketData, setMarketData] = useState<Record<string, any>>({});
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const client = getGlobalWebSocketClient();

  useEffect(() => {
    if (!client || symbols.length === 0) return;

    const handleMarketData = (message: MarketDataMessage) => {
      if (symbols.includes(message.symbol)) {
        setMarketData(prev => ({
          ...prev,
          [message.symbol]: {
            symbol: message.symbol,
            price: message.price,
            change: message.change,
            changePercent: message.changePercent,
            volume: message.volume,
            timestamp: new Date(message.timestamp)
          }
        }));
        setLastUpdate(new Date());
      }
    };

    client.addMessageHandler('market_data', handleMarketData);

    // Subscribe to market data channels
    const channels = symbols.map(symbol => `market:${symbol}`);
    client.subscribe(channels);

    return () => {
      client.removeMessageHandler('market_data', handleMarketData);
      client.unsubscribe(channels);
    };
  }, [client, symbols]);

  return {
    marketData,
    lastUpdate,
    isLoading: Object.keys(marketData).length === 0
  };
};

/**
 * Hook for real-time algorithm decisions
 */
export const useRealTimeAlgorithmDecisions = (sessionId: string | null) => {
  const [decisions, setDecisions] = useState<AlgorithmDecisionMessage[]>([]);
  const [lastDecision, setLastDecision] = useState<AlgorithmDecisionMessage | null>(null);
  const client = getGlobalWebSocketClient();

  useEffect(() => {
    if (!client || !sessionId) return;

    const handleAlgorithmDecision = (message: AlgorithmDecisionMessage) => {
      if (message.sessionId === sessionId) {
        setDecisions(prev => [message, ...prev.slice(0, 49)]); // Keep last 50
        setLastDecision(message);
      }
    };

    client.addMessageHandler('algorithm_decision', handleAlgorithmDecision);

    // Subscribe to session channel for algorithm decisions
    client.subscribe(`session:${sessionId}`);

    return () => {
      client.removeMessageHandler('algorithm_decision', handleAlgorithmDecision);
      client.unsubscribe(`session:${sessionId}`);
    };
  }, [client, sessionId]);

  return {
    decisions,
    lastDecision,
    decisionCount: decisions.length
  };
};

/**
 * Hook for connection statistics
 */
export const useWebSocketStats = () => {
  const [stats, setStats] = useState<any>(null);
  const client = getGlobalWebSocketClient();

  useEffect(() => {
    if (!client) return;

    const updateStats = () => {
      setStats(client.getStats());
    };

    updateStats();
    const interval = setInterval(updateStats, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [client]);

  return stats;
};
