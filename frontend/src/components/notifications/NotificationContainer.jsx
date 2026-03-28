// frontend/src/components/notifications/NotificationContainer.jsx
import React, { useState, useCallback, useRef } from 'react';
import { CloseIcon, AlertIcon, CheckIcon, InfoIcon, PhoneIcon } from '../icons/Icons';

const NotificationContext = React.createContext();

export const useNotification = () => {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const autoCloseTimersRef = useRef({});

  const addNotification = useCallback((notification) => {
    const id = Date.now();
    const fullNotification = {
      id,
      type: 'info',
      autoClose: true,
      duration: 5000,
      ...notification,
    };

    setNotifications(prev => [...prev, fullNotification]);

    // Show browser notification if applicable
    if (['error', 'success', 'warning'].includes(fullNotification.type)) {
      showBrowserNotification(fullNotification);
    }

    // Auto-close handling
    if (fullNotification.autoClose && fullNotification.duration) {
      const timer = setTimeout(() => {
        removeNotification(id);
      }, fullNotification.duration);

      autoCloseTimersRef.current[id] = timer;
    }

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    // Clear auto-close timer
    if (autoCloseTimersRef.current[id]) {
      clearTimeout(autoCloseTimersRef.current[id]);
      delete autoCloseTimersRef.current[id];
    }

    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const handleAction = useCallback((notificationId, actionType, actionData) => {
    if (notifications.find(n => n.id === notificationId)?.onAction) {
      notifications
        .find(n => n.id === notificationId)
        .onAction(actionType, actionData);
    }
    removeNotification(notificationId);
  }, [notifications, removeNotification]);

  return (
    <NotificationContext.Provider value={{ addNotification, removeNotification, handleAction }}>
      {children}
      <NotificationContainer notifications={notifications} />
    </NotificationContext.Provider>
  );
};

const NotificationContainer = ({ notifications }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md pointer-events-none">
      {notifications.map(notification => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </div>
  );
};

const NotificationItem = ({ notification }) => {
  const { removeNotification, handleAction } = useNotification();
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => removeNotification(notification.id), 300);
  };

  const getStyles = () => {
    const baseStyles = 'rounded-lg shadow-lg border-l-4 p-4 backdrop-blur-sm transition-all duration-300 pointer-events-auto';
    const exitStyles = isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0';

    switch (notification.type) {
      case 'success':
        return `${baseStyles} ${exitStyles} bg-green-50 border-green-400 text-green-900`;
      case 'error':
        return `${baseStyles} ${exitStyles} bg-red-50 border-red-400 text-red-900`;
      case 'warning':
        return `${baseStyles} ${exitStyles} bg-yellow-50 border-yellow-400 text-yellow-900`;
      case 'call':
        return `${baseStyles} ${exitStyles} bg-blue-50 border-blue-400 text-blue-900`;
      default:
        return `${baseStyles} ${exitStyles} bg-gray-50 border-gray-400 text-gray-900`;
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckIcon />;
      case 'error':
        return <AlertIcon />;
      case 'warning':
        return <AlertIcon />;
      case 'call':
        return <PhoneIcon />;
      default:
        return <InfoIcon />;
    }
  };

  return (
    <div className={getStyles()}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>

        <div className="flex-1">
          {notification.title && (
            <p className="font-semibold text-sm">
              {notification.title}
            </p>
          )}
          {notification.message && (
            <p className="text-sm mt-1 opacity-90">
              {notification.message}
            </p>
          )}

          {notification.actions && notification.actions.length > 0 && (
            <div className="flex gap-2 mt-3">
              {notification.actions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAction(notification.id, action.type, action.data)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded transition-all ${
                    action.primary
                      ? 'bg-current text-white opacity-100 hover:opacity-90'
                      : 'bg-white opacity-70 hover:opacity-100'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleClose}
          className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
        >
          <CloseIcon />
        </button>
      </div>

      {notification.autoClose && (
        <div className="mt-2 h-1 bg-current bg-opacity-10 rounded-full overflow-hidden">
          <div
            className="h-full bg-current opacity-30 rounded-full"
            style={{
              animation: `shrink ${notification.duration || 5000}ms linear forwards`
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

const showBrowserNotification = (notification) => {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    new Notification(notification.title || 'Notification', {
      body: notification.message || '',
      icon: '/favicon.ico',
    });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(notification.title || 'Notification', {
          body: notification.message || '',
          icon: '/favicon.ico',
        });
      }
    });
  }
};

export default NotificationProvider;