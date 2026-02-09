// frontend/src/services/apiClient.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: (email, password) => apiClient.post('/auth/login', { email, password }),
  register: (userData) => apiClient.post('/auth/register', userData),
  getCurrentUser: () => apiClient.get('/auth/me'),
};

export const appointmentsAPI = {
  getAppointments: () => apiClient.get('/appointments'),
  createAppointment: (data) => apiClient.post('/appointments', data),
  updateAppointment: (id, data) => apiClient.patch(`/appointments/${id}`, data),
};

export const doctorsAPI = {
  getDoctors: () => apiClient.get('/doctors'),
};

export const predictionAPI = {
  predictDiabetes: (data) => apiClient.post('/predict-diabetes', data),
  getPredictionHistory: () => apiClient.get('/predictions'),
};

export const statsAPI = {
  getStats: () => apiClient.get('/stats'),
};

export const healthAPI = {
  getHealthCheck: () => apiClient.get('/health'),
};

export default apiClient;
