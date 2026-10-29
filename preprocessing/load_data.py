import pandas as pd
import os
from typing import Tuple

def load_data(data_path: str) -> pd.DataFrame:
    """Load the raw accident dataset.
    
    Args:
        data_path: Path to the CSV (or parquet) file containing the raw data.
    Returns:
        DataFrame with the loaded data.
    """
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Data file not found: {data_path}")
    ext = os.path.splitext(data_path)[1].lower()
    if ext == ".csv":
        df = pd.read_csv(data_path)
    elif ext in {".parquet", ".pq"}:
        df = pd.read_parquet(data_path)
    else:
        raise ValueError(f"Unsupported file extension: {ext}")
    return df

def get_default_data_path() -> str:
    """Return a default path relative to the project root.
    Users can override by passing a custom path to :func:`load_data`.
    """
    return os.path.join(os.path.dirname(__file__), "..", "data", "raw", "accidents.csv")

if __name__ == "__main__":
    df = load_data(get_default_data_path())
    print(df.head())
