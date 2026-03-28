// frontend/src/services/websocket.js
import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    // Local EventEmitter for internal ws: lifecycle events
    this._listeners = {};
  }

  // ─── Internal EventEmitter (for ws: prefixed events) ─────────────────────

  _emit(event, data) {
    (this._listeners[event] || []).forEach((cb) => cb(data));
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  connect(url = 'http://localhost:5000') {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      this.socket = io(url, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
        transports: ['websocket', 'polling'],
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        console.log('✓ WebSocket connected');
        this.reconnectAttempts = 0;
        this._emit('ws:connected');
      });

      this.socket.on('disconnect', (reason) => {
        console.log('✗ WebSocket disconnected:', reason);
        this._emit('ws:disconnected', reason);
      });

      this.socket.on('connect_error', (error) => {
        this.reconnectAttempts++;
        console.error(`✗ WebSocket connection error (attempt ${this.reconnectAttempts}):`, error.message);
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('Max reconnection attempts reached');
          this._emit('ws:reconnect-failed');
        }
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log(`✓ WebSocket reconnected after ${attemptNumber} attempts`);
        this._emit('ws:reconnected');
      });

      this.socket.on('reconnect_failed', () => {
        console.error('Failed to reconnect to WebSocket server');
        this._emit('ws:reconnect-failed');
      });
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // FIX: cleanup() was called in AuthContext.logout() but never defined
  cleanup() {
    this._listeners = {};
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  // FIX: notifyOnline() was called in AuthContext but never defined
  notifyOnline(userId) {
    this.emit('user:online', userId);
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`Cannot emit ${event}: WebSocket not connected`);
    }
  }

  // FIX: on() now also handles internal ws: events, not just socket.io events
  on(event, callback) {
    if (event.startsWith('ws:')) {
      this._listeners[event] = this._listeners[event] || [];
      this._listeners[event].push(callback);
      // Return unsubscribe function (used in AuthContext)
      return () => this.off(event, callback);
    }
    if (this.socket) {
      this.socket.on(event, callback);
    }
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (event.startsWith('ws:')) {
      if (callback) {
        this._listeners[event] = (this._listeners[event] || []).filter((cb) => cb !== callback);
      } else {
        delete this._listeners[event];
      }
      return;
    }
    if (this.socket) {
      callback ? this.socket.off(event, callback) : this.socket.off(event);
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  // ─── Appointment events ───────────────────────────────────────────────────
  notifyAppointmentCreated(appointment) { this.emit('appointment:created', appointment); }
  notifyAppointmentUpdated(appointment) { this.emit('appointment:updated', appointment); }
  onAppointmentCreated(callback) { this.on('appointment:created', callback); }
  onAppointmentUpdated(callback) { this.on('appointment:updated', callback); }

  // ─── Video call events ────────────────────────────────────────────────────
  initiateCall(data) { this.emit('call:initiate', data); }
  answerCall(data) { this.emit('call:answer', data); }
  sendICECandidate(data) { this.emit('call:ice-candidate', data); }
  rejectCall(data) { this.emit('call:reject', data); }
  endCall(data) { this.emit('call:end', data); }
  onCallIncoming(callback) { this.on('call:incoming', callback); }
  onCallAnswered(callback) { this.on('call:answered', callback); }
  onICECandidate(callback) { this.on('call:ice-candidate', callback); }
  onCallRejected(callback) { this.on('call:rejected', callback); }
  onCallEnded(callback) { this.on('call:ended', callback); }

  // ─── User / stats ─────────────────────────────────────────────────────────
  onUserStatus(callback) { this.on('user:status', callback); }
  onStatsUpdate(callback) { this.on('stats:updated', callback); }
}

export default new WebSocketService();