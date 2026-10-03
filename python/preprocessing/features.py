"""
Feature Engineering and Categorical Lookup Enrichment Module.
Derives temporal indicators, time_period traffic proxies, severity targets,
vehicle-involvement aggregates, and maps numeric codes to official descriptive labels.
"""

from pathlib import Path
from typing import Dict, List, Optional
import numpy as np
import pandas as pd

# Add repo root to sys.path
import sys
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(REPO_ROOT))

import python.config as config

MONTH_NAMES = {
    1: "January", 2: "February", 3: "March", 4: "April",
    5: "May", 6: "June", 7: "July", 8: "August",
    9: "September", 10: "October", 11: "November", 12: "December"
}

# STATS19 Day of Week standard mapping: 1 = Sunday ... 7 = Saturday
DAY_OF_WEEK_NAMES = {
    1: "Sunday",
    2: "Monday",
    3: "Tuesday",
    4: "Wednesday",
    5: "Thursday",
    6: "Friday",
    7: "Saturday"
}

# Vehicle Type Domain Categories
MOTORCYCLE_CODES = {2, 3, 4, 5, 23, 97, 103, 104, 105, 106}
HGV_CODES = {20, 21, 98, 113}
CYCLIST_CODES = {1}


def derive_temporal_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Derive temporal indicators from accident_date and time.
    Adds accident_year, month, month_name, day_of_week_name, hour, is_weekend,
    and time_period (rush-hour / time-of-day proxy).
    """
    df_feat = df.copy()

    # 1. Date breakdown
    if "accident_date" in df_feat.columns:
        dt_series = pd.to_datetime(df_feat["accident_date"], errors="coerce")
        df_feat["accident_year"] = dt_series.dt.year.astype("Int64")
        df_feat["month"] = dt_series.dt.month.astype("Int64")
        df_feat["month_name"] = df_feat["month"].map(MONTH_NAMES).fillna("Unknown")

    # 2. Day of week
    if "day_of_week" in df_feat.columns:
        # Convert numeric day_of_week to name (1=Sunday..7=Saturday)
        dow_int = pd.to_numeric(df_feat["day_of_week"], errors="coerce").astype("Int64")
        df_feat["day_of_week_name"] = dow_int.map(DAY_OF_WEEK_NAMES).fillna("Unknown")
        # is_weekend: 1 for Sunday(1) and Saturday(7)
        df_feat["is_weekend"] = dow_int.isin([1, 7]).astype(int)
    else:
        df_feat["day_of_week_name"] = "Unknown"
        df_feat["is_weekend"] = 0

    # 3. Hour and time_period proxy
    # NOTE: time_period is an explainable time-of-day proxy for traffic density, NOT direct sensor counts.
    if "time" in df_feat.columns:
        raw_times = df_feat["time"].astype(str).str.strip()
        hour_extracted = raw_times.str.extract(r"^(\d{1,2}):", expand=False)
        hour_numeric = pd.to_numeric(hour_extracted, errors="coerce")
        df_feat["hour"] = hour_numeric.astype("Int64")

        # Classify time_period
        conditions = [
            df_feat["hour"].between(7, 9),    # 07:00 - 09:59 (Morning peak)
            df_feat["hour"].between(10, 15),  # 10:00 - 15:59 (Daytime off-peak)
            df_feat["hour"].between(16, 18),  # 16:00 - 18:59 (Evening peak)
            df_feat["hour"].between(19, 22),  # 19:00 - 22:59 (Evening)
            (df_feat["hour"] == 23) | df_feat["hour"].between(0, 6)  # 23:00 - 06:59 (Night)
        ]
        choices = [
            "Morning Peak",
            "Daytime",
            "Evening Peak",
            "Evening",
            "Night"
        ]
        df_feat["time_period"] = np.select(conditions, choices, default="Unknown")
    else:
        df_feat["hour"] = pd.NA
        df_feat["time_period"] = "Unknown"

    return df_feat


def derive_severity_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Derive severity target and label indicators.
    Adds is_severe (1 for Fatal or Serious, 0 for Slight) and severity_label.
    """
    df_feat = df.copy()

    sev_col = "accident_severity" if "accident_severity" in df_feat.columns else None
    if sev_col:
        sev_num = pd.to_numeric(df_feat[sev_col], errors="coerce")
        # 1 = Fatal, 2 = Serious, 3 = Slight
        df_feat["is_severe"] = sev_num.isin([1, 2]).astype(int)

        severity_labels = {1: "Fatal", 2: "Serious", 3: "Slight"}
        df_feat["severity_label"] = sev_num.map(severity_labels).fillna("Unknown")
    else:
        df_feat["is_severe"] = 0
        df_feat["severity_label"] = "Unknown"

    return df_feat


def derive_vehicle_involvement_flags(df_acc: pd.DataFrame, df_veh: pd.DataFrame) -> pd.DataFrame:
    """
    Aggregate vehicle records per accident to create accident-level vehicle flags:
    - involves_motorcycle
    - involves_hgv
    - involves_cyclist
    """
    df_res = df_acc.copy()
    pk = "accident_index"

    if pk not in df_veh.columns or "vehicle_type" not in df_veh.columns:
        df_res["involves_motorcycle"] = 0
        df_res["involves_hgv"] = 0
        df_res["involves_cyclist"] = 0
        return df_res

    veh_types = pd.to_numeric(df_veh["vehicle_type"], errors="coerce")
    
    # Flag masks
    is_moto = veh_types.isin(MOTORCYCLE_CODES)
    is_hgv = veh_types.isin(HGV_CODES)
    is_cycle = veh_types.isin(CYCLIST_CODES)

    # Group by accident_index
    moto_accidents = set(df_veh.loc[is_moto, pk].dropna().unique())
    hgv_accidents = set(df_veh.loc[is_hgv, pk].dropna().unique())
    cycle_accidents = set(df_veh.loc[is_cycle, pk].dropna().unique())

    df_res["involves_motorcycle"] = df_res[pk].isin(moto_accidents).astype(int)
    df_res["involves_hgv"] = df_res[pk].isin(hgv_accidents).astype(int)
    df_res["involves_cyclist"] = df_res[pk].isin(cycle_accidents).astype(int)

    return df_res


def load_reference_lookup(domain_name: str) -> Dict[str, str]:
    """Load a reference mapping dictionary from data/reference/<domain_name>.csv."""
    ref_file = config.REFERENCE_DATA_DIR / f"{domain_name}.csv"
    if not ref_file.exists():
        return {}

    try:
        ref_df = pd.read_csv(ref_file)
        if "code" in ref_df.columns and "label" in ref_df.columns:
            lookup = dict(zip(ref_df["code"].astype(str).str.strip(), ref_df["label"].astype(str).str.strip()))
            return lookup
    except Exception:
        pass
    return {}


def apply_reference_labels(
    df: pd.DataFrame,
    mappings: List[Tuple[str, str, str]]
) -> Tuple[pd.DataFrame, Dict[str, int]]:
    """
    Map coded fields to readable labels.
    mappings is a list of tuples: (source_col, target_label_col, reference_domain_name)
    Returns enriched dataframe and unmapped code counts.
    """
    df_enriched = df.copy()
    unmapped_counts = {}

    for source_col, label_col, domain_name in mappings:
        if source_col not in df_enriched.columns:
            continue

        lookup = load_reference_lookup(domain_name)
        if not lookup:
            continue

        series_str = df_enriched[source_col].astype(str).str.strip()
        # Drop floating point suffix e.g. "1.0" -> "1"
        series_str = series_str.str.replace(r"\.0$", "", regex=True)

        mapped_series = series_str.map(lookup)
        
        # Count unmapped non-null codes
        valid_source_mask = df_enriched[source_col].notna() & (~series_str.isin(["nan", "None", "-1", "NULL", ""]))
        unmapped_mask = valid_source_mask & mapped_series.isna()
        unmapped_cnt = int(unmapped_mask.sum())
        if unmapped_cnt > 0:
            unmapped_counts[source_col] = unmapped_cnt

        # Fill missing / unknown
        df_enriched[label_col] = mapped_series.fillna("Unknown")

    return df_enriched, unmapped_counts


def enrich_accidents_features(df_acc: pd.DataFrame, df_veh: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
    """Apply complete feature engineering and reference mapping to accidents dataset."""
    report = {}
    df = derive_temporal_features(df_acc)
    df = derive_severity_features(df)
    df = derive_vehicle_involvement_flags(df, df_veh)

    accident_mappings = [
        ("police_force", "police_force_label", "police_force"),
        ("local_authority_district", "local_authority_district_label", "local_authority_district"),
        ("first_road_class", "first_road_class_label", "first_road_class"),
        ("road_type", "road_type_label", "road_type"),
        ("junction_detail", "junction_detail_label", "junction_detail"),
        ("junction_control", "junction_control_label", "junction_control"),
        ("light_conditions", "light_conditions_label", "light_conditions"),
        ("weather_conditions", "weather_conditions_label", "weather_conditions"),
        ("road_surface_conditions", "road_surface_conditions_label", "road_surface_conditions"),
        ("special_conditions_at_site", "special_conditions_at_site_label", "special_conditions_at_site"),
        ("carriageway_hazards", "carriageway_hazards_label", "carriageway_hazards"),
        ("urban_or_rural_area", "urban_or_rural_area_label", "urban_or_rural_area"),
        ("pedestrian_crossing", "pedestrian_crossing_label", "pedestrian_crossing")
    ]

    df, unmapped = apply_reference_labels(df, accident_mappings)
    report["unmapped_reference_codes"] = unmapped
    return df, report


def enrich_vehicles_features(df_veh: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
    """Apply feature engineering and reference mapping to vehicles dataset."""
    report = {}
    vehicle_mappings = [
        ("vehicle_type", "vehicle_type_label", "vehicle_type"),
        ("towing_and_articulation", "towing_and_articulation_label", "towing_and_articulation"),
        ("vehicle_manoeuvre", "vehicle_manoeuvre_label", "vehicle_manoeuvre"),
        ("junction_location", "junction_location_label", "junction_location"),
        ("skidding_and_overturning", "skidding_and_overturning_label", "skidding_and_overturning"),
        ("first_point_of_impact", "first_point_of_impact_label", "first_point_of_impact"),
        ("sex_of_driver", "sex_of_driver_label", "sex_of_driver"),
        ("age_band_of_driver", "age_band_of_driver_label", "age_band_of_driver"),
        ("journey_purpose_of_driver", "journey_purpose_of_driver_label", "journey_purpose_of_driver"),
        ("propulsion_code", "propulsion_code_label", "propulsion_code")
    ]
    df, unmapped = apply_reference_labels(df_veh, vehicle_mappings)
    report["unmapped_reference_codes"] = unmapped
    return df, report


def enrich_casualties_features(df_cas: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
    """Apply feature engineering and reference mapping to casualties dataset."""
    report = {}
    casualty_mappings = [
        ("casualty_class", "casualty_class_label", "casualty_class"),
        ("sex_of_casualty", "sex_of_casualty_label", "sex_of_casualty"),
        ("age_band_of_casualty", "age_band_of_casualty_label", "age_band_of_casualty"),
        ("casualty_severity", "casualty_severity_label", "casualty_severity"),
        ("casualty_type", "casualty_type_label", "casualty_type"),
        ("pedestrian_location", "pedestrian_location_label", "pedestrian_location"),
        ("pedestrian_movement", "pedestrian_movement_label", "pedestrian_movement")
    ]
    df, unmapped = apply_reference_labels(df_cas, casualty_mappings)
    report["unmapped_reference_codes"] = unmapped
    return df, report
