import React from 'react';
import { useWebSocketContext } from '../../contexts/WebSocketContext';
import NotificationToast from './NotificationToast';

const NotificationContainer: React.FC = () => {
  const { notifications, markAsRead } = useWebSocketContext();

  // Only show unread notifications as toasts
  const unreadNotifications = notifications.filter(n => !n.read);

  const handleDismiss = (notificationId: string) => {
    markAsRead(notificationId);
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {unreadNotifications.slice(0, 5).map((notification, index) => (
        <div
          key={notification.id}
          style={{ 
            transform: `translateY(${index * 8}px)`,
            zIndex: 50 - index 
          }}
        >
          <NotificationToast
            notification={notification}
            onDismiss={handleDismiss}
            autoHide={notification.severity !== 'error'}
            hideDelay={notification.severity === 'error' ? 10000 : 5000}
          />
        </div>
      ))}
    </div>
  );
};

export default NotificationContainer;
