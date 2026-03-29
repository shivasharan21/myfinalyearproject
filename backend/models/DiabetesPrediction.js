const mongoose = require('mongoose');

const diabetesPredictionSchema = new mongoose.Schema({
  userId:                   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pregnancies:              Number,
  glucose:                  Number,
  bloodPressure:            Number,
  skinThickness:            Number,
  insulin:                  Number,
  bmi:                      Number,
  diabetesPedigreeFunction: Number,
  age:                      Number,
  prediction:               Number,
  probability:              Number,
  createdAt:                { type: Date, default: Date.now }
});

module.exports = mongoose.model('DiabetesPrediction', diabetesPredictionSchema);