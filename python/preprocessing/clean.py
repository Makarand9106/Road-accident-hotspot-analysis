"""
Data Cleaning Module for UK DfT STATS19 Road Safety Datasets.
Provides modular, testable functions to clean, standardize, and validate
collisions (accidents), vehicles, and casualties data.
"""

import re
from typing import Dict, List, Set, Tuple
import numpy as np
import pandas as pd

# UK Geographic Bounding Box
UK_LAT_MIN, UK_LAT_MAX = 49.85, 60.90
UK_LON_MIN, UK_LON_MAX = -8.65, 1.80

# Columns where 9 / 99 denotes unknown sentinel
UNKNOWN_SENTINEL_COLUMNS = {
    "weather_conditions": {9, 99, -1},
    "road_surface_conditions": {9, 99, -1},
    "light_conditions": {7, 9, 99, -1},  # 7 is darkness lighting unknown
    "road_type": {9, 99, -1},
    "junction_detail": {99, -1},
    "junction_control": {9, 99, -1},
    "special_conditions_at_site": {9, 99, -1},
    "carriageway_hazards": {9, 99, -1},
    "urban_or_rural_area": {3, 9, 99, -1},  # 3 is unallocated
    "did_police_officer_attend_scene_of_accident": {9, 99, -1},
    "trunk_road_flag": {9, 99, -1},
    "speed_limit": {99, -1},
    "sex_of_driver": {3, 9, 99, -1},  # 3 is not known
    "sex_of_casualty": {9, 99, -1},
    "age_band_of_driver": {9, 99, -1},
    "age_band_of_casualty": {9, 99, -1},
    "vehicle_type": {99, -1},
    "casualty_type": {99, -1},
    "casualty_class": {9, 99, -1},
    "journey_purpose_of_driver": {9, 99, -1, 15},  # 15 is not known
}


def to_snake_case(col_name: str) -> str:
    """Convert column name string to clean snake_case."""
    col = str(col_name).strip()
    col = re.sub(r"[^\w\s]", "_", col)
    col = re.sub(r"\s+", "_", col)
    col = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1_\2", col)
    col = re.sub(r"([a-z\d])([A-Z])", r"\1_\2", col)
    col = re.sub(r"_+", "_", col)
    return col.lower().strip("_")


def standardize_column_names(df: pd.DataFrame) -> pd.DataFrame:
    """Standardize column names to snake_case and align collision -> accident naming."""
    df_clean = df.copy()
    df_clean.columns = [to_snake_case(c) for c in df_clean.columns]

    # Map collision naming variations to standard accident schema
    column_renames = {
        "collision_index": "accident_index",
        "collision_year": "accident_year",
        "collision_ref_no": "accident_reference",
        "collision_severity": "accident_severity",
        "enhanced_severity_collision": "enhanced_severity_accident",
        "collision_injury_based": "accident_injury_based",
        "collision_adjusted_severity_serious": "accident_adjusted_severity_serious",
        "collision_adjusted_severity_slight": "accident_adjusted_severity_slight",
        "date": "accident_date"
    }

    df_clean = df_clean.rename(columns={k: v for k, v in column_renames.items() if k in df_clean.columns})
    return df_clean


def convert_sentinel_unknowns(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, int]]:
    """
    Convert -1, 99, 9, 'NULL', 'nan' and domain sentinel unknown conventions to NaN.
    Returns cleaned dataframe and a dictionary counting converted values per column.
    """
    df_clean = df.copy()
    conversions_log = {}

    for col in df_clean.columns:
        converted_count = 0
        series = df_clean[col]

        # 1. Text NULL representations (case-insensitive)
        str_mask = series.astype(str).str.strip().str.upper().isin({"NULL", "NAN", "NONE", "-1", "UNKNOWN", ""})
        if str_mask.any():
            converted_count += int(str_mask.sum())
            df_clean[col] = df_clean[col].mask(str_mask, np.nan)

        # 2. General -1 missing sentinel for numeric values
        if pd.api.types.is_numeric_dtype(df_clean[col]):
            neg1_mask = df_clean[col] == -1
            if neg1_mask.any():
                converted_count += int(neg1_mask.sum())
                df_clean[col] = df_clean[col].mask(neg1_mask, np.nan)

        # 3. Domain-specific sentinel unknowns (e.g. 9 or 99)
        col_lower = col.lower()
        if col_lower in UNKNOWN_SENTINEL_COLUMNS:
            sentinels = UNKNOWN_SENTINEL_COLUMNS[col_lower]
            sentinel_mask = df_clean[col].isin(sentinels)
            if sentinel_mask.any():
                converted_count += int(sentinel_mask.sum())
                df_clean[col] = df_clean[col].mask(sentinel_mask, np.nan)

        if converted_count > 0:
            conversions_log[col] = converted_count

    return df_clean, conversions_log


def parse_dates_and_times(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, int]]:
    """
    Parse accident_date (day-first: DD/MM/YYYY) and time (HH:MM) to standardized formats.
    Returns cleaned dataframe and parse error counts.
    """
    df_clean = df.copy()
    errors = {"invalid_dates": 0, "invalid_times": 0}

    # 1. Parse accident_date
    if "accident_date" in df_clean.columns:
        raw_dates = df_clean["accident_date"].astype(str).str.strip()
        parsed_dates = pd.to_datetime(raw_dates, format="%d/%m/%Y", errors="coerce")
        # Fallback to general parser for any non-standard rows
        if parsed_dates.isna().any():
            fallback_mask = parsed_dates.isna() & ~raw_dates.isna() & (raw_dates != "nan")
            parsed_dates.loc[fallback_mask] = pd.to_datetime(raw_dates[fallback_mask], errors="coerce")

        errors["invalid_dates"] = int(parsed_dates.isna().sum())
        df_clean["accident_date"] = parsed_dates.dt.strftime("%Y-%m-%d")

    # 2. Standardize time format (HH:MM)
    if "time" in df_clean.columns:
        raw_times = df_clean["time"].astype(str).str.strip()
        time_pattern = r"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
        valid_mask = raw_times.str.match(time_pattern)
        
        # Standardize 1-digit hours: e.g. "8:30" -> "08:30"
        standardized_times = raw_times.copy()
        for idx in standardized_times[valid_mask].index:
            t = standardized_times.at[idx]
            if len(t) == 4 and t[1] == ":":
                standardized_times.at[idx] = "0" + t

        invalid_mask = (~valid_mask) | raw_times.isin(["nan", "NULL", "-1", ""])
        standardized_times[invalid_mask] = np.nan
        errors["invalid_times"] = int(invalid_mask.sum())
        df_clean["time"] = standardized_times

    return df_clean, errors


def validate_and_flag_coordinates(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, int]]:
    """
    Validate coordinates against UK bounds and create has_valid_coords flag.
    Retains original OSGB easting/northing and lat/lon columns.
    """
    df_clean = df.copy()

    has_lat = "latitude" in df_clean.columns
    has_lon = "longitude" in df_clean.columns

    if has_lat and has_lon:
        lat = pd.to_numeric(df_clean["latitude"], errors="coerce")
        lon = pd.to_numeric(df_clean["longitude"], errors="coerce")

        valid_mask = (
            lat.notna() & lon.notna() &
            (lat >= UK_LAT_MIN) & (lat <= UK_LAT_MAX) &
            (lon >= UK_LON_MIN) & (lon <= UK_LON_MAX)
        )
        df_clean["has_valid_coords"] = valid_mask
        
        stats = {
            "total_records": len(df_clean),
            "valid_coords": int(valid_mask.sum()),
            "invalid_or_missing_coords": int((~valid_mask).sum())
        }
    else:
        df_clean["has_valid_coords"] = False
        stats = {"total_records": len(df_clean), "valid_coords": 0, "invalid_or_missing_coords": len(df_clean)}

    return df_clean, stats


def deduplicate_records(df: pd.DataFrame, key_column: str = "accident_index") -> Tuple[pd.DataFrame, int]:
    """Drop exact duplicate records while preserving the first occurrence."""
    initial_count = len(df)
    df_clean = df.drop_duplicates().copy()
    if key_column in df_clean.columns:
        df_clean = df_clean.drop_duplicates(subset=[key_column], keep="first")
    duplicates_dropped = initial_count - len(df_clean)
    return df_clean, duplicates_dropped


def remove_orphan_records(
    df_child: pd.DataFrame,
    valid_parent_ids: Set[str],
    key_column: str = "accident_index"
) -> Tuple[pd.DataFrame, int]:
    """
    Remove child records (vehicles/casualties) that do not link to any valid parent accident.
    Returns cleaned child dataframe and count of orphan rows removed.
    """
    if key_column not in df_child.columns:
        return df_child, 0

    valid_mask = df_child[key_column].isin(valid_parent_ids)
    orphan_count = int((~valid_mask).sum())
    df_clean = df_child[valid_mask].copy()
    return df_clean, orphan_count


def clean_accidents(df_raw: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
    """Complete cleaning pipeline for collisions / accidents."""
    report = {"initial_rows": len(df_raw)}
    df = standardize_column_names(df_raw)
    df, dups_removed = deduplicate_records(df, "accident_index")
    report["duplicates_removed"] = dups_removed
    
    df, sentinels = convert_sentinel_unknowns(df)
    report["sentinels_converted"] = sentinels

    df, date_time_errors = parse_dates_and_times(df)
    report["temporal_errors"] = date_time_errors

    df, coord_stats = validate_and_flag_coordinates(df)
    report["coordinate_stats"] = coord_stats
    report["final_rows"] = len(df)
    return df, report


def clean_vehicles(df_raw: pd.DataFrame, valid_accident_ids: Set[str]) -> Tuple[pd.DataFrame, Dict]:
    """Complete cleaning pipeline for vehicles."""
    report = {"initial_rows": len(df_raw)}
    df = standardize_column_names(df_raw)
    df, dups_removed = deduplicate_records(df, None)
    report["duplicates_removed"] = dups_removed

    df, orphans_removed = remove_orphan_records(df, valid_accident_ids, "accident_index")
    report["orphans_removed"] = orphans_removed

    df, sentinels = convert_sentinel_unknowns(df)
    report["sentinels_converted"] = sentinels
    report["final_rows"] = len(df)
    return df, report


def clean_casualties(df_raw: pd.DataFrame, valid_accident_ids: Set[str]) -> Tuple[pd.DataFrame, Dict]:
    """Complete cleaning pipeline for casualties."""
    report = {"initial_rows": len(df_raw)}
    df = standardize_column_names(df_raw)
    df, dups_removed = deduplicate_records(df, None)
    report["duplicates_removed"] = dups_removed

    df, orphans_removed = remove_orphan_records(df, valid_accident_ids, "accident_index")
    report["orphans_removed"] = orphans_removed

    df, sentinels = convert_sentinel_unknowns(df)
    report["sentinels_converted"] = sentinels
    report["final_rows"] = len(df)
    return df, report
