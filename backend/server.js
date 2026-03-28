// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { spawn } = require('child_process');
const http = require('http');
const socketIO = require('socket.io');
require('dotenv').config();

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

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

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

// ─── Schemas ──────────────────────────────────────────────────────────────────

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

const diabetesPredictionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pregnancies: Number, glucose: Number, bloodPressure: Number,
  skinThickness: Number, insulin: Number, bmi: Number,
  diabetesPedigreeFunction: Number, age: Number,
  prediction: Number, probability: Number,
  createdAt: { type: Date, default: Date.now }
});
const DiabetesPrediction = mongoose.model('DiabetesPrediction', diabetesPredictionSchema);

const heartDiseasePredictionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  age: Number, sex: Number, chestPainType: Number, restingBP: Number,
  cholesterol: Number, fastingBS: Number, restingECG: Number,
  maxHeartRate: Number, exerciseAngina: Number, oldpeak: Number,
  stSlope: Number, ca: Number, thal: Number,
  prediction: Number, probability: Number,
  createdAt: { type: Date, default: Date.now }
});
const HeartDiseasePrediction = mongoose.model('HeartDiseasePrediction', heartDiseasePredictionSchema);

// FIX: Add missing schemas for routes that the frontend calls but had no backend

const healthRecordSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: { type: String, required: true },
  recordType: { type: String, default: 'general' },
  description: { type: String },
  diagnosis: { type: String },
  vitals: [{ name: String, value: String, unit: String }],
  createdAt: { type: Date, default: Date.now }
});
const HealthRecord = mongoose.model('HealthRecord', healthRecordSchema);

const prescriptionSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorName: { type: String },
  diagnosis: { type: String },
  medicines: [{
    name: String, dosage: String, frequency: String, duration: String
  }],
  advice: { type: String },
  status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
  prescribedDate: { type: Date, default: Date.now },
  validUntil: { type: Date }
});
const Prescription = mongoose.model('Prescription', prescriptionSchema);

const reminderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  medicineName: { type: String, required: true },
  dosage: { type: String },
  times: [{ type: String }],
  instructions: { type: String },
  active: { type: Boolean, default: true },
  logs: [{ takenAt: Date, skipped: Boolean }],
  createdAt: { type: Date, default: Date.now }
});
const Reminder = mongoose.model('Reminder', reminderSchema);

// ─── Default users ────────────────────────────────────────────────────────────

async function createDefaultUsers() {
  try {
    if (!await User.findOne({ email: 'doctor@test.com' })) {
      const hashedDoctorPassword = await bcrypt.hash('doctor123', 10);
      await new User({
        name: 'Dr. James Wilson', email: 'doctor@test.com',
        password: hashedDoctorPassword, role: 'doctor',
        specialization: 'General Practitioner', phone: '+1-555-0100'
      }).save();
      console.log('✓ Default doctor created: doctor@test.com (password: doctor123)');
    }

    if (!await User.findOne({ email: 'patient@test.com' })) {
      const hashedPatientPassword = await bcrypt.hash('patient123', 10);
      await new User({
        name: 'John Smith', email: 'patient@test.com',
        password: hashedPatientPassword, role: 'patient', phone: '+1-555-0101'
      }).save();
      console.log('✓ Default patient created: patient@test.com (password: patient123)');
    }
  } catch (error) {
    console.error('Error creating default users:', error);
  }
}

// ─── Socket.IO ────────────────────────────────────────────────────────────────

const userSockets = new Map();
const activeCalls = new Map();

io.on('connection', (socket) => {
  console.log('✓ Client connected:', socket.id);

  socket.on('user:online', (userId) => {
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
              candidate: candidate.candidate || candidate,
              sdpMLineIndex: candidate.sdpMLineIndex || 0,
              sdpMid: candidate.sdpMid || ''
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
      const otherUserId = userId.toString() === callData.callerId.toString()
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
      const otherUserId = userId.toString() === callData.callerId.toString()
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

// FIX: broadcastAppointmentUpdate previously emitted 'appointment:updated' for
// ALL event types (including 'created'). The PatientDashboard listens for
// 'appointment:updated' via onAppointmentUpdated — emit the correct event key.
const broadcastAppointmentUpdate = async (appointment, eventType) => {
  try {
    const populatedApt = await Appointment.findById(appointment._id)
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name email specialization');
    if (!populatedApt) return;

    const patientSocketId = userSockets.get(populatedApt.patientId._id.toString());
    const doctorSocketId  = userSockets.get(populatedApt.doctorId._id.toString());

    const updateData = { type: eventType, appointment: populatedApt };

    // FIX: use the correct event name based on eventType so both dashboards
    // can distinguish between new bookings and status changes.
    const socketEvent = eventType === 'created' ? 'appointment:created' : 'appointment:updated';

    if (patientSocketId) io.to(patientSocketId).emit(socketEvent, updateData);
    if (doctorSocketId)  io.to(doctorSocketId).emit(socketEvent, updateData);

    console.log(`✓ Appointment update broadcasted: ${socketEvent}`);
  } catch (error) {
    console.error('Error broadcasting appointment update:', error);
  }
};

// ─── Auth Middleware ──────────────────────────────────────────────────────────

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// Auth
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, specialization, phone } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ error: 'Missing required fields' });

    if (await User.findOne({ email })) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await new User({
      name, email, password: hashedPassword, role,
      specialization: role === 'doctor' ? specialization : undefined, phone
    }).save();

    const token = jwt.sign({ userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key-change-this', { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, specialization: user.specialization }
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key-change-this', { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, specialization: user.specialization }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Doctors
app.get('/api/doctors', authMiddleware, async (req, res) => {
  try {
    res.json(await User.find({ role: 'doctor' }).select('-password'));
  } catch {
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

// Appointments
app.post('/api/appointments', authMiddleware, async (req, res) => {
  try {
    const { doctorId, date, time, reason } = req.body;
    if (!doctorId || !date || !time) return res.status(400).json({ error: 'Missing required fields' });

    const patient = await User.findById(req.userId);
    const doctor  = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') return res.status(404).json({ error: 'Doctor not found' });

    const appointment = await new Appointment({
      patientId: req.userId, doctorId,
      patientName: patient.name, doctorName: doctor.name,
      date, time, reason: reason || ''
    }).save();

    await broadcastAppointmentUpdate(appointment, 'created');
    res.status(201).json(appointment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create appointment', details: error.message });
  }
});

app.get('/api/appointments', authMiddleware, async (req, res) => {
  try {
    const query = req.userRole === 'patient' ? { patientId: req.userId } : { doctorId: req.userId };
    const appointments = await Appointment.find(query)
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name email specialization')
      .sort({ date: -1 });
    res.json(appointments);
  } catch {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

app.patch('/api/appointments/:id', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

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
  } catch {
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// Diabetes prediction
app.post('/api/predict-diabetes', authMiddleware, async (req, res) => {
  try {
    const inputData = req.body;
    const requiredFields = ['pregnancies', 'glucose', 'bloodPressure', 'skinThickness', 'insulin', 'bmi', 'diabetesPedigreeFunction', 'age'];
    for (const field of requiredFields) {
      if (inputData[field] === undefined || inputData[field] === null) {
        return res.status(400).json({ error: `Missing field: ${field}` });
      }
    }

    const pythonCmd = process.env.PYTHON_CMD || 'python';
    const python = spawn(pythonCmd, ['ml_model/predict.py', JSON.stringify(inputData)]);
    let result = '', error = '';

    python.stdout.on('data', (data) => { result += data.toString(); });
    python.stderr.on('data', (data) => { error += data.toString(); });

    python.on('close', async (code) => {
      if (code !== 0) return res.status(500).json({ error: 'Prediction failed', details: error });
      try {
        const prediction = JSON.parse(result);
        await new DiabetesPrediction({ userId: req.userId, ...inputData, prediction: prediction.prediction, probability: prediction.probability }).save();
        res.json(prediction);
      } catch {
        res.status(500).json({ error: 'Failed to parse prediction result' });
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Prediction failed', details: error.message });
  }
});

// Heart disease prediction
app.post('/api/predict-heart-disease', authMiddleware, async (req, res) => {
  try {
    const inputData = req.body;
    const requiredFields = ['age', 'sex', 'chestPainType', 'restingBP', 'cholesterol', 'fastingBS', 'restingECG', 'maxHeartRate', 'exerciseAngina', 'oldpeak', 'stSlope', 'ca', 'thal'];
    for (const field of requiredFields) {
      if (inputData[field] === undefined || inputData[field] === null) {
        return res.status(400).json({ error: `Missing field: ${field}` });
      }
    }

    const pythonCmd = process.env.PYTHON_CMD || 'python';
    const python = spawn(pythonCmd, ['ml_model/heart_predict.py', JSON.stringify(inputData)]);
    let result = '', error = '';

    python.stdout.on('data', (data) => { result += data.toString(); });
    python.stderr.on('data', (data) => { error += data.toString(); });

    python.on('close', async (code) => {
      if (code !== 0) return res.status(500).json({ error: 'Prediction failed', details: error });
      try {
        const prediction = JSON.parse(result);
        await new HeartDiseasePrediction({ userId: req.userId, ...inputData, prediction: prediction.prediction, probability: prediction.probability }).save();
        res.json(prediction);
      } catch {
        res.status(500).json({ error: 'Failed to parse prediction result' });
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Prediction failed', details: error.message });
  }
});

app.get('/api/heart-predictions', authMiddleware, async (req, res) => {
  try {
    res.json(await HeartDiseasePrediction.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(10));
  } catch {
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
});

app.get('/api/predictions', authMiddleware, async (req, res) => {
  try {
    res.json(await DiabetesPrediction.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(10));
  } catch {
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
});

// Stats
app.get('/api/stats', authMiddleware, async (req, res) => {
  try {
    if (req.userRole === 'patient') {
      const [appointmentCount, diabetesPredictionCount, heartPredictionCount, upcomingAppointments] = await Promise.all([
        Appointment.countDocuments({ patientId: req.userId }),
        DiabetesPrediction.countDocuments({ userId: req.userId }),
        HeartDiseasePrediction.countDocuments({ userId: req.userId }),
        Appointment.countDocuments({ patientId: req.userId, status: { $in: ['pending', 'confirmed'] }, date: { $gte: new Date() } })
      ]);
      res.json({
        totalAppointments: appointmentCount,
        totalPredictions: diabetesPredictionCount + heartPredictionCount,
        totalDiabetesPredictions: diabetesPredictionCount,
        totalHeartPredictions: heartPredictionCount,
        upcomingAppointments
      });
    } else {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

      const [appointmentCount, todayAppointments, patientIds] = await Promise.all([
        Appointment.countDocuments({ doctorId: req.userId }),
        Appointment.countDocuments({ doctorId: req.userId, date: { $gte: today, $lt: tomorrow } }),
        Appointment.distinct('patientId', { doctorId: req.userId })
      ]);
      res.json({ totalAppointments: appointmentCount, todayAppointments, totalPatients: patientIds.length });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─── FIX: Missing routes that frontend calls ──────────────────────────────────

// Health Records
app.get('/api/health-records', authMiddleware, async (req, res) => {
  try {
    const records = await HealthRecord.find({ patientId: req.userId })
      .populate('doctorId', 'name')
      .sort({ createdAt: -1 });
    res.json({ records });
  } catch {
    res.status(500).json({ error: 'Failed to fetch health records' });
  }
});

app.post('/api/health-records', authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== 'doctor') return res.status(403).json({ error: 'Only doctors can create health records' });
    const { patientId, title, recordType, description, diagnosis, vitals } = req.body;
    if (!patientId || !title) return res.status(400).json({ error: 'patientId and title are required' });

    const record = await new HealthRecord({
      patientId, doctorId: req.userId, title, recordType, description, diagnosis, vitals
    }).save();

    const populatedRecord = await HealthRecord.findById(record._id).populate('doctorId', 'name');
    res.status(201).json(populatedRecord);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create health record', details: error.message });
  }
});

// Prescriptions
app.get('/api/prescriptions', authMiddleware, async (req, res) => {
  try {
    const query = req.userRole === 'patient' ? { patientId: req.userId } : { doctorId: req.userId };
    const prescriptions = await Prescription.find(query).sort({ prescribedDate: -1 });
    res.json({ prescriptions });
  } catch {
    res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
});

app.post('/api/prescriptions', authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== 'doctor') return res.status(403).json({ error: 'Only doctors can create prescriptions' });
    const doctor = await User.findById(req.userId);
    const { patientId, diagnosis, medicines, advice, validUntil } = req.body;
    if (!patientId || !medicines?.length) return res.status(400).json({ error: 'patientId and medicines are required' });

    const prescription = await new Prescription({
      patientId, doctorId: req.userId, doctorName: doctor.name,
      diagnosis, medicines, advice, validUntil
    }).save();

    res.status(201).json(prescription);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create prescription', details: error.message });
  }
});

// FIX: POST /api/prescriptions/:id/refill — called by PatientDashboard
app.post('/api/prescriptions/:id/refill', authMiddleware, async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) return res.status(404).json({ error: 'Prescription not found' });
    if (prescription.patientId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Notify doctor via socket
    const doctorSocketId = userSockets.get(prescription.doctorId.toString());
    if (doctorSocketId) {
      const patient = await User.findById(req.userId).select('name');
      io.to(doctorSocketId).emit('prescription:refill-request', {
        prescriptionId: prescription._id,
        patientName: patient?.name,
        diagnosis: prescription.diagnosis
      });
    }

    res.json({ message: 'Refill request sent to your doctor.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to request refill', details: error.message });
  }
});

// Reminders
app.get('/api/reminders', authMiddleware, async (req, res) => {
  try {
    res.json(await Reminder.find({ userId: req.userId, active: true }).sort({ createdAt: -1 }));
  } catch {
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

// FIX: GET /api/reminders/today — called by MedicineReminder in PatientDashboard
// IMPORTANT: this route must be defined BEFORE /api/reminders/:id so Express
// doesn't try to match "today" as an ObjectId.
app.get('/api/reminders/today', authMiddleware, async (req, res) => {
  try {
    const reminders = await Reminder.find({ userId: req.userId, active: true });
    res.json(reminders);
  } catch {
    res.status(500).json({ error: 'Failed to fetch today\'s reminders' });
  }
});

app.post('/api/reminders', authMiddleware, async (req, res) => {
  try {
    const { medicineName, dosage, times, instructions } = req.body;
    if (!medicineName) return res.status(400).json({ error: 'medicineName is required' });
    const reminder = await new Reminder({ userId: req.userId, medicineName, dosage, times: times || [], instructions }).save();
    res.status(201).json(reminder);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create reminder', details: error.message });
  }
});

app.delete('/api/reminders/:id', authMiddleware, async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) return res.status(404).json({ error: 'Reminder not found' });
    if (reminder.userId.toString() !== req.userId) return res.status(403).json({ error: 'Unauthorized' });
    reminder.active = false;
    await reminder.save();
    res.json({ message: 'Reminder deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete reminder' });
  }
});

// ─── Error handler ────────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🔗 MongoDB: ${MONGODB_URI}`);
});