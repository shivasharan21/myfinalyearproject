"""
Heart Disease Prediction Script
Works with the stacking-ensemble model from heart_train_model.py.
Automatically detects and replaces stale/old-format models.
"""

import sys
import json
import os
from subprocess import run

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH   = os.path.join(SCRIPT_DIR, 'heart_model.pkl')
TRAIN_SCRIPT = os.path.join(SCRIPT_DIR, 'heart_train_model.py')
DATA_PATH    = os.path.join(SCRIPT_DIR, 'heart.csv')

FEATURE_COLS = ['age', 'sex', 'cp', 'trestbps', 'chol', 'fbs',
                'restecg', 'thalach', 'exang', 'oldpeak', 'slope', 'ca', 'thal']

FIELD_MAP = {
    'chestPainType':  'cp',
    'restingBP':      'trestbps',
    'cholesterol':    'chol',
    'fastingBS':      'fbs',
    'restingECG':     'restecg',
    'maxHeartRate':   'thalach',
    'exerciseAngina': 'exang',
    'stSlope':        'slope',
}

def run_training():
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(
            'heart.csv not found at {}. '
            'Place the UCI Heart Disease dataset in the ml_model/ directory.'.format(DATA_PATH)
        )
    print(json.dumps({'status': 'training', 'message': 'Training heart model...'}),
          file=sys.stderr)
    result = run([sys.executable, TRAIN_SCRIPT],
                 capture_output=True, text=True, timeout=300, cwd=SCRIPT_DIR)
    if result.returncode != 0:
        raise RuntimeError('Training failed:\n' + result.stderr)
    if not os.path.exists(MODEL_PATH):
        raise RuntimeError('Training finished but heart_model.pkl was not created.')
    print(json.dumps({'status': 'trained', 'message': 'Model trained successfully'}),
          file=sys.stderr)

def load_model():
    import joblib

    if not os.path.exists(MODEL_PATH):
        run_training()

    model_data = joblib.load(MODEL_PATH)

    if not isinstance(model_data, dict):
        os.remove(MODEL_PATH)
        run_training()
        model_data = joblib.load(MODEL_PATH)

    # OLD format had 'features' (one-hot column list); new format has 'feature_cols'
    is_old_format = ('features' in model_data and 'feature_cols' not in model_data)
    if is_old_format:
        print(json.dumps({
            'status': 'retraining',
            'message': 'Old model format detected — retraining with new architecture...'
        }), file=sys.stderr)
        os.remove(MODEL_PATH)
        run_training()
        model_data = joblib.load(MODEL_PATH)

    if 'model' not in model_data:
        raise ValueError('heart_model.pkl is missing the model key. Delete it and retry.')

    return model_data['model'], model_data.get('feature_cols', FEATURE_COLS)

def predict(input_data):
    import pandas as pd

    model, feature_cols = load_model()

    row = {}
    for frontend_key, model_key in FIELD_MAP.items():
        if frontend_key in input_data:
            row[model_key] = float(input_data[frontend_key])

    for col in ['age', 'sex', 'ca', 'thal', 'oldpeak']:
        if col in input_data:
            row[col] = float(input_data[col])

    missing = [c for c in feature_cols if c not in row]
    if missing:
        raise ValueError('Mapped input is missing columns: {}'.format(missing))

    df = pd.DataFrame([row])[feature_cols]

    prediction      = int(model.predict(df)[0])
    probs           = model.predict_proba(df)[0]
    prob_disease    = float(probs[1])
    prob_no_disease = float(probs[0])

    if prob_disease < 0.30:
        risk_level = 'Low'
    elif prob_disease < 0.60:
        risk_level = 'Moderate'
    else:
        risk_level = 'High'

    return {
        'prediction':             prediction,
        'prediction_label':       'Heart Disease' if prediction == 1 else 'No Heart Disease',
        'probability':            prob_disease,
        'probability_disease':    prob_disease,
        'probability_no_disease': prob_no_disease,
        'risk_level':             risk_level,
        'confidence':             float(max(prob_disease, prob_no_disease)),
        'message': (
            'Based on the provided health metrics, the model predicts '
            + '{} risk of heart disease.'.format(risk_level.lower())
        ),
    }

if __name__ == '__main__':
    try:
        raw = sys.stdin.read().strip()
        if not raw:
            print(json.dumps({'error': 'No input provided'}), file=sys.stderr)
            sys.exit(1)

        input_data = json.loads(raw)

        required = ['age', 'sex', 'chestPainType', 'restingBP', 'cholesterol',
                    'fastingBS', 'restingECG', 'maxHeartRate', 'exerciseAngina',
                    'oldpeak', 'stSlope', 'ca', 'thal']
        missing = [f for f in required if f not in input_data]
        if missing:
            print(json.dumps({'error': 'Missing fields: {}'.format(', '.join(missing))}),
                  file=sys.stderr)
            sys.exit(1)

        print(json.dumps(predict(input_data)))

    except json.JSONDecodeError as e:
        print(json.dumps({'error': 'Invalid JSON', 'details': str(e)}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)