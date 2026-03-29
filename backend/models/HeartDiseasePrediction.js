const mongoose = require('mongoose');

const heartDiseasePredictionSchema = new mongoose.Schema({
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  age:             Number,
  sex:             Number,
  chestPainType:   Number,
  restingBP:       Number,
  cholesterol:     Number,
  fastingBS:       Number,
  restingECG:      Number,
  maxHeartRate:    Number,
  exerciseAngina:  Number,
  oldpeak:         Number,
  stSlope:         Number,
  ca:              Number,
  thal:            Number,
  prediction:      Number,
  probability:     Number,
  createdAt:       { type: Date, default: Date.now }
});

module.exports = mongoose.model('HeartDiseasePrediction', heartDiseasePredictionSchema);