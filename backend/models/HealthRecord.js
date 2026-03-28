// backend/models/HealthRecord.js
const mongoose = require('mongoose');

const vitalSchema = new mongoose.Schema({
  name: { type: String, required: true },       // e.g. "Blood Pressure"
  value: { type: String, required: true },      // e.g. "120/80"
  unit: { type: String },                       // e.g. "mmHg"
  status: {
    type: String,
    enum: ['Normal', 'Low', 'High', 'Critical', 'Borderline', 'Healthy'],
    default: 'Normal',
  },
  recordedAt: { type: Date, default: Date.now },
}, { _id: false });

const healthRecordSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
  },
  // Vitals
  vitals: [vitalSchema],
  // Record categories
  recordType: {
    type: String,
    enum: ['consultation', 'lab-report', 'radiology', 'vaccination', 'surgery', 'general'],
    default: 'consultation',
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  diagnosis: {
    type: String,
    trim: true,
  },
  symptoms: [String],
  treatment: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  // Lab values
  labResults: [{
    testName: String,
    value: String,
    unit: String,
    referenceRange: String,
    status: { type: String, enum: ['Normal', 'Abnormal', 'Critical'] },
  }],
  // File attachments (URLs/paths)
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    uploadedAt: { type: Date, default: Date.now },
  }],
  followUpRequired: {
    type: Boolean,
    default: false,
  },
  followUpDate: {
    type: Date,
  },
  isPrivate: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

healthRecordSchema.index({ patientId: 1, createdAt: -1 });
healthRecordSchema.index({ patientId: 1, recordType: 1 });

module.exports = mongoose.model('HealthRecord', healthRecordSchema);
