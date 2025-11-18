// frontend/src/contexts/AuthContext.jsx (Fixed and Enhanced)
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import websocketService from '../services/websocket';

const AuthContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [error, setError] = useState(null);
    const [wsConnected, setWsConnected] = useState(false);

    // Set up axios interceptor for auth token
    useEffect(() => {
        const interceptor = axios.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('token');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                // Ensure full URL
                if (config.url.startsWith('/')) {
                    config.url = API_URL + config.url;
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // Response interceptor for handling 401 errors
        const responseInterceptor = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    // Token expired or invalid
                    localStorage.removeItem('token');
                    setToken(null);
                    setUser(null);
                    window.location.href = '/login';
                }
                return Promise.reject(error);
            }
        );

        return () => {
            axios.interceptors.request.eject(interceptor);
            axios.interceptors.response.eject(responseInterceptor);
        };
    }, []);

    // Check for existing token on mount
    useEffect(() => {
        const checkAuth = async () => {
            const storedToken = localStorage.getItem('token');
            if (storedToken) {
                try {
                    const response = await axios.get(`${API_URL}/auth/me`);
                    setUser(response.data);
                    setToken(storedToken);
                    setError(null);
                    
                    // Connect WebSocket after user is authenticated
                    connectWebSocket(response.data._id);
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

    const connectWebSocket = (userId) => {
        try {
            const wsUrl = API_URL.replace('/api', '');
            websocketService.connect(wsUrl);
            
            // Wait a bit for connection to establish
            setTimeout(() => {
                websocketService.emit('user:online', userId);
                setWsConnected(true);
                console.log('✓ WebSocket connected for user:', userId);
            }, 500);

            // Listen for connection status
            websocketService.on('connect', () => {
                setWsConnected(true);
                websocketService.emit('user:online', userId);
            });

            websocketService.on('disconnect', () => {
                setWsConnected(false);
            });
        } catch (wsError) {
            console.warn('WebSocket connection warning:', wsError);
            setWsConnected(false);
        }
    };

    const login = async (email, password) => {
        try {
            setError(null);
            setLoading(true);
            
            const response = await axios.post(`${API_URL}/auth/login`, { 
                email, 
                password 
            });
            
            const { token, user } = response.data;
            
            // Store token
            localStorage.setItem('token', token);
            setToken(token);
            setUser(user);
            
            // Connect WebSocket
            connectWebSocket(user.id);
            
            setLoading(false);
            return { success: true, user };
        } catch (error) {
            const errorMessage = error.response?.data?.error || error.message || 'Login failed';
            setError(errorMessage);
            setLoading(false);
            console.error('Login failed:', error);
            throw error;
        }
    };

    const register = async (userData) => {
        try {
            setError(null);
            setLoading(true);
            
            const response = await axios.post(`${API_URL}/auth/register`, userData);
            const { token, user } = response.data;
            
            // Store token
            localStorage.setItem('token', token);
            setToken(token);
            setUser(user);
            
            // Connect WebSocket
            connectWebSocket(user.id);
            
            setLoading(false);
            return { success: true, user };
        } catch (error) {
            const errorMessage = error.response?.data?.error || error.message || 'Registration failed';
            setError(errorMessage);
            setLoading(false);
            console.error('Registration failed:', error);
            return { 
                success: false, 
                error: errorMessage
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setError(null);
        setWsConnected(false);
        
        // Disconnect WebSocket
        try {
            websocketService.disconnect();
        } catch (wsError) {
            console.warn('WebSocket disconnect warning:', wsError);
        }
        
        window.location.href = '/login';
    };

    const clearError = () => {
        setError(null);
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            loading, 
            token, 
            login, 
            register, 
            logout, 
            API_URL,
            error,
            clearError,
            wsConnected
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};