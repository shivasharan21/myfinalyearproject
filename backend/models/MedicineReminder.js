// backend/models/MedicineReminder.js
const mongoose = require('mongoose');

const medicineReminderSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  prescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription',
  },
  medicineName: { type: String, required: true, trim: true },
  dosage: { type: String, required: true },
  times: [{ type: String }],        // e.g. ["08:00", "14:00", "20:00"]
  daysOfWeek: [{ type: Number }],   // 0=Sun ... 6=Sat; empty = daily
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  instructions: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  logs: [{
    scheduledTime: Date,
    takenAt: Date,
    status: { type: String, enum: ['taken', 'missed', 'skipped'], default: 'missed' },
    note: String,
  }],
}, { timestamps: true });

medicineReminderSchema.index({ patientId: 1, isActive: 1 });

module.exports = mongoose.model('MedicineReminder', medicineReminderSchema);