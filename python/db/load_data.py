"""
High-Performance Bulk Data Loader for STATS19 Database.
Loads accidents, vehicles, and casualties into PostgreSQL using COPY within a single atomic transaction.
Builds performance indexes and runs ANALYZE post-load.
"""

import argparse
import io
import sys
import time
from pathlib import Path
import numpy as np
import pandas as pd
import psycopg2

# Add repo root to sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(REPO_ROOT))

import python.config as config


def get_connection():
    """Create psycopg2 connection using config parameters."""
    params = {
        "host": config.DB_HOST,
        "port": config.DB_PORT,
        "user": config.DB_USER,
        "database": config.DB_NAME
    }
    if config.DB_PASSWORD:
        params["password"] = config.DB_PASSWORD
    return psycopg2.connect(**params)


def truncate_fact_tables(conn):
    """Truncate fact and child tables in dependency order."""
    print("Truncating existing data in casualty, vehicle, accident tables...")
    with conn.cursor() as cur:
        cur.execute("TRUNCATE TABLE casualty, vehicle, accident CASCADE;")
    conn.commit()
    print("  -> Tables truncated successfully.")


def prepare_accident_copy_buffer(df_acc: pd.DataFrame) -> io.StringIO:
    """Format and clean accidents dataframe for COPY into accident table."""
    print("  Preparing accidents COPY buffer...")
    df = pd.DataFrame()
    df["accident_index"] = df_acc["accident_index"].astype(str)
    df["accident_reference"] = df_acc["accident_reference"].where(df_acc["accident_reference"].notna(), None)
    df["accident_year"] = df_acc["accident_year"].astype("Int64")
    df["accident_date"] = df_acc["accident_date"].astype(str)
    df["accident_time"] = df_acc["time"].where(df_acc["time"].notna(), None)
    df["hour"] = df_acc["hour"].astype("Int64")
    df["month"] = df_acc["month"].astype("Int64")
    df["day_of_week_name"] = df_acc["day_of_week_name"].where(df_acc["day_of_week_name"].notna(), None)
    df["is_weekend"] = df_acc["is_weekend"].astype("Int64")
    df["time_period"] = df_acc["time_period"].where(df_acc["time_period"].notna(), None)
    df["severity_id"] = df_acc["accident_severity"].astype("Int64")
    df["is_severe"] = df_acc["is_severe"].astype("Int64")

    # Coordinates handling: keep NULL when has_valid_coords is False
    valid_coords_mask = df_acc["has_valid_coords"].fillna(False).astype(bool)
    invalid_coords_count = (~valid_coords_mask).sum()
    print(f"    [Constraint Rule] Invalid coordinates: {invalid_coords_count:,} rows kept with NULL lat/lon/easting/northing (has_valid_coords = FALSE).")

    df["latitude"] = np.where(valid_coords_mask, df_acc["latitude"], np.nan)
    df["longitude"] = np.where(valid_coords_mask, df_acc["longitude"], np.nan)
    df["easting"] = np.where(valid_coords_mask, df_acc["location_easting_osgr"], np.nan)
    df["northing"] = np.where(valid_coords_mask, df_acc["location_northing_osgr"], np.nan)
    df["has_valid_coords"] = valid_coords_mask

    # Foreign Keys & Lookups (cast to nullable Int64 to avoid float formatting in COPY)
    df["police_force_id"] = df_acc["police_force"].astype("Int64")
    df["district_id"] = df_acc["local_authority_district"].astype("Int64")
    df["weather_condition_id"] = df_acc["weather_conditions"].astype("Int64")
    df["road_surface_condition_id"] = df_acc["road_surface_conditions"].astype("Int64")
    df["light_condition_id"] = df_acc["light_conditions"].astype("Int64")
    df["road_type_id"] = df_acc["road_type"].astype("Int64")
    df["first_road_class_id"] = df_acc["first_road_class"].astype("Int64")
    df["junction_detail_id"] = df_acc["junction_detail"].astype("Int64")
    df["junction_control_id"] = df_acc["junction_control"].astype("Int64")
    df["urban_rural_id"] = df_acc["urban_or_rural_area"].astype("Int64")

    # Speed limit: only valid UK speed limits [20, 30, 40, 50, 60, 70], otherwise NULL
    valid_speed = df_acc["speed_limit"].isin([20, 30, 40, 50, 60, 70])
    invalid_speed_count = (~valid_speed).sum()
    print(f"    [Constraint Rule] Non-standard speed limits: {invalid_speed_count:,} rows mapped to NULL speed_limit.")
    df["speed_limit"] = pd.Series(np.where(valid_speed, df_acc["speed_limit"], np.nan), dtype="Int64")

    # Counts and flags
    df["number_of_vehicles"] = df_acc["number_of_vehicles"].fillna(1).astype("Int64")
    df["number_of_casualties"] = df_acc["number_of_casualties"].fillna(1).astype("Int64")
    df["involves_motorcycle"] = df_acc["involves_motorcycle"].fillna(0).astype("Int64")
    df["involves_hgv"] = df_acc["involves_hgv"].fillna(0).astype("Int64")
    df["involves_cyclist"] = df_acc["involves_cyclist"].fillna(0).astype("Int64")
    df["hotspot_id"] = pd.Series([np.nan] * len(df_acc), dtype="Int64")

    buf = io.StringIO()
    df.to_csv(buf, index=False, header=False, na_rep="\\N", sep="\t")
    buf.seek(0)
    return buf


def prepare_vehicle_copy_buffer(df_veh: pd.DataFrame) -> io.StringIO:
    """Format vehicles dataframe for COPY into vehicle table."""
    print("  Preparing vehicles COPY buffer...")
    df = pd.DataFrame()
    df["accident_index"] = df_veh["accident_index"].astype(str)
    df["vehicle_reference"] = df_veh["vehicle_reference"].astype("Int64")
    df["vehicle_type_id"] = df_veh["vehicle_type"].astype("Int64")

    buf = io.StringIO()
    df.to_csv(buf, index=False, header=False, na_rep="\\N", sep="\t")
    buf.seek(0)
    return buf


def prepare_casualty_copy_buffer(df_cas: pd.DataFrame) -> io.StringIO:
    """Format casualties dataframe for COPY into casualty table."""
    print("  Preparing casualties COPY buffer...")
    df = pd.DataFrame()
    df["accident_index"] = df_cas["accident_index"].astype(str)
    df["casualty_reference"] = df_cas["casualty_reference"].astype("Int64")
    df["casualty_class_id"] = df_cas["casualty_class"].astype("Int64")
    df["severity_id"] = df_cas["casualty_severity"].astype("Int64")

    buf = io.StringIO()
    df.to_csv(buf, index=False, header=False, na_rep="\\N", sep="\t")
    buf.seek(0)
    return buf


def build_indexes_and_analyze(conn):
    """Execute database/indexes.sql and run ANALYZE."""
    indexes_file = config.DATABASE_DIR / "indexes.sql"
    if not indexes_file.exists():
        print(f"[WARNING] {indexes_file} not found.")
        return

    print("\n" + "=" * 70)
    print("BUILDING PERFORMANCE INDEXES & RUNNING ANALYZE")
    print("=" * 70)

    start_idx = time.time()
    with open(indexes_file, "r", encoding="utf-8") as f:
        idx_sql = f.read()

    with conn.cursor() as cur:
        print("Creating indexes on populated tables...")
        cur.execute(idx_sql)
        conn.commit()
    print(f"  -> Indexes created in {time.time() - start_idx:.2f}s.")

    start_an = time.time()
    with conn.cursor() as cur:
        print("Running PostgreSQL optimizer ANALYZE...")
        cur.execute("ANALYZE accident; ANALYZE vehicle; ANALYZE casualty; ANALYZE hotspot;")
        conn.commit()
    print(f"  -> ANALYZE completed in {time.time() - start_an:.2f}s.")


def run_bulk_load(reset: bool = False):
    """Execute end-to-end atomic bulk load."""
    print("=" * 70)
    print("STATS19 PostgreSQL Bulk Data Loading Pipeline")
    print("=" * 70)
    total_start = time.time()

    acc_path = config.PROCESSED_DATA_DIR / "accidents_clean.csv"
    veh_path = config.PROCESSED_DATA_DIR / "vehicles_clean.csv"
    cas_path = config.PROCESSED_DATA_DIR / "casualties_clean.csv"

    if not acc_path.exists() or not veh_path.exists() or not cas_path.exists():
        print("[ERROR] Cleaned CSV files missing in data/processed/. Run preprocessing first.")
        sys.exit(1)

    print("\n[1/4] Loading processed CSV files into memory...")
    t0 = time.time()
    df_acc = pd.read_csv(acc_path, low_memory=False)
    df_veh = pd.read_csv(veh_path, low_memory=False)
    df_cas = pd.read_csv(cas_path, low_memory=False)
    print(f"  Loaded {len(df_acc):,} accidents, {len(df_veh):,} vehicles, {len(df_cas):,} casualties in {time.time() - t0:.2f}s.")

    conn = get_connection()

    if reset:
        truncate_fact_tables(conn)

    # Build memory buffers
    print("\n[2/4] Formatting in-memory buffers for PostgreSQL COPY...")
    t_buf = time.time()
    buf_acc = prepare_accident_copy_buffer(df_acc)
    buf_veh = prepare_vehicle_copy_buffer(df_veh)
    buf_cas = prepare_casualty_copy_buffer(df_cas)
    print(f"  Buffers prepared in {time.time() - t_buf:.2f}s.")

    # Execute atomic transaction
    print("\n[3/4] Executing atomic COPY transaction...")
    t_copy = time.time()
    try:
        with conn.cursor() as cur:
            # 1. Copy accidents
            print("  Copying accidents...")
            t_acc = time.time()
            cur.copy_expert("""
                COPY accident (
                    accident_index, accident_reference, accident_year, accident_date,
                    accident_time, hour, month, day_of_week_name, is_weekend, time_period,
                    severity_id, is_severe, latitude, longitude, easting, northing,
                    has_valid_coords, police_force_id, district_id, weather_condition_id,
                    road_surface_condition_id, light_condition_id, road_type_id,
                    first_road_class_id, junction_detail_id, junction_control_id,
                    urban_rural_id, speed_limit, number_of_vehicles, number_of_casualties,
                    involves_motorcycle, involves_hgv, involves_cyclist, hotspot_id
                ) FROM STDIN WITH (FORMAT text, NULL '\\N', DELIMITER '\t');
            """, buf_acc)
            print(f"    -> {len(df_acc):,} accidents loaded in {time.time() - t_acc:.2f}s.")

            # 2. Copy vehicles
            print("  Copying vehicles...")
            t_veh = time.time()
            cur.copy_expert("""
                COPY vehicle (
                    accident_index, vehicle_reference, vehicle_type_id
                ) FROM STDIN WITH (FORMAT text, NULL '\\N', DELIMITER '\t');
            """, buf_veh)
            print(f"    -> {len(df_veh):,} vehicles loaded in {time.time() - t_veh:.2f}s.")

            # 3. Copy casualties
            print("  Copying casualties...")
            t_cas = time.time()
            cur.copy_expert("""
                COPY casualty (
                    accident_index, casualty_reference, casualty_class_id, severity_id
                ) FROM STDIN WITH (FORMAT text, NULL '\\N', DELIMITER '\t');
            """, buf_cas)
            print(f"    -> {len(df_cas):,} casualties loaded in {time.time() - t_cas:.2f}s.")

        # Commit single atomic transaction
        conn.commit()
        print(f"\n[TRANSACTION COMMITTED] Total COPY time: {time.time() - t_copy:.2f}s.")

    except Exception as e:
        conn.rollback()
        print(f"\n[FATAL ERROR] Bulk load transaction failed: {e}")
        print("[TRANSACTION ROLLED BACK] No partial data committed.")
        conn.close()
        sys.exit(1)

    # Post-load index creation & optimizer analyze
    print("\n[4/4] Post-load indexing & statistics update...")
    build_indexes_and_analyze(conn)

    total_time = round(time.time() - total_start, 2)
    print("\n" + "=" * 70)
    print(f"[SUCCESS] Bulk database load completed in {total_time}s.")
    print("=" * 70)
    conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bulk Load STATS19 data into PostgreSQL")
    parser.add_argument("--reset", action="store_true", help="Truncate fact tables before loading")
    args = parser.parse_args()

    run_bulk_load(reset=args.reset)
