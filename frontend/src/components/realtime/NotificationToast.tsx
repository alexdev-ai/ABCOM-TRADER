import React, { useEffect, useState } from 'react';
import { NotificationData } from '../../types/websocket';

interface NotificationToastProps {
  notification: NotificationData;
  onDismiss: (id: string) => void;
  autoHide?: boolean;
  hideDelay?: number;
}

const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onDismiss,
  autoHide = true,
  hideDelay = 5000
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, hideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, hideDelay]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss(notification.id);
    }, 300); // Animation duration
  };

  const getSeverityConfig = (severity: 'info' | 'warning' | 'error') => {
    switch (severity) {
      case 'error':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconColor: 'text-red-500',
          titleColor: 'text-red-800',
          messageColor: 'text-red-700',
          icon: '🚨',
          closeColor: 'text-red-400 hover:text-red-600'
        };
      case 'warning':
        return {
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          iconColor: 'text-yellow-500',
          titleColor: 'text-yellow-800',
          messageColor: 'text-yellow-700',
          icon: '⚠️',
          closeColor: 'text-yellow-400 hover:text-yellow-600'
        };
      case 'info':
      default:
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-500',
          titleColor: 'text-blue-800',
          messageColor: 'text-blue-700',
          icon: 'ℹ️',
          closeColor: 'text-blue-400 hover:text-blue-600'
        };
    }
  };

  const config = getSeverityConfig(notification.severity);

  if (!isVisible) return null;

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 max-w-sm w-full 
        transform transition-all duration-300 ease-in-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      `}
      style={{ marginTop: '0px' }}
    >
      <div
        className={`
          rounded-lg border shadow-lg p-4 
          ${config.bgColor} ${config.borderColor}
        `}
      >
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-2xl">{config.icon}</span>
          </div>
          
          <div className="ml-3 w-0 flex-1">
            <div className={`text-sm font-medium ${config.titleColor}`}>
              {notification.title}
            </div>
            <div className={`mt-1 text-sm ${config.messageColor}`}>
              {notification.message}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {notification.timestamp.toLocaleTimeString()}
            </div>
          </div>
          
          <div className="ml-4 flex-shrink-0 flex">
            <button
              className={`
                inline-flex ${config.closeColor} 
                hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500
                rounded-md p-1.5 transition-colors
              `}
              onClick={handleDismiss}
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationToast;
