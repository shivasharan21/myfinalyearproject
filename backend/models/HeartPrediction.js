// backend/models/HeartPrediction.js
const mongoose = require('mongoose');

const heartPredictionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Input features
  age: { type: Number, required: true },
  sex: { type: Number, required: true },
  chestPainType: { type: Number, required: true },
  restingBP: { type: Number, required: true },
  cholesterol: { type: Number, required: true },
  fastingBS: { type: Number, required: true },
  restingECG: { type: Number, required: true },
  maxHeartRate: { type: Number, required: true },
  exerciseAngina: { type: Number, required: true },
  oldpeak: { type: Number, required: true },
  stSlope: { type: Number, required: true },
  ca: { type: Number, required: true },
  thal: { type: Number, required: true },
  // Prediction output
  prediction: { type: Number, required: true }, // 0 or 1
  predictionLabel: { type: String },
  probability: { type: Number, required: true },
  probabilityDisease: { type: Number },
  probabilityNoDisease: { type: Number },
  riskLevel: { type: String, enum: ['Low', 'Moderate', 'High'], required: true },
  message: { type: String },
}, { timestamps: true });

heartPredictionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('HeartPrediction', heartPredictionSchema);