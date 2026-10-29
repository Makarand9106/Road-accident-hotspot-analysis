import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingRegressor, GradientBoostingClassifier
from sklearn.metrics import mean_squared_error, accuracy_score
import joblib
import os

from preprocessing.load_data import load_data, get_default_data_path
from preprocessing.clean_data import clean_data

# Assume target column is 'severity' for classification (if categorical) else 'accident_count' for regression
TARGET_COLUMN = os.getenv('TARGET_COLUMN', 'severity')
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.pkl')

def train():
    df = clean_data(load_data(get_default_data_path()))
    if TARGET_COLUMN not in df.columns:
        raise ValueError(f"Target column '{TARGET_COLUMN}' not found in data")
    X = df.drop(columns=[TARGET_COLUMN])
    y = df[TARGET_COLUMN]
    # Simple preprocessing: convert categorical to dummy variables
    X = pd.get_dummies(X, drop_first=True)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    if y.dtype.kind in 'biu' or y.nunique() < 20:  # treat as classification if integer with few classes
        model = GradientBoostingClassifier(random_state=42)
        model.fit(X_train, y_train)
        preds = model.predict(X_test)
        acc = accuracy_score(y_test, preds)
        print(f"Classification accuracy: {acc:.4f}")
    else:
        model = GradientBoostingRegressor(random_state=42)
        model.fit(X_train, y_train)
        preds = model.predict(X_test)
        mse = mean_squared_error(y_test, preds)
        print(f"Regression MSE: {mse:.4f}")
    joblib.dump(model, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")

if __name__ == '__main__':
    train()
