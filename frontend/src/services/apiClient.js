// frontend/src/services/api.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor
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

// Response interceptor
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

// Auth API
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

// Appointments API
export const appointmentsAPI = {
  getAppointments: async (filters = {}) => {
    try {
      const response = await apiClient.get('/appointments', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch appointments' };
    }
  },

  getAppointment: async (id) => {
    try {
      const response = await apiClient.get(`/appointments/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch appointment' };
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

// Doctors API
export const doctorsAPI = {
  getDoctors: async (filters = {}) => {
    try {
      const response = await apiClient.get('/doctors', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch doctors' };
    }
  },

  getDoctor: async (id) => {
    try {
      const response = await apiClient.get(`/doctors/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch doctor' };
    }
  },

  getAvailableSlots: async (doctorId, date) => {
    try {
      const response = await apiClient.get(`/doctors/${doctorId}/slots`, { 
        params: { date } 
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch available slots' };
    }
  },

  getDoctorPatients: async () => {
    try {
      const response = await apiClient.get('/doctors/patients');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch patients' };
    }
  },
};

// Health Records API
export const healthAPI = {
  getHealthRecords: async (filters = {}) => {
    try {
      const response = await apiClient.get('/health-records', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch health records' };
    }
  },

  getHealthRecord: async (id) => {
    try {
      const response = await apiClient.get(`/health-records/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch health record' };
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

  updateHealthRecord: async (id, updates) => {
    try {
      const response = await apiClient.put(`/health-records/${id}`, updates);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update health record' };
    }
  },

  getVitalsTimeline: async (patientId) => {
    try {
      const response = await apiClient.get(`/health-records/vitals/${patientId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch vitals' };
    }
  },
};

// Prescriptions API
export const prescriptionsAPI = {
  getPrescriptions: async (filters = {}) => {
    try {
      const response = await apiClient.get('/prescriptions', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch prescriptions' };
    }
  },

  getPrescription: async (id) => {
    try {
      const response = await apiClient.get(`/prescriptions/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch prescription' };
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

  updatePrescription: async (id, updates) => {
    try {
      const response = await apiClient.put(`/prescriptions/${id}`, updates);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update prescription' };
    }
  },

  dispensePrescription: async (id) => {
    try {
      const response = await apiClient.patch(`/prescriptions/${id}/dispense`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to dispense prescription' };
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

// Predictions API
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
      const response = await apiClient.get('/predictions', { 
        params: { limit } 
      });
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
      const response = await apiClient.get('/heart-predictions', { 
        params: { limit } 
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch history' };
    }
  },

  getPredictionSummary: async () => {
    try {
      const response = await apiClient.get('/predictions/summary');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch summary' };
    }
  },
};

// Stats API
export const statsAPI = {
  getStats: async () => {
    try {
      const response = await apiClient.get('/stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch stats' };
    }
  },

  getAdminStats: async () => {
    try {
      const response = await apiClient.get('/stats/admin');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch admin stats' };
    }
  },
};

// Reminders API
export const remindersAPI = {
  getReminders: async () => {
    try {
      const response = await apiClient.get('/reminders');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch reminders' };
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

  updateReminder: async (id, updates) => {
    try {
      const response = await apiClient.put(`/reminders/${id}`, updates);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update reminder' };
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

  getTodaySchedule: async () => {
    try {
      const response = await apiClient.get('/reminders/today');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch today\'s schedule' };
    }
  },
};

export default apiClient; a4ea9ad