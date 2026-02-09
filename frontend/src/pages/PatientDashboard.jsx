// Updated PatientDashboard.jsx with Notifications and Appointment Actions
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import websocketService from "../services/websocket";
import VideoCall from "../components/VideoCall";
import axios from "axios";
import DiabetesPrediction from "../components/DiabetesPrediction";
import AppointmentBooking from "../components/AppointmentBooking";
import { Bell, Phone, X, Calendar, Check, AlertCircle } from "lucide-react";
import HeartDiseasePrediction from "../components/HeartDiseasePrediction";

// Notification Component (inline for this artifact)
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
      case "call":
        return <Phone className="w-5 h-5 text-green-600" />;
      case "appointment":
        return <Calendar className="w-5 h-5 text-blue-600" />;
      case "success":
        return <Check className="w-5 h-5 text-green-600" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Bell className="w-5 h-5 text-cyan-600" />;
    }
  };

  const getBgColor = () => {
    switch (notification.type) {
      case "call":
        return "from-green-50 to-emerald-50 border-green-200";
      case "appointment":
        return "from-blue-50 to-cyan-50 border-blue-200";
      case "success":
        return "from-green-50 to-emerald-50 border-green-200";
      case "error":
        return "from-red-50 to-pink-50 border-red-200";
      default:
        return "from-cyan-50 to-blue-50 border-cyan-200";
    }
  };

  return (
    <div
      className={`bg-gradient-to-r ${getBgColor()} border-2 rounded-2xl shadow-2xl p-4 backdrop-blur-sm transition-all duration-300 ${
        isExiting
          ? "opacity-0 transform translate-x-full"
          : "opacity-100 transform translate-x-0"
      }`}
      style={{ animation: "slideIn 0.3s ease-out" }}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm mb-1">
            {notification.title}
          </p>
          <p className="text-gray-600 text-xs mb-2">{notification.message}</p>

          {notification.actions && notification.actions.length > 0 && (
            <div className="flex space-x-2 mt-3">
              {notification.actions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onAction(notification.id, action.type, action.data);
                    handleDismiss();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    action.primary
                      ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:shadow-lg"
                      : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
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
    </div>
  );
}

function PatientDashboard() {
  const { user, logout, API_URL, wsConnected } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((notification) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, ...notification }]);

    // Browser notification for important types
    if (["call", "appointment"].includes(notification.type)) {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(notification.title, {
          body: notification.message,
          icon: "/favicon.ico",
          tag: notification.type,
        });
      }
    }

    // Auto-dismiss after 5 seconds if specified
    if (notification.autoClose) {
      setTimeout(() => {
        dismissNotification(id);
      }, 5000);
    }
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleNotificationAction = useCallback(async (id, actionType, data) => {
    if (actionType === "accept" && data?.appointment && data?.callData) {
      // Pass the call data directly to startVideoCall instead of relying on state
      startVideoCall(data.appointment, data.callData);
    } else if (actionType === "decline" && data?.callData) {
      // Send call rejection
      websocketService.emit("call:reject", {
        appointmentId: data.callData.appointmentId,
        userId: user.id,
      });
    }
  }, []);

  const fetchDashboardData = useCallback(
    async (showRefreshing = false) => {
      try {
        if (showRefreshing) setRefreshing(true);

        const [statsRes, appointmentsRes] = await Promise.all([
          axios.get(`${API_URL}/stats`),
          axios.get(`${API_URL}/appointments`),
        ]);

        setStats(statsRes.data);
        setAppointments(appointmentsRes.data);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        addNotification({
          type: "error",
          title: "Error",
          message: "Failed to load dashboard data",
          autoClose: true,
        });
      } finally {
        setLoading(false);
        if (showRefreshing) {
          setTimeout(() => setRefreshing(false), 500);
        }
      }
    },
    [API_URL, addNotification],
  );

  useEffect(() => {
    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    fetchDashboardData();

    // Set up real-time listeners
    const handleAppointmentUpdate = (data) => {
      console.log("📱 Appointment update received:", data.type);
      fetchDashboardData(true);

      if (data.type === "updated") {
        addNotification({
          type: "appointment",
          title: "Appointment Updated",
          message: `Your appointment status has been updated to ${data.appointment.status}`,
          autoClose: true,
        });
      }
    };

    // Listen for incoming calls
    const handleIncomingCall = (data) => {
      console.log("📞 Incoming call received:", data);
      const appointment = appointments.find(
        (apt) => apt._id === data.appointmentId,
      );
      if (appointment) {
        addNotification({
          type: "call",
          title: "Incoming Video Call",
          message: `${data.callerName} is calling you`,
          actions: [
            {
              label: "Accept",
              type: "accept",
              primary: true,
              data: {
                appointment,
                callData: data, // Include the incoming call data with offer
              },
            },
            {
              label: "Decline",
              type: "decline",
              data: {
                callData: data, // Include callData for rejection
              },
            },
          ],
        });
      }
    };

    websocketService.onAppointmentUpdated(handleAppointmentUpdate);
    websocketService.on("call:incoming", handleIncomingCall);

    return () => {
      websocketService.off("appointment:updated", handleAppointmentUpdate);
      websocketService.off("call:incoming", handleIncomingCall);
    };
  }, [fetchDashboardData, addNotification, appointments]);

  const startVideoCall = (appointment, callData = null) => {
    setActiveCall({
      appointmentId: appointment._id,
      otherUserId: appointment.doctorId._id,
      otherUserName: appointment.doctorName,
      isDoctor: false,
      incomingCallData: callData || incomingCallData,
    });
  };

  const cancelAppointment = async (appointmentId) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) {
      return;
    }

    try {
      await axios.patch(`${API_URL}/appointments/${appointmentId}`, {
        status: "cancelled",
      });
      fetchDashboardData(true);
      addNotification({
        type: "success",
        title: "Appointment Cancelled",
        message: "Your appointment has been cancelled successfully",
        autoClose: true,
      });
    } catch (error) {
      console.error("Failed to cancel appointment:", error);
      addNotification({
        type: "error",
        title: "Error",
        message: "Failed to cancel appointment",
        autoClose: true,
      });
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <Overview
            stats={stats}
            appointments={appointments}
            onStartCall={startVideoCall}
            onCancelAppointment={cancelAppointment}
            onRefresh={() => fetchDashboardData(true)}
          />
        );
      case "diabetes":
        return <DiabetesPrediction />;
      case "heart":
        return <HeartDiseasePrediction />;
      case "appointments":
        return (
          <AppointmentBooking
            onBookingComplete={() => {
              fetchDashboardData(true);
              addNotification({
                type: "success",
                title: "Appointment Booked",
                message: "Your appointment has been booked successfully",
                autoClose: true,
              });
            }}
          />
        );
      case "history":
        return (
          <AppointmentHistory
            appointments={appointments}
            onStartCall={startVideoCall}
            onCancelAppointment={cancelAppointment}
            onRefresh={() => fetchDashboardData(true)}
          />
        );
      case "health":
        return <HealthRecords />;
      case "prescriptions":
        return <Prescriptions />;
      default:
        return (
          <Overview
            stats={stats}
            appointments={appointments}
            onStartCall={startVideoCall}
            onCancelAppointment={cancelAppointment}
            onRefresh={() => fetchDashboardData(true)}
          />
        );
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
          incomingCallData={activeCall.incomingCallData}
          onCallEnd={() => {
            setActiveCall(null);
            setIncomingCallData(null);
            fetchDashboardData(true);
            addNotification({
              type: "info",
              title: "Call Ended",
              message: "The video call has ended",
              autoClose: true,
            });
          }}
        />
      )}

      <NotificationSystem
        notifications={notifications}
        onDismiss={dismissNotification}
        onAction={handleNotificationAction}
      />

      <div className="flex h-screen bg-gradient-to-br from-slate-50 to-gray-100">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-xl overflow-y-auto flex flex-col border-r border-gray-200">
          <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
              Dr.AssistAI
            </h1>
            <p className="text-sm text-gray-600 mt-1">Patient Portal</p>

            <div className="mt-3 flex items-center text-xs">
              <div
                className={`w-2 h-2 rounded-full mr-2 ${wsConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}
              ></div>
              <span
                className={wsConnected ? "text-green-600" : "text-gray-500"}
              >
                {wsConnected ? "Connected" : "Offline"}
              </span>
            </div>
          </div>

          <div className="p-4 flex-1">
            <div className="mb-6">
              <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-100 shadow-sm">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-md">
                  {user?.name?.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 truncate">
                    {user?.name}
                  </p>
                  <p className="text-xs text-gray-600 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>

            <nav className="space-y-1">
              <NavButton
                icon={<HomeIcon />}
                label="Overview"
                active={activeTab === "overview"}
                onClick={() => setActiveTab("overview")}
              />
              <NavButton
                icon={<BrainIcon />}
                label="Health Check"
                active={activeTab === "diabetes"}
                onClick={() => setActiveTab("diabetes")}
                badge="AI"
              />

              <NavButton
                icon={<HeartCheckIcon />} // ADD THIS NEW BUTTON
                label="Heart Check"
                active={activeTab === "heart"}
                onClick={() => setActiveTab("heart")}
                badge="AI"
              />
              
              <NavButton
                icon={<CalendarIcon />}
                label="Book Appointment"
                active={activeTab === "appointments"}
                onClick={() => setActiveTab("appointments")}
              />
              <NavButton
                icon={<HistoryIcon />}
                label="My Appointments"
                active={activeTab === "history"}
                onClick={() => setActiveTab("history")}
                count={appointments.length}
              />
              <NavButton
                icon={<HeartIcon />}
                label="Health Records"
                active={activeTab === "health"}
                onClick={() => setActiveTab("health")}
              />
              <NavButton
                icon={<PrescriptionIcon />}
                label="Prescriptions"
                active={activeTab === "prescriptions"}
                onClick={() => setActiveTab("prescriptions")}
              />
            </nav>
          </div>

          <div className="p-4 border-t border-gray-200 bg-white">
            <button
              onClick={logout}
              className="w-full px-4 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all duration-200 flex items-center justify-center space-x-2 font-medium shadow-sm hover:shadow"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-600 mb-4"></div>
                <p className="text-gray-600 font-medium">
                  Loading your dashboard...
                </p>
              </div>
            ) : (
              <>
                {refreshing && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center text-blue-700 animate-fade-in">
                    <svg
                      className="animate-spin w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
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
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}

// Reuse all the previous components (NavButton, Overview, etc.)
function NavButton({ icon, label, active, onClick, badge, count }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all duration-200 text-sm font-medium ${
        active
          ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md"
          : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">{icon}</div>
        <span>{label}</span>
      </div>
      {badge && (
        <span
          className={`px-2 py-0.5 text-xs font-bold rounded-full ${
            active ? "bg-white text-cyan-600" : "bg-cyan-100 text-cyan-700"
          }`}
        >
          {badge}
        </span>
      )}
      {count !== undefined && count > 0 && (
        <span
          className={`px-2 py-0.5 text-xs font-bold rounded-full ${
            active ? "bg-white text-cyan-600" : "bg-gray-200 text-gray-700"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function Overview({
  stats,
  appointments,
  onStartCall,
  onCancelAppointment,
  onRefresh,
}) {
  const upcomingAppointments = appointments
    .filter(
      (apt) => new Date(apt.date) >= new Date() && apt.status !== "cancelled",
    )
    .slice(0, 3);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Dashboard Overview</h2>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center space-x-2 text-sm font-medium text-gray-700 shadow-sm"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Appointments"
          value={stats?.totalAppointments || 0}
          icon={<CalendarIcon className="w-6 h-6 text-cyan-600" />}
          bgColor="bg-gradient-to-br from-cyan-100 to-blue-100"
          trend="+12%"
        />
        <StatCard
          title="Upcoming"
          value={stats?.upcomingAppointments || 0}
          icon={
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          bgColor="bg-gradient-to-br from-green-100 to-emerald-100"
        />
        <StatCard
          title="Health Checks"
          value={stats?.totalPredictions || 0}
          icon={<HeartIcon className="w-6 h-6 text-purple-600" />}
          bgColor="bg-gradient-to-br from-purple-100 to-pink-100"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <svg
              className="w-5 h-5 mr-2 text-cyan-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Upcoming Appointments
          </h3>
          {upcomingAppointments.length === 0 ? (
            <div className="text-center py-8">
              <svg
                className="w-16 h-16 text-gray-300 mx-auto mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-gray-500">No upcoming appointments</p>
              <p className="text-sm text-gray-400 mt-1">
                Book one to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map((apt) => (
                <AppointmentCard
                  key={apt._id}
                  apt={apt}
                  onStartCall={onStartCall}
                  onCancel={onCancelAppointment}
                />
              ))}
            </div>
          )}
        </div>

        <HealthTipsCard />
      </div>

      <div className="mt-6">
        <MedicineReminder />
      </div>
    </div>
  );
}

function AppointmentCard({ apt, onStartCall, onCancel }) {
  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-700 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "completed":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "cancelled":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="font-semibold text-gray-800 mb-1">{apt.doctorName}</p>
          <p className="text-sm text-gray-600 flex items-center">
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {new Date(apt.date).toLocaleDateString()}
            <span className="mx-2">•</span>
            {apt.time}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(apt.status)}`}
        >
          {apt.status}
        </span>
      </div>

      {apt.status === "confirmed" && (
        <div className="flex space-x-2 pt-3 border-t border-gray-200">
          <button
            onClick={() => onStartCall(apt)}
            className="flex-1 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-semibold text-sm flex items-center justify-center"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
            Join Call
          </button>
          <button
            onClick={() => onCancel(apt._id)}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all font-semibold text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {apt.status === "pending" && (
        <div className="pt-3 border-t border-gray-200">
          <button
            onClick={() => onCancel(apt._id)}
            className="w-full py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all font-semibold text-sm"
          >
            Cancel Appointment
          </button>
        </div>
      )}
    </div>
  );
}

// Rest of the components remain the same...
function StatCard({ title, value, icon, bgColor, trend }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <div className="flex items-end mt-2">
            <p className="text-4xl font-bold text-gray-800">{value}</p>
            {trend && (
              <span className="ml-2 text-green-600 text-sm font-semibold mb-1">
                {trend}
              </span>
            )}
          </div>
        </div>
        <div
          className={`w-14 h-14 ${bgColor} rounded-2xl flex items-center justify-center shadow-sm`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function HealthTipsCard() {
  const tips = [
    {
      icon: "💧",
      text: "Drink at least 8 glasses of water daily",
      color: "blue",
    },
    { icon: "🏃", text: "Exercise for 30 minutes every day", color: "green" },
    { icon: "😴", text: "Get 7-9 hours of quality sleep", color: "purple" },
    {
      icon: "🥗",
      text: "Eat a balanced diet with fruits and vegetables",
      color: "orange",
    },
  ];

  const colorClasses = {
    blue: "from-blue-50 to-cyan-50 border-blue-100",
    green: "from-green-50 to-emerald-50 border-green-100",
    purple: "from-purple-50 to-pink-50 border-purple-100",
    orange: "from-orange-50 to-amber-50 border-orange-100",
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <svg
          className="w-5 h-5 mr-2 text-green-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.381-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        Daily Health Tips
      </h3>
      <div className="space-y-3">
        {tips.map((tip, idx) => (
          <div
            key={idx}
            className={`flex items-start space-x-3 p-4 bg-gradient-to-r ${colorClasses[tip.color]} rounded-xl border transition-all hover:shadow-sm`}
          >
            <span className="text-2xl flex-shrink-0">{tip.icon}</span>
            <p className="text-sm text-gray-700 font-medium">{tip.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MedicineReminder() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <svg
          className="w-5 h-5 mr-2 text-blue-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
        </svg>
        Medicine Reminders
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-semibold text-gray-800">Aspirin 100mg</p>
              <p className="text-sm text-gray-600 mt-1">Morning - 08:00 AM</p>
            </div>
            <span className="text-green-600 text-xs font-bold bg-green-100 px-2 py-1 rounded-full">
              ✓ Taken
            </span>
          </div>
        </div>
        <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-100">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-semibold text-gray-800">Vitamin D 1000IU</p>
              <p className="text-sm text-gray-600 mt-1">Afternoon - 02:00 PM</p>
            </div>
            <span className="text-yellow-600 text-xs font-bold bg-yellow-100 px-2 py-1 rounded-full">
              ⏰ Pending
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppointmentHistory({
  appointments,
  onStartCall,
  onCancelAppointment,
  onRefresh,
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">
          Appointment History
        </h2>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center space-x-2 text-sm font-medium text-gray-700"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>Refresh</span>
        </button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {appointments.length === 0 ? (
          <div className="p-12 text-center">
            <svg
              className="w-20 h-20 text-gray-300 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-gray-600 text-lg mb-2">No appointments yet</p>
            <p className="text-gray-400 text-sm">
              Book your first appointment to get started
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Doctor
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {appointments.map((apt) => (
                  <tr
                    key={apt._id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                          {apt.doctorName?.charAt(0)}
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {apt.doctorName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {new Date(apt.date).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">{apt.time}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {apt.reason || "Regular checkup"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          apt.status === "confirmed"
                            ? "bg-green-100 text-green-800"
                            : apt.status === "completed"
                              ? "bg-blue-100 text-blue-800"
                              : apt.status === "cancelled"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {apt.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {apt.status === "confirmed" && (
                          <>
                            <button
                              onClick={() => onStartCall(apt)}
                              className="text-cyan-600 hover:text-cyan-900 font-semibold text-sm hover:underline"
                            >
                              Join Call
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => onCancelAppointment(apt._id)}
                              className="text-red-600 hover:text-red-900 font-semibold text-sm hover:underline"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {apt.status === "pending" && (
                          <button
                            onClick={() => onCancelAppointment(apt._id)}
                            className="text-red-600 hover:text-red-900 font-semibold text-sm hover:underline"
                          >
                            Cancel
                          </button>
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

function HealthRecords() {
  const records = [
    {
      title: "Blood Pressure",
      value: "120/80",
      unit: "mmHg",
      status: "Normal",
      color: "green",
    },
    {
      title: "Heart Rate",
      value: "72",
      unit: "bpm",
      status: "Normal",
      color: "green",
    },
    {
      title: "BMI",
      value: "24.5",
      unit: "kg/m²",
      status: "Healthy",
      color: "green",
    },
    {
      title: "Blood Sugar",
      value: "95",
      unit: "mg/dL",
      status: "Normal",
      color: "green",
    },
  ];

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Health Records</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {records.map((record, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {record.title}
            </h3>
            <div className="text-center py-6">
              <p className="text-5xl font-bold text-gray-800 mb-2">
                {record.value}
              </p>
              <p className="text-sm text-gray-600 mb-3">{record.unit}</p>
              <span
                className={`px-4 py-1.5 text-sm font-semibold rounded-full ${
                  record.color === "green"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {record.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Prescriptions() {
  const prescriptions = [
    {
      name: "Aspirin 100mg",
      dosage: "1 tablet daily",
      doctor: "Dr. Smith",
      date: "2024-01-15",
    },
    {
      name: "Vitamin D 1000IU",
      dosage: "1 capsule daily",
      doctor: "Dr. Johnson",
      date: "2024-01-10",
    },
  ];

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Prescriptions</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          {prescriptions.map((rx, idx) => (
            <div
              key={idx}
              className="p-5 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100 hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-bold text-gray-800 text-lg mb-1">
                    {rx.name}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    Dosage: {rx.dosage}
                  </p>
                  <p className="text-sm text-gray-600">
                    Prescribed by: {rx.doctor}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(rx.date).toLocaleDateString()}
                  </p>
                </div>
                <button className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all text-sm font-semibold">
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
function HomeIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  );
}
function BrainIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}
function HistoryIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
function HeartIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  );
}
function PrescriptionIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function HeartCheckIcon() { 
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ); 
}

export default PatientDashboard;
