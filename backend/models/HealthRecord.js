const mongoose = require('mongoose');

const healthRecordSchema = new mongoose.Schema({
  patientId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title:       { type: String, required: true },
  type:        { type: String, default: 'diagnosis' }, // lab_result, diagnosis, vital_signs, imaging, consultation, other
  content:     { type: String, required: true }, // Main findings/content
  severity:    { type: String, enum: ['normal', 'mild', 'moderate', 'severe', 'critical'], default: 'normal' },
  notes:       { type: String }, // Doctor's additional notes
  date:        { type: Date, default: Date.now },
  // Legacy fields for backward compatibility
  recordType:  { type: String },
  description: { type: String },
  diagnosis:   { type: String },
  vitals:      [{ name: String, value: String, unit: String }],
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('HealthRecord', healthRecordSchema);