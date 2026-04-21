const { spawn }              = require('child_process');
const path                   = require('path');
const DiabetesPrediction     = require('../models/DiabetesPrediction');
const HeartDiseasePrediction = require('../models/HeartDiseasePrediction');

// Absolute paths — work regardless of where Node is started from
const ML_DIR          = path.join(__dirname, '..', 'ml_model');
const DIABETES_SCRIPT = path.join(ML_DIR, 'predict.py');
const HEART_SCRIPT    = path.join(ML_DIR, 'heart_predict.py');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const runPythonScript = (scriptPath, inputData) =>
  new Promise((resolve, reject) => {
    const pythonCmd = process.env.PYTHON_CMD || 'python';
    // NOTE: no cwd override — scripts resolve paths via __file__ internally
    const python = spawn(pythonCmd, [scriptPath]);

    let stdout = '';
    let stderr = '';

    python.stdin.write(JSON.stringify(inputData));
    python.stdin.end();

    python.stdout.on('data', (d) => { stdout += d.toString(); });
    python.stderr.on('data', (d) => { stderr += d.toString(); });

    python.on('error', (err) => {
      reject(new Error(`Failed to start Python (${pythonCmd}): ${err.message}`));
    });

    python.on('close', (code) => {
      if (stderr.trim()) {
        // Only log real errors, not sklearn UserWarnings
        const isOnlyWarnings = stderr.trim().split('\n')
          .every((l) => l.includes('UserWarning') || l.includes('warnings.warn') || !l.trim());
        if (!isOnlyWarnings) console.error('[ML stderr]', stderr.trim());
      }

      if (code !== 0) {
        return reject(new Error(stderr.trim() || `Python exited with code ${code}`));
      }

      const raw = stdout.trim();
      if (!raw) return reject(new Error('Python script produced no output'));

      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error(`Could not parse output: ${raw.slice(0, 300)}`));
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

    const prediction = await runPythonScript(DIABETES_SCRIPT, req.body);
    await new DiabetesPrediction({
      userId: req.userId, ...req.body,
      prediction: prediction.prediction, probability: prediction.probability
    }).save();

    res.json(prediction);
  } catch (error) {
    console.error('[predictDiabetes]', error.message);
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

    const prediction = await runPythonScript(HEART_SCRIPT, req.body);
    await new HeartDiseasePrediction({
      userId: req.userId, ...req.body,
      prediction: prediction.prediction, probability: prediction.probability
    }).save();

    res.json(prediction);
  } catch (error) {
    console.error('[predictHeartDisease]', error.message);
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