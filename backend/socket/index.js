const socketIO   = require('socket.io');
const Appointment = require('../models/Appointment');

let io;
const userSockets = new Map();
const activeCalls = new Map();

// ─── Broadcast helper (used by appointment controller) ───────────────────────

const broadcastAppointmentUpdate = async (appointment, eventType) => {
  try {
    const populatedApt = await Appointment.findById(appointment._id)
      .populate('patientId', 'name email phone')
      .populate('doctorId',  'name email specialization');
    if (!populatedApt) return;

    const patientSocketId = userSockets.get(populatedApt.patientId._id.toString());
    const doctorSocketId  = userSockets.get(populatedApt.doctorId._id.toString());

    const updateData   = { type: eventType, appointment: populatedApt };
    const socketEvent  = eventType === 'created' ? 'appointment:created' : 'appointment:updated';

    if (patientSocketId) io.to(patientSocketId).emit(socketEvent, updateData);
    if (doctorSocketId)  io.to(doctorSocketId).emit(socketEvent, updateData);

    console.log(`✓ Appointment update broadcasted: ${socketEvent}`);
  } catch (error) {
    console.error('Error broadcasting appointment update:', error);
  }
};

// ─── Socket initialisation ───────────────────────────────────────────────────

const initSocket = (server, allowedOrigins) => {
  io = socketIO(server, {
    cors: {
      origin:         allowedOrigins,
      credentials:    true,
      methods:        ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }
  });

  io.on('connection', (socket) => {
    console.log('✓ Client connected:', socket.id);

    socket.on('user:online', (userId) => {
      if (userId) {
        userSockets.set(userId.toString(), socket.id);
        io.emit('user:status', { userId, status: 'online' });
      }
    });
    socket.on('user:online', (userId) => {
  console.log('user:online received. userId:', userId, '| type:', typeof userId); // ADD THIS
  if (userId) {
    userSockets.set(userId.toString(), socket.id);
    io.emit('user:status', { userId, status: 'online' });
  }
});

    socket.on('call:initiate', (data) => {
      const { appointmentId, callerId, callerName, receiverId, offer } = data;
      const receiverSocketId = userSockets.get(receiverId.toString());

      if (receiverSocketId) {
        activeCalls.set(appointmentId, { callerId, receiverId, startTime: new Date(), status: 'ringing' });
        io.to(receiverSocketId).emit('call:incoming', { appointmentId, callerId, callerName, offer });
      } else {
        io.to(socket.id).emit('call:rejected', { appointmentId, reason: 'User is offline' });
      }
    });

    socket.on('call:answer', (data) => {
      const { appointmentId, answer } = data;
      const callData = activeCalls.get(appointmentId);
      if (callData) {
        callData.status = 'active';
        const callerSocketId = userSockets.get(callData.callerId.toString());
        if (callerSocketId) {
          io.to(callerSocketId).emit('call:answered', { appointmentId, answer });
        }
      }
    });

    socket.on('call:ice-candidate', (data) => {
      try {
        const { appointmentId, candidate, senderId } = data;
        if (!appointmentId || !candidate || !senderId) return;

        const callData = activeCalls.get(appointmentId);
        if (callData) {
          const receiverId = senderId.toString() === callData.callerId.toString()
            ? callData.receiverId : callData.callerId;
          const receiverSocketId = userSockets.get(receiverId.toString());
          if (receiverSocketId) {
            io.to(receiverSocketId).emit('call:ice-candidate', {
              appointmentId,
              candidate: {
                candidate:     candidate.candidate     || candidate,
                sdpMLineIndex: candidate.sdpMLineIndex || 0,
                sdpMid:        candidate.sdpMid        || ''
              }
            });
          }
        }
      } catch (error) {
        console.error('❌ Error in call:ice-candidate:', error);
      }
    });

    socket.on('call:reject', (data) => {
      const { appointmentId, userId } = data;
      const callData = activeCalls.get(appointmentId);
      if (callData) {
        const otherUserId  = userId.toString() === callData.callerId.toString()
          ? callData.receiverId : callData.callerId;
        const otherSocketId = userSockets.get(otherUserId.toString());
        if (otherSocketId) io.to(otherSocketId).emit('call:rejected', { appointmentId });
        activeCalls.delete(appointmentId);
      }
    });

    socket.on('call:end', (data) => {
      const { appointmentId, userId } = data;
      const callData = activeCalls.get(appointmentId);
      if (callData) {
        const otherUserId   = userId.toString() === callData.callerId.toString()
          ? callData.receiverId : callData.callerId;
        const otherSocketId = userSockets.get(otherUserId.toString());
        if (otherSocketId) io.to(otherSocketId).emit('call:ended', { appointmentId });

        const callerSocketId = userSockets.get(callData.callerId.toString());
        if (callerSocketId && callerSocketId !== otherSocketId) {
          io.to(callerSocketId).emit('call:ended', { appointmentId });
        }
        activeCalls.delete(appointmentId);
      }
    });

    socket.on('disconnect', () => {
      for (let [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          userSockets.delete(userId);
          io.emit('user:status', { userId, status: 'offline' });
        }
      }
    });
  });

  return io;
};

module.exports = { initSocket, broadcastAppointmentUpdate, userSockets, getIo: () => io };