"""
Database Access Layer for Analytical Queries and Exploratory Data Analysis.
Executes parameterized or raw SQL queries against PostgreSQL using SQLAlchemy engine.
"""

from typing import Any, Dict, Optional
import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine

import python.config as config

_ENGINE: Optional[Engine] = None


def get_engine() -> Engine:
    """Singleton getter for SQLAlchemy PostgreSQL database engine."""
    global _ENGINE
    if _ENGINE is None:
        _ENGINE = config.get_db_engine()
    return _ENGINE


def query_df(sql_query: str, params: Optional[Dict[str, Any]] = None) -> pd.DataFrame:
    """
    Execute a SQL statement through SQLAlchemy engine and return results as a pandas DataFrame.
    
    Args:
        sql_query: The SQL query string to execute.
        params: Optional dictionary of bound query parameters.
        
    Returns:
        pd.DataFrame containing the query results.
    """
    engine = get_engine()
    with engine.connect() as conn:
        if params:
            return pd.read_sql(text(sql_query), conn, params=params)
        return pd.read_sql(text(sql_query), conn)
