"""
Heart Disease Model Training Script
Trains a Random Forest model with proper feature engineering
"""
import pandas as pd
import joblib
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, roc_auc_score, confusion_matrix, classification_report

# ===============================
# CONFIG
# ===============================
DATA_PATH = "heart.csv"
MODEL_PATH = "heart_model.pkl"
RANDOM_STATE = 42

print("=" * 60)
print("HEART DISEASE MODEL TRAINING")
print("=" * 60)

# ===============================
# LOAD DATA
# ===============================
print("\n1. Loading dataset...")
df = pd.read_csv(DATA_PATH)

# Remove BOM if present
df.columns = df.columns.str.replace('\ufeff', '')

print(f"   Dataset shape: {df.shape}")
print(f"   Features: {list(df.columns)}")

if "target" not in df.columns:
    raise ValueError("❌ 'target' column not found in heart.csv")

# Check target distribution
print(f"\n   Target distribution:")
print(f"   - No Disease (0): {(df['target'] == 0).sum()} samples")
print(f"   - Disease (1): {(df['target'] == 1).sum()} samples")

X = df.drop("target", axis=1)
y = df["target"]

# ===============================
# FEATURE ENGINEERING
# ===============================
print("\n2. Feature engineering...")

# Convert categorical variables to proper categories
# sex: 0 = female, 1 = male
# cp (chest pain): 0-3
# fbs (fasting blood sugar): 0 = <120mg/dl, 1 = >120mg/dl
# restecg (resting ECG): 0-2
# exang (exercise induced angina): 0 = no, 1 = yes
# slope: 0-2
# ca (number of major vessels): 0-3
# thal: 0-3

categorical_cols = ['sex', 'cp', 'fbs', 'restecg', 'exang', 'slope', 'ca', 'thal']

# One-hot encode categorical features
X_encoded = pd.get_dummies(X, columns=categorical_cols, drop_first=False)

feature_columns = X_encoded.columns.tolist()
print(f"   Total features after encoding: {len(feature_columns)}")
print(f"   Features: {feature_columns}")

# ===============================
# SPLIT DATA
# ===============================
print("\n3. Splitting data...")
X_train, X_test, y_train, y_test = train_test_split(
    X_encoded,
    y,
    test_size=0.2,
    random_state=RANDOM_STATE,
    stratify=y
)

print(f"   Training set: {X_train.shape[0]} samples")
print(f"   Test set: {X_test.shape[0]} samples")

# ===============================
# TRAIN MODEL
# ===============================
print("\n4. Training Random Forest model...")
model = RandomForestClassifier(
    n_estimators=200,
    max_depth=8,
    min_samples_split=5,
    min_samples_leaf=2,
    random_state=RANDOM_STATE,
    class_weight='balanced'  # Handle any class imbalance
)

model.fit(X_train, y_train)
print("   ✓ Model trained successfully")

# ===============================
# EVALUATE MODEL
# ===============================
print("\n5. Evaluating model...")

# Training set predictions
y_train_pred = model.predict(X_train)
y_train_prob = model.predict_proba(X_train)[:, 1]
train_accuracy = accuracy_score(y_train, y_train_pred)
train_auc = roc_auc_score(y_train, y_train_prob)

# Test set predictions
y_test_pred = model.predict(X_test)
y_test_prob = model.predict_proba(X_test)[:, 1]
test_accuracy = accuracy_score(y_test, y_test_pred)
test_auc = roc_auc_score(y_test, y_test_prob)

print(f"\n   Training Performance:")
print(f"   - Accuracy: {train_accuracy:.4f}")
print(f"   - AUC: {train_auc:.4f}")

print(f"\n   Test Performance:")
print(f"   - Accuracy: {test_accuracy:.4f}")
print(f"   - AUC: {test_auc:.4f}")

# Confusion matrix
cm = confusion_matrix(y_test, y_test_pred)
print(f"\n   Confusion Matrix:")
print(f"   [[TN={cm[0,0]}, FP={cm[0,1]}],")
print(f"    [FN={cm[1,0]}, TP={cm[1,1]}]]")

print(f"\n   Classification Report:")
print(classification_report(y_test, y_test_pred, 
                          target_names=['No Disease', 'Disease']))

# Feature importance
feature_importance = pd.DataFrame({
    'feature': feature_columns,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)

print(f"\n   Top 10 Important Features:")
for idx, row in feature_importance.head(10).iterrows():
    print(f"   - {row['feature']}: {row['importance']:.4f}")

# ===============================
# SAVE MODEL
# ===============================
print("\n6. Saving model...")

model_data = {
    "model": model,
    "features": feature_columns,
    "feature_types": {
        "categorical": categorical_cols,
        "numeric": ['age', 'trestbps', 'chol', 'thalach', 'oldpeak']
    },
    "metadata": {
        "train_accuracy": train_accuracy,
        "test_accuracy": test_accuracy,
        "train_auc": train_auc,
        "test_auc": test_auc,
        "n_features": len(feature_columns),
        "model_type": "RandomForestClassifier"
    }
}

joblib.dump(model_data, MODEL_PATH)

print(f"   ✓ Model saved to: {MODEL_PATH}")

# ===============================
# TEST WITH SAMPLE DATA
# ===============================
print("\n7. Testing with sample patients...")

test_samples = [
    {
        "label": "Low Risk Patient",
        "age": 35, "sex": 1, "cp": 0, "trestbps": 120, "chol": 180,
        "fbs": 0, "restecg": 0, "thalach": 170, "exang": 0,
        "oldpeak": 0.0, "slope": 2, "ca": 0, "thal": 2
    },
    {
        "label": "High Risk Patient",
        "age": 65, "sex": 0, "cp": 3, "trestbps": 160, "chol": 286,
        "fbs": 1, "restecg": 2, "thalach": 108, "exang": 1,
        "oldpeak": 3.5, "slope": 0, "ca": 3, "thal": 3
    }
]

for sample in test_samples:
    label = sample.pop("label")
    df_sample = pd.DataFrame([sample])
    df_sample_encoded = pd.get_dummies(df_sample, columns=categorical_cols, drop_first=False)
    df_sample_encoded = df_sample_encoded.reindex(columns=feature_columns, fill_value=0)
    
    pred = model.predict(df_sample_encoded)[0]
    prob = model.predict_proba(df_sample_encoded)[0]
    
    print(f"\n   {label}:")
    print(f"   - Prediction: {'Disease' if pred == 1 else 'No Disease'}")
    print(f"   - Probability: {prob[1]*100:.1f}% disease risk")

print("\n" + "=" * 60)
print("✅ TRAINING COMPLETE")
print("=" * 60)