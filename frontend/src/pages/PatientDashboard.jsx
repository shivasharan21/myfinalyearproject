// frontend/src/pages/PatientDashboard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import websocketService from '../services/websocket';
import VideoCall from '../components/VideoCall';
import axios from 'axios';
import DiabetesPrediction from '../components/DiabetesPrediction';
import AppointmentBooking from '../components/AppointmentBooking';
import { Bell, Phone, X, Calendar, Check, AlertCircle } from 'lucide-react';
import HeartDiseasePrediction from '../components/HeartDiseasePrediction';

// ─── Notification components ─────────────────────────────────────────────────

function NotificationSystem({ notifications, onDismiss, onAction }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      {notifications.map((n) => (
        <NotificationCard key={n.id} notification={n} onDismiss={onDismiss} onAction={onAction} />
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

  const iconMap = {
    call: <Phone className="w-5 h-5 text-green-600" />,
    appointment: <Calendar className="w-5 h-5 text-blue-600" />,
    success: <Check className="w-5 h-5 text-green-600" />,
    error: <AlertCircle className="w-5 h-5 text-red-600" />,
  };
  const bgMap = {
    call: 'from-green-50 to-emerald-50 border-green-200',
    appointment: 'from-blue-50 to-cyan-50 border-blue-200',
    success: 'from-green-50 to-emerald-50 border-green-200',
    error: 'from-red-50 to-pink-50 border-red-200',
  };

  return (
    <div
      className={`bg-gradient-to-r ${bgMap[notification.type] || 'from-cyan-50 to-blue-50 border-cyan-200'} border-2 rounded-2xl shadow-2xl p-4 transition-all duration-300 ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}`}
      style={{ animation: 'slideIn 0.3s ease-out' }}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
          {iconMap[notification.type] || <Bell className="w-5 h-5 text-cyan-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm mb-1">{notification.title}</p>
          <p className="text-gray-600 text-xs mb-2">{notification.message}</p>
          {notification.actions?.length > 0 && (
            <div className="flex space-x-2 mt-3">
              {notification.actions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => { onAction(notification.id, action.type, action.data); handleDismiss(); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${action.primary ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={handleDismiss} className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

function PatientDashboard() {
  const { user, logout, API_URL, wsConnected } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCall, setActiveCall] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // FIX: keep a ref so the WebSocket callback always sees the latest appointments
  // without needing to be re-registered on every appointments state change.
  const appointmentsRef = useRef(appointments);
  useEffect(() => { appointmentsRef.current = appointments; }, [appointments]);

  const addNotification = useCallback((notification) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, ...notification }]);
    if (['call', 'appointment'].includes(notification.type)) {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, { body: notification.message, icon: '/favicon.ico' });
      }
    }
    if (notification.autoClose) {
      setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 5000);
    }
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleNotificationAction = useCallback((id, actionType, data) => {
    if (actionType === 'accept' && data?.appointment && data?.callData) {
      startVideoCall(data.appointment, data.callData);
    } else if (actionType === 'decline' && data?.callData) {
      websocketService.emit('call:reject', { appointmentId: data.callData.appointmentId, userId: user.id });
    }
  }, [user?.id]);

  const fetchDashboardData = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      const [statsRes, appointmentsRes] = await Promise.all([
        axios.get(`${API_URL}/stats`),
        axios.get(`${API_URL}/appointments`),
      ]);
      setStats(statsRes.data);
      setAppointments(appointmentsRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      addNotification({ type: 'error', title: 'Error', message: 'Failed to load dashboard data', autoClose: true });
    } finally {
      setLoading(false);
      if (showRefreshing) setTimeout(() => setRefreshing(false), 500);
    }
  }, [API_URL, addNotification]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    fetchDashboardData();

    const handleAppointmentUpdate = (data) => {
      fetchDashboardData(true);
      if (data.type === 'updated') {
        addNotification({ type: 'appointment', title: 'Appointment Updated', message: `Status changed to ${data.appointment?.status}`, autoClose: true });
      }
    };

    // FIX: use appointmentsRef.current so this handler never has stale data,
    // and is only registered once (no appointments in the dep array).
    const handleIncomingCall = (data) => {
      const appointment = appointmentsRef.current.find((apt) => apt._id === data.appointmentId);
      if (appointment) {
        addNotification({
          type: 'call',
          title: 'Incoming Video Call',
          message: `${data.callerName} is calling you`,
          actions: [
            { label: 'Accept', type: 'accept', primary: true, data: { appointment, callData: data } },
            { label: 'Decline', type: 'decline', data: { callData: data } },
          ],
        });
      }
    };

    websocketService.onAppointmentUpdated(handleAppointmentUpdate);
    websocketService.on('call:incoming', handleIncomingCall);

    return () => {
      websocketService.off('appointment:updated', handleAppointmentUpdate);
      websocketService.off('call:incoming', handleIncomingCall);
    };
    // FIX: removed `appointments` from dep array — ref handles freshness
  }, [fetchDashboardData, addNotification]);

  const startVideoCall = (appointment, callData = null) => {
    setActiveCall({
      appointmentId: appointment._id,
      otherUserId: appointment.doctorId._id || appointment.doctorId,
      otherUserName: appointment.doctorName,
      isDoctor: false,
      incomingCallData: callData,
    });
  };

  const cancelAppointment = async (appointmentId) => {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      await axios.patch(`${API_URL}/appointments/${appointmentId}`, { status: 'cancelled' });
      fetchDashboardData(true);
      addNotification({ type: 'success', title: 'Appointment Cancelled', message: 'Cancelled successfully', autoClose: true });
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to cancel appointment', autoClose: true });
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview stats={stats} appointments={appointments} onStartCall={startVideoCall} onCancelAppointment={cancelAppointment} onRefresh={() => fetchDashboardData(true)} />;
      case 'diabetes':   return <DiabetesPrediction />;
      case 'heart':      return <HeartDiseasePrediction />;
      case 'appointments': return <AppointmentBooking onBookingComplete={() => { fetchDashboardData(true); addNotification({ type: 'success', title: 'Appointment Booked', message: 'Booked successfully', autoClose: true }); }} />;
      case 'history':    return <AppointmentHistory appointments={appointments} onStartCall={startVideoCall} onCancelAppointment={cancelAppointment} onRefresh={() => fetchDashboardData(true)} />;
      case 'health':     return <HealthRecords />;
      case 'prescriptions': return <Prescriptions />;
      default:           return null;
    }
  };

  return (
    <>
      {activeCall && (
        <VideoCall
          appointmentId={activeCall.appointmentId}
          otherUserId={activeCall.otherUserId}
          otherUserName={activeCall.otherUserName}
          isDoctor={false}
          incomingCallData={activeCall.incomingCallData}
          onCallEnd={() => { setActiveCall(null); fetchDashboardData(true); addNotification({ type: 'info', title: 'Call Ended', message: 'The video call has ended', autoClose: true }); }}
        />
      )}

      <NotificationSystem notifications={notifications} onDismiss={dismissNotification} onAction={handleNotificationAction} />

      <div className="flex h-screen bg-gradient-to-br from-slate-50 to-gray-100">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-xl overflow-y-auto flex flex-col border-r border-gray-200">
          <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Dr.AssistAI</h1>
            <p className="text-sm text-gray-600 mt-1">Patient Portal</p>
            <div className="mt-3 flex items-center text-xs">
              <div className={`w-2 h-2 rounded-full mr-2 ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className={wsConnected ? 'text-green-600' : 'text-gray-500'}>{wsConnected ? 'Connected' : 'Offline'}</span>
            </div>
          </div>

          <div className="p-4 flex-1">
            <div className="mb-6">
              <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-100">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {user?.name?.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-600 truncate">{user?.email}</p>
                </div>
              </div>
            </div>

            <nav className="space-y-1">
              <NavButton icon={<HomeIcon />}         label="Overview"         active={activeTab === 'overview'}      onClick={() => setActiveTab('overview')} />
              <NavButton icon={<BrainIcon />}        label="Health Check"     active={activeTab === 'diabetes'}      onClick={() => setActiveTab('diabetes')} badge="AI" />
              <NavButton icon={<HeartCheckIcon />}   label="Heart Check"      active={activeTab === 'heart'}         onClick={() => setActiveTab('heart')} badge="AI" />
              <NavButton icon={<CalendarIcon />}     label="Book Appointment" active={activeTab === 'appointments'}  onClick={() => setActiveTab('appointments')} />
              <NavButton icon={<HistoryIcon />}      label="My Appointments"  active={activeTab === 'history'}       onClick={() => setActiveTab('history')} count={appointments.length} />
              <NavButton icon={<HeartIcon />}        label="Health Records"   active={activeTab === 'health'}        onClick={() => setActiveTab('health')} />
              <NavButton icon={<PrescriptionIcon />} label="Prescriptions"    active={activeTab === 'prescriptions'} onClick={() => setActiveTab('prescriptions')} />
            </nav>
          </div>

          <div className="p-4 border-t border-gray-200 bg-white">
            <button onClick={logout} className="w-full px-4 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all flex items-center justify-center space-x-2 font-medium text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-600 mb-4"></div>
                <p className="text-gray-600 font-medium">Loading your dashboard...</p>
              </div>
            ) : (
              <>
                {refreshing && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center text-blue-700">
                    <svg className="animate-spin w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    <span className="text-sm font-medium">Updating...</span>
                  </div>
                )}
                {renderContent()}
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </>
  );
}

// ─── Nav button ───────────────────────────────────────────────────────────────

function NavButton({ icon, label, active, onClick, badge, count }) {
  return (
    <button onClick={onClick} className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all duration-200 text-sm font-medium ${active ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'}`}>
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">{icon}</div>
        <span>{label}</span>
      </div>
      {badge && <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${active ? 'bg-white text-cyan-600' : 'bg-cyan-100 text-cyan-700'}`}>{badge}</span>}
      {count !== undefined && count > 0 && <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${active ? 'bg-white text-cyan-600' : 'bg-gray-200 text-gray-700'}`}>{count}</span>}
    </button>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────

function Overview({ stats, appointments, onStartCall, onCancelAppointment, onRefresh }) {
  const upcomingAppointments = appointments.filter((apt) => new Date(apt.date) >= new Date() && apt.status !== 'cancelled').slice(0, 3);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Dashboard Overview</h2>
        <button onClick={onRefresh} className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center space-x-2 text-sm font-medium text-gray-700 shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Total Appointments" value={stats?.totalAppointments || 0} icon={<CalendarIcon />} bgColor="bg-gradient-to-br from-cyan-100 to-blue-100" />
        <StatCard title="Upcoming" value={stats?.upcomingAppointments || 0} icon={<HistoryIcon />} bgColor="bg-gradient-to-br from-green-100 to-emerald-100" />
        <StatCard title="Health Checks" value={stats?.totalPredictions || 0} icon={<HeartIcon />} bgColor="bg-gradient-to-br from-purple-100 to-pink-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Upcoming Appointments
          </h3>
          {upcomingAppointments.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <p className="text-gray-500">No upcoming appointments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map((apt) => <AppointmentCard key={apt._id} apt={apt} onStartCall={onStartCall} onCancel={onCancelAppointment} />)}
            </div>
          )}
        </div>
        <HealthTipsCard />
      </div>

      <div className="mt-6"><MedicineReminder /></div>
    </div>
  );
}

function StatCard({ title, value, icon, bgColor }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-all">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className="text-4xl font-bold text-gray-800 mt-2">{value}</p>
        </div>
        <div className={`w-14 h-14 ${bgColor} rounded-2xl flex items-center justify-center shadow-sm`}>{icon}</div>
      </div>
    </div>
  );
}

function AppointmentCard({ apt, onStartCall, onCancel }) {
  const statusColor = { confirmed: 'bg-green-100 text-green-700 border-green-200', pending: 'bg-yellow-100 text-yellow-700 border-yellow-200', completed: 'bg-blue-100 text-blue-700 border-blue-200', cancelled: 'bg-red-100 text-red-700 border-red-200' };
  return (
    <div className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="font-semibold text-gray-800 mb-1">{apt.doctorName}</p>
          <p className="text-sm text-gray-600">{new Date(apt.date).toLocaleDateString()} • {apt.time}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColor[apt.status] || 'bg-gray-100 text-gray-700'}`}>{apt.status}</span>
      </div>
      {apt.status === 'confirmed' && (
        <div className="flex space-x-2 pt-3 border-t border-gray-200">
          <button onClick={() => onStartCall(apt)} className="flex-1 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:shadow-lg transition font-semibold text-sm flex items-center justify-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/></svg>
            Join Call
          </button>
          <button onClick={() => onCancel(apt._id)} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition font-semibold text-sm">Cancel</button>
        </div>
      )}
      {apt.status === 'pending' && (
        <div className="pt-3 border-t border-gray-200">
          <button onClick={() => onCancel(apt._id)} className="w-full py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition font-semibold text-sm">Cancel Appointment</button>
        </div>
      )}
    </div>
  );
}

function HealthTipsCard() {
  const tips = [
    { icon: '💧', text: 'Drink at least 8 glasses of water daily', color: 'from-blue-50 to-cyan-50 border-blue-100' },
    { icon: '🏃', text: 'Exercise for 30 minutes every day', color: 'from-green-50 to-emerald-50 border-green-100' },
    { icon: '😴', text: 'Get 7-9 hours of quality sleep', color: 'from-purple-50 to-pink-50 border-purple-100' },
    { icon: '🥗', text: 'Eat a balanced diet with fruits and vegetables', color: 'from-orange-50 to-amber-50 border-orange-100' },
  ];
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Daily Health Tips</h3>
      <div className="space-y-3">
        {tips.map((tip, idx) => (
          <div key={idx} className={`flex items-start space-x-3 p-4 bg-gradient-to-r ${tip.color} rounded-xl border`}>
            <span className="text-2xl flex-shrink-0">{tip.icon}</span>
            <p className="text-sm text-gray-700 font-medium">{tip.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FIX: MedicineReminder fetches from /api/reminders/today ─────────────────

function MedicineReminder() {
  const { API_URL } = useAuth();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/reminders/today`)
      .then((res) => setReminders(res.data))
      .catch(() => setReminders([]))
      .finally(() => setLoading(false));
  }, [API_URL]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Medicine Reminders</h3>
      {loading ? (
        <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div></div>
      ) : reminders.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">No reminders for today.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reminders.map((r) => (
            <div key={r._id} className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
              <p className="font-semibold text-gray-800">{r.medicineName} — {r.dosage}</p>
              <p className="text-sm text-gray-600 mt-1">Times: {r.times.join(', ')}</p>
              {r.instructions && <p className="text-xs text-gray-500 mt-1">{r.instructions}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── FIX: HealthRecords fetches from /api/health-records ─────────────────────

function HealthRecords() {
  const { API_URL } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/health-records`)
      .then((res) => setRecords(res.data.records || []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [API_URL]);

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Health Records</h2>
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-cyan-600"></div></div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <p className="text-gray-500">No health records yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {records.map((record) => (
            <div key={record._id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-800">{record.title}</h3>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">{record.recordType}</span>
              </div>
              {record.description && <p className="text-sm text-gray-600 mb-3">{record.description}</p>}
              {record.diagnosis && <p className="text-sm text-gray-700"><span className="font-medium">Diagnosis:</span> {record.diagnosis}</p>}
              {record.doctorId && <p className="text-xs text-gray-500 mt-2">By {record.doctorId.name}</p>}
              {record.vitals?.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {record.vitals.map((v, i) => (
                    <div key={i} className="p-2 bg-gray-50 rounded-lg text-xs">
                      <span className="font-medium text-gray-700">{v.name}:</span> {v.value} {v.unit}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-3">{new Date(record.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── FIX: Prescriptions fetches from /api/prescriptions ──────────────────────

function Prescriptions() {
  const { API_URL } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/prescriptions`)
      .then((res) => setPrescriptions(res.data.prescriptions || []))
      .catch(() => setPrescriptions([]))
      .finally(() => setLoading(false));
  }, [API_URL]);

  const requestRefill = async (id) => {
    try {
      await axios.post(`${API_URL}/prescriptions/${id}/refill`);
      alert('Refill request sent to your doctor.');
    } catch {
      alert('Failed to send refill request.');
    }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Prescriptions</h2>
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-cyan-600"></div></div>
      ) : prescriptions.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <p className="text-gray-500">No prescriptions yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          {prescriptions.map((rx) => (
            <div key={rx._id} className="p-5 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100 hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-bold text-gray-800 text-lg">{rx.diagnosis || 'Prescription'}</p>
                  <p className="text-sm text-gray-600">By {rx.doctorName} · {new Date(rx.prescribedDate).toLocaleDateString()}</p>
                  {rx.validUntil && <p className="text-xs text-gray-500 mt-0.5">Valid until {new Date(rx.validUntil).toLocaleDateString()}</p>}
                </div>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${rx.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{rx.status}</span>
              </div>
              <div className="space-y-1 mb-3">
                {rx.medicines?.map((med, i) => (
                  <div key={i} className="text-sm text-gray-700 flex items-center space-x-2">
                    <span className="w-2 h-2 bg-cyan-500 rounded-full flex-shrink-0"></span>
                    <span><span className="font-medium">{med.name}</span> {med.dosage} — {med.frequency}{med.duration ? ` for ${med.duration}` : ''}</span>
                  </div>
                ))}
              </div>
              {rx.advice && <p className="text-sm text-gray-600 italic mb-3">Advice: {rx.advice}</p>}
              <div className="flex space-x-2">
                {rx.status === 'active' && (
                  <button onClick={() => requestRefill(rx._id)} className="px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition text-sm font-semibold">
                    Request Refill
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Appointment history ──────────────────────────────────────────────────────

function AppointmentHistory({ appointments, onStartCall, onCancelAppointment, onRefresh }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Appointment History</h2>
        <button onClick={onRefresh} className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center space-x-2 text-sm font-medium text-gray-700">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          <span>Refresh</span>
        </button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {appointments.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <p className="text-gray-600 text-lg mb-2">No appointments yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Doctor', 'Date & Time', 'Reason', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {appointments.map((apt) => (
                  <tr key={apt._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-3">{apt.doctorName?.charAt(0)}</div>
                        <span className="text-sm font-medium text-gray-900">{apt.doctorName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4"><div className="text-sm text-gray-900">{new Date(apt.date).toLocaleDateString()}</div><div className="text-sm text-gray-500">{apt.time}</div></td>
                    <td className="px-6 py-4 text-sm text-gray-900">{apt.reason || 'Regular checkup'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${apt.status === 'confirmed' ? 'bg-green-100 text-green-800' : apt.status === 'completed' ? 'bg-blue-100 text-blue-800' : apt.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{apt.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {apt.status === 'confirmed' && (
                          <>
                            <button onClick={() => onStartCall(apt)} className="text-cyan-600 hover:text-cyan-900 font-semibold text-sm hover:underline">Join Call</button>
                            <span className="text-gray-300">|</span>
                            <button onClick={() => onCancelAppointment(apt._id)} className="text-red-600 hover:text-red-900 font-semibold text-sm hover:underline">Cancel</button>
                          </>
                        )}
                        {apt.status === 'pending' && (
                          <button onClick={() => onCancelAppointment(apt._id)} className="text-red-600 hover:text-red-900 font-semibold text-sm hover:underline">Cancel</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function HomeIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>; }
function BrainIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>; }
function HeartCheckIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>; }
function CalendarIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>; }
function HistoryIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>; }
function HeartIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>; }
function PrescriptionIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>; }

export default PatientDashboard;