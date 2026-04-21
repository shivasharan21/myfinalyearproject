/**
 * ML Prediction Diagnostics
 * Run from the backend directory:  node diagnose_ml.js
 */

const { spawn, execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const COLORS = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
};

const ok   = (msg) => console.log(`  ${COLORS.green('✓')} ${msg}`);
const fail = (msg) => console.log(`  ${COLORS.red('✗')} ${msg}`);
const warn = (msg) => console.log(`  ${COLORS.yellow('⚠')} ${msg}`);
const info = (msg) => console.log(`  ${COLORS.cyan('→')} ${msg}`);

function section(title) {
  console.log(`\n${COLORS.bold(title)}`);
  console.log('─'.repeat(50));
}

// ─── 1. Check Python command ──────────────────────────────────────────────────

section('1. Python executable');

const pythonCandidates = [
  process.env.PYTHON_CMD,
  'python3',
  'python',
].filter(Boolean);

let pythonCmd = null;

for (const cmd of pythonCandidates) {
  try {
    const version = execSync(`${cmd} --version 2>&1`, { encoding: 'utf8' }).trim();
    ok(`${cmd}  →  ${version}`);
    if (!pythonCmd) pythonCmd = cmd;
  } catch {
    fail(`${cmd}  not found`);
  }
}

if (!pythonCmd) {
  fail('No Python executable found. Install Python 3.7+ and make sure it is on your PATH.');
  process.exit(1);
}

info(`Will use: ${pythonCmd}`);

// ─── 2. Check required Python packages ───────────────────────────────────────

section('2. Python packages');

const packages = ['sklearn', 'numpy', 'pandas', 'joblib'];
const missing  = [];

for (const pkg of packages) {
  try {
    execSync(`${pythonCmd} -c "import ${pkg}; print(${pkg}.__version__)"`,
             { encoding: 'utf8', stdio: 'pipe' });
    const version = execSync(
      `${pythonCmd} -c "import ${pkg}; print(${pkg}.__version__)"`,
      { encoding: 'utf8' }
    ).trim();
    ok(`${pkg}  ${version}`);
  } catch {
    fail(`${pkg}  NOT installed`);
    missing.push(pkg === 'sklearn' ? 'scikit-learn' : pkg);
  }
}

if (missing.length) {
  info(`Fix: pip install ${missing.join(' ')}`);
}

// ─── 3. Check ml_model directory and files ────────────────────────────────────

section('3. ml_model directory & files');

const ML_DIR = path.join(__dirname, 'ml_model');

if (fs.existsSync(ML_DIR)) {
  ok(`ml_model/ directory exists at ${ML_DIR}`);
} else {
  fail(`ml_model/ directory not found at ${ML_DIR}`);
  info('Make sure you are running this script from the backend/ directory');
}

const files = {
  'predict.py':           { required: true,  type: 'script'  },
  'train_model.py':       { required: true,  type: 'script'  },
  'heart_predict.py':     { required: true,  type: 'script'  },
  'heart_train_model.py': { required: true,  type: 'script'  },
  'diabetes.csv':         { required: true,  type: 'dataset' },
  'heart.csv':            { required: true,  type: 'dataset' },
  'diabetes_model.pkl':   { required: false, type: 'model'   },
  'heart_model.pkl':      { required: false, type: 'model'   },
};

for (const [filename, meta] of Object.entries(files)) {
  const fullPath = path.join(ML_DIR, filename);
  if (fs.existsSync(fullPath)) {
    const size = (fs.statSync(fullPath).size / 1024).toFixed(1);
    ok(`${filename}  (${size} KB)  [${meta.type}]`);
  } else {
    if (meta.required) {
      fail(`${filename}  MISSING  [${meta.type}]`);
      if (meta.type === 'dataset') {
        info(`Download the dataset and save it as ml_model/${filename}`);
        if (filename === 'diabetes.csv')
          info('  Pima Indians Diabetes: https://www.kaggle.com/datasets/uciml/pima-indians-diabetes-database');
        if (filename === 'heart.csv')
          info('  UCI Heart Disease:     https://www.kaggle.com/datasets/cherngs/heart-disease-cleveland-uci');
      }
    } else {
      warn(`${filename}  not found — will be created on first prediction`);
    }
  }
}

// ─── 4. Live prediction test ──────────────────────────────────────────────────

function runPrediction(label, scriptName, sampleInput) {
  return new Promise((resolve) => {
    const scriptPath = path.join(ML_DIR, scriptName);

    if (!fs.existsSync(scriptPath)) {
      fail(`${label}: script not found at ${scriptPath}`);
      return resolve(false);
    }

    const py = spawn(pythonCmd, [scriptPath]);
    let stdout = '';
    let stderr = '';

    py.stdin.write(JSON.stringify(sampleInput));
    py.stdin.end();

    py.stdout.on('data', (d) => { stdout += d.toString(); });
    py.stderr.on('data', (d) => { stderr += d.toString(); });

    py.on('close', (code) => {
      if (code !== 0) {
        fail(`${label}: Python exited with code ${code}`);
        if (stderr.trim()) {
          stderr.trim().split('\n').forEach((line) => info(`  stderr: ${line}`));
        }
        return resolve(false);
      }

      try {
        const result = JSON.parse(stdout.trim());
        ok(`${label}: prediction=${result.prediction}, risk=${result.risk_level}, prob=${(result.probability * 100).toFixed(1)}%`);
        if (stderr.trim()) {
          stderr.trim().split('\n').forEach((line) => warn(`  stderr: ${line}`));
        }
        resolve(true);
      } catch {
        fail(`${label}: could not parse JSON output`);
        info(`  stdout: ${stdout.trim().slice(0, 200)}`);
        if (stderr.trim()) {
          stderr.trim().split('\n').forEach((line) => info(`  stderr: ${line}`));
        }
        resolve(false);
      }
    });

    // Timeout after 60 s (first run may need to train)
    setTimeout(() => {
      py.kill();
      fail(`${label}: timed out after 60 s`);
      resolve(false);
    }, 60_000);
  });
}

section('4. Live prediction tests');
info('(First run may take up to 60 s if model needs to be trained)');

const diabetesSample = {
  pregnancies: 2, glucose: 120, bloodPressure: 70,
  skinThickness: 20, insulin: 80, bmi: 25.5,
  diabetesPedigreeFunction: 0.5, age: 35,
};

const heartSample = {
  age: 50, sex: 1, chestPainType: 0, restingBP: 130,
  cholesterol: 250, fastingBS: 0, restingECG: 1,
  maxHeartRate: 155, exerciseAngina: 0, oldpeak: 0.5,
  stSlope: 2, ca: 1, thal: 3,
};

(async () => {
  const diabOk  = await runPrediction('Diabetes', 'predict.py',       diabetesSample);
  const heartOk = await runPrediction('Heart',    'heart_predict.py', heartSample);

  // ─── Summary ────────────────────────────────────────────────────────────────
  section('Summary');

  if (missing.length) {
    fail(`Missing Python packages: ${missing.join(', ')}`);
    info(`Run: pip install ${missing.join(' ')}`);
  }

  if (!diabOk)  fail('Diabetes prediction: BROKEN');
  else          ok ('Diabetes prediction: OK');

  if (!heartOk) fail('Heart prediction: BROKEN');
  else          ok ('Heart prediction: OK');

  if (missing.length === 0 && diabOk && heartOk) {
    console.log(`\n${COLORS.green(COLORS.bold('All checks passed — predictions should work.'))}`);
  } else {
    console.log(`\n${COLORS.red(COLORS.bold('Fix the issues above and re-run this script.'))}`);
  }
})();