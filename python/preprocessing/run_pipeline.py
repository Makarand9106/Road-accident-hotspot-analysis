"""
End-to-End STATS19 Preprocessing Pipeline Runner.
Orchestrates cleaning, feature engineering, and reference label enrichment.
Outputs cleaned CSVs and data/processed/quality_report.json.
"""

import json
import sys
import time
from pathlib import Path
import pandas as pd

# Add repo root to sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(REPO_ROOT))

import python.config as config
from python.preprocessing.clean import (
    clean_accidents,
    clean_casualties,
    clean_vehicles
)
from python.preprocessing.features import (
    enrich_accidents_features,
    enrich_casualties_features,
    enrich_vehicles_features
)


def run_preprocessing_pipeline():
    """Execute complete end-to-end preprocessing pipeline."""
    print("=" * 75)
    print("UK DfT STATS19 Road Safety Preprocessing & Feature Pipeline")
    print("=" * 75)
    start_time = time.time()

    config.PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Load Raw Datasets
    print("\n[STEP 1/4] Loading raw data files from data/raw/...")
    col_path = config.RAW_DATA_DIR / "collisions_last_5_years.csv"
    cas_path = config.RAW_DATA_DIR / "casualties_last_5_years.csv"
    veh_path = config.RAW_DATA_DIR / "vehicles_last_5_years.csv"

    if not col_path.exists() or not cas_path.exists() or not veh_path.exists():
        raise FileNotFoundError("Raw files missing. Run python/ingestion/download_data.py first.")

    raw_col = pd.read_csv(col_path, low_memory=False)
    raw_cas = pd.read_csv(cas_path, low_memory=False)
    raw_veh = pd.read_csv(veh_path, low_memory=False)

    print(f"  Loaded Collisions: {len(raw_col):,} rows")
    print(f"  Loaded Casualties: {len(raw_cas):,} rows")
    print(f"  Loaded Vehicles:   {len(raw_veh):,} rows")

    # 2. Clean Datasets
    print("\n[STEP 2/4] Executing modular cleaning rules...")
    clean_acc_df, acc_clean_report = clean_accidents(raw_col)
    valid_accident_ids = set(clean_acc_df["accident_index"].dropna().unique())

    clean_veh_df, veh_clean_report = clean_vehicles(raw_veh, valid_accident_ids)
    clean_cas_df, cas_clean_report = clean_casualties(raw_cas, valid_accident_ids)

    print(f"  Cleaned Accidents:  {len(clean_acc_df):,} rows (Duplicates dropped: {acc_clean_report['duplicates_removed']})")
    print(f"  Cleaned Vehicles:   {len(clean_veh_df):,} rows (Orphans removed: {veh_clean_report['orphans_removed']})")
    print(f"  Cleaned Casualties: {len(clean_cas_df):,} rows (Orphans removed: {cas_clean_report['orphans_removed']})")

    # 3. Feature Engineering & Reference Label Enrichment
    print("\n[STEP 3/4] Engineering features and decoding reference labels...")
    acc_final_df, acc_feat_report = enrich_accidents_features(clean_acc_df, clean_veh_df)
    veh_final_df, veh_feat_report = enrich_vehicles_features(clean_veh_df)
    cas_final_df, cas_feat_report = enrich_casualties_features(clean_cas_df)

    # 4. Standardize Column Orders & Export Processed CSVs
    print("\n[STEP 4/4] Writing clean CSVs to data/processed/...")
    acc_out_path = config.PROCESSED_DATA_DIR / "accidents_clean.csv"
    veh_out_path = config.PROCESSED_DATA_DIR / "vehicles_clean.csv"
    cas_out_path = config.PROCESSED_DATA_DIR / "casualties_clean.csv"

    acc_final_df.to_csv(acc_out_path, index=False)
    veh_final_df.to_csv(veh_out_path, index=False)
    cas_final_df.to_csv(cas_out_path, index=False)

    print(f"  Saved: {acc_out_path.name} ({len(acc_final_df):,} rows, {len(acc_final_df.columns)} cols)")
    print(f"  Saved: {veh_out_path.name} ({len(veh_final_df):,} rows, {len(veh_final_df.columns)} cols)")
    print(f"  Saved: {cas_out_path.name} ({len(cas_final_df):,} rows, {len(cas_final_df.columns)} cols)")

    # 5. Generate Quality & Transformation Report
    elapsed = round(time.time() - start_time, 2)
    quality_report = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "execution_time_seconds": elapsed,
        "row_counts": {
            "accidents": {
                "raw": len(raw_col),
                "cleaned": len(acc_final_df),
                "duplicates_dropped": acc_clean_report["duplicates_removed"],
                "valid_coordinates": int(acc_final_df["has_valid_coords"].sum()),
                "missing_or_invalid_coords": int((~acc_final_df["has_valid_coords"]).sum())
            },
            "vehicles": {
                "raw": len(raw_veh),
                "cleaned": len(veh_final_df),
                "orphans_removed": veh_clean_report["orphans_removed"]
            },
            "casualties": {
                "raw": len(raw_cas),
                "cleaned": len(cas_final_df),
                "orphans_removed": cas_clean_report["orphans_removed"]
            }
        },
        "target_distribution": {
            "is_severe_1_fatal_or_serious": int(acc_final_df["is_severe"].sum()),
            "is_severe_0_slight": int((acc_final_df["is_severe"] == 0).sum()),
            "severe_percentage": round(float(acc_final_df["is_severe"].mean() * 100), 2)
        },
        "vehicle_involvement_flags": {
            "involves_motorcycle": int(acc_final_df["involves_motorcycle"].sum()),
            "involves_hgv": int(acc_final_df["involves_hgv"].sum()),
            "involves_cyclist": int(acc_final_df["involves_cyclist"].sum())
        },
        "time_period_distribution": acc_final_df["time_period"].value_counts().to_dict(),
        "cleaning_details": {
            "accidents": acc_clean_report,
            "vehicles": veh_clean_report,
            "casualties": cas_clean_report
        }
    }

    report_path = config.PROCESSED_DATA_DIR / "quality_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(quality_report, f, indent=2)
    print(f"  Saved quality report: {report_path.name}")

    print("\n" + "=" * 75)
    print(f"[SUCCESS] Preprocessing pipeline completed in {elapsed}s.")
    print("=" * 75)
    return True


if __name__ == "__main__":
    success = run_preprocessing_pipeline()
    if not success:
        sys.exit(1)
