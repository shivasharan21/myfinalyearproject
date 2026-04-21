import sys
import json
import pickle
import numpy as np
import os
from subprocess import run

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH   = os.path.join(SCRIPT_DIR, 'diabetes_model.pkl')
TRAIN_SCRIPT = os.path.join(SCRIPT_DIR, 'train_model.py')
DATA_PATH    = os.path.join(SCRIPT_DIR, 'diabetes.csv')

def train_model_if_needed():
    if os.path.exists(MODEL_PATH):
        return
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(
            'diabetes.csv not found at {}. '
            'Place the Pima Indians Diabetes dataset in the ml_model/ directory.'.format(DATA_PATH)
        )
    print(json.dumps({'status': 'training', 'message': 'Training diabetes model...'}),
          file=sys.stderr)
    result = run([sys.executable, TRAIN_SCRIPT],
                 capture_output=True, text=True, timeout=300, cwd=SCRIPT_DIR)
    if result.returncode != 0:
        raise RuntimeError('Training failed:\n' + result.stderr)
    if not os.path.exists(MODEL_PATH):
        raise RuntimeError('Training finished but diabetes_model.pkl was not created.')
    print(json.dumps({'status': 'trained', 'message': 'Model trained successfully'}),
          file=sys.stderr)

def load_model():
    train_model_if_needed()
    with open(MODEL_PATH, 'rb') as f:
        model = pickle.load(f)
    if not hasattr(model, 'estimators_'):
        raise RuntimeError(
            'diabetes_model.pkl contains an unfitted model. '
            'Delete it so the script can retrain.'
        )
    return model

def predict(input_data):
    model = load_model()
    features = np.array([
        float(input_data['pregnancies']),
        float(input_data['glucose']),
        float(input_data['bloodPressure']),
        float(input_data['skinThickness']),
        float(input_data['insulin']),
        float(input_data['bmi']),
        float(input_data['diabetesPedigreeFunction']),
        float(input_data['age']),
    ]).reshape(1, -1)

    prediction    = int(model.predict(features)[0])
    probabilities = model.predict_proba(features)[0]
    prob_positive = float(probabilities[1]) if len(probabilities) > 1 else float(prediction)

    if prob_positive < 0.3:
        risk_level = 'Low'
    elif prob_positive < 0.6:
        risk_level = 'Moderate'
    else:
        risk_level = 'High'

    return {
        'prediction':  prediction,
        'probability': prob_positive,
        'risk_level':  risk_level,
        'message': (
            'Based on the provided health metrics, the model predicts '
            + ('a high risk of diabetes.' if prediction == 1 else 'a low risk of diabetes.')
        )
    }

if __name__ == '__main__':
    try:
        raw = sys.stdin.read().strip()
        if not raw:
            print(json.dumps({'error': 'No input provided'}), file=sys.stderr)
            sys.exit(1)

        input_data = json.loads(raw)

        required = ['pregnancies', 'glucose', 'bloodPressure', 'skinThickness',
                    'insulin', 'bmi', 'diabetesPedigreeFunction', 'age']
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