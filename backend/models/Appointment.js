const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patientId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, required: true },
  doctorName:  { type: String, required: true },
  date:        { type: Date, required: true },
  time:        { type: String, required: true },
  reason:      { type: String },
  status:      { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('Appointment', appointmentSchema);