// backend/models/Prescription.js
const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  dosage: { type: String, required: true },         // e.g. "500mg"
  frequency: { type: String, required: true },      // e.g. "Twice daily"
  duration: { type: String },                       // e.g. "7 days"
  route: {
    type: String,
    enum: ['oral', 'topical', 'injection', 'inhalation', 'sublingual', 'other'],
    default: 'oral',
  },
  instructions: { type: String, trim: true },       // e.g. "Take after meals"
  quantity: { type: Number },
  refillsAllowed: { type: Number, default: 0 },
}, { _id: true });

const prescriptionSchema = new mongoose.Schema({
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
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
  },
  patientName: { type: String, required: true },
  doctorName: { type: String, required: true },
  doctorSpecialization: { type: String },
  // Prescription details
  medicines: [medicineSchema],
  diagnosis: {
    type: String,
    trim: true,
  },
  advice: {
    type: String,
    trim: true,
  },
  dietaryInstructions: {
    type: String,
    trim: true,
  },
  // Prescription validity
  prescribedDate: {
    type: Date,
    default: Date.now,
  },
  validUntil: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'expired', 'cancelled'],
    default: 'active',
  },
  // For tracking
  dispensed: {
    type: Boolean,
    default: false,
  },
  dispensedAt: {
    type: Date,
  },
  notes: {
    type: String,
    trim: true,
  },
  // Refill tracking
  refillCount: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

prescriptionSchema.index({ patientId: 1, createdAt: -1 });
prescriptionSchema.index({ doctorId: 1, createdAt: -1 });
prescriptionSchema.index({ status: 1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);