// frontend/src/services/websocket.js (Enhanced with Video Call Support)
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

  // Stats update events
  notifyStatsUpdate(stats) {
    this.emit('stats:updated', stats);
  }

  onStatsUpdate(callback) {
    this.on('stats:updated', callback);
  }
}

export default new WebSocketService();