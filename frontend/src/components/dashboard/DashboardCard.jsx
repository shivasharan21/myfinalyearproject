// frontend/src/components/dashboard/DashboardCard.jsx
import React from 'react';
// FIX: DashboardOverview previously used require() inside a React component body,
// which is invalid in ES-module / Vite environments and throws at runtime.
// Icons are now imported at the top level.
import {
  HomeIcon,
  CalendarIcon,
  UsersIcon,
  RefreshIcon,
} from '../icons/icons';

export const DashboardCard = ({
  title,
  subtitle,
  icon,
  children,
  footer,
  action,
  loading = false,
  error = null,
  isEmpty = false,
  emptyMessage = 'No data available',
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {icon && (
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600 flex-shrink-0">
                {icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
            </div>
          </div>
          {action && (
            <button
              onClick={action.onClick}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {action.label}
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600 text-sm font-medium">{error}</p>
          </div>
        ) : isEmpty ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </div>

      {footer && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-sm text-gray-600">
          {footer}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

export const StatCard = ({ label, value, icon, trend, color = 'blue' }) => {
  const colorClasses = {
    blue:   'bg-blue-50 text-blue-600 border-blue-200',
    green:  'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    red:    'bg-red-50 text-red-600 border-red-200',
  };

  return (
    <div className={`p-6 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium opacity-75">{label}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-bold">{value}</p>
            {trend && (
              <span className={`text-sm font-semibold ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
                {trend.positive ? '+' : '-'}{trend.value}
              </span>
            )}
          </div>
        </div>
        {icon && (
          <div className="w-12 h-12 rounded-lg bg-current opacity-10 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

export const AppointmentListItem = ({ appointment, onAction, actions = [] }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':  return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':  return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':  return 'bg-red-100 text-red-800 border-red-200';
      default:           return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="font-semibold text-gray-900">
            {appointment.doctorName || appointment.patientName}
          </p>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
            <span>{new Date(appointment.date).toLocaleDateString()}</span>
            <span>{appointment.time}</span>
          </div>
          {appointment.reason && (
            <p className="text-xs text-gray-500 mt-2">{appointment.reason}</p>
          )}
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(appointment.status)}`}>
          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
        </span>
      </div>

      {actions.length > 0 && (
        <div className="flex gap-2 pt-3 border-t border-gray-100">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => onAction(action.id, appointment._id)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                action.primary
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

// FIX: icons are now top-level imports, not require() inside the component body
export const DashboardOverview = ({ stats, appointments, onRefresh }) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's your overview</p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshIcon />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard label="Total Appointments" value={stats?.totalAppointments || 0} icon={<CalendarIcon />} color="blue" />
        <StatCard label="Upcoming"           value={stats?.upcomingAppointments || 0} icon={<HomeIcon />} color="green" />
        <StatCard label="Patients"           value={stats?.totalPatients || 0} icon={<UsersIcon />} color="purple" />
      </div>

      <DashboardCard
        title="Upcoming Appointments"
        subtitle="Next scheduled consultations"
        icon={<CalendarIcon />}
        isEmpty={!appointments || appointments.length === 0}
        emptyMessage="No upcoming appointments scheduled"
        action={{ label: 'Book New', onClick: () => {} }}
      >
        <div className="space-y-3">
          {(appointments || []).slice(0, 5).map((appointment) => (
            <AppointmentListItem
              key={appointment._id}
              appointment={appointment}
              onAction={(actionId, appointmentId) => {
                console.log('Action:', actionId, 'Appointment:', appointmentId);
              }}
              actions={
                appointment.status === 'confirmed'
                  ? [
                      { id: 'join', label: 'Join Call', primary: true },
                      { id: 'cancel', label: 'Cancel' },
                    ]
                  : []
              }
            />
          ))}
        </div>
      </DashboardCard>
    </div>
  );
};