// frontend/src/services/apiClient.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor — attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — redirect on 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth API ────────────────────────────────────────────────────────────────
export const authAPI = {
  login: async (email, password) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Login failed' };
    }
  },

  register: async (userData) => {
    try {
      const response = await apiClient.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Registration failed' };
    }
  },

  getCurrentUser: async () => {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch user' };
    }
  },

  updateProfile: async (userData) => {
    try {
      const response = await apiClient.put('/auth/profile', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Update failed' };
    }
  },
};

// ─── Appointments API ────────────────────────────────────────────────────────
export const appointmentsAPI = {
  getAppointments: async (filters = {}) => {
    try {
      const response = await apiClient.get('/appointments', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch appointments' };
    }
  },

  createAppointment: async (appointmentData) => {
    try {
      const response = await apiClient.post('/appointments', appointmentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to create appointment' };
    }
  },

  updateAppointment: async (id, updates) => {
    try {
      const response = await apiClient.patch(`/appointments/${id}`, updates);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update appointment' };
    }
  },

  cancelAppointment: async (id, reason = '') => {
    try {
      const response = await apiClient.patch(`/appointments/${id}`, {
        status: 'cancelled',
        cancellationReason: reason
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to cancel appointment' };
    }
  },
};

// ─── Doctors API ─────────────────────────────────────────────────────────────
export const doctorsAPI = {
  getDoctors: async (filters = {}) => {
    try {
      const response = await apiClient.get('/doctors', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch doctors' };
    }
  },

  getAvailableSlots: async (doctorId, date) => {
    try {
      const response = await apiClient.get(`/doctors/${doctorId}/slots`, { params: { date } });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch available slots' };
    }
  },
};

// ─── Health Records API ───────────────────────────────────────────────────────
export const healthAPI = {
  getHealthRecords: async (filters = {}) => {
    try {
      const response = await apiClient.get('/health-records', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch health records' };
    }
  },

  createHealthRecord: async (recordData) => {
    try {
      const response = await apiClient.post('/health-records', recordData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to create health record' };
    }
  },

  // FIX: was PUT — the route is PATCH
  updateHealthRecord: async (id, updates) => {
    try {
      const response = await apiClient.patch(`/health-records/${id}`, updates);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update health record' };
    }
  },

  deleteHealthRecord: async (id) => {
    try {
      const response = await apiClient.delete(`/health-records/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to delete health record' };
    }
  },
};

// ─── Prescriptions API ────────────────────────────────────────────────────────
export const prescriptionsAPI = {
  getPrescriptions: async (filters = {}) => {
    try {
      const response = await apiClient.get('/prescriptions', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch prescriptions' };
    }
  },

  createPrescription: async (prescriptionData) => {
    try {
      const response = await apiClient.post('/prescriptions', prescriptionData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to create prescription' };
    }
  },

  // FIX: added missing updatePrescription
  updatePrescription: async (id, updates) => {
    try {
      const response = await apiClient.patch(`/prescriptions/${id}`, updates);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update prescription' };
    }
  },

  deletePrescription: async (id) => {
    try {
      const response = await apiClient.delete(`/prescriptions/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to delete prescription' };
    }
  },

  requestRefill: async (id) => {
    try {
      const response = await apiClient.post(`/prescriptions/${id}/refill`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to request refill' };
    }
  },
};

// ─── Predictions API ──────────────────────────────────────────────────────────
export const predictionsAPI = {
  predictDiabetes: async (data) => {
    try {
      const response = await apiClient.post('/predict-diabetes', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Prediction failed' };
    }
  },

  getDiabetesHistory: async (limit = 10) => {
    try {
      const response = await apiClient.get('/predictions', { params: { limit } });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch history' };
    }
  },

  predictHeartDisease: async (data) => {
    try {
      const response = await apiClient.post('/predict-heart-disease', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Prediction failed' };
    }
  },

  getHeartHistory: async (limit = 10) => {
    try {
      const response = await apiClient.get('/heart-predictions', { params: { limit } });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch history' };
    }
  },
};

// ─── Stats API ────────────────────────────────────────────────────────────────
export const statsAPI = {
  getStats: async () => {
    try {
      const response = await apiClient.get('/stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch stats' };
    }
  },
};

// ─── Reminders API ────────────────────────────────────────────────────────────
export const remindersAPI = {
  getReminders: async () => {
    try {
      const response = await apiClient.get('/reminders');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch reminders' };
    }
  },

  getTodaySchedule: async () => {
    try {
      const response = await apiClient.get('/reminders/today');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: "Failed to fetch today's schedule" };
    }
  },

  createReminder: async (reminderData) => {
    try {
      const response = await apiClient.post('/reminders', reminderData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to create reminder' };
    }
  },

  logMedicine: async (id, logData) => {
    try {
      const response = await apiClient.post(`/reminders/${id}/log`, logData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to log medicine' };
    }
  },

  deleteReminder: async (id) => {
    try {
      const response = await apiClient.delete(`/reminders/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to delete reminder' };
    }
  },
};

// Also export as default for legacy imports
export default apiClient;