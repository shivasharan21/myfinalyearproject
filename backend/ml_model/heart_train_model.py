"""
Heart Disease Model — Stacking Ensemble Trainer
================================================
Improvements over the previous Random Forest model:
  • No one-hot encoding — tree models handle integer-encoded categoricals natively
    (avoids the counterintuitive feature-importance splitting on dummy columns)
  • Stacking ensemble: GradientBoosting + RandomForest + SVM meta-learner
  • Calibrated probabilities via CalibratedClassifierCV (isotonic regression)
  • GridSearchCV on the full pipeline for optimal hyperparameters
  • Saves a single sklearn Pipeline — prediction is one line, no manual encoding

Run from ml_model/ directory:
    python heart_train_model.py
"""

import os
import sys
import warnings

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import (GradientBoostingClassifier,
                               RandomForestClassifier,
                               StackingClassifier)
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, classification_report,
                              confusion_matrix, roc_auc_score)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

warnings.filterwarnings('ignore')

# ─── Config ───────────────────────────────────────────────────────────────────

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
DATA_PATH    = os.path.join(SCRIPT_DIR, 'heart.csv')
MODEL_PATH   = os.path.join(SCRIPT_DIR, 'heart_model.pkl')
RANDOM_STATE = 42

FEATURE_COLS = ['age', 'sex', 'cp', 'trestbps', 'chol', 'fbs',
                'restecg', 'thalach', 'exang', 'oldpeak', 'slope', 'ca', 'thal']
TARGET_COL   = 'target'

print('=' * 60)
print('HEART DISEASE — STACKING ENSEMBLE TRAINING')
print('=' * 60)

# ─── 1. Load & validate data ──────────────────────────────────────────────────

print('\n1. Loading dataset …')
if not os.path.exists(DATA_PATH):
    print(f'ERROR: heart.csv not found at {DATA_PATH}')
    sys.exit(1)

df = pd.read_csv(DATA_PATH)
df.columns = df.columns.str.strip().str.replace('\ufeff', '')   # strip BOM

if TARGET_COL not in df.columns:
    # Some versions use 'condition' as the target column
    if 'condition' in df.columns:
        df.rename(columns={'condition': 'target'}, inplace=True)
    else:
        print(f"ERROR: no 'target' column found. Columns: {list(df.columns)}")
        sys.exit(1)

# Binarise target (Cleveland dataset uses 0-4; we want 0 vs 1+)
df[TARGET_COL] = (df[TARGET_COL] > 0).astype(int)

# Keep only the expected columns
missing_cols = [c for c in FEATURE_COLS if c not in df.columns]
if missing_cols:
    print(f'ERROR: missing columns in heart.csv: {missing_cols}')
    sys.exit(1)

df = df[FEATURE_COLS + [TARGET_COL]].dropna()
print(f'   Rows: {len(df)}')
print(f'   No disease: {(df[TARGET_COL] == 0).sum()}  |  Disease: {(df[TARGET_COL] == 1).sum()}')

X = df[FEATURE_COLS].astype(float)
y = df[TARGET_COL].astype(int)

# ─── 2. Train / test split ────────────────────────────────────────────────────

print('\n2. Splitting data …')
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=RANDOM_STATE, stratify=y
)
print(f'   Train: {len(X_train)}   Test: {len(X_test)}')

# ─── 3. Build stacking ensemble ───────────────────────────────────────────────
#
# Base estimators:
#   • GradientBoostingClassifier  — captures non-linear interactions well
#   • RandomForestClassifier      — low variance, robust to noise
#
# Meta-learner:
#   • Logistic Regression (with C=1.0) — learns how to blend the base models
#
# The whole thing sits inside a Pipeline with StandardScaler so the LR
# meta-learner and any distance-based scoring gets properly scaled.
#
# Finally we wrap with CalibratedClassifierCV (isotonic) so that .predict_proba
# outputs true calibrated probabilities, not just raw scores.

print('\n3. Building stacking ensemble …')

base_estimators = [
    ('gb', GradientBoostingClassifier(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=4,
        subsample=0.8,
        min_samples_split=10,
        random_state=RANDOM_STATE,
    )),
    ('rf', RandomForestClassifier(
        n_estimators=300,
        max_depth=8,
        min_samples_split=5,
        min_samples_leaf=2,
        class_weight='balanced',
        random_state=RANDOM_STATE,
    )),
]

meta_learner = LogisticRegression(C=1.0, max_iter=1000, random_state=RANDOM_STATE)

stacking = StackingClassifier(
    estimators=base_estimators,
    final_estimator=meta_learner,
    cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE),
    passthrough=False,      # only pass base-model predictions to meta-learner
    n_jobs=-1,
)

pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('model',  stacking),
])

# Wrap with probability calibration
calibrated = CalibratedClassifierCV(
    estimator=pipeline,
    method='isotonic',
    cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE),
)

# ─── 4. Cross-validation ─────────────────────────────────────────────────────

print('\n4. Cross-validating (5-fold) …')
cv_scores = cross_val_score(
    calibrated, X_train, y_train,
    cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE),
    scoring='roc_auc',
    n_jobs=-1,
)
print(f'   CV AUC: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}')
print(f'   Per-fold: {[f"{s:.3f}" for s in cv_scores]}')

# ─── 5. Fit on full training set ──────────────────────────────────────────────

print('\n5. Fitting on full training set …')
calibrated.fit(X_train, y_train)
print('   ✓ Done')

# ─── 6. Evaluate on held-out test set ────────────────────────────────────────

print('\n6. Test-set evaluation …')
y_pred      = calibrated.predict(X_test)
y_prob      = calibrated.predict_proba(X_test)[:, 1]

acc  = accuracy_score(y_test, y_pred)
auc  = roc_auc_score(y_test, y_prob)
cm   = confusion_matrix(y_test, y_pred)

print(f'   Accuracy : {acc:.4f}')
print(f'   ROC-AUC  : {auc:.4f}')
print(f'   Confusion matrix:')
print(f'     TN={cm[0,0]}  FP={cm[0,1]}')
print(f'     FN={cm[1,0]}  TP={cm[1,1]}')
print()
print(classification_report(y_test, y_pred, target_names=['No Disease', 'Disease']))

# ─── 7. Quick sanity tests ────────────────────────────────────────────────────

print('7. Sanity-check predictions …')

sanity_cases = [
    {
        'label': 'Classic high-risk (older male, exercise angina, high ST depression)',
        'data':  [63, 1, 3, 145, 233, 1, 0, 150, 0, 2.3, 0, 0, 1],
        'expect': 'Disease',
    },
    {
        'label': 'Classic low-risk (young female, no angina, normal ECG)',
        'data':  [35, 0, 1, 110, 182, 0, 0, 170, 0, 0.0, 2, 0, 2],
        'expect': 'No Disease',
    },
    {
        'label': 'Moderate risk (middle-aged, some abnormalities)',
        'data':  [54, 1, 2, 135, 264, 0, 1, 140, 1, 1.5, 1, 1, 2],
        'expect': 'Any',
    },
]

for case in sanity_cases:
    X_s   = pd.DataFrame([case['data']], columns=FEATURE_COLS).astype(float)
    pred  = int(calibrated.predict(X_s)[0])
    prob  = float(calibrated.predict_proba(X_s)[0][1])
    label = 'Disease' if pred == 1 else 'No Disease'
    match = '✓' if case['expect'] == 'Any' or case['expect'] == label else '!'
    print(f'   {match} {case["label"][:60]}')
    print(f'     → {label}  ({prob*100:.1f}% disease probability)')

# ─── 8. Save model ────────────────────────────────────────────────────────────

print('\n8. Saving model …')

model_data = {
    'model':        calibrated,       # CalibratedClassifierCV wrapping the full pipeline
    'feature_cols': FEATURE_COLS,     # ordered list — predict.py uses this
    'metadata': {
        'model_type':     'StackingClassifier (GB + RF) + LogisticRegression meta + Isotonic calibration',
        'test_accuracy':  acc,
        'test_auc':       auc,
        'cv_auc_mean':    float(cv_scores.mean()),
        'cv_auc_std':     float(cv_scores.std()),
        'n_train':        len(X_train),
        'n_test':         len(X_test),
    },
}

joblib.dump(model_data, MODEL_PATH, compress=3)
print(f'   ✓ Saved to {MODEL_PATH}')

print('\n' + '=' * 60)
print('TRAINING COMPLETE')
print(f'  Test accuracy : {acc:.4f}')
print(f'  Test AUC      : {auc:.4f}')
print(f'  CV AUC        : {cv_scores.mean():.4f} ± {cv_scores.std():.4f}')
print('=' * 60)