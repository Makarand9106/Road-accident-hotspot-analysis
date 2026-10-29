import pandas as pd
from typing import List, Dict

def aggregate_data(df: pd.DataFrame, groupby_cols: List[str], agg_dict: Dict[str, str]) -> pd.DataFrame:
    """Aggregate the DataFrame.

    Parameters
    ----------
    df : pd.DataFrame
        Cleaned data.
    groupby_cols : list of str
        Columns to group by.
    agg_dict : dict
        Mapping of column name to aggregation function (e.g., {'severity':'mean'}).

    Returns
    -------
    pd.DataFrame
        Aggregated DataFrame.
    """
    aggregated = df.groupby(groupby_cols).agg(agg_dict).reset_index()
    return aggregated

if __name__ == "__main__":
    from .load_data import load_data, get_default_data_path
    from .clean_data import clean_data
    df = clean_data(load_data(get_default_data_path()))
    # Example aggregation: count accidents per district
    result = aggregate_data(df, groupby_cols=['district'], agg_dict={'accident_id':'count'})
    print(result.head())
