// frontend/src/components/NotificationSystem.jsx
import React, { useState, useEffect } from 'react';
import websocketService from '../services/websocket';

function NotificationSystem({ userId, userRole }) {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Define handlers
    const handleAppointmentUpdate = (data) => {
      addNotification({
        id: Date.now(),
        type: 'appointment',
        title: 'Appointment Update',
        message: getAppointmentMessage(data),
        timestamp: new Date(),
        read: false
      });
    };

    const handleCallIncoming = (data) => {
      addNotification({
        id: Date.now(),
        type: 'call',
        title: 'Incoming Call',
        message: `${data.callerName} is calling you`,
        timestamp: new Date(),
        read: false,
        sound: true
      });
      playNotificationSound();
    };

    // Listen for appointment updates
    websocketService.onAppointmentUpdated(handleAppointmentUpdate);

    // Listen for incoming calls
    websocketService.onCallIncoming(handleCallIncoming);

    return () => {
      // Clean up listeners
      websocketService.off('appointment:updated', handleAppointmentUpdate);
      websocketService.off('call:incoming', handleCallIncoming);
    };
  }, [userRole]);

  const getAppointmentMessage = (data) => {
    switch (data.type) {
      case 'created':
        return userRole === 'doctor' 
          ? `New appointment request from ${data.appointment.patientName}`
          : 'Your appointment has been submitted for approval';
      case 'updated':
        if (data.appointment.status === 'confirmed') {
          return userRole === 'patient'
            ? 'Your appointment has been confirmed!'
            : `Appointment with ${data.appointment.patientName} confirmed`;
        } else if (data.appointment.status === 'cancelled') {
          return 'Appointment has been cancelled';
        } else if (data.appointment.status === 'completed') {
          return 'Appointment has been completed';
        }
        return 'Appointment status updated';
      default:
        return 'Appointment notification';
    }
  };

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 10)); // Keep last 10
    
    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico'
      });
    }
  };

  const playNotificationSound = () => {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi6Hwu7aizsHGGS56+OZUQ0OT6vj7bVmGwU7k9jyz3ksBSlyw+3bjDwIGGi56OKZUQ0OT6vj7bVmGwU7k9jyz3ksBSl3x/DdkEAKFF606+uoVRQKRp/g8r5sIQYuh8Lu2os7Bxhkuevhl1UODk+r4+21ZhsFO5PY8s95LAUpd8fw3ZBAChRetevrqFUUCkaf4PK+bCEGLofC7tqLOwcYZLnr4ZdVDg5Pq+PttWYbBTuT2PLPeSwFKXfH8N2QQAoUXrXr66hVFApGn+DyvmwhBi6Hwu7ajzwHGGS56+GXVQ4OT6vj7bVmGwU7k9jyz3ksBSl3x/DdkEAKFF616+uoVRQKRp/g8r5sIQYuh8Lu2os7Bxhkuevhl1UODk+r4+21ZhsFO5PY8s95LAUpd8fw3ZBAChRetevrqFUUCkaf4PK+bCEGLofC7tqLOwcYZLnr4ZdVDg5Pq+PttWYbBTuT2PLPeSwFKXfH8N2QQAoUXrXr66hVFApGn+DyvmwhBi6Hwu7aizsHGGS56+GXVQ4OT6vj7bVmGwU7k9jyz3ksBSl3x/DdkEAKFF616+uoVRQKRp/g8r5sIQYuh8Lu2os7Bxhkuevhl1UODk+r4+21ZhsFO5PY8s95LAUpd8fw3ZBAChRetevrqFUUCkaf4PK+bCEGLofC7tqLOwcYZLnr4ZdVDg5Pq+PttWYbBTuT2PLPeSwFKXfH8N2QQAoUXrXr66hVFApGn+DyvmwhBi6Hwu7aizsHGGS56+GXVQ4OT6vj7bVmGwU7k9jyz3ksBSl3x/DdkEAKFF616+uoVRQKRp/g8r5sIQYuh8Lu2os7Bxhkuevhl1UODk+r4+21ZhsFO5PY8s95LAUpd8fw3ZBAChRetevrqFUUCkaf4PK+bCEGLofC7tqLOwcYZLnr4ZdVDg5Pq+PttWYbBTuT2PLPeSwFKXfH8N2QQAoUXrXr66hVFApGn+DyvmwhBi6Hwu7aizsHGGS56+GXVQ4OT6vj7bVmGwU7k9jyz3ksBSl3x/DdkEAKFF616+uoVRQKRp/g8r5s');
    audio.play().catch(e => console.log('Could not play sound:', e));
  };

  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {showNotifications && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowNotifications(false)}
          ></div>

          {/* Notification Panel */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">Notifications</h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-cyan-600 hover:text-cyan-700 font-medium"
                  >
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* Notification List */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <p className="text-gray-500">No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => markAsRead(notification.id)}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        notification.type === 'call' ? 'bg-green-100' :
                        notification.type === 'appointment' ? 'bg-blue-100' :
                        'bg-purple-100'
                      }`}>
                        {notification.type === 'call' ? (
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        ) : notification.type === 'appointment' ? (
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{notification.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notification.timestamp).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default NotificationSystem;