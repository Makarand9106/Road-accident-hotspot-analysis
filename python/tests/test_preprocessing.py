import sys
from pathlib import Path
import numpy as np
import pandas as pd
import pytest

# Add repo root to sys.path
TEST_DIR = Path(__file__).resolve().parent
REPO_ROOT = TEST_DIR.parent.parent
sys.path.insert(0, str(REPO_ROOT))

from python.preprocessing.clean import (
    convert_sentinel_unknowns,
    deduplicate_records,
    parse_dates_and_times,
    remove_orphan_records,
    standardize_column_names,
    validate_and_flag_coordinates
)
from python.preprocessing.features import (
    derive_severity_features,
    derive_temporal_features,
    derive_vehicle_involvement_flags
)


def test_standardize_column_names():
    """Verify conversion of headers to snake_case and collision -> accident alignment."""
    df = pd.DataFrame(columns=["Collision Index", "Collision Year", "Weather-Conditions", "Speed Limit (mph)"])
    cleaned = standardize_column_names(df)
    assert "accident_index" in cleaned.columns
    assert "accident_year" in cleaned.columns
    assert "weather_conditions" in cleaned.columns
    assert "speed_limit_mph" in cleaned.columns


def test_convert_sentinel_unknowns():
    """Verify that -1, 99, 9, 'NULL', and sentinel codes are replaced with NaN."""
    df = pd.DataFrame({
        "weather_conditions": [1, 9, -1, 2],
        "speed_limit": [30, 99, 50, -1],
        "road_type": [1, 2, 9, "NULL"],
        "notes": ["Valid", "null", "none", "NAN"]
    })
    cleaned, log = convert_sentinel_unknowns(df)

    # Weather 9 and -1 should be NaN
    assert pd.isna(cleaned.loc[1, "weather_conditions"])
    assert pd.isna(cleaned.loc[2, "weather_conditions"])
    assert cleaned.loc[0, "weather_conditions"] == 1

    # Speed limit 99 and -1 should be NaN
    assert pd.isna(cleaned.loc[1, "speed_limit"])
    assert pd.isna(cleaned.loc[3, "speed_limit"])
    assert cleaned.loc[0, "speed_limit"] == 30

    # Text NULLs should be NaN
    assert pd.isna(cleaned.loc[3, "road_type"])
    assert pd.isna(cleaned.loc[1, "notes"])
    assert pd.isna(cleaned.loc[2, "notes"])


def test_parse_dates_and_times():
    """Verify parsing of day-first dates and standardized 24-hour HH:MM times."""
    df = pd.DataFrame({
        "accident_date": ["15/07/2022", "01/01/2023", "invalid-date", None],
        "time": ["8:30", "17:45", "25:00", "NULL"]
    })
    cleaned, errors = parse_dates_and_times(df)

    assert cleaned.loc[0, "accident_date"] == "2022-07-15"
    assert cleaned.loc[1, "accident_date"] == "2023-01-01"
    assert pd.isna(cleaned.loc[2, "accident_date"])

    assert cleaned.loc[0, "time"] == "08:30"
    assert cleaned.loc[1, "time"] == "17:45"
    assert pd.isna(cleaned.loc[2, "time"])  # 25:00 is invalid
    assert pd.isna(cleaned.loc[3, "time"])


def test_validate_and_flag_coordinates():
    """Verify bounding box checks and has_valid_coords flag."""
    df = pd.DataFrame({
        "latitude": [51.5074, 55.9533, 40.7128, None],  # London, Edinburgh, New York (invalid), Missing
        "longitude": [-0.1278, -3.1883, -74.0060, -0.1278]
    })
    cleaned, stats = validate_and_flag_coordinates(df)

    assert cleaned.loc[0, "has_valid_coords"] == True
    assert cleaned.loc[1, "has_valid_coords"] == True
    assert cleaned.loc[2, "has_valid_coords"] == False  # Outside UK
    assert cleaned.loc[3, "has_valid_coords"] == False  # Null


def test_remove_orphan_records():
    """Verify removal of child vehicle/casualty records with non-existent parent accidents."""
    df_children = pd.DataFrame({
        "accident_index": ["ACC001", "ACC002", "ORPHAN01", "ACC003"],
        "record_id": [1, 2, 3, 4]
    })
    valid_parents = {"ACC001", "ACC002", "ACC003"}

    cleaned, removed_count = remove_orphan_records(df_children, valid_parents)
    assert removed_count == 1
    assert len(cleaned) == 3
    assert "ORPHAN01" not in cleaned["accident_index"].values


def test_derive_temporal_and_time_period_boundaries():
    """Verify time_period classification across all 24 hours."""
    df = pd.DataFrame({
        "accident_date": ["2023-05-15", "2023-05-20"],  # Monday, Saturday
        "day_of_week": [2, 7],                          # 2=Monday, 7=Saturday
        "time": ["08:30", "23:15"]
    })
    feat = derive_temporal_features(df)

    assert feat.loc[0, "month_name"] == "May"
    assert feat.loc[0, "day_of_week_name"] == "Monday"
    assert feat.loc[0, "is_weekend"] == 0
    assert feat.loc[0, "time_period"] == "Morning Peak"

    assert feat.loc[1, "day_of_week_name"] == "Saturday"
    assert feat.loc[1, "is_weekend"] == 1
    assert feat.loc[1, "time_period"] == "Night"

    # Test all specific hour boundaries
    hour_test_df = pd.DataFrame({
        "time": ["07:00", "09:59", "10:00", "15:59", "16:00", "18:59", "19:00", "22:59", "23:00", "04:00"]
    })
    hour_feat = derive_temporal_features(hour_test_df)
    expected_periods = [
        "Morning Peak", "Morning Peak",
        "Daytime", "Daytime",
        "Evening Peak", "Evening Peak",
        "Evening", "Evening",
        "Night", "Night"
    ]
    assert list(hour_feat["time_period"]) == expected_periods


def test_derive_severity_features():
    """Verify is_severe (1 for Fatal/Serious, 0 for Slight) and label mapping."""
    df = pd.DataFrame({
        "accident_severity": [1, 2, 3, None]
    })
    feat = derive_severity_features(df)

    assert feat.loc[0, "is_severe"] == 1
    assert feat.loc[0, "severity_label"] == "Fatal"

    assert feat.loc[1, "is_severe"] == 1
    assert feat.loc[1, "severity_label"] == "Serious"

    assert feat.loc[2, "is_severe"] == 0
    assert feat.loc[2, "severity_label"] == "Slight"

    assert feat.loc[3, "is_severe"] == 0
    assert feat.loc[3, "severity_label"] == "Unknown"


def test_derive_vehicle_involvement_flags():
    """Verify accident-level vehicle flags aggregation."""
    df_acc = pd.DataFrame({
        "accident_index": ["ACC_MOTO", "ACC_HGV", "ACC_CYCLE", "ACC_CAR"]
    })
    df_veh = pd.DataFrame({
        "accident_index": [
            "ACC_MOTO", "ACC_MOTO",  # Motorcycle + Car
            "ACC_HGV",               # HGV
            "ACC_CYCLE",             # Pedal Cycle
            "ACC_CAR"                # Car only
        ],
        "vehicle_type": [
            3, 9,    # Motorcycle 125cc (3), Car (9)
            21,      # Goods >=7.5t (21)
            1,       # Pedal cycle (1)
            9        # Car (9)
        ]
    })

    feat = derive_vehicle_involvement_flags(df_acc, df_veh)
    
    # Check flags for ACC_MOTO
    row_moto = feat[feat["accident_index"] == "ACC_MOTO"].iloc[0]
    assert row_moto["involves_motorcycle"] == 1
    assert row_moto["involves_hgv"] == 0
    assert row_moto["involves_cyclist"] == 0

    # Check flags for ACC_HGV
    row_hgv = feat[feat["accident_index"] == "ACC_HGV"].iloc[0]
    assert row_hgv["involves_motorcycle"] == 0
    assert row_hgv["involves_hgv"] == 1
    assert row_hgv["involves_cyclist"] == 0

    # Check flags for ACC_CYCLE
    row_cycle = feat[feat["accident_index"] == "ACC_CYCLE"].iloc[0]
    assert row_cycle["involves_motorcycle"] == 0
    assert row_cycle["involves_hgv"] == 0
    assert row_cycle["involves_cyclist"] == 1

    # Check flags for ACC_CAR
    row_car = feat[feat["accident_index"] == "ACC_CAR"].iloc[0]
    assert row_car["involves_motorcycle"] == 0
    assert row_car["involves_hgv"] == 0
    assert row_car["involves_cyclist"] == 0
