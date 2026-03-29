"""
Heart Disease Prediction Script
Makes predictions using the trained model
"""
import sys
import json
import joblib
import pandas as pd
import numpy as np
import os
from subprocess import run, PIPE

def train_model_if_needed():
    """Train the model if it doesn't exist"""
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(script_dir, 'heart_model.pkl')
    train_script_path = os.path.join(script_dir, 'heart_train_model.py')
    
    if not os.path.exists(model_path):
        print(json.dumps({
            'status': 'training',
            'message': 'Model not found. Training now...'
        }), file=sys.stderr)
        
        try:
            # Run the training script from its directory
            result = run([sys.executable, train_script_path], 
                        capture_output=True, text=True, timeout=300,
                        cwd=script_dir)
            
            if result.returncode != 0:
                raise Exception(f"Training failed: {result.stderr}")
            
            print(json.dumps({
                'status': 'trained',
                'message': 'Model trained successfully'
            }), file=sys.stderr)
        except Exception as e:
            print(json.dumps({
                'error': f'Model training failed: {str(e)}',
                'message': 'Please ensure heart.csv exists and try again'
            }), file=sys.stderr)
            sys.exit(1)

def load_model():
    """Load the trained heart disease model"""
    try:
        # Train if needed
        train_model_if_needed()
        
        # Get the directory where this script is located
        script_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(script_dir, 'heart_model.pkl')
        
        model_data = joblib.load(model_path)
        
        if not isinstance(model_data, dict):
            raise ValueError("Invalid model format")
        
        model = model_data.get('model')
        features = model_data.get('features')
        feature_types = model_data.get('feature_types', {})
        
        if model is None or features is None:
            raise ValueError("Model or features not found in model file")
        
        return model, features, feature_types
        
    except Exception as e:
        print(json.dumps({
            'error': f'Error loading model: {str(e)}'
        }), file=sys.stderr)
        sys.exit(1)

def predict(input_data):
    """Make prediction using the trained model"""
    model, features, feature_types = load_model()
    
    # Map frontend field names to model field names
    field_mapping = {
        'chestPainType': 'cp',
        'restingBP': 'trestbps',
        'cholesterol': 'chol',
        'fastingBS': 'fbs',
        'restingECG': 'restecg',
        'maxHeartRate': 'thalach',
        'exerciseAngina': 'exang',
        'stSlope': 'slope'
    }
    
    # Create data dictionary with correct field names
    data = {}
    for frontend_field, model_field in field_mapping.items():
        if frontend_field in input_data:
            data[model_field] = input_data[frontend_field]
    
    # Add fields that don't need mapping
    for field in ['age', 'sex', 'ca', 'thal', 'oldpeak']:
        if field in input_data:
            data[field] = input_data[field]
    
    # Convert to DataFrame
    df = pd.DataFrame([data])
    
    # Get categorical columns
    categorical_cols = feature_types.get('categorical', 
                                        ['sex', 'cp', 'fbs', 'restecg', 'exang', 'slope', 'ca', 'thal'])
    
    # One-hot encode categorical features (must match training)
    df_encoded = pd.get_dummies(df, columns=categorical_cols, drop_first=False)
    
    # Align features with training data (add missing columns with 0)
    df_encoded = df_encoded.reindex(columns=features, fill_value=0)
    
    # Make prediction
    prediction = model.predict(df_encoded)[0]
    probabilities = model.predict_proba(df_encoded)[0]
    
    # Extract probabilities
    prob_no_disease = float(probabilities[0])
    prob_disease = float(probabilities[1])
    
    # Determine risk level based on disease probability
    if prob_disease < 0.3:
        risk_level = 'Low'
    elif prob_disease < 0.7:
        risk_level = 'Moderate'
    else:
        risk_level = 'High'
    
    # Create response
    result = {
        'prediction': int(prediction),
        'prediction_label': 'Heart Disease' if prediction == 1 else 'No Heart Disease',
        'probability': prob_disease,  # Probability of disease
        'probability_disease': prob_disease,
        'probability_no_disease': prob_no_disease,
        'risk_level': risk_level,
        'confidence': float(max(prob_no_disease, prob_disease)),
        'message': f'Based on the provided health metrics, the model predicts {risk_level.lower()} risk of heart disease.'
    }
    
    return result

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
        
        # Validate required fields (using frontend field names)
        required_fields = ['age', 'sex', 'chestPainType', 'restingBP', 'cholesterol', 
                          'fastingBS', 'restingECG', 'maxHeartRate', 'exerciseAngina', 
                          'oldpeak', 'stSlope', 'ca', 'thal']
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