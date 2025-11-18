// frontend/src/services/websocket.js (Enhanced with Better Error Handling)
import io from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

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
        timeout: 10000
      });

      this.socket.on('connect', () => {
        console.log('✓ WebSocket connected');
        this.reconnectAttempts = 0;
      });

      this.socket.on('disconnect', (reason) => {
        console.log('✗ WebSocket disconnected:', reason);
      });

      this.socket.on('connect_error', (error) => {
        this.reconnectAttempts++;
        console.error(`✗ WebSocket connection error (attempt ${this.reconnectAttempts}):`, error.message);
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('Max reconnection attempts reached');
        }
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log(`✓ WebSocket reconnected after ${attemptNumber} attempts`);
      });

      this.socket.on('reconnect_error', (error) => {
        console.error('Reconnection error:', error);
      });

      this.socket.on('reconnect_failed', () => {
        console.error('Failed to reconnect to WebSocket server');
      });
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('✓ WebSocket disconnected');
    }
  }

  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`Cannot emit ${event}: WebSocket not connected`);
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  // Appointment events
  notifyAppointmentCreated(appointment) {
    this.emit('appointment:created', appointment);
  }

  notifyAppointmentUpdated(appointment) {
    this.emit('appointment:updated', appointment);
  }

  onAppointmentCreated(callback) {
    this.on('appointment:created', callback);
  }

  onAppointmentUpdated(callback) {
    this.on('appointment:updated', callback);
  }

  // Video call events
  initiateCall(data) {
    this.emit('call:initiate', data);
  }

  answerCall(data) {
    this.emit('call:answer', data);
  }

  sendICECandidate(data) {
    this.emit('call:ice-candidate', data);
  }

  rejectCall(data) {
    this.emit('call:reject', data);
  }

  endCall(data) {
    this.emit('call:end', data);
  }

  onCallInitiate(callback) {
    this.on('call:initiate', callback);
  }

  onCallIncoming(callback) {
    this.on('call:incoming', callback);
  }

  onCallAnswered(callback) {
    this.on('call:answered', callback);
  }

  onICECandidate(callback) {
    this.on('call:ice-candidate', callback);
  }

  onCallRejected(callback) {
    this.on('call:rejected', callback);
  }

  onCallEnded(callback) {
    this.on('call:ended', callback);
  }

  // User status events
  onUserStatus(callback) {
    this.on('user:status', callback);
  }

  // Stats update events
  notifyStatsUpdate(stats) {
    this.emit('stats:updated', stats);
  }

  onStatsUpdate(callback) {
    this.on('stats:updated', callback);
  }
}

export default new WebSocketService();