// frontend/src/contexts/AuthContext.jsx (IMPROVED VERSION)
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';
import websocketService from '../services/websocket';

const AuthContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [error, setError] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Initialize WebSocket listeners
  useEffect(() => {
    const handleWsConnected = () => {
      console.log('WebSocket service connected');
      setWsConnected(true);
    };

    const handleWsDisconnected = () => {
      console.log('WebSocket service disconnected');
      setWsConnected(false);
    };

    websocketService.on('ws:connected', handleWsConnected);
    websocketService.on('ws:disconnected', handleWsDisconnected);
    websocketService.on('ws:reconnected', handleWsConnected);
    websocketService.on('ws:reconnect-failed', () => {
      console.warn('WebSocket reconnection failed');
      setWsConnected(false);
    });

    return () => {
      websocketService.off('ws:connected', handleWsConnected);
      websocketService.off('ws:disconnected', handleWsDisconnected);
      websocketService.off('ws:reconnected', handleWsConnected);
    };
  }, []);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token');

      if (storedToken) {
        try {
          const userData = await authAPI.getCurrentUser();
          setUser(userData);
          setToken(storedToken);
          setError(null);

          // Connect WebSocket after successful auth
          connectWebSocket(userData._id);
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  const connectWebSocket = useCallback((userId) => {
    if (!userId) {
      console.error('User ID required for WebSocket connection');
      return;
    }

    try {
      // Extract base URL from API_URL
      const wsUrl = API_URL.endsWith('/api')
        ? API_URL.slice(0, -4)
        : API_URL;

      websocketService.connect(wsUrl);

      // Notify server that user is online
      const unsubscribe = websocketService.on('ws:connected', () => {
        websocketService.notifyOnline(userId);
        console.log('User online notification sent:', userId);
      });

      // If already connected, notify immediately
      if (websocketService.isConnected()) {
        websocketService.notifyOnline(userId);
      }

      setWsConnected(websocketService.isConnected());
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setWsConnected(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      setError(null);
      setLoading(true);

      const response = await authAPI.login(email, password);
      const { token: newToken, user: userData } = response;

      // Store token and user
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);

      // Connect WebSocket
      connectWebSocket(userData.id);

      return { success: true, user: userData };
    } catch (err) {
      const errorMessage = err.error || err.message || 'Login failed';
      setError(errorMessage);
      console.error('Login error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [connectWebSocket]);

  const register = useCallback(async (userData) => {
    try {
      setError(null);
      setLoading(true);

      const response = await authAPI.register(userData);
      const { token: newToken, user: newUser } = response;

      // Store token and user
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(newUser);

      // Connect WebSocket
      connectWebSocket(newUser.id);

      return { success: true, user: newUser };
    } catch (err) {
      const errorMessage = err.error || err.message || 'Registration failed';
      setError(errorMessage);
      console.error('Register error:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [connectWebSocket]);

  const logout = useCallback(() => {
    try {
      // Clean up WebSocket
      websocketService.cleanup();
      websocketService.disconnect();

      // Clear auth state
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      setError(null);
      setWsConnected(false);

      // Redirect to login
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  const updateProfile = useCallback(async (profileData) => {
    try {
      setError(null);
      const response = await authAPI.updateProfile(profileData);
      setUser(response.user);
      return response;
    } catch (err) {
      const errorMessage = err.error || err.message || 'Update failed';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    user,
    loading,
    token,
    error,
    wsConnected,
    login,
    register,
    logout,
    updateProfile,
    clearError,
    API_URL,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;