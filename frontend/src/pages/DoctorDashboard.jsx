// frontend/src/pages/DoctorDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import websocketService from '../services/websocket';
import VideoCall from '../components/VideoCall';
import apiClient from '../services/apiClient'; // FIX: was raw axios

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
  const handleDismiss = () => { setIsExiting(true); setTimeout(() => onDismiss(notification.id), 300); };
  const bgMap = { call: 'from-green-50 to-emerald-50 border-green-200', appointment: 'from-blue-50 to-cyan-50 border-blue-200', success: 'from-green-50 to-emerald-50 border-green-200', error: 'from-red-50 to-pink-50 border-red-200' };
  return (
    <div className={`bg-gradient-to-r ${bgMap[notification.type] || 'from-cyan-50 to-blue-50 border-cyan-200'} border-2 rounded-2xl shadow-2xl p-4 transition-all duration-300 ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}`} style={{ animation: 'slideIn 0.3s ease-out' }}>
      <div className="flex items-start space-x-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm mb-1">{notification.title}</p>
          <p className="text-gray-600 text-xs">{notification.message}</p>
          {notification.actions?.length > 0 && (
            <div className="flex space-x-2 mt-3">
              {notification.actions.map((action, idx) => (
                <button key={idx} onClick={() => { onAction(notification.id, action.type, action.data); handleDismiss(); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${action.primary ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-200'}`}>
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={handleDismiss} className="flex-shrink-0 text-gray-400 hover:text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
    </div>
  );
}

function DoctorDashboard() {
  const { user, logout, wsConnected } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCall, setActiveCall] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((notification) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, ...notification }]);
    if (notification.autoClose) {
      setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 5000);
    }
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleNotificationAction = useCallback((id, actionType, data) => {
    if (actionType === 'answer' && data?.callData) {
      setIncomingCall(data.callData);
    } else if (actionType === 'decline' && data?.callData) {
      websocketService.emit('call:reject', { appointmentId: data.callData.appointmentId, userId: user?.id });
      setIncomingCall(null);
    }
  }, [user?.id]);

  // FIX: use apiClient instead of raw axios
  const fetchDashboardData = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      const [statsRes, appointmentsRes] = await Promise.all([
        apiClient.get('/stats'),
        apiClient.get('/appointments'),
      ]);
      setStats(statsRes.data);
      setAppointments(appointmentsRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
      if (showRefreshing) setTimeout(() => setRefreshing(false), 500);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    const handleAppointmentUpdate = () => {
      fetchDashboardData(true);
      addNotification({ type: 'appointment', title: 'Appointment Updated', message: 'An appointment was updated', autoClose: true });
    };

    const handleNewAppointment = (data) => {
      fetchDashboardData(true);
      addNotification({ type: 'appointment', title: 'New Appointment Request', message: `${data.appointment?.patientName || 'A patient'} requested an appointment`, autoClose: true });
    };

    const handleIncomingCall = (data) => {
      setIncomingCall(data);
      addNotification({
        type: 'call',
        title: 'Incoming Video Call',
        message: `${data.callerName} is calling`,
        actions: [
          { label: 'Answer',  type: 'answer',  primary: true, data: { callData: data } },
          { label: 'Decline', type: 'decline',               data: { callData: data } },
        ],
      });
    };

    websocketService.onAppointmentUpdated(handleAppointmentUpdate);
    websocketService.on('appointment:created', handleNewAppointment);
    websocketService.on('call:incoming', handleIncomingCall);

    const interval = setInterval(() => fetchDashboardData(), 30000);

    return () => {
      websocketService.off('appointment:updated', handleAppointmentUpdate);
      websocketService.off('appointment:created', handleNewAppointment);
      websocketService.off('call:incoming', handleIncomingCall);
      clearInterval(interval);
    };
  }, [fetchDashboardData, addNotification]);

  const startVideoCall = (appointment) => {
    setActiveCall({
      appointmentId: appointment._id,
      otherUserId:   appointment.patientId?._id || appointment.patientId,
      otherUserName: appointment.patientName,
      isDoctor: true,
    });
  };

  const answerCall = () => {
    if (!incomingCall) return;
    const appointment = appointments.find((a) => a._id === incomingCall.appointmentId);
    if (appointment) {
      startVideoCall(appointment);
    } else {
      setActiveCall({ appointmentId: incomingCall.appointmentId, otherUserId: incomingCall.callerId, otherUserName: incomingCall.callerName, isDoctor: true });
    }
    setIncomingCall(null);
  };

  const rejectCall = () => {
    if (incomingCall) {
      websocketService.emit('call:reject', { appointmentId: incomingCall.appointmentId, userId: user?.id });
      setIncomingCall(null);
    }
  };

  // FIX: use apiClient instead of raw axios
  const updateStatus = async (appointmentId, status) => {
    try {
      await apiClient.patch(`/appointments/${appointmentId}`, { status });
      fetchDashboardData(true);
      addNotification({ type: 'success', title: 'Status Updated', message: `Appointment ${status}`, autoClose: true });
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to update appointment', autoClose: true });
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':     return <Overview stats={stats} appointments={appointments} onStartCall={startVideoCall} onUpdateStatus={updateStatus} onRefresh={() => fetchDashboardData(true)} />;
      case 'appointments': return <AppointmentManagement appointments={appointments} onStartCall={startVideoCall} onUpdateStatus={updateStatus} />;
      case 'patients':     return <PatientList appointments={appointments} />;
      case 'schedule':     return <ScheduleView appointments={appointments} />;
      case 'reports':      return <Reports stats={stats} appointments={appointments} />;
      default:             return null;
    }
  };

  return (
    <>
      <NotificationSystem notifications={notifications} onDismiss={dismissNotification} onAction={handleNotificationAction} />

      {incomingCall && (
        <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Incoming Call</h3>
              <p className="text-lg text-gray-600 mb-8">{incomingCall.callerName} is calling...</p>
              <div className="flex gap-4">
                <button onClick={rejectCall}  className="flex-1 py-4 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all">Decline</button>
                <button onClick={answerCall}  className="flex-1 py-4 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-all">Answer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeCall && (
        <VideoCall
          appointmentId={activeCall.appointmentId}
          otherUserId={activeCall.otherUserId}
          otherUserName={activeCall.otherUserName}
          isDoctor={true}
          onCallEnd={() => { setActiveCall(null); fetchDashboardData(true); addNotification({ type: 'info', title: 'Call Ended', message: 'The video call has ended', autoClose: true }); }}
        />
      )}

      <div className="flex h-screen bg-gradient-to-br from-slate-50 to-gray-100">
        <div className="w-64 bg-white shadow-xl overflow-y-auto flex flex-col border-r border-gray-200">
          <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Dr.AssistAI</h1>
            <p className="text-sm text-gray-600 mt-1">Doctor Portal</p>
            <div className="mt-3 flex items-center text-xs">
              <div className={`w-2 h-2 rounded-full mr-2 ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className={wsConnected ? 'text-green-600' : 'text-gray-500'}>{wsConnected ? 'Connected' : 'Offline'}</span>
            </div>
          </div>
          <div className="p-4 flex-1">
            <div className="mb-6">
              <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-100">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">Dr</div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-800 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-600 truncate">{user?.specialization}</p>
                </div>
              </div>
            </div>
            <nav className="space-y-1">
              <NavButton icon={<HomeIcon />}     label="Overview"     active={activeTab === 'overview'}     onClick={() => setActiveTab('overview')} />
              <NavButton icon={<CalendarIcon />} label="Appointments" active={activeTab === 'appointments'} onClick={() => setActiveTab('appointments')} count={appointments.filter((a) => a.status === 'pending').length} />
              <NavButton icon={<ScheduleIcon />} label="Schedule"     active={activeTab === 'schedule'}     onClick={() => setActiveTab('schedule')} />
              <NavButton icon={<PatientsIcon />} label="My Patients"  active={activeTab === 'patients'}     onClick={() => setActiveTab('patients')} />
              <NavButton icon={<ReportsIcon />}  label="Reports"      active={activeTab === 'reports'}      onClick={() => setActiveTab('reports')} />
            </nav>
          </div>
          <div className="w-full p-4 border-t border-gray-200 bg-white">
            <button onClick={logout} className="w-full px-4 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all flex items-center justify-center space-x-2 font-medium text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              <span>Logout</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-600 mb-4"></div>
                <p className="text-gray-600 font-medium">Loading dashboard...</p>
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
      <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </>
  );
}

function NavButton({ icon, label, active, onClick, count }) {
  return (
    <button onClick={onClick} className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all duration-200 text-sm font-medium ${active ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'}`}>
      <div className="flex items-center space-x-3"><div className="flex-shrink-0">{icon}</div><span>{label}</span></div>
      {count > 0 && <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${active ? 'bg-white text-cyan-600' : 'bg-red-100 text-red-700'}`}>{count}</span>}
    </button>
  );
}

function Overview({ stats, appointments, onStartCall, onUpdateStatus, onRefresh }) {
  const todayAppointments = appointments.filter((apt) => new Date(apt.date).toDateString() === new Date().toDateString());
  const pendingAppointments = appointments.filter((apt) => apt.status === 'pending').slice(0, 5);
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Dashboard Overview</h2>
        <button onClick={onRefresh} className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center space-x-2 text-sm font-medium text-gray-700 shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          <span>Refresh</span>
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard title="Today's Appointments" value={stats?.todayAppointments || 0} />
        <StatCard title="Total Patients"        value={stats?.totalPatients || 0} />
        <StatCard title="Pending Approvals"     value={pendingAppointments.length} />
        <StatCard title="Total Appointments"    value={stats?.totalAppointments || 0} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Today's Schedule</h3>
          {todayAppointments.length === 0 ? <p className="text-center text-gray-500 py-8">No appointments today</p> : (
            <div className="space-y-3">
              {todayAppointments.map((apt) => (
                <div key={apt._id} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                    <div><p className="font-semibold text-gray-800">{apt.patientName}</p><p className="text-sm text-gray-600">{apt.time}</p></div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${apt.status === 'confirmed' ? 'bg-green-100 text-green-700' : apt.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{apt.status}</span>
                  </div>
                  {apt.status === 'confirmed' && (
                    <div className="flex space-x-2">
                      <button onClick={() => onStartCall(apt)} className="flex-1 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition font-semibold text-sm">Start Call</button>
                      <button onClick={() => window.confirm('Mark complete?') && onUpdateStatus(apt._id, 'completed')} className="flex-1 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition font-semibold text-sm">Mark Complete</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Pending Approvals</h3>
          {pendingAppointments.length === 0 ? <p className="text-center text-gray-500 py-8">No pending appointments</p> : (
            <div className="space-y-3">
              {pendingAppointments.map((apt) => (
                <div key={apt._id} className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                  <p className="font-semibold text-gray-800">{apt.patientName}</p>
                  <p className="text-sm text-gray-600">{new Date(apt.date).toLocaleDateString()} at {apt.time}</p>
                  {apt.reason && <p className="text-xs text-gray-500 mt-1">{apt.reason}</p>}
                  <div className="flex space-x-2 mt-3">
                    <button onClick={() => onUpdateStatus(apt._id, 'confirmed')} className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700 transition font-semibold">✓ Confirm</button>
                    <button onClick={() => onUpdateStatus(apt._id, 'cancelled')} className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-xl hover:bg-red-700 transition font-semibold">✕ Decline</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-all">
      <p className="text-gray-600 text-sm font-medium">{title}</p>
      <p className="text-4xl font-bold text-gray-800 mt-2">{value}</p>
    </div>
  );
}

function AppointmentManagement({ appointments, onStartCall, onUpdateStatus }) {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? appointments : appointments.filter((a) => a.status === filter);
  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-3xl font-bold text-gray-800">Appointments</h2>
        <div className="flex space-x-2">
          {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === s ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        {filtered.length === 0 ? <p className="text-center text-gray-500 py-12">No appointments found</p> : (
          <div className="space-y-3">
            {filtered.map((apt) => (
              <div key={apt._id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:shadow-md transition-all">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-lg">{apt.patientName}</p>
                    <p className="text-sm text-gray-600">{new Date(apt.date).toLocaleDateString()} at {apt.time}</p>
                    {apt.reason && <p className="text-xs text-gray-500 mt-1">{apt.reason}</p>}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${apt.status === 'confirmed' ? 'bg-green-100 text-green-800' : apt.status === 'completed' ? 'bg-blue-100 text-blue-800' : apt.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{apt.status}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  {apt.status === 'confirmed' && (
                    <>
                      <button onClick={() => onStartCall(apt)} className="flex-1 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition font-semibold text-sm">Start Call</button>
                      <button onClick={() => window.confirm('Mark complete?') && onUpdateStatus(apt._id, 'completed')} className="flex-1 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition font-semibold text-sm">Complete</button>
                    </>
                  )}
                  {apt.status === 'pending' && (
                    <>
                      <button onClick={() => onUpdateStatus(apt._id, 'confirmed')} className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold text-sm">Confirm</button>
                      <button onClick={() => onUpdateStatus(apt._id, 'cancelled')} className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold text-sm">Decline</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PatientList({ appointments }) {
  const patientsMap = {};
  appointments.forEach((apt) => {
    if (apt.patientId) {
      const id = apt.patientId._id || apt.patientId;
      if (!patientsMap[id]) patientsMap[id] = { ...apt.patientId, patientName: apt.patientName, appointmentCount: 1, lastVisit: apt.date };
      else { patientsMap[id].appointmentCount++; if (new Date(apt.date) > new Date(patientsMap[id].lastVisit)) patientsMap[id].lastVisit = apt.date; }
    }
  });
  const patientList = Object.values(patientsMap);
  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">My Patients</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        {patientList.length === 0 ? <p className="text-center text-gray-500 py-12">No patients yet</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {patientList.map((p, i) => (
              <div key={i} className="p-6 bg-gray-50 rounded-2xl border border-gray-200 hover:shadow-lg transition-all">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md">{(p.name || p.patientName)?.charAt(0)}</div>
                  <div><p className="font-bold text-gray-800">{p.name || p.patientName}</p>{p.email && <p className="text-sm text-gray-600">{p.email}</p>}</div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 bg-white rounded-lg"><span className="text-gray-600">Total Visits:</span><span className="font-bold">{p.appointmentCount}</span></div>
                  <div className="flex justify-between p-2 bg-white rounded-lg"><span className="text-gray-600">Last Visit:</span><span className="font-bold">{new Date(p.lastVisit).toLocaleDateString()}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ScheduleView({ appointments }) {
  const upcoming = appointments.filter((apt) => new Date(apt.date) >= new Date()).slice(0, 7);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Weekly Schedule</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        {upcoming.length === 0 ? <p className="text-center text-gray-500 py-12">No upcoming appointments</p> : (
          <div className="space-y-4">
            {upcoming.map((apt) => (
              <div key={apt._id} className="flex items-center p-5 bg-blue-50 rounded-2xl border border-blue-100 hover:shadow-md transition-all">
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-2xl flex flex-col items-center justify-center mr-4 flex-shrink-0">
                  <p className="text-3xl font-bold text-white">{new Date(apt.date).getDate()}</p>
                  <p className="text-xs text-white font-semibold">{days[new Date(apt.date).getDay()]}</p>
                </div>
                <div className="flex-1"><p className="font-bold text-gray-800 text-lg">{apt.patientName}</p><p className="text-sm text-gray-600">{apt.time} — {apt.reason || 'Regular checkup'}</p></div>
                <span className={`px-4 py-2 rounded-xl text-sm font-semibold ${apt.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{apt.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Reports({ stats, appointments }) {
  const completedApts = appointments.filter((a) => a.status === 'completed').length;
  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Reports & Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Statistics</h3>
          <div className="space-y-4">
            {[['Total Consultations', stats?.totalAppointments || 0], ['Active Patients', stats?.totalPatients || 0], ['Completed', completedApts]].map(([label, val]) => (
              <div key={label} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-700 font-medium">{label}</span>
                <span className="font-bold text-2xl text-gray-800">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HomeIcon()     { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>; }
function CalendarIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>; }
function ScheduleIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>; }
function PatientsIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>; }
function ReportsIcon()  { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>; }

export default DoctorDashboard;