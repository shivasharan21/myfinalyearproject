// frontend/src/pages/PatientDashboard.jsx (Updated with Video Call)
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import websocketService from '../services/websocket';
import VideoCall from '../components/VideoCall';
import axios from 'axios';
import DiabetesPrediction from '../components/DiabetesPrediction';
import AppointmentBooking from '../components/AppointmentBooking';

function PatientDashboard() {
  const { user, logout, API_URL } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCall, setActiveCall] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    
    const handleAppointmentUpdate = (data) => {
      console.log('Appointment update received:', data);
      fetchDashboardData();
    };

    try {
      websocketService.on('appointment:updated', handleAppointmentUpdate);
    } catch (error) {
      console.warn('WebSocket listener setup warning:', error);
    }

    return () => {
      try {
        websocketService.off('appointment:updated', handleAppointmentUpdate);
      } catch (error) {
        console.warn('WebSocket listener cleanup warning:', error);
      }
    };
  }, []);

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
      otherUserId: appointment.doctorId._id,
      otherUserName: appointment.doctorName,
      isDoctor: false
    });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview stats={stats} appointments={appointments} onStartCall={startVideoCall} />;
      case 'diabetes':
        return <DiabetesPrediction />;
      case 'appointments':
        return <AppointmentBooking onBookingComplete={fetchDashboardData} />;
      case 'history':
        return <AppointmentHistory appointments={appointments} onStartCall={startVideoCall} />;
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
      
      <div className="flex h-screen bg-gray-100">
        <div className="w-64 bg-white shadow-lg">
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold text-blue-600">TeleMed</h1>
            <p className="text-sm text-gray-600 mt-1">Patient Portal</p>
          </div>

          <div className="p-4">
            <div className="mb-6">
              <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {user?.name?.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{user?.name}</p>
                  <p className="text-xs text-gray-600">{user?.email}</p>
                </div>
              </div>
            </div>

            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center space-x-3 transition ${
                  activeTab === 'overview'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Overview</span>
              </button>

              <button
                onClick={() => setActiveTab('diabetes')}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center space-x-3 transition ${
                  activeTab === 'diabetes'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Diabetes Prediction</span>
              </button>

              <button
                onClick={() => setActiveTab('appointments')}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center space-x-3 transition ${
                  activeTab === 'appointments'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Book Appointment</span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center space-x-3 transition ${
                  activeTab === 'history'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Appointment History</span>
              </button>
            </nav>
          </div>

          <div className="absolute bottom-0 w-64 p-4 border-t">
            <button
              onClick={logout}
              className="w-full px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition flex items-center justify-center space-x-2"
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
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

function Overview({ stats, appointments, onStartCall }) {
  const upcomingAppointments = appointments
    .filter(apt => new Date(apt.date) >= new Date() && apt.status !== 'cancelled')
    .slice(0, 3);

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Dashboard Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Appointments</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{stats?.totalAppointments || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Upcoming</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{stats?.upcomingAppointments || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Health Checks</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{stats?.totalPredictions || 0}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {upcomingAppointments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Upcoming Appointments</h3>
          <div className="space-y-4">
            {upcomingAppointments.map(apt => (
              <div key={apt._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{apt.doctorName}</p>
                  <p className="text-sm text-gray-600">{new Date(apt.date).toLocaleDateString()} at {apt.time}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    apt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    apt.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {apt.status}
                  </span>
                  {apt.status === 'confirmed' && (
                    <button
                      onClick={() => onStartCall(apt)}
                      className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
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
        </div>
      )}
    </div>
  );
}

function AppointmentHistory({ appointments, onStartCall }) {
  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Appointment History</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {appointments.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-600">No appointments yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {appointments.map(apt => (
                  <tr key={apt._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{apt.doctorName}</div>
                      <div className="text-sm text-gray-500">{apt.doctorId?.specialization}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(apt.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{apt.time}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        apt.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        apt.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        apt.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {apt.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{apt.reason || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
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

export default PatientDashboard;