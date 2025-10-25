// frontend/src/services/websocket.js
import io from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
  }

  connect(url = 'http://localhost:5000') {
    this.socket = io(url, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
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

  // Stats update events
  notifyStatsUpdate(stats) {
    this.emit('stats:updated', stats);
  }

  onStatsUpdate(callback) {
    this.on('stats:updated', callback);
  }
}

export default new WebSocketService();