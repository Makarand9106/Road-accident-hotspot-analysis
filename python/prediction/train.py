"""
Machine Learning Training Pipeline for Accident Severity Prediction.
Trains explainable Logistic Regression, Random Forest, Decision Tree, and Baseline Dummy models.
Extracts features from PostgreSQL view v_model_dataset with strict casualty target leakage exclusions.
"""

import argparse
import sys
import time
from pathlib import Path
from typing import Dict, Tuple, Any

import joblib
import numpy as np
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.model_selection import train_test_split

# Add repo root to sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(REPO_ROOT))

import python.config as config
from python.analysis.db_access import query_df


# =============================================================================
# FEATURE DEFINITIONS (Known at time of collision; NO CASUALTY LEAKAGE)
# =============================================================================

CATEGORICAL_FEATURES = [
    "time_period",
    "day_of_week_name",
    "weather_condition_name",
    "road_surface_condition_name",
    "light_condition_name",
    "road_type_name",
    "road_class_name",
    "junction_detail_name",
    "junction_control_name",
    "urban_rural_name",
]

NUMERICAL_FEATURES = [
    "hour",
    "month",
    "speed_limit",
    "number_of_vehicles",
]

BINARY_FEATURES = [
    "is_weekend",
    "involves_motorcycle",
    "involves_hgv",
    "involves_cyclist",
]

ALL_FEATURES = CATEGORICAL_FEATURES + NUMERICAL_FEATURES + BINARY_FEATURES
TARGET_COL = "is_severe"


def load_dataset() -> pd.DataFrame:
    """Load collision records from v_model_dataset PostgreSQL view."""
    print("Loading collision training records from PostgreSQL view 'v_model_dataset'...")
    t0 = time.time()
    
    # Explicitly select only non-leaked pre-collision features and target
    cols_sql = ", ".join([
        "accident_index", "accident_year", TARGET_COL,
        *CATEGORICAL_FEATURES, *NUMERICAL_FEATURES, *BINARY_FEATURES
    ])
    
    query = f"SELECT {cols_sql} FROM v_model_dataset;"
    df = query_df(query)
    
    print(f"  -> Loaded {len(df):,} records in {time.time() - t0:.2f}s.")
    
    # Verify no casualty columns present
    for col in df.columns:
        if "casualty" in col.lower() or col == "number_of_casualties":
            raise ValueError(f"[TARGET LEAKAGE DETECTED] Illegal casualty column found in model dataset: {col}")
            
    # Report class balance
    target_counts = df[TARGET_COL].value_counts().to_dict()
    total = len(df)
    print(f"  -> Target '{TARGET_COL}' Balance:")
    print(f"     * Slight  (0): {target_counts.get(0, 0):,} ({target_counts.get(0, 0)*100.0/total:.2f}%)")
    print(f"     * Severe  (1): {target_counts.get(1, 0):,} ({target_counts.get(1, 0)*100.0/total:.2f}%)")
    
    return df


def build_preprocessor() -> ColumnTransformer:
    """Build scikit-learn ColumnTransformer for categorical, numerical, and binary features."""
    cat_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="constant", fill_value="Unknown")),
        ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False))
    ])
    
    num_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler())
    ])
    
    bin_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="constant", fill_value=0))
    ])
    
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", cat_pipeline, CATEGORICAL_FEATURES),
            ("num", num_pipeline, NUMERICAL_FEATURES),
            ("bin", bin_pipeline, BINARY_FEATURES),
        ],
        remainder="drop"
    )
    return preprocessor


def train_all_models(
    X_train: pd.DataFrame, 
    y_train: pd.Series
) -> Tuple[Dict[str, Pipeline], ColumnTransformer]:
    """Train Dummy, Logistic Regression, Decision Tree, and Random Forest pipelines."""
    print("\nTraining Severity Risk Classification Models...")
    
    # 1. Fit preprocessor on training data
    preprocessor = build_preprocessor()
    
    # Define models
    models = {
        "Dummy Baseline": DummyClassifier(strategy="prior"),
        "Logistic Regression": LogisticRegression(
            class_weight="balanced",
            max_iter=1000,
            C=1.0,
            solver="lbfgs",
            random_state=42
        ),
        "Decision Tree": DecisionTreeClassifier(
            max_depth=4,
            class_weight="balanced",
            random_state=42
        ),
        "Random Forest": RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            class_weight="balanced",
            n_jobs=-1,
            random_state=42
        )
    }
    
    trained_pipelines = {}
    for name, clf in models.items():
        t0 = time.time()
        print(f"  -> Fitting {name} pipeline...")
        pipe = Pipeline([
            ("preprocessor", preprocessor),
            ("classifier", clf)
        ])
        pipe.fit(X_train, y_train)
        elapsed = time.time() - t0
        print(f"     Completed {name} training in {elapsed:.2f}s.")
        trained_pipelines[name] = pipe
        
    return trained_pipelines, preprocessor


def main():
    parser = argparse.ArgumentParser(description="Accident Severity Risk Model Training")
    parser.add_argument("--save-dir", type=str, default=str(REPO_ROOT / "models"), help="Output directory for model artifacts")
    args = parser.parse_args()
    
    print("=" * 80)
    print("ACCIDENT SEVERITY RISK PREDICTION MODEL TRAINING")
    print("=" * 80)
    
    save_dir = Path(args.save_dir)
    save_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. Load Data
    df = load_dataset()
    
    # 2. Stratified 80/20 Train/Test Split
    print("\nCreating Stratified 80/20 Train/Test Split (random_state=42)...")
    X = df[ALL_FEATURES]
    y = df[TARGET_COL]
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, stratify=y, random_state=42
    )
    print(f"  -> Training Set: {len(X_train):,} samples ({y_train.mean()*100:.2f}% severe)")
    print(f"  -> Test Set:     {len(X_test):,} samples ({y_test.mean()*100:.2f}% severe)")
    
    # 3. Train Models
    pipelines, preprocessor = train_all_models(X_train, y_train)
    
    # 4. Save Trained Artifacts to models/
    print(f"\nSaving trained pipelines and datasets to {save_dir}...")
    joblib.dump(pipelines["Logistic Regression"], save_dir / "risk_model.joblib")
    joblib.dump(pipelines, save_dir / "all_pipelines.joblib")
    joblib.dump({
        "X_train": X_train, "X_test": X_test,
        "y_train": y_train, "y_test": y_test,
        "features": ALL_FEATURES,
        "cat_cols": CATEGORICAL_FEATURES,
        "num_cols": NUMERICAL_FEATURES,
        "bin_cols": BINARY_FEATURES,
        "training_severe_rate": float(y_train.mean())
    }, save_dir / "split_data.joblib")
    
    print(f"  -> Saved risk_model.joblib and split_data.joblib.")
    print("\n[SUCCESS] Model training completed cleanly.")


if __name__ == "__main__":
    main()
