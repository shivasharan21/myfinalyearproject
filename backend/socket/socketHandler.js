// backend/socket/socketHandler.js

const onlineUsers = new Map(); // userId -> socketId

const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`✓ Socket connected: ${socket.id}`);

    // ─── User presence ────────────────────────────────────────────────────────

    socket.on('user:online', (userId) => {
      if (!userId) return;
      onlineUsers.set(userId.toString(), socket.id);

      // Join personal rooms so targeted events work
      socket.join(`patient_${userId}`);
      socket.join(`doctor_${userId}`);

      console.log(`✓ User ${userId} is online (socket: ${socket.id})`);
      io.emit('user:status', { userId, status: 'online' });
    });

    // ─── Video call signalling ────────────────────────────────────────────────

    socket.on('call:initiate', (data) => {
      const { receiverId, callerId, callerName, appointmentId, offer } = data;
      const receiverSocketId = onlineUsers.get(receiverId?.toString());

      console.log(`📞 Call from ${callerId} → ${receiverId} (socket: ${receiverSocketId})`);

      if (receiverSocketId) {
        io.to(receiverSocketId).emit('call:incoming', {
          callerId,
          callerName,
          appointmentId,
          offer,
        });
      } else {
        // Receiver offline – notify caller
        socket.emit('call:receiver-offline', { receiverId });
      }
    });

    socket.on('call:answer', (data) => {
      const { appointmentId, answer } = data;
      // Find caller by appointmentId room and forward the answer
      socket.to(`appointment_${appointmentId}`).emit('call:answered', { answer });
      // Also broadcast to all participants of appointment
      io.to(`appointment_${appointmentId}`).emit('call:answered', { answer });
    });

    socket.on('call:ice-candidate', (data) => {
      const { appointmentId, candidate, senderId } = data;
      socket.to(`appointment_${appointmentId}`).emit('call:ice-candidate', {
        candidate,
        senderId,
      });
    });

    socket.on('call:reject', (data) => {
      const { appointmentId, userId } = data;
      socket.to(`appointment_${appointmentId}`).emit('call:rejected', { userId });
      io.to(`appointment_${appointmentId}`).emit('call:rejected', { userId });
    });

    socket.on('call:end', (data) => {
      const { appointmentId, userId } = data;
      socket.to(`appointment_${appointmentId}`).emit('call:ended', { userId });
    });

    // Join a room scoped to an appointment (both doctor & patient join when call starts)
    socket.on('call:join-room', ({ appointmentId }) => {
      socket.join(`appointment_${appointmentId}`);
      console.log(`Socket ${socket.id} joined appointment room: ${appointmentId}`);
    });

    // ─── Appointment real-time events ─────────────────────────────────────────

    socket.on('appointment:created', (data) => {
      const { doctorId } = data;
      io.to(`doctor_${doctorId}`).emit('appointment:created', data);
    });

    socket.on('appointment:updated', (data) => {
      const { patientId, doctorId } = data;
      if (patientId) io.to(`patient_${patientId}`).emit('appointment:updated', data);
      if (doctorId) io.to(`doctor_${doctorId}`).emit('appointment:updated', data);
    });

    // ─── Prescription / reminder notifications ────────────────────────────────

    socket.on('prescription:notify', (data) => {
      const { patientId } = data;
      io.to(`patient_${patientId}`).emit('prescription:new', data);
    });

    socket.on('reminder:alert', (data) => {
      const { patientId } = data;
      io.to(`patient_${patientId}`).emit('reminder:alert', data);
    });

    // ─── Disconnect ───────────────────────────────────────────────────────────

    socket.on('disconnect', () => {
      // Remove user from online map
      for (const [userId, sid] of onlineUsers.entries()) {
        if (sid === socket.id) {
          onlineUsers.delete(userId);
          io.emit('user:status', { userId, status: 'offline' });
          console.log(`✗ User ${userId} went offline`);
          break;
        }
      }
      console.log(`✗ Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

// Helper to get a user's socket ID (useful from controllers)
const getSocketId = (userId) => onlineUsers.get(userId?.toString());

module.exports = { setupSocket, getSocketId, onlineUsers };