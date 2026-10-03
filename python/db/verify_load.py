"""
Database Verification and Relational Integrity Suite.
Validates row count parity between CSVs and PostgreSQL, checks for orphan records,
validates column constraints, prints joined samples, and runs analytical sanity checks.
"""

import json
import sys
import time
from pathlib import Path
import pandas as pd
import psycopg2
from psycopg2.extras import DictCursor

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


def verify_row_counts(conn, df_acc, df_veh, df_cas):
    """Verify exact parity between processed CSVs and database tables."""
    print("\n" + "=" * 70)
    print("1. ROW COUNT PARITY VERIFICATION")
    print("=" * 70)

    tables = [
        ("accident", len(df_acc)),
        ("vehicle", len(df_veh)),
        ("casualty", len(df_cas))
    ]

    all_match = True
    with conn.cursor() as cur:
        for tbl, expected in tables:
            cur.execute(f"SELECT COUNT(*) FROM {tbl};")
            db_count = cur.fetchone()[0]
            diff = db_count - expected
            status = "PASSED" if diff == 0 else "FAILED"
            if diff != 0:
                all_match = False
            print(f"  [{status}] Table '{tbl}': Expected CSV = {expected:,} | DB = {db_count:,} (Diff: {diff})")

    return all_match


def verify_orphan_foreign_keys(conn):
    """Verify 0 orphan records across all relational foreign keys."""
    print("\n" + "=" * 70)
    print("2. ORPHAN FOREIGN KEY & REFERENTIAL INTEGRITY AUDIT")
    print("=" * 70)

    checks = [
        ("vehicle -> accident", "SELECT COUNT(*) FROM vehicle v LEFT JOIN accident a ON v.accident_index = a.accident_index WHERE a.accident_index IS NULL;"),
        ("casualty -> accident", "SELECT COUNT(*) FROM casualty c LEFT JOIN accident a ON c.accident_index = a.accident_index WHERE a.accident_index IS NULL;"),
        ("accident -> severity", "SELECT COUNT(*) FROM accident a LEFT JOIN severity s ON a.severity_id = s.severity_id WHERE s.severity_id IS NULL;"),
        ("casualty -> severity", "SELECT COUNT(*) FROM casualty c LEFT JOIN severity s ON c.severity_id = s.severity_id WHERE s.severity_id IS NULL;"),
        ("casualty -> casualty_class", "SELECT COUNT(*) FROM casualty c LEFT JOIN casualty_class cc ON c.casualty_class_id = cc.casualty_class_id WHERE c.casualty_class_id IS NOT NULL AND cc.casualty_class_id IS NULL;"),
        ("vehicle -> vehicle_type", "SELECT COUNT(*) FROM vehicle v LEFT JOIN vehicle_type vt ON v.vehicle_type_id = vt.vehicle_type_id WHERE v.vehicle_type_id IS NOT NULL AND vt.vehicle_type_id IS NULL;"),
        ("accident -> police_force", "SELECT COUNT(*) FROM accident a LEFT JOIN police_force pf ON a.police_force_id = pf.police_force_id WHERE a.police_force_id IS NOT NULL AND pf.police_force_id IS NULL;"),
        ("accident -> local_authority_district", "SELECT COUNT(*) FROM accident a LEFT JOIN local_authority_district lad ON a.district_id = lad.district_id WHERE a.district_id IS NOT NULL AND lad.district_id IS NULL;"),
        ("accident -> weather_condition", "SELECT COUNT(*) FROM accident a LEFT JOIN weather_condition wc ON a.weather_condition_id = wc.weather_condition_id WHERE a.weather_condition_id IS NOT NULL AND wc.weather_condition_id IS NULL;"),
        ("accident -> road_surface_condition", "SELECT COUNT(*) FROM accident a LEFT JOIN road_surface_condition rsc ON a.road_surface_condition_id = rsc.road_surface_condition_id WHERE a.road_surface_condition_id IS NOT NULL AND rsc.road_surface_condition_id IS NULL;"),
        ("accident -> light_condition", "SELECT COUNT(*) FROM accident a LEFT JOIN light_condition lc ON a.light_condition_id = lc.light_condition_id WHERE a.light_condition_id IS NOT NULL AND lc.light_condition_id IS NULL;"),
        ("accident -> road_type", "SELECT COUNT(*) FROM accident a LEFT JOIN road_type rt ON a.road_type_id = rt.road_type_id WHERE a.road_type_id IS NOT NULL AND rt.road_type_id IS NULL;"),
        ("accident -> road_class", "SELECT COUNT(*) FROM accident a LEFT JOIN road_class rc ON a.first_road_class_id = rc.road_class_id WHERE a.first_road_class_id IS NOT NULL AND rc.road_class_id IS NULL;"),
        ("accident -> junction_detail", "SELECT COUNT(*) FROM accident a LEFT JOIN junction_detail jd ON a.junction_detail_id = jd.junction_detail_id WHERE a.junction_detail_id IS NOT NULL AND jd.junction_detail_id IS NULL;"),
        ("accident -> junction_control", "SELECT COUNT(*) FROM accident a LEFT JOIN junction_control jc ON a.junction_control_id = jc.junction_control_id WHERE a.junction_control_id IS NOT NULL AND jc.junction_control_id IS NULL;"),
        ("accident -> urban_rural_area", "SELECT COUNT(*) FROM accident a LEFT JOIN urban_rural_area ur ON a.urban_rural_id = ur.urban_rural_id WHERE a.urban_rural_id IS NOT NULL AND ur.urban_rural_id IS NULL;")
    ]

    all_clean = True
    with conn.cursor() as cur:
        for desc, sql in checks:
            cur.execute(sql)
            orphan_count = cur.fetchone()[0]
            status = "PASSED" if orphan_count == 0 else "FAILED"
            if orphan_count > 0:
                all_clean = False
            print(f"  [{status}] {desc}: {orphan_count:,} orphan rows")

    return all_clean


def verify_required_null_constraints(conn):
    """Verify NOT NULL constraints on mandatory columns."""
    print("\n" + "=" * 70)
    print("3. NOT-NULL INTEGRITY & CONSTRAINT COMPLIANCE")
    print("=" * 70)

    required_cols = [
        ("accident", "accident_index"),
        ("accident", "accident_year"),
        ("accident", "accident_date"),
        ("accident", "severity_id"),
        ("accident", "is_severe"),
        ("accident", "is_weekend"),
        ("accident", "number_of_vehicles"),
        ("accident", "number_of_casualties"),
        ("accident", "has_valid_coords"),
        ("vehicle", "vehicle_id"),
        ("vehicle", "accident_index"),
        ("vehicle", "vehicle_reference"),
        ("casualty", "casualty_id"),
        ("casualty", "accident_index"),
        ("casualty", "casualty_reference"),
        ("casualty", "severity_id")
    ]

    all_valid = True
    with conn.cursor() as cur:
        for tbl, col in required_cols:
            cur.execute(f"SELECT COUNT(*) FROM {tbl} WHERE {col} IS NULL;")
            null_count = cur.fetchone()[0]
            status = "PASSED" if null_count == 0 else "FAILED"
            if null_count > 0:
                all_valid = False
            print(f"  [{status}] Table '{tbl}' column '{col}': {null_count:,} NULLs")

    # Also verify coordinate constraint: when has_valid_coords is false, coords are NULL
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM accident WHERE has_valid_coords = FALSE AND (latitude IS NOT NULL OR longitude IS NOT NULL);")
        invalid_coord_violations = cur.fetchone()[0]
        status = "PASSED" if invalid_coord_violations == 0 else "FAILED"
        print(f"  [{status}] Coordinate Invariant (has_valid_coords=FALSE implies lat/lon NULL): {invalid_coord_violations:,} violations")
        if invalid_coord_violations > 0:
            all_valid = False

    return all_valid


def print_sample_joined_rows(conn):
    """Retrieve and display 5 comprehensive joined relational records."""
    print("\n" + "=" * 70)
    print("4. SAMPLE 5 JOINED RELATIONAL RECORDS (ACCIDENT + VEHICLE + CASUALTY + LOOKUPS)")
    print("=" * 70)

    query = """
    SELECT 
        a.accident_index,
        a.accident_date,
        a.accident_time,
        s.severity_name,
        lad.district_name,
        pf.police_force_name,
        wc.weather_condition_name,
        rsc.road_surface_condition_name,
        lc.light_condition_name,
        a.speed_limit,
        v.vehicle_reference,
        vt.vehicle_type_name,
        c.casualty_reference,
        cc.casualty_class_name,
        cs.severity_name AS casualty_severity
    FROM accident a
    JOIN severity s ON a.severity_id = s.severity_id
    LEFT JOIN local_authority_district lad ON a.district_id = lad.district_id
    LEFT JOIN police_force pf ON a.police_force_id = pf.police_force_id
    LEFT JOIN weather_condition wc ON a.weather_condition_id = wc.weather_condition_id
    LEFT JOIN road_surface_condition rsc ON a.road_surface_condition_id = rsc.road_surface_condition_id
    LEFT JOIN light_condition lc ON a.light_condition_id = lc.light_condition_id
    JOIN vehicle v ON a.accident_index = v.accident_index
    LEFT JOIN vehicle_type vt ON v.vehicle_type_id = vt.vehicle_type_id
    JOIN casualty c ON a.accident_index = c.accident_index
    LEFT JOIN casualty_class cc ON c.casualty_class_id = cc.casualty_class_id
    JOIN severity cs ON c.severity_id = cs.severity_id
    LIMIT 5;
    """

    with conn.cursor(cursor_factory=DictCursor) as cur:
        cur.execute(query)
        rows = cur.fetchall()
        for idx, r in enumerate(rows, 1):
            print(f"\n--- [Sample Row {idx}] Collision Index: {r['accident_index']} ---")
            print(f"  Date & Time:      {r['accident_date']} at {r['accident_time']}")
            print(f"  Severity:         {r['severity_name']} (Speed Limit: {r['speed_limit']} mph)")
            print(f"  Location:         District: {r['district_name']} | Police: {r['police_force_name']}")
            print(f"  Environment:      Weather: {r['weather_condition_name']} | Surface: {r['road_surface_condition_name']} | Light: {r['light_condition_name']}")
            print(f"  Vehicle Involved: Ref #{r['vehicle_reference']} ({r['vehicle_type_name']})")
            print(f"  Casualty Record:  Ref #{r['casualty_reference']} ({r['casualty_class_name']} - {r['casualty_severity']})")


def run_sanity_queries(conn, quality_report):
    """Run analytical sanity checks and cross-verify with quality report."""
    print("\n" + "=" * 70)
    print("5. ANALYTICAL SANITY QUERIES & QUALITY REPORT CROSS-VALIDATION")
    print("=" * 70)

    # 1. Collisions per year
    print("\n[Query 1] Collisions per Year:")
    with conn.cursor() as cur:
        cur.execute("SELECT accident_year, COUNT(*) FROM accident GROUP BY accident_year ORDER BY accident_year;")
        db_years = cur.fetchall()
        total_coll = sum(c for _, c in db_years)
        for year, count in db_years:
            pct = round(count * 100.0 / total_coll, 2)
            print(f"  Year {year}: {count:,} collisions ({pct}%)")

    # 2. Severity distribution and target cross-validation
    print("\n[Query 2] Collision Severity Distribution & Target Invariant:")
    with conn.cursor() as cur:
        cur.execute("""
            SELECT s.severity_name, COUNT(*), ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2)
            FROM accident a
            JOIN severity s ON a.severity_id = s.severity_id
            GROUP BY s.severity_id, s.severity_name
            ORDER BY s.severity_id;
        """)
        db_severity = cur.fetchall()

    target_dist = quality_report.get("target_distribution", {})
    expected_slight = target_dist.get("is_severe_0_slight", 389435)
    expected_severe = target_dist.get("is_severe_1_fatal_or_serious", 124366)

    severe_sum = 0
    slight_sum = 0
    for sev_name, count, pct in db_severity:
        if sev_name in ["Fatal", "Serious"]:
            severe_sum += count
        elif sev_name == "Slight":
            slight_sum += count
        print(f"  {sev_name:8s}: {count:,} ({pct}%)")

    slight_match = "MATCH" if slight_sum == expected_slight else f"MISMATCH ({expected_slight})"
    severe_match = "MATCH" if severe_sum == expected_severe else f"MISMATCH ({expected_severe})"
    print(f"  --> Cross-Check Slight (Target=0): {slight_sum:,} [{slight_match}]")
    print(f"  --> Cross-Check Severe (Target=1): {severe_sum:,} [{severe_match}]")

    # 3. Top 5 Districts
    print("\n[Query 3] Top 5 Local Authority Districts by Collision Count:")
    with conn.cursor() as cur:
        cur.execute("""
            SELECT COALESCE(lad.district_name, 'Unassigned / District Code ' || a.district_id::text), COUNT(*) AS total_accidents
            FROM accident a
            LEFT JOIN local_authority_district lad ON a.district_id = lad.district_id
            WHERE a.district_id IS NOT NULL
            GROUP BY lad.district_name, a.district_id
            ORDER BY total_accidents DESC
            LIMIT 5;
        """)
        top_districts = cur.fetchall()
        for rank, (d_name, total) in enumerate(top_districts, 1):
            print(f"  #{rank}: {d_name} - {total:,} collisions")


def run_full_verification():
    """Execute end-to-end verification suite."""
    print("=" * 70)
    print("STATS19 PostgreSQL Relational Integrity & Quality Verification")
    print("=" * 70)

    acc_path = config.PROCESSED_DATA_DIR / "accidents_clean.csv"
    veh_path = config.PROCESSED_DATA_DIR / "vehicles_clean.csv"
    cas_path = config.PROCESSED_DATA_DIR / "casualties_clean.csv"
    qr_path = config.PROCESSED_DATA_DIR / "quality_report.json"

    print("Loading processed CSVs and quality report for baseline comparison...")
    df_acc = pd.read_csv(acc_path, low_memory=False)
    df_veh = pd.read_csv(veh_path, low_memory=False)
    df_cas = pd.read_csv(cas_path, low_memory=False)

    quality_report = {}
    if qr_path.exists():
        with open(qr_path, "r", encoding="utf-8") as f:
            quality_report = json.load(f)

    conn = get_connection()

    v1 = verify_row_counts(conn, df_acc, df_veh, df_cas)
    v2 = verify_orphan_foreign_keys(conn)
    v3 = verify_required_null_constraints(conn)
    print_sample_joined_rows(conn)
    run_sanity_queries(conn, quality_report)

    conn.close()

    print("\n" + "=" * 70)
    if v1 and v2 and v3:
        print("[ALL CHECKS PASSED] Database load is completely verified and integral.")
        print("=" * 70)
    else:
        print("[VERIFICATION FAILED] One or more integrity checks failed.")
        print("=" * 70)
        sys.exit(1)


if __name__ == "__main__":
    run_full_verification()
