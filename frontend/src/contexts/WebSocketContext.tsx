import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useWebSocket, useRealTimeNotifications } from '../hooks/useWebSocket';
import { ConnectionState } from '../types/websocket';

interface WebSocketContextType {
  connectionState: ConnectionState;
  isConnected: boolean;
  error: string | null;
  notifications: any[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
  wsUrl?: string;
  token?: string;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ 
  children, 
  wsUrl = 'ws://localhost:3003/ws',
  token 
}) => {
  const { connectionState, error, isConnected } = useWebSocket(wsUrl, token);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useRealTimeNotifications();

  // Log connection state changes for debugging
  useEffect(() => {
    console.log('WebSocket connection state:', connectionState);
  }, [connectionState]);

  const contextValue: WebSocketContextType = {
    connectionState,
    isConnected,
    error,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};
