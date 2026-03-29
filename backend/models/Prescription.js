const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  patientId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorName:    { type: String },
  diagnosis:     { type: String },
  medicines: [{
    name:      String,
    dosage:    String,
    frequency: String,
    duration:  String
  }],
  advice:        { type: String },
  status:        { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
  prescribedDate:{ type: Date, default: Date.now },
  validUntil:    { type: Date }
});

module.exports = mongoose.model('Prescription', prescriptionSchema);