const mongoose = require('mongoose');

const healthRecordSchema = new mongoose.Schema({
  patientId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title:       { type: String, required: true },
  recordType:  { type: String, default: 'general' },
  description: { type: String },
  diagnosis:   { type: String },
  vitals:      [{ name: String, value: String, unit: String }],
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('HealthRecord', healthRecordSchema);