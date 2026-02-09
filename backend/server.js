// backend/server.js (Fixed and Enhanced)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { spawn } = require('child_process');
const http = require('http');
const socketIO = require('socket.io');
require('dotenv').config();

// Helper function to parse CLIENT_URL (comma-separated or single value)
const parseClientUrl = () => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000,http://localhost:5173,http://localhost:5174';
  if (typeof clientUrl === 'string') {
    return clientUrl.split(',').map(url => url.trim());
  }
  return clientUrl;
};

const allowedOrigins = parseClientUrl();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
});

// Middleware
const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// MongoDB Connection (Fixed connection string)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/telemedicine';
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✓ Connected to MongoDB');
    createDefaultUsers();
  })
  .catch((err) => {
    console.error('✗ MongoDB connection error:', err);
    process.exit(1);
  });

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

const heartDiseasePredictionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  age: Number,
  sex: Number,
  chestPainType: Number,
  restingBP: Number,
  cholesterol: Number,
  fastingBS: Number,
  restingECG: Number,
  maxHeartRate: Number,
  exerciseAngina: Number,
  oldpeak: Number,
  stSlope: Number,
  ca: Number,
  thal: Number,
  prediction: Number,
  probability: Number,
  createdAt: { type: Date, default: Date.now }
});

const DiabetesPrediction = mongoose.model('DiabetesPrediction', diabetesPredictionSchema);
const HeartDiseasePrediction = mongoose.model('HeartDiseasePrediction', heartDiseasePredictionSchema);


// Create default test users
async function createDefaultUsers() {
  try {
    const testDoctor = await User.findOne({ email: 'doctor@test.com' });
    const testPatient = await User.findOne({ email: 'patient@test.com' });

    if (!testDoctor) {
      const hashedDoctorPassword = await bcrypt.hash('doctor123', 10);
      const doctor = new User({
        name: 'Dr. James Wilson',
        email: 'doctor@test.com',
        password: hashedDoctorPassword,
        role: 'doctor',
        specialization: 'General Practitioner',
        phone: '+1-555-0100'
      });
      await doctor.save();
      console.log('✓ Default doctor created: doctor@test.com (password: doctor123)');
    }

    if (!testPatient) {
      const hashedPatientPassword = await bcrypt.hash('patient123', 10);
      const patient = new User({
        name: 'John Smith',
        email: 'patient@test.com',
        password: hashedPatientPassword,
        role: 'patient',
        phone: '+1-555-0101'
      });
      await patient.save();
      console.log('✓ Default patient created: patient@test.com (password: patient123)');
    }
  } catch (error) {
    console.error('Error creating default users:', error);
  }
}

// Store user socket mappings
const userSockets = new Map();
const activeCalls = new Map();

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log('✓ Client connected:', socket.id);

  socket.on('user:online', (userId) => {
    if (userId) {
      userSockets.set(userId.toString(), socket.id);
      console.log(`✓ User ${userId} online with socket ${socket.id}`);

      // Broadcast online status
      io.emit('user:status', { userId, status: 'online' });
    }
  });

  // Video Call Events
  socket.on('call:initiate', (data) => {
    const { appointmentId, callerId, callerName, receiverId, offer } = data;
    const receiverSocketId = userSockets.get(receiverId.toString());

    console.log(`📞 Call initiated: ${callerId} -> ${receiverId}`);

    if (receiverSocketId) {
      activeCalls.set(appointmentId, {
        callerId,
        receiverId,
        startTime: new Date(),
        status: 'ringing'
      });

      io.to(receiverSocketId).emit('call:incoming', {
        appointmentId,
        callerId,
        callerName,
        offer
      });
      console.log(`✓ Call notification sent to ${receiverId}`);
    } else {
      console.log(`✗ Receiver ${receiverId} not online`);
      io.to(socket.id).emit('call:rejected', {
        appointmentId,
        reason: 'User is offline'
      });
    }
  });

  socket.on('call:answer', (data) => {
    const { appointmentId, answer } = data;
    const callData = activeCalls.get(appointmentId);

    if (callData) {
      callData.status = 'active';
      const callerSocketId = userSockets.get(callData.callerId.toString());

      if (callerSocketId) {
        io.to(callerSocketId).emit('call:answered', {
          appointmentId,
          answer
        });
        console.log(`✓ Call answered for appointment ${appointmentId}`);
      }
    }
  });

  socket.on('call:ice-candidate', (data) => {
    try {
      const { appointmentId, candidate, senderId } = data;

      if (!appointmentId || !candidate || !senderId) {
        console.warn('⚠️ Invalid ICE candidate data - missing fields:', { appointmentId: !!appointmentId, candidate: !!candidate, senderId: !!senderId });
        return;
      }

      const callData = activeCalls.get(appointmentId);

      if (callData) {
        // Determine receiver (the other party)
        const receiverId = senderId.toString() === callData.callerId.toString()
          ? callData.receiverId
          : callData.callerId;

        const receiverSocketId = userSockets.get(receiverId.toString());

        if (receiverSocketId) {
          io.to(receiverSocketId).emit('call:ice-candidate', {
            appointmentId,
            candidate: {
              candidate: candidate.candidate || candidate,
              sdpMLineIndex: candidate.sdpMLineIndex || 0,
              sdpMid: candidate.sdpMid || ''
            }
          });
          console.log(`✓ ICE candidate sent for appointment ${appointmentId}`);
        } else {
          console.log(`✗ Receiver socket not found for ICE candidate`);
        }
      } else {
        console.log(`✗ No active call for ICE candidate: ${appointmentId}`);
      }
    } catch (error) {
      console.error('❌ Error in call:ice-candidate:', error);
    }
  });

  socket.on('call:reject', (data) => {
    const { appointmentId, userId } = data;
    const callData = activeCalls.get(appointmentId);

    if (callData) {
      const otherUserId = userId.toString() === callData.callerId.toString()
        ? callData.receiverId
        : callData.callerId;
      const otherSocketId = userSockets.get(otherUserId.toString());

      if (otherSocketId) {
        io.to(otherSocketId).emit('call:rejected', { appointmentId });
      }
      activeCalls.delete(appointmentId);
      console.log(`✓ Call rejected for appointment ${appointmentId}`);
    }
  });

  socket.on('call:end', (data) => {
    const { appointmentId, userId } = data;
    const callData = activeCalls.get(appointmentId);

    if (callData) {
      const otherUserId = userId.toString() === callData.callerId.toString()
        ? callData.receiverId
        : callData.callerId;
      const otherSocketId = userSockets.get(otherUserId.toString());

      if (otherSocketId) {
        io.to(otherSocketId).emit('call:ended', { appointmentId });
      }

      // Also emit to the caller
      const callerSocketId = userSockets.get(callData.callerId.toString());
      if (callerSocketId && callerSocketId !== otherSocketId) {
        io.to(callerSocketId).emit('call:ended', { appointmentId });
      }

      activeCalls.delete(appointmentId);
      console.log(`✓ Call ended for appointment ${appointmentId}`);
    }
  });

  socket.on('disconnect', () => {
    for (let [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        io.emit('user:status', { userId, status: 'offline' });
        console.log(`✗ User ${userId} disconnected`);
      }
    }
  });
});

// Broadcast appointment updates
const broadcastAppointmentUpdate = async (appointment, eventType) => {
  try {
    const populatedApt = await Appointment.findById(appointment._id)
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name email specialization');

    if (!populatedApt) return;

    const patientSocketId = userSockets.get(populatedApt.patientId._id.toString());
    const doctorSocketId = userSockets.get(populatedApt.doctorId._id.toString());

    const updateData = {
      type: eventType,
      appointment: populatedApt
    };

    if (patientSocketId) {
      io.to(patientSocketId).emit('appointment:updated', updateData);
    }

    if (doctorSocketId) {
      io.to(doctorSocketId).emit('appointment:updated', updateData);
    }

    console.log(`✓ Appointment update broadcasted: ${eventType}`);
  } catch (error) {
    console.error('Error broadcasting appointment update:', error);
  }
};

// Auth Middleware
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, specialization, phone } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
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
      process.env.JWT_SECRET || 'your-secret-key-change-this',
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
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key-change-this',
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
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Get current user
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
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

    if (!doctorId || !date || !time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

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
      reason: reason || ''
    });

    await appointment.save();
    await broadcastAppointmentUpdate(appointment, 'created');

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Create appointment error:', error);
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
    console.error('Fetch appointments error:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Update appointment status
app.patch('/api/appointments/:id', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Authorization check
    if (req.userRole === 'patient' && appointment.patientId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (req.userRole === 'doctor' && appointment.doctorId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    appointment.status = status;
    await appointment.save();

    await broadcastAppointmentUpdate(appointment, 'updated');

    res.json(appointment);
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// Diabetes prediction
app.post('/api/predict-diabetes', authMiddleware, async (req, res) => {
  try {
    const inputData = req.body;

    // Validate input
    const requiredFields = ['pregnancies', 'glucose', 'bloodPressure', 'skinThickness', 'insulin', 'bmi', 'diabetesPedigreeFunction', 'age'];
    for (const field of requiredFields) {
      if (inputData[field] === undefined || inputData[field] === null) {
        return res.status(400).json({ error: `Missing field: ${field}` });
      }
    }

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
        console.error('Python prediction error:', error);
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
        console.error('Parse prediction error:', parseError);
        res.status(500).json({ error: 'Failed to parse prediction result' });
      }
    });
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ error: 'Prediction failed', details: error.message });
  }
});

// Heart disease prediction
app.post('/api/predict-heart-disease', authMiddleware, async (req, res) => {
  try {
    const inputData = req.body;

    // Validate input
    const requiredFields = [
      'age', 'sex', 'chestPainType', 'restingBP', 'cholesterol',
      'fastingBS', 'restingECG', 'maxHeartRate', 'exerciseAngina',
      'oldpeak', 'stSlope', 'ca', 'thal'
    ];
    
    for (const field of requiredFields) {
      if (inputData[field] === undefined || inputData[field] === null) {
        return res.status(400).json({ error: `Missing field: ${field}` });
      }
    }

    const pythonCmd = process.env.PYTHON_CMD || 'python';
    const python = spawn(pythonCmd, ['ml_model/heart_predict.py', JSON.stringify(inputData)]);

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
        console.error('Python prediction error:', error);
        return res.status(500).json({ error: 'Prediction failed', details: error });
      }

      try {
        const prediction = JSON.parse(result);

        const heartPrediction = new HeartDiseasePrediction({
          userId: req.userId,
          ...inputData,
          prediction: prediction.prediction,
          probability: prediction.probability
        });

        await heartPrediction.save();
        res.json(prediction);
      } catch (parseError) {
        console.error('Parse prediction error:', parseError);
        res.status(500).json({ error: 'Failed to parse prediction result' });
      }
    });
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ error: 'Prediction failed', details: error.message });
  }
});

// Get heart disease prediction history
app.get('/api/heart-predictions', authMiddleware, async (req, res) => {
  try {
    const predictions = await HeartDiseasePrediction.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(10);
    res.json(predictions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch predictions' });
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
      const [appointmentCount, diabetesPredictionCount, heartPredictionCount, upcomingAppointments] = await Promise.all([
        Appointment.countDocuments({ patientId: req.userId }),
        DiabetesPrediction.countDocuments({ userId: req.userId }),
        HeartDiseasePrediction.countDocuments({ userId: req.userId }), // ADD THIS LINE
        Appointment.countDocuments({
          patientId: req.userId,
          status: { $in: ['pending', 'confirmed'] },
          date: { $gte: new Date() }
        })
      ]);

      res.json({
        totalAppointments: appointmentCount,
        totalPredictions: diabetesPredictionCount + heartPredictionCount, // UPDATE THIS LINE
        totalDiabetesPredictions: diabetesPredictionCount, // ADD THIS LINE
        totalHeartPredictions: heartPredictionCount, // ADD THIS LINE
        upcomingAppointments
      });
    } else {
      // Doctor stats remain the same
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [appointmentCount, todayAppointments, patientIds] = await Promise.all([
        Appointment.countDocuments({ doctorId: req.userId }),
        Appointment.countDocuments({
          doctorId: req.userId,
          date: { $gte: today, $lt: tomorrow }
        }),
        Appointment.distinct('patientId', { doctorId: req.userId })
      ]);

      res.json({
        totalAppointments: appointmentCount,
        todayAppointments,
        totalPatients: patientIds.length
      });
    }
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🔗 MongoDB connected to ${MONGODB_URI}`);
});