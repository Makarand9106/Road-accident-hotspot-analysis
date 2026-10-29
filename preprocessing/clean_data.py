import pandas as pd
import numpy as np
from typing import List


def clean_data(df: pd.DataFrame,
               duplicate_subset: List[str] = None,
               drop_duplicates: bool = True,
               null_strategy: str = "drop",
               fill_value: any = None) -> pd.DataFrame:
    """Clean the accident DataFrame.

    Parameters
    ----------
    df : pd.DataFrame
        Raw data.
    duplicate_subset : list of str, optional
        Columns to consider when identifying duplicates. If ``None`` all columns are used.
    drop_duplicates : bool, default True
        Whether to drop duplicate rows.
    null_strategy : {"drop", "fill"}, default "drop"
        Strategy for handling missing values.
    fill_value : any, optional
        Value to use when ``null_strategy`` is "fill". If ``None`` and ``fill_value`` is not provided,
        numeric columns are filled with the median, object columns with the mode.

    Returns
    -------
    pd.DataFrame
        Cleaned DataFrame.
    """
    cleaned = df.copy()
    # Drop duplicates
    if drop_duplicates:
        cleaned = cleaned.drop_duplicates(subset=duplicate_subset)

    # Handle missing values
    if null_strategy == "drop":
        cleaned = cleaned.dropna()
    elif null_strategy == "fill":
        if fill_value is not None:
            cleaned = cleaned.fillna(fill_value)
        else:
            # Fill numeric columns with median, categorical with mode
            for col in cleaned.columns:
                if pd.api.types.is_numeric_dtype(cleaned[col]):
                    median = cleaned[col].median()
                    cleaned[col] = cleaned[col].fillna(median)
                else:
                    mode = cleaned[col].mode()
                    if not mode.empty:
                        cleaned[col] = cleaned[col].fillna(mode.iloc[0])
    else:
        raise ValueError(f"Unsupported null_strategy: {null_strategy}")

    # Optional type casting (example: ensure date columns are datetime)
    for col in cleaned.columns:
        if "date" in col.lower() and cleaned[col].dtype == object:
            cleaned[col] = pd.to_datetime(cleaned[col], errors="coerce")

    # After type conversion, drop any rows that became NaT in datetime columns
    cleaned = cleaned.dropna()
    return cleaned

if __name__ == "__main__":
    from .load_data import load_data, get_default_data_path
    df_raw = load_data(get_default_data_path())
    df_clean = clean_data(df_raw)
    print(df_clean.head())
