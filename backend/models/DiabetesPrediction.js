// backend/models/DiabetesPrediction.js
const mongoose = require('mongoose');

const diabetesPredictionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Input features
  pregnancies: { type: Number, required: true },
  glucose: { type: Number, required: true },
  bloodPressure: { type: Number, required: true },
  skinThickness: { type: Number, required: true },
  insulin: { type: Number, required: true },
  bmi: { type: Number, required: true },
  diabetesPedigreeFunction: { type: Number, required: true },
  age: { type: Number, required: true },
  // Prediction output
  prediction: { type: Number, required: true }, // 0 or 1
  probability: { type: Number, required: true },
  riskLevel: { type: String, enum: ['Low', 'Moderate', 'High'], required: true },
  message: { type: String },
}, { timestamps: true });

diabetesPredictionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('DiabetesPrediction', diabetesPredictionSchema);
