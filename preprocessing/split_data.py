import pandas as pd
from sklearn.model_selection import train_test_split
from typing import Tuple


def split_data(df: pd.DataFrame, test_size: float = 0.2, val_size: float = 0.1, random_state: int = 42) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Split a DataFrame into train, validation, and test sets.

    Args:
        df: Input DataFrame.
        test_size: Fraction of the data to keep for the test set.
        val_size: Fraction of the remaining data (after test split) for validation.
        random_state: Seed for reproducibility.
    Returns:
        Tuple of (train_df, val_df, test_df).
    """
    train_val, test = train_test_split(df, test_size=test_size, random_state=random_state)
    train, val = train_test_split(train_val, test_size=val_size / (1 - test_size), random_state=random_state)
    return train, val, test

if __name__ == "__main__":
    # Example usage (will raise if data not present)
    from .load_data import load_data, get_default_data_path
    df = load_data(get_default_data_path())
    train, val, test = split_data(df)
    print(f"Train: {train.shape}, Val: {val.shape}, Test: {test.shape}")
