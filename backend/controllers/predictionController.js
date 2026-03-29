const { spawn }              = require('child_process');
const DiabetesPrediction     = require('../models/DiabetesPrediction');
const HeartDiseasePrediction = require('../models/HeartDiseasePrediction');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const runPythonScript = (scriptPath, inputData) =>
  new Promise((resolve, reject) => {
    const pythonCmd = process.env.PYTHON_CMD || 'python';
    const python    = spawn(pythonCmd, [scriptPath]);
    let result = '', error = '';

    // Send input data via stdin
    python.stdin.write(JSON.stringify(inputData));
    python.stdin.end();

    python.stdout.on('data', (data) => { result += data.toString(); });
    python.stderr.on('data', (data) => { error  += data.toString(); });

    python.on('close', (code) => {
      if (code !== 0) return reject(new Error(error || 'Python script failed'));
      try {
        resolve(JSON.parse(result));
      } catch {
        reject(new Error('Failed to parse prediction result'));
      }
    });
  });

const validateFields = (body, fields) => {
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null) return field;
  }
  return null;
};

// ─── Diabetes ─────────────────────────────────────────────────────────────────

const DIABETES_FIELDS = [
  'pregnancies', 'glucose', 'bloodPressure', 'skinThickness',
  'insulin', 'bmi', 'diabetesPedigreeFunction', 'age'
];

const predictDiabetes = async (req, res) => {
  try {
    const missing = validateFields(req.body, DIABETES_FIELDS);
    if (missing) return res.status(400).json({ error: `Missing field: ${missing}` });

    const prediction = await runPythonScript('ml_model/predict.py', req.body);
    await new DiabetesPrediction({
      userId: req.userId, ...req.body,
      prediction: prediction.prediction, probability: prediction.probability
    }).save();

    res.json(prediction);
  } catch (error) {
    res.status(500).json({ error: 'Prediction failed', details: error.message });
  }
};

const getDiabetesPredictions = async (req, res) => {
  try {
    res.json(await DiabetesPrediction.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(10));
  } catch {
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
};

// ─── Heart Disease ────────────────────────────────────────────────────────────

const HEART_FIELDS = [
  'age', 'sex', 'chestPainType', 'restingBP', 'cholesterol', 'fastingBS',
  'restingECG', 'maxHeartRate', 'exerciseAngina', 'oldpeak', 'stSlope', 'ca', 'thal'
];

const predictHeartDisease = async (req, res) => {
  try {
    const missing = validateFields(req.body, HEART_FIELDS);
    if (missing) return res.status(400).json({ error: `Missing field: ${missing}` });

    const prediction = await runPythonScript('ml_model/heart_predict.py', req.body);
    await new HeartDiseasePrediction({
      userId: req.userId, ...req.body,
      prediction: prediction.prediction, probability: prediction.probability
    }).save();

    res.json(prediction);
  } catch (error) {
    res.status(500).json({ error: 'Prediction failed', details: error.message });
  }
};

const getHeartPredictions = async (req, res) => {
  try {
    res.json(await HeartDiseasePrediction.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(10));
  } catch {
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
};

module.exports = { predictDiabetes, getDiabetesPredictions, predictHeartDisease, getHeartPredictions };