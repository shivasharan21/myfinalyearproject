// frontend/src/contexts/AuthContext.jsx (Fixed)
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import websocketService from '../services/websocket';

const AuthContext = createContext();

const API_URL = 'http://localhost:5000/api';

// Configure axios defaults
axios.defaults.baseURL = API_URL;

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [error, setError] = useState(null);

    // Set up axios interceptor for auth token
    useEffect(() => {
        const interceptor = axios.interceptors.request.use(
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

        return () => {
            axios.interceptors.request.eject(interceptor);
        };
    }, []);

    // Check for existing token on mount
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const response = await axios.get('/auth/me');
                    setUser(response.data);
                    setToken(token);
                    setError(null);
                    
                    // Connect WebSocket after user is authenticated
                    try {
                        websocketService.connect(API_URL.replace('/api', ''));
                        websocketService.emit('user:online', response.data._id);
                    } catch (wsError) {
                        console.warn('WebSocket connection warning:', wsError);
                        // Don't fail auth if WebSocket fails
                    }
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

    const login = async (email, password) => {
        try {
            setError(null);
            setLoading(true);
            const response = await axios.post('/auth/login', { email, password });
            const { token, user } = response.data;
            
            // Store token
            localStorage.setItem('token', token);
            setToken(token);
            setUser(user);
            
            // Connect WebSocket after successful login
            try {
                websocketService.connect(API_URL.replace('/api', ''));
                websocketService.emit('user:online', user.id);
            } catch (wsError) {
                console.warn('WebSocket connection warning:', wsError);
                // Don't fail login if WebSocket fails
            }
            
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
            const response = await axios.post('/auth/register', userData);
            const { token, user } = response.data;
            
            // Store token
            localStorage.setItem('token', token);
            setToken(token);
            setUser(user);
            
            // Connect WebSocket after successful registration
            try {
                websocketService.connect(API_URL.replace('/api', ''));
                websocketService.emit('user:online', user.id);
            } catch (wsError) {
                console.warn('WebSocket connection warning:', wsError);
                // Don't fail registration if WebSocket fails
            }
            
            return { success: true, user };
        } catch (error) {
            const errorMessage = error.response?.data?.error || error.message || 'Registration failed';
            setError(errorMessage);
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
        
        // Disconnect WebSocket
        try {
            websocketService.disconnect();
        } catch (wsError) {
            console.warn('WebSocket disconnect warning:', wsError);
        }
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
            clearError
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