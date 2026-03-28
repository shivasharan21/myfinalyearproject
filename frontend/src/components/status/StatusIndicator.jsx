// frontend/src/components/status/StatusIndicator.jsx
import React from 'react';

export const OnlineIndicator = ({ isOnline, size = 'md' }) => {
  const sizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <div className="flex items-center gap-1">
      <div
        className={`${sizes[size]} rounded-full transition-all ${
          isOnline
            ? 'bg-green-500 animate-pulse'
            : 'bg-gray-400'
        }`}
      />
      <span className="text-xs text-gray-600">
        {isOnline ? 'Online' : 'Offline'}
      </span>
    </div>
  );
};

export const ConnectionStatus = ({ connected }) => {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
      connected
        ? 'bg-green-50 text-green-700 border border-green-200'
        : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
    }`}>
      <div className={`w-2 h-2 rounded-full ${
        connected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-pulse'
      }`} />
      {connected ? 'Connected' : 'Reconnecting...'}
    </div>
  );
};

export const LoadingState = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mb-4" />
      <p className="text-gray-600 text-sm">{message}</p>
    </div>
  );
};

export const ErrorState = ({ message = 'Something went wrong', onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p className="text-gray-900 font-medium text-center mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          Try Again
        </button>
      )}
    </div>
  );
};

export const EmptyState = ({ title, message, icon, action }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12">
      {icon && (
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-center text-sm mb-6">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export const AppointmentStatusBadge = ({ status }) => {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    confirmed: 'bg-green-100 text-green-800 border-green-200',
    completed: 'bg-blue-100 text-blue-800 border-blue-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
    'no-show': 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
      styles[status] || styles.pending
    }`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// Status badge for user online/offline
export const UserStatusBadge = ({ isOnline, name }) => {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
      <span className="text-sm text-gray-700">{name}</span>
    </div>
  );
};