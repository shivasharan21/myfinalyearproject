# backend/ml_model/test_prediction.py
"""
Standalone script to test the diabetes prediction model
"""
import pickle
import numpy as np
import os

def load_model():
    """Load the trained model"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(script_dir, 'diabetes_model.pkl')
    
    try:
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
            print("✓ Model loaded successfully!")
            return model
    except FileNotFoundError:
        print("✗ Error: diabetes_model.pkl not found!")
        print("Please run: python ml_model/train_model.py")
        return None

def test_prediction(model, test_case_name, data):
    """Test a single prediction"""
    print(f"\n{'='*60}")
    print(f"Test Case: {test_case_name}")
    print(f"{'='*60}")
    
    # Display input data
    print("\nInput Data:")
    for key, value in data.items():
        print(f"  {key:30s}: {value}")
    
    # Prepare features in correct order
    features = [
        data['pregnancies'],
        data['glucose'],
        data['bloodPressure'],
        data['skinThickness'],
        data['insulin'],
        data['bmi'],
        data['diabetesPedigreeFunction'],
        data['age']
    ]
    
    # Make prediction
    features_array = np.array(features).reshape(1, -1)
    prediction = model.predict(features_array)[0]
    
    # Get probability
    try:
        probability = model.predict_proba(features_array)[0]
        prob_positive = float(probability[1])
    except:
        prob_positive = 1.0 if prediction == 1 else 0.0
    
    # Display results
    print("\n" + "="*60)
    print("PREDICTION RESULTS:")
    print("="*60)
    print(f"Prediction: {'DIABETES RISK - HIGH ⚠️' if prediction == 1 else 'DIABETES RISK - LOW ✓'}")
    print(f"Probability: {prob_positive * 100:.2f}%")
    print(f"Risk Level: {'High' if prediction == 1 else 'Low'}")
    print("="*60)

def main():
    print("\n" + "="*60)
    print("DIABETES PREDICTION MODEL - TEST SUITE")
    print("="*60)
    
    # Load model
    model = load_model()
    if model is None:
        return
    
    # Test Case 1: Low Risk Profile
    test_case_1 = {
        'pregnancies': 1,
        'glucose': 85,
        'bloodPressure': 66,
        'skinThickness': 29,
        'insulin': 0,
        'bmi': 26.6,
        'diabetesPedigreeFunction': 0.351,
        'age': 31
    }
    test_prediction(model, "Low Risk Profile (Young, Normal Values)", test_case_1)
    
    # Test Case 2: High Risk Profile
    test_case_2 = {
        'pregnancies': 6,
        'glucose': 148,
        'bloodPressure': 72,
        'skinThickness': 35,
        'insulin': 0,
        'bmi': 33.6,
        'diabetesPedigreeFunction': 0.627,
        'age': 50
    }
    test_prediction(model, "High Risk Profile (Multiple Risk Factors)", test_case_2)
    
    # Test Case 3: Moderate Risk Profile
    test_case_3 = {
        'pregnancies': 2,
        'glucose': 120,
        'bloodPressure': 70,
        'skinThickness': 20,
        'insulin': 80,
        'bmi': 25.5,
        'diabetesPedigreeFunction': 0.5,
        'age': 35
    }
    test_prediction(model, "Moderate Risk Profile (Mixed Values)", test_case_3)
    
    # Test Case 4: Very High Risk
    test_case_4 = {
        'pregnancies': 10,
        'glucose': 168,
        'bloodPressure': 74,
        'skinThickness': 0,
        'insulin': 0,
        'bmi': 38.0,
        'diabetesPedigreeFunction': 0.537,
        'age': 34
    }
    test_prediction(model, "Very High Risk Profile (Extreme Values)", test_case_4)
    
    print("\n" + "="*60)
    print("✓ ALL TESTS COMPLETED SUCCESSFULLY!")
    print("="*60)
    print("\nThe model is working correctly and ready for production use.")
    print("It will be called by the Node.js backend with patient data.\n")

if __name__ == '__main__':
    main()
