// backend/controllers/predictionController.js
const { spawn } = require('child_process');
const path = require('path');
const DiabetesPrediction = require('../models/DiabetesPrediction');
const HeartPrediction = require('../models/HeartPrediction');

// Helper: run Python prediction script
const runPythonScript = (scriptPath, inputData) => {
  return new Promise((resolve, reject) => {
    const process = spawn('python3', [scriptPath, JSON.stringify(inputData)]);
    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => { stdout += data.toString(); });
    process.stderr.on('data', (data) => { stderr += data.toString(); });

    process.on('close', (code) => {
      if (code !== 0) {
        try {
          const errData = JSON.parse(stderr);
          return reject(new Error(errData.error || 'Prediction script failed'));
        } catch {
          return reject(new Error(stderr || 'Prediction script failed'));
        }
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error('Invalid JSON response from prediction script'));
      }
    });

    process.on('error', (err) => {
      reject(new Error(`Failed to start Python: ${err.message}`));
    });
  });
};

// @desc    Predict diabetes risk
// @route   POST /api/predict-diabetes
const predictDiabetes = async (req, res, next) => {
  try {
    const {
      pregnancies, glucose, bloodPressure, skinThickness,
      insulin, bmi, diabetesPedigreeFunction, age,
    } = req.body;

    const required = ['pregnancies', 'glucose', 'bloodPressure', 'skinThickness',
      'insulin', 'bmi', 'diabetesPedigreeFunction', 'age'];
    const missing = required.filter(f => req.body[f] === undefined || req.body[f] === null);
    if (missing.length) {
      return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
    }

    const scriptPath = path.join(__dirname, '../ml_model/predict.py');
    const result = await runPythonScript(scriptPath, req.body);

    // Save to DB
    await DiabetesPrediction.create({
      userId: req.user._id,
      pregnancies, glucose, bloodPressure, skinThickness,
      insulin, bmi, diabetesPedigreeFunction, age,
      prediction: result.prediction,
      probability: result.probability,
      riskLevel: result.risk_level,
      message: result.message,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Get diabetes prediction history
// @route   GET /api/predictions
const getDiabetisHistory = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const predictions = await DiabetesPrediction.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json(predictions);
  } catch (error) {
    next(error);
  }
};

// @desc    Predict heart disease risk
// @route   POST /api/predict-heart-disease
const predictHeartDisease = async (req, res, next) => {
  try {
    const required = ['age', 'sex', 'chestPainType', 'restingBP', 'cholesterol',
      'fastingBS', 'restingECG', 'maxHeartRate', 'exerciseAngina', 'oldpeak', 'stSlope', 'ca', 'thal'];
    const missing = required.filter(f => req.body[f] === undefined || req.body[f] === null);
    if (missing.length) {
      return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
    }

    const scriptPath = path.join(__dirname, '../ml_model/heart_predict.py');
    const result = await runPythonScript(scriptPath, req.body);

    await HeartPrediction.create({
      userId: req.user._id,
      ...req.body,
      prediction: result.prediction,
      predictionLabel: result.prediction_label,
      probability: result.probability,
      probabilityDisease: result.probability_disease,
      probabilityNoDisease: result.probability_no_disease,
      riskLevel: result.risk_level,
      message: result.message,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Get heart prediction history
// @route   GET /api/heart-predictions
const getHeartHistory = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const predictions = await HeartPrediction.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json(predictions);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all predictions summary for user
// @route   GET /api/predictions/summary
const getPredictionSummary = async (req, res, next) => {
  try {
    const [diabetesCount, heartCount, latestDiabetes, latestHeart] = await Promise.all([
      DiabetesPrediction.countDocuments({ userId: req.user._id }),
      HeartPrediction.countDocuments({ userId: req.user._id }),
      DiabetesPrediction.findOne({ userId: req.user._id }).sort({ createdAt: -1 }),
      HeartPrediction.findOne({ userId: req.user._id }).sort({ createdAt: -1 }),
    ]);

    res.json({
      totalPredictions: diabetesCount + heartCount,
      diabetes: { total: diabetesCount, latest: latestDiabetes },
      heart: { total: heartCount, latest: latestHeart },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  predictDiabetes,
  getDiabetisHistory,
  predictHeartDisease,
  getHeartHistory,
  getPredictionSummary,
};