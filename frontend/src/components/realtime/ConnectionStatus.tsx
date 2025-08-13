import React from 'react';
import { ConnectionState } from '../../types/websocket';

interface ConnectionStatusProps {
  connectionState: ConnectionState;
  className?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ connectionState, className = '' }) => {
  const getStatusConfig = (state: ConnectionState) => {
    switch (state) {
      case 'connected':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200',
          icon: '🟢',
          text: 'Connected',
          description: 'Real-time updates active'
        };
      case 'connecting':
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          borderColor: 'border-yellow-200',
          icon: '🟡',
          text: 'Connecting...',
          description: 'Establishing connection'
        };
      case 'disconnected':
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200',
          icon: '⚪',
          text: 'Disconnected',
          description: 'No real-time updates'
        };
      case 'error':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200',
          icon: '🔴',
          text: 'Error',
          description: 'Connection failed'
        };
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200',
          icon: '⚪',
          text: 'Unknown',
          description: 'Status unknown'
        };
    }
  };

  const config = getStatusConfig(connectionState);

  return (
    <div className={`inline-flex items-center px-3 py-2 rounded-lg border ${config.bgColor} ${config.borderColor} ${className}`}>
      <span className="mr-2 text-lg">{config.icon}</span>
      <div className="flex flex-col">
        <span className={`text-sm font-medium ${config.color}`}>
          {config.text}
        </span>
        <span className="text-xs text-gray-500">
          {config.description}
        </span>
      </div>
    </div>
  );
};

export default ConnectionStatus;
