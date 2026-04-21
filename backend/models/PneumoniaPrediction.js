const mongoose = require('mongoose');

const pneumoniaPredictionSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  prediction:  String, // 'NORMAL' or 'PNEUMONIA'
  probability: Number,
  risk:        String, // 'Low Risk', 'Moderate Risk', 'High Risk'
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('PneumoniaPrediction', pneumoniaPredictionSchema);