import React, { useState, useEffect } from 'react';
import { X, Bell, Phone, Calendar, Check, AlertCircle } from 'lucide-react';

// Notification Component
function NotificationSystem({ notifications, onDismiss, onAction }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      {notifications.map((notification) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
          onAction={onAction}
        />
      ))}
    </div>
  );
}

function NotificationCard({ notification, onDismiss, onAction }) {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(notification.id), 300);
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'call':
        return <Phone className="w-5 h-5 text-green-600" />;
      case 'appointment':
        return <Calendar className="w-5 h-5 text-blue-600" />;
      case 'success':
        return <Check className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Bell className="w-5 h-5 text-cyan-600" />;
    }
  };

  const getBgColor = () => {
    switch (notification.type) {
      case 'call':
        return 'from-green-50 to-emerald-50 border-green-200';
      case 'appointment':
        return 'from-blue-50 to-cyan-50 border-blue-200';
      case 'success':
        return 'from-green-50 to-emerald-50 border-green-200';
      case 'error':
        return 'from-red-50 to-pink-50 border-red-200';
      default:
        return 'from-cyan-50 to-blue-50 border-cyan-200';
    }
  };

  return (
    <div
      className={`bg-gradient-to-r ${getBgColor()} border-2 rounded-2xl shadow-2xl p-4 backdrop-blur-sm transition-all duration-300 ${
        isExiting ? 'opacity-0 transform translate-x-full' : 'opacity-100 transform translate-x-0'
      } animate-in slide-in-from-right`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm mb-1">
            {notification.title}
          </p>
          <p className="text-gray-600 text-xs mb-2">
            {notification.message}
          </p>
          
          {notification.actions && notification.actions.length > 0 && (
            <div className="flex space-x-2 mt-3">
              {notification.actions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onAction(notification.id, action.type);
                    handleDismiss();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    action.primary
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {notification.autoClose && (
        <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-600 to-blue-600 animate-progress" />
        </div>
      )}
    </div>
  );
}

// Browser Notification Helper
const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
};

const showBrowserNotification = (title, options) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options
    });
  }
};

// Demo Component
export default function NotificationDemo() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const addNotification = (notification) => {
    const id = Date.now();
    setNotifications((prev) => [
      ...prev,
      { id, ...notification }
    ]);

    // Show browser notification for important types
    if (['call', 'appointment'].includes(notification.type)) {
      showBrowserNotification(notification.title, {
        body: notification.message,
        tag: notification.type,
        requireInteraction: notification.type === 'call'
      });
    }

    // Auto-dismiss after 5 seconds if autoClose is true
    if (notification.autoClose) {
      setTimeout(() => {
        dismissNotification(id);
      }, 5000);
    }
  };

  const dismissNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleAction = (id, actionType) => {
    console.log('Notification action:', actionType);
    // Handle the action based on type
  };

  // Demo notifications
  const demoNotifications = [
    {
      type: 'call',
      title: 'Incoming Video Call',
      message: 'Dr. Sarah Johnson is calling you',
      actions: [
        { label: 'Accept', type: 'accept', primary: true },
        { label: 'Decline', type: 'decline' }
      ]
    },
    {
      type: 'appointment',
      title: 'Appointment Confirmed',
      message: 'Your appointment with Dr. Johnson has been confirmed for tomorrow at 2:00 PM',
      autoClose: true
    },
    {
      type: 'success',
      title: 'Appointment Completed',
      message: 'Your consultation has been marked as complete',
      autoClose: true
    },
    {
      type: 'info',
      title: 'New Message',
      message: 'You have a new message from Dr. Johnson',
      autoClose: true
    },
    {
      type: 'error',
      title: 'Connection Error',
      message: 'Failed to connect to video call. Please try again.',
      autoClose: true
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Notification System Demo
          </h1>
          <p className="text-gray-600 mb-6">
            Click the buttons below to test different notification types
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {demoNotifications.map((notification, idx) => (
              <button
                key={idx}
                onClick={() => addNotification(notification)}
                className="px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all text-sm"
              >
                Show {notification.type}
              </button>
            ))}
          </div>

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
              <Bell className="w-4 h-4 mr-2" />
              How to Use
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Import the NotificationSystem component</li>
              <li>• Manage notifications state in your app</li>
              <li>• Call addNotification() to show new notifications</li>
              <li>• Handle actions through onAction callback</li>
              <li>• Browser notifications work automatically for important types</li>
            </ul>
          </div>
        </div>
      </div>

      <NotificationSystem
        notifications={notifications}
        onDismiss={dismissNotification}
        onAction={handleAction}
      />

      <style>{`
        @keyframes progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
        .animate-progress {
          animation: progress 5s linear;
        }
        @keyframes slide-in-from-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-in {
          animation: slide-in-from-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export { NotificationSystem, requestNotificationPermission, showBrowserNotification };