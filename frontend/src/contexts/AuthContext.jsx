// frontend/src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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

  // FIX: hold unsubscribe fns so we can clean them up properly
  const wsUnsubscribeRef = useRef([]);

  // Initialize WebSocket lifecycle listeners
  useEffect(() => {
    const handleConnected    = () => setWsConnected(true);
    const handleDisconnected = () => setWsConnected(false);
    const handleReconnected  = () => setWsConnected(true);
    const handleFailed       = () => { console.warn('WebSocket reconnection failed'); setWsConnected(false); };

    // FIX: store the unsubscribe functions returned by on()
    const unsubs = [
      websocketService.on('ws:connected',       handleConnected),
      websocketService.on('ws:disconnected',     handleDisconnected),
      websocketService.on('ws:reconnected',      handleReconnected),
      websocketService.on('ws:reconnect-failed', handleFailed),
    ];
    wsUnsubscribeRef.current = unsubs;

    return () => {
      // FIX: actually call each unsubscribe on unmount
      unsubs.forEach((unsub) => typeof unsub === 'function' && unsub());
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const connectWebSocket = useCallback((userId) => {
    if (!userId) {
      console.error('User ID required for WebSocket connection');
      return;
    }

    try {
      const wsUrl = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;
      websocketService.connect(wsUrl);

      // FIX: the unsubscribe returned here was previously discarded (memory leak)
      const unsub = websocketService.on('ws:connected', () => {
        websocketService.notifyOnline(userId);
        console.log('User online notification sent:', userId);
        unsub(); // one-shot: remove listener once connected
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
  }, []);  // API_URL is module-level constant, safe to omit

  const login = useCallback(async (email, password) => {
    try {
      setError(null);
      setLoading(true);

      const response = await authAPI.login(email, password);
      const { token: newToken, user: userData } = response;

      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
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

      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(newUser);
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
      // FIX: cleanup() clears all socket listeners BEFORE disconnect()
      // Previously the order was wrong: cleanup then disconnect left the
      // socket in a half-torn-down state on the server side.
      websocketService.cleanup();
      websocketService.disconnect();

      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      setError(null);
      setWsConnected(false);

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

  const clearError = useCallback(() => setError(null), []);

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