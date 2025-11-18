// frontend/src/pages/PatientDashboard.jsx (Enhanced)
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
      case 'health':
        return <HealthRecords />;
      case 'prescriptions':
        return <Prescriptions />;
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
            <p className="text-sm text-gray-600 mt-1">Patient Portal</p>
          </div>

          <div className="p-4 flex-1">
            <div className="mb-6">
              <div className="flex items-center space-x-3 p-3 bg-cyan-50 rounded-lg border border-cyan-100">
                <div className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {user?.name?.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-600 truncate">{user?.email}</p>
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
                icon={<BrainIcon />}
                label="Diabetes Prediction"
                active={activeTab === 'diabetes'}
                onClick={() => setActiveTab('diabetes')}
              />
              <NavButton 
                icon={<CalendarIcon />}
                label="Book Appointment"
                active={activeTab === 'appointments'}
                onClick={() => setActiveTab('appointments')}
              />
              <NavButton 
                icon={<HistoryIcon />}
                label="Appointment History"
                active={activeTab === 'history'}
                onClick={() => setActiveTab('history')}
              />
              <NavButton 
                icon={<HeartIcon />}
                label="Health Records"
                active={activeTab === 'health'}
                onClick={() => setActiveTab('health')}
              />
              <NavButton 
                icon={<PrescriptionIcon />}
                label="Prescriptions"
                active={activeTab === 'prescriptions'}
                onClick={() => setActiveTab('prescriptions')}
              />
            </nav>
          </div>

          <div className="p-4 border-t border-gray-200 bg-white">
            <button
              onClick={logout}
              className="w-full px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition flex items-center justify-center space-x-2 font-medium"
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
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
      className={`w-full text-left px-4 py-3 rounded-lg flex items-center space-x-3 transition ${
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
  const upcomingAppointments = appointments
    .filter(apt => new Date(apt.date) >= new Date() && apt.status !== 'cancelled')
    .slice(0, 3);

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Dashboard Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard 
          title="Total Appointments"
          value={stats?.totalAppointments || 0}
          icon={<CalendarIcon className="w-6 h-6 text-cyan-600" />}
          bgColor="bg-cyan-100"
        />
        <StatCard 
          title="Upcoming"
          value={stats?.upcomingAppointments || 0}
          icon={<ClockIcon className="w-6 h-6 text-green-600" />}
          bgColor="bg-green-100"
        />
        <StatCard 
          title="Health Checks"
          value={stats?.totalPredictions || 0}
          icon={<HeartIcon className="w-6 h-6 text-purple-600" />}
          bgColor="bg-purple-100"
        />
      </div>

      {upcomingAppointments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Upcoming Appointments</h3>
          <div className="space-y-4">
            {upcomingAppointments.map(apt => (
              <AppointmentCard key={apt._id} apt={apt} onStartCall={onStartCall} />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HealthTipsCard />
        <MedicineReminder />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, bgColor }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">{title}</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 ${bgColor} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function AppointmentCard({ apt, onStartCall }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition">
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
            className="p-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition"
            title="Start video call"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function HealthTipsCard() {
  const tips = [
    "Drink at least 8 glasses of water daily",
    "Exercise for 30 minutes every day",
    "Get 7-9 hours of sleep",
    "Eat a balanced diet with fruits and vegetables"
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.381-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        Health Tips
      </h3>
      <div className="space-y-3">
        {tips.map((tip, idx) => (
          <div key={idx} className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg border border-green-100">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-gray-700">{tip}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MedicineReminder() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
          <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
        </svg>
        Medicine Reminder
      </h3>
      <div className="space-y-3">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-slate-800">Aspirin 100mg</p>
              <p className="text-sm text-slate-600 mt-1">Morning - 08:00 AM</p>
            </div>
            <span className="text-green-600 text-sm font-semibold">✓ Taken</span>
          </div>
        </div>
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-slate-800">Vitamin D 1000IU</p>
              <p className="text-sm text-slate-600 mt-1">Afternoon - 02:00 PM</p>
            </div>
            <span className="text-yellow-600 text-sm font-semibold">⏰ Pending</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppointmentHistory({ appointments, onStartCall }) {
  return (
    <div>
      <h2 className="text-3xl font-bold text-slate-800 mb-6">Appointment History</h2>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {appointments.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-slate-600">No appointments yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Doctor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {appointments.map(apt => (
                  <tr key={apt._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">{apt.doctorName}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {new Date(apt.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">{apt.time}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        apt.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        apt.status === 'completed' ? 'bg-sky-100 text-sky-800' :
                        apt.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {apt.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {apt.status === 'confirmed' && (
                        <button
                          onClick={() => onStartCall(apt)}
                          className="text-sky-600 hover:text-sky-900 font-medium"
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

function HealthRecords() {
  return (
    <div>
      <h2 className="text-3xl font-bold text-slate-800 mb-6">Health Records</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Blood Pressure</h3>
          <div className="text-center py-8">
            <p className="text-3xl font-bold text-slate-800">120/80</p>
            <p className="text-sm text-slate-600 mt-2">mmHg</p>
            <p className="text-sm text-green-600 font-medium mt-2">Normal Range</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">BMI</h3>
          <div className="text-center py-8">
            <p className="text-3xl font-bold text-slate-800">24.5</p>
            <p className="text-sm text-slate-600 mt-2">kg/m²</p>
            <p className="text-sm text-green-600 font-medium mt-2">Healthy Weight</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Prescriptions() {
  return (
    <div>
      <h2 className="text-3xl font-bold text-slate-800 mb-6">Prescriptions</h2>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="space-y-4">
          {[
            { name: "Aspirin 100mg", dosage: "1 tablet daily", doctor: "Dr. Smith" },
            { name: "Vitamin D 1000IU", dosage: "1 capsule daily", doctor: "Dr. Johnson" }
          ].map((rx, idx) => (
            <div key={idx} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-slate-800">{rx.name}</p>
                  <p className="text-sm text-slate-600 mt-1">Dosage: {rx.dosage}</p>
                  <p className="text-sm text-slate-600">Prescribed by: {rx.doctor}</p>
                </div>
                <button className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition text-sm font-medium">
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Icons
function HomeIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>; }
function BrainIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>; }
function CalendarIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>; }
function HistoryIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>; }
function HeartIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>; }
function PrescriptionIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>; }
function ClockIcon() { return <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>; }

export default PatientDashboard;