# backend/ml_model/train_model.py
import numpy as np
import pandas as pd
import pickle
import os
from sklearn.model_selection import train_test_split
from sklearn.ensemble import BaggingClassifier
from sklearn.metrics import accuracy_score, precision_score, confusion_matrix

def train_and_save_model(data_path='diabetes.csv'):
    """Train the diabetes prediction model and save it"""
    
    # Get the directory of this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(script_dir, data_path)
    
    # Load data
    print(f"Loading data from: {csv_path}")
    df = pd.read_csv(csv_path)
    
    # Drop ID column if exists
    if 'Id' in df.columns:
        df = df.drop(columns=['Id'])
    
    # Separate features and target
    X = df.iloc[:, :-1]
    y = df.iloc[:, -1]
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=2
    )
    
    # Train model
    print("Training model...")
    model = BaggingClassifier(n_estimators=150, random_state=2)
    model.fit(X_train, y_train)
    
    # Evaluate model
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred)
    cm = confusion_matrix(y_test, y_pred)
    
    print(f"\nModel Performance:")
    print(f"Accuracy: {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"\nConfusion Matrix:")
    print(cm)
    
    # Save model in the same directory as the script
    model_path = os.path.join(script_dir, 'diabetes_model.pkl')
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    
    print(f"\nModel saved as '{model_path}'")
    
    return model, accuracy, precision

if __name__ == '__main__':
    # Train and save the model
    # Make sure to place your Healthcare-Diabetes.csv in the same directory
    train_and_save_model()