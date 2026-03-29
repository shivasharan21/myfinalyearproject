# backend/ml_model/predict.py
import sys
import json
import pickle
import numpy as np
from sklearn.ensemble import BaggingClassifier

def load_model():
    """Load the trained model"""
    try:
        with open('ml_model/diabetes_model.pkl', 'rb') as f:
            return pickle.load(f)
    except FileNotFoundError:
        # If model doesn't exist, create and return a new one
        # In production, you should train this with your actual data
        model = BaggingClassifier(n_estimators=150, random_state=2)
        return model

def predict(input_data):
    """Make prediction using the trained model"""
    model = load_model()
    
    # Extract features in the correct order
    features = [
        input_data['pregnancies'],
        input_data['glucose'],
        input_data['bloodPressure'],
        input_data['skinThickness'],
        input_data['insulin'],
        input_data['bmi'],
        input_data['diabetesPedigreeFunction'],
        input_data['age']
    ]
    
    # Convert to numpy array and reshape
    features_array = np.array(features).reshape(1, -1)
    
    # Make prediction
    prediction = model.predict(features_array)[0]
    
    # Get probability if available
    try:
        probability = model.predict_proba(features_array)[0]
        prob_positive = float(probability[1]) if len(probability) > 1 else 0.0
    except:
        prob_positive = 1.0 if prediction == 1 else 0.0
    
    return {
        'prediction': int(prediction),
        'probability': prob_positive,
        'risk_level': 'High' if prediction == 1 else 'Low',
        'message': 'Based on the provided health metrics, the model predicts ' + 
                   ('a high risk of diabetes.' if prediction == 1 else 'a low risk of diabetes.')
    }

if __name__ == '__main__':
    try:
        # Read input data from stdin
        import sys
        input_json = sys.stdin.read()
        
        if not input_json.strip():
            error_msg = {
                'error': 'No input data provided',
                'note': 'This script expects JSON data via stdin'
            }
            print(json.dumps(error_msg), file=sys.stderr)
            sys.exit(1)
        
        input_data = json.loads(input_json)
        
        # Validate required fields
        required_fields = ['pregnancies', 'glucose', 'bloodPressure', 'skinThickness', 
                          'insulin', 'bmi', 'diabetesPedigreeFunction', 'age']
        missing_fields = [field for field in required_fields if field not in input_data]
        
        if missing_fields:
            error_msg = {
                'error': f'Missing required fields: {", ".join(missing_fields)}',
                'required_fields': required_fields
            }
            print(json.dumps(error_msg), file=sys.stderr)
            sys.exit(1)
        
        # Make prediction
        result = predict(input_data)
        
        # Output result as JSON
        print(json.dumps(result))
    except json.JSONDecodeError as e:
        print(json.dumps({'error': 'Invalid JSON format', 'details': str(e)}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)