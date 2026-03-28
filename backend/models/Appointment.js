// backend/models/Appointment.js
const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  patientName: { type: String, required: true },
  doctorName: { type: String, required: true },
  date: {
    type: Date,
    required: [true, 'Appointment date is required'],
  },
  time: {
    type: String,
    required: [true, 'Appointment time is required'],
  },
  reason: {
    type: String,
    trim: true,
    maxlength: [500, 'Reason cannot exceed 500 characters'],
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'],
    default: 'pending',
  },
  type: {
    type: String,
    enum: ['video', 'in-person', 'phone'],
    default: 'video',
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
  },
  // Doctor's post-consultation notes
  doctorNotes: {
    type: String,
    trim: true,
  },
  diagnosis: {
    type: String,
    trim: true,
  },
  followUpDate: {
    type: Date,
  },
  callDuration: {
    type: Number, // in seconds
    default: 0,
  },
  cancelledBy: {
    type: String,
    enum: ['patient', 'doctor', 'system', ''],
  },
  cancellationReason: {
    type: String,
    trim: true,
  },
}, { timestamps: true });

// Indexes for frequent queries
appointmentSchema.index({ patientId: 1, date: -1 });
appointmentSchema.index({ doctorId: 1, date: -1 });
appointmentSchema.index({ status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);