// backend/server.js (Updated)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { spawn } = require('child_process');
const http = require('http');
const socketIO = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/telemedicine')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['patient', 'doctor'], required: true },
  specialization: { type: String },
  phone: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Appointment Schema
const appointmentSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, required: true },
  doctorName: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  reason: { type: String },
  status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

// Diabetes Prediction Schema
const diabetesPredictionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pregnancies: Number,
  glucose: Number,
  bloodPressure: Number,
  skinThickness: Number,
  insulin: Number,
  bmi: Number,
  diabetesPedigreeFunction: Number,
  age: Number,
  prediction: Number,
  probability: Number,
  createdAt: { type: Date, default: Date.now }
});

const DiabetesPrediction = mongoose.model('DiabetesPrediction', diabetesPredictionSchema);

// Store user socket mappings
const userSockets = new Map();

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('user:online', (userId) => {
    userSockets.set(userId, socket.id);
    console.log(`User ${userId} is online with socket ${socket.id}`);
  });

  socket.on('disconnect', () => {
    // Remove user from online map
    for (let [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        console.log(`User ${userId} went offline`);
      }
    }
  });
});

// Helper function to broadcast appointment updates
const broadcastAppointmentUpdate = async (appointment, eventType) => {
  // Populate the appointment details
  const populatedApt = await Appointment.findById(appointment._id)
    .populate('patientId', 'name email phone')
    .populate('doctorId', 'name email specialization');

  // Notify patient
  if (userSockets.has(populatedApt.patientId._id.toString())) {
    const socketId = userSockets.get(populatedApt.patientId._id.toString());
    io.to(socketId).emit('appointment:updated', {
      type: eventType,
      appointment: populatedApt
    });
  }

  // Notify doctor
  if (userSockets.has(populatedApt.doctorId._id.toString())) {
    const socketId = userSockets.get(populatedApt.doctorId._id.toString());
    io.to(socketId).emit('appointment:updated', {
      type: eventType,
      appointment: populatedApt
    });
  }
};

// Auth Middleware
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Routes

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, specialization, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      specialization: role === 'doctor' ? specialization : undefined,
      phone
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        specialization: user.specialization
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        specialization: user.specialization
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Get current user
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Get all doctors
app.get('/api/doctors', authMiddleware, async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor' }).select('-password');
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

// Create appointment
app.post('/api/appointments', authMiddleware, async (req, res) => {
  try {
    const { doctorId, date, time, reason } = req.body;
    
    const patient = await User.findById(req.userId);
    const doctor = await User.findById(doctorId);

    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const appointment = new Appointment({
      patientId: req.userId,
      doctorId,
      patientName: patient.name,
      doctorName: doctor.name,
      date,
      time,
      reason
    });

    await appointment.save();

    // Broadcast to both patient and doctor
    await broadcastAppointmentUpdate(appointment, 'created');

    res.status(201).json(appointment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create appointment', details: error.message });
  }
});

// Get appointments
app.get('/api/appointments', authMiddleware, async (req, res) => {
  try {
    const query = req.userRole === 'patient' 
      ? { patientId: req.userId }
      : { doctorId: req.userId };
    
    const appointments = await Appointment.find(query)
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name email specialization')
      .sort({ date: -1 });
    
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Update appointment status
app.patch('/api/appointments/:id', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    // Broadcast status update
    await broadcastAppointmentUpdate(appointment, 'updated');

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// Diabetes prediction
app.post('/api/predict-diabetes', authMiddleware, async (req, res) => {
  try {
    const inputData = req.body;
    
    const pythonCmd = process.env.PYTHON_CMD || 'python';
    const python = spawn(pythonCmd, ['ml_model/predict.py', JSON.stringify(inputData)]);
    
    let result = '';
    let error = '';

    python.stdout.on('data', (data) => {
      result += data.toString();
    });

    python.stderr.on('data', (data) => {
      error += data.toString();
    });

    python.on('close', async (code) => {
      if (code !== 0) {
        return res.status(500).json({ error: 'Prediction failed', details: error });
      }

      try {
        const prediction = JSON.parse(result);
        
        const diabetesPrediction = new DiabetesPrediction({
          userId: req.userId,
          ...inputData,
          prediction: prediction.prediction,
          probability: prediction.probability
        });

        await diabetesPrediction.save();
        res.json(prediction);
      } catch (parseError) {
        res.status(500).json({ error: 'Failed to parse prediction result' });
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Prediction failed', details: error.message });
  }
});

// Get prediction history
app.get('/api/predictions', authMiddleware, async (req, res) => {
  try {
    const predictions = await DiabetesPrediction.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(10);
    res.json(predictions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
});

// Stats for dashboards
app.get('/api/stats', authMiddleware, async (req, res) => {
  try {
    if (req.userRole === 'patient') {
      const appointmentCount = await Appointment.countDocuments({ patientId: req.userId });
      const predictionCount = await DiabetesPrediction.countDocuments({ userId: req.userId });
      const upcomingAppointments = await Appointment.countDocuments({
        patientId: req.userId,
        status: { $in: ['pending', 'confirmed'] },
        date: { $gte: new Date() }
      });

      res.json({
        totalAppointments: appointmentCount,
        totalPredictions: predictionCount,
        upcomingAppointments
      });
    } else {
      const appointmentCount = await Appointment.countDocuments({ doctorId: req.userId });
      const todayAppointments = await Appointment.countDocuments({
        doctorId: req.userId,
        date: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      });
      const patientCount = await Appointment.distinct('patientId', { doctorId: req.userId });

      res.json({
        totalAppointments: appointmentCount,
        todayAppointments,
        totalPatients: patientCount.length
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});