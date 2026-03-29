const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  medicineName: { type: String, required: true },
  dosage:       { type: String },
  times:        [{ type: String }],
  instructions: { type: String },
  active:       { type: Boolean, default: true },
  logs:         [{ takenAt: Date, skipped: Boolean }],
  createdAt:    { type: Date, default: Date.now }
});

module.exports = mongoose.model('Reminder', reminderSchema);