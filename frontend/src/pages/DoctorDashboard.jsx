// frontend/src/pages/DoctorDashboard.jsx (Enhanced)
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import websocketService from '../services/websocket';
import VideoCall from '../components/VideoCall';
import axios from 'axios';

function DoctorDashboard() {
  const { user, logout, API_URL } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCall, setActiveCall] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    
    websocketService.connect(API_URL.replace('/api', ''));
    websocketService.emit('user:online', user?.id);

    const handleAppointmentUpdate = (data) => {
      console.log('Appointment update received:', data);
      fetchDashboardData();
    };

    websocketService.on('appointment:updated', handleAppointmentUpdate);

    return () => {
      websocketService.off('appointment:updated', handleAppointmentUpdate);
    };
  }, [user?.id, API_URL]);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, appointmentsRes] = await Promise.all([
        axios.get(`${API_URL}/stats`),
        axios.get(`${API_URL}/appointments`)
      ]);
      
      setStats(statsRes.data);
      setAppointments(appointmentsRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startVideoCall = (appointment) => {
    setActiveCall({
      appointmentId: appointment._id,
      otherUserId: appointment.patientId._id,
      otherUserName: appointment.patientName,
      isDoctor: true
    });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview stats={stats} appointments={appointments} onStartCall={startVideoCall} />;
      case 'appointments':
        return <AppointmentManagement appointments={appointments} onStartCall={startVideoCall} />;
      case 'patients':
        return <PatientList appointments={appointments} />;
      case 'schedule':
        return <ScheduleView appointments={appointments} />;
      case 'reports':
        return <Reports />;
      default:
        return <Overview stats={stats} appointments={appointments} onStartCall={startVideoCall} />;
    }
  };

  return (
    <>
      {activeCall && (
        <VideoCall
          appointmentId={activeCall.appointmentId}
          otherUserId={activeCall.otherUserId}
          otherUserName={activeCall.otherUserName}
          isDoctor={activeCall.isDoctor}
          onCallEnd={() => {
            setActiveCall(null);
            fetchDashboardData();
          }}
        />
      )}
      
      <div className="flex h-screen bg-gradient-to-br from-slate-50 to-gray-100">
        <div className="w-64 bg-white shadow-lg overflow-y-auto flex flex-col">
          <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
            <h1 className="text-2xl font-bold text-cyan-600">Dr.AssistAI</h1>
            <p className="text-sm text-gray-600 mt-1">Doctor Portal</p>
          </div>

          <div className="p-4 flex-1">
            <div className="mb-6">
              <div className="flex items-center space-x-3 p-3 bg-cyan-50 rounded-lg border border-cyan-100">
                <div className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                  Dr
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-600 truncate">{user?.specialization}</p>
                </div>
              </div>
            </div>

            <nav className="space-y-2">
              <NavButton 
                icon={<HomeIcon />}
                label="Overview"
                active={activeTab === 'overview'}
                onClick={() => setActiveTab('overview')}
              />
              <NavButton 
                icon={<CalendarIcon />}
                label="Appointments"
                active={activeTab === 'appointments'}
                onClick={() => setActiveTab('appointments')}
              />
              <NavButton 
                icon={<ScheduleIcon />}
                label="Schedule"
                active={activeTab === 'schedule'}
                onClick={() => setActiveTab('schedule')}
              />
              <NavButton 
                icon={<PatientsIcon />}
                label="My Patients"
                active={activeTab === 'patients'}
                onClick={() => setActiveTab('patients')}
              />
              <NavButton 
                icon={<ReportsIcon />}
                label="Reports"
                active={activeTab === 'reports'}
                onClick={() => setActiveTab('reports')}
              />
            </nav>
          </div>

          <div className="w-full p-4 border-t border-gray-200 bg-white">
            <button
              onClick={logout}
              className="w-full px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition flex items-center justify-center space-x-2 font-medium text-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              renderContent()
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function NavButton({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-lg flex items-center space-x-3 transition text-sm ${
        active
          ? 'bg-cyan-600 text-white'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <div className="flex-shrink-0">{icon}</div>
      <span>{label}</span>
    </button>
  );
}

function Overview({ stats, appointments, onStartCall }) {
  const todayAppointments = appointments.filter(apt => {
    const today = new Date();
    const aptDate = new Date(apt.date);
    return aptDate.toDateString() === today.toDateString();
  });

  const pendingAppointments = appointments.filter(apt => apt.status === 'pending').slice(0, 5);

  const updateStatus = async (appointmentId, status) => {
    try {
      await axios.patch(`${API_URL}/appointments/${appointmentId}`, { status });
      window.location.reload();
    } catch (error) {
      console.error('Failed to update appointment:', error);
    }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Dashboard Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Today's Appointments"
          value={stats?.todayAppointments || 0}
          icon={<CalendarIcon className="w-6 h-6 text-cyan-600" />}
          bgColor="bg-cyan-100"
        />
        <StatCard 
          title="Total Patients"
          value={stats?.totalPatients || 0}
          icon={<PatientsIcon className="w-6 h-6 text-green-600" />}
          bgColor="bg-green-100"
        />
        <StatCard 
          title="Pending Approvals"
          value={pendingAppointments.length}
          icon={<ClockIcon className="w-6 h-6 text-yellow-600" />}
          bgColor="bg-yellow-100"
        />
        <StatCard 
          title="Total Appointments"
          value={stats?.totalAppointments || 0}
          icon={<CheckIcon className="w-6 h-6 text-purple-600" />}
          bgColor="bg-purple-100"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Today's Schedule</h3>
          {todayAppointments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No appointments today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayAppointments.map(apt => (
                <div key={apt._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="font-semibold text-gray-800">{apt.patientName}</p>
                    <p className="text-sm text-gray-600">{apt.time}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      apt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                      apt.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {apt.status}
                    </span>
                    {apt.status === 'confirmed' && (
                      <button
                        onClick={() => onStartCall(apt)}
                        className="p-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition"
                        title="Start video call"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Pending Approvals</h3>
          {pendingAppointments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No pending appointments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingAppointments.map(apt => (
                <div key={apt._id} className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-800">{apt.patientName}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(apt.date).toLocaleDateString()} at {apt.time}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2 mt-3">
                    <button
                      onClick={() => updateStatus(apt._id, 'confirmed')}
                      className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => updateStatus(apt._id, 'cancelled')}
                      className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition"
                    >
                      Decline
                    </button>
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

function StatCard({ title, value, icon, bgColor }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
        </div>
        <div className={`w-12 h-12 ${bgColor} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function AppointmentManagement({ appointments, onStartCall }) {
  const [filter, setFilter] = useState('all');

  const filteredAppointments = appointments.filter(apt => {
    if (filter === 'all') return true;
    return apt.status === filter;
  });

  const updateStatus = async (appointmentId, status) => {
    try {
      await axios.patch(`/appointments/${appointmentId}`, { status });
      window.location.reload();
    } catch (error) {
      console.error('Failed to update appointment:', error);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Appointments</h2>
        <div className="flex space-x-2">
          {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredAppointments.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-600">No appointments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAppointments.map(apt => (
                  <tr key={apt._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{apt.patientName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{new Date(apt.date).toLocaleDateString()}</div>
                      <div className="text-sm text-gray-500">{apt.time}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{apt.reason || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        apt.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        apt.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        apt.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {apt.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm space-x-2">
                      {apt.status === 'confirmed' && (
                        <button
                          onClick={() => onStartCall(apt)}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          Call
                        </button>
                      )}
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

function PatientList({ appointments }) {
  const uniquePatients = {};
  appointments.forEach(apt => {
    if (apt.patientId && !uniquePatients[apt.patientId._id]) {
      uniquePatients[apt.patientId._id] = {
        ...apt.patientId,
        appointmentCount: 1,
        lastVisit: apt.date
      };
    } else if (apt.patientId) {
      uniquePatients[apt.patientId._id].appointmentCount++;
      if (new Date(apt.date) > new Date(uniquePatients[apt.patientId._id].lastVisit)) {
        uniquePatients[apt.patientId._id].lastVisit = apt.date;
      }
    }
  });

  const patientList = Object.values(uniquePatients);

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">My Patients</h2>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {patientList.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-600">No patients yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {patientList.map(patient => (
              <div key={patient._id} className="p-6 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                    {patient.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{patient.name}</p>
                    <p className="text-sm text-gray-600">{patient.email}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Visits:</span>
                    <span className="font-medium text-gray-800">{patient.appointmentCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Visit:</span>
                    <span className="font-medium text-gray-800">
                      {new Date(patient.lastVisit).toLocaleDateString()}
                    </span>
                  </div>
                  {patient.phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium text-gray-800">{patient.phone}</span>
                    </div>
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

function ScheduleView({ appointments }) {
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const upcomingApts = appointments.filter(apt => new Date(apt.date) >= new Date()).slice(0, 7);

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Weekly Schedule</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          {upcomingApts.map(apt => (
            <div key={apt._id} className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex flex-col items-center justify-center mr-4 flex-shrink-0">
                <p className="text-2xl font-bold text-blue-600">{new Date(apt.date).getDate()}</p>
                <p className="text-xs text-gray-600">{weekDays[new Date(apt.date).getDay()]}</p>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{apt.patientName}</p>
                <p className="text-sm text-gray-600">{apt.time} - {apt.reason || 'Regular checkup'}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                apt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                apt.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {apt.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Reports() {
  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Reports & Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Statistics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Total Consultations</span>
              <span className="font-bold text-blue-600">24</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">New Patients</span>
              <span className="font-bold text-green-600">8</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Follow-ups</span>
              <span className="font-bold text-purple-600">16</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Completed</span>
              <span className="font-bold text-emerald-600">20</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Patient Feedback</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-700">Overall Rating</span>
                <span className="text-sm font-bold">4.6/5</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-400 h-2 rounded-full" style={{width: '92%'}}></div>
              </div>
            </div>
            <div className="flex items-center space-x-2 mt-4">
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.381-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <p className="text-sm text-gray-600">Based on 24 patient reviews</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Icons
function HomeIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>; }
function CalendarIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>; }
function ScheduleIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>; }
function PatientsIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>; }
function ReportsIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>; }
function ClockIcon() { return <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>; }
function CheckIcon() { return <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>; }

export default DoctorDashboard;