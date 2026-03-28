// backend/server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { setupSocket } = require('./socket/socketHandler');

// ─── Route imports ────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const predictionRoutes = require('./routes/predictions');
const healthRecordRoutes = require('./routes/healthRecords');
const prescriptionRoutes = require('./routes/prescriptions');
const reminderRoutes = require('./routes/reminders');
const doctorRoutes = require('./routes/doctors');
const statsRoutes = require('./routes/stats');

// ─── App & Server setup ───────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ─── Socket.IO ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

setupSocket(io);

// Make io accessible in controllers via req.app.get('io')
app.set('io', io);

// ─── Connect DB ───────────────────────────────────────────────────────────────
connectDB();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api', predictionRoutes);          // /api/predict-diabetes, /api/predictions, etc.
app.use('/api/health-records', healthRecordRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/stats', statsRoutes);

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║         Dr.AssistAI Backend Server           ║
╠══════════════════════════════════════════════╣
║  Port     : ${PORT}                              ║
║  Mode     : ${(process.env.NODE_ENV || 'development').padEnd(30)} ║
║  DB       : MongoDB                          ║
╚══════════════════════════════════════════════╝
  `);
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err.message);
  server.close(() => process.exit(1));
});

module.exports = { app, server };