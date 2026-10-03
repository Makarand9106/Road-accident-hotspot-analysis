"""
PostgreSQL Database Schema and Seed Runner.
Executes schema.sql, constraints.sql, seed.sql, and indexes.sql using psycopg2.
Supports database creation, resetting, and isolated index creation.
"""

import argparse
import sys
import time
from pathlib import Path
import psycopg2
from psycopg2 import sql
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Add repo root to sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(REPO_ROOT))

import python.config as config


def get_admin_connection():
    """Connect to default 'postgres' database to manage databases."""
    params = {
        "host": config.DB_HOST,
        "port": config.DB_PORT,
        "user": config.DB_USER,
        "database": "postgres"
    }
    if config.DB_PASSWORD:
        params["password"] = config.DB_PASSWORD
    return psycopg2.connect(**params)


def get_app_connection():
    """Connect to the project 'road_safety' database."""
    params = {
        "host": config.DB_HOST,
        "port": config.DB_PORT,
        "user": config.DB_USER,
        "database": config.DB_NAME
    }
    if config.DB_PASSWORD:
        params["password"] = config.DB_PASSWORD
    return psycopg2.connect(**params)


def ensure_database_exists():
    """Check if project database exists; if not, create it."""
    print(f"Checking if database '{config.DB_NAME}' exists on {config.DB_HOST}:{config.DB_PORT}...")
    try:
        conn = get_admin_connection()
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s;", (config.DB_NAME,))
        exists = cursor.fetchone()

        if not exists:
            print(f"Creating database '{config.DB_NAME}'...")
            cursor.execute(sql.SQL("CREATE DATABASE {};").format(sql.Identifier(config.DB_NAME)))
            print(f"Database '{config.DB_NAME}' created successfully.")
        else:
            print(f"Database '{config.DB_NAME}' already exists.")

        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"[ERROR] Failed checking/creating database: {e}")
        return False


def execute_sql_file(file_path: Path, conn) -> bool:
    """Execute SQL statements from a file in the active connection."""
    if not file_path.exists():
        print(f"[ERROR] SQL file not found: {file_path}")
        return False

    print(f"Executing: {file_path.name}...")
    start = time.time()
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            sql_content = f.read()

        with conn.cursor() as cursor:
            cursor.execute(sql_content)
        conn.commit()
        print(f"  -> Completed {file_path.name} in {time.time() - start:.3f}s")
        return True
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Executing {file_path.name}: {e}")
        return False


def print_table_and_seed_summary(conn):
    """Print summary of created tables, constraints, and seeded row counts."""
    print("\n" + "=" * 70)
    print(f"POSTGRESQL SCHEMA SUMMARY ({config.DB_NAME})")
    print("=" * 70)

    with conn.cursor() as cursor:
        # 1. List user tables
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """)
        tables = [row[0] for row in cursor.fetchall()]

        print(f"{'Table Name':<30} | {'Row Count':<12} | {'Table Type':<15}")
        print("-" * 62)

        lookup_tables = {
            "severity", "police_force", "local_authority_district", "weather_condition",
            "road_surface_condition", "light_condition", "road_type", "junction_detail",
            "junction_control", "road_class", "urban_rural_area", "vehicle_type", "casualty_class"
        }

        for table in tables:
            cursor.execute(sql.SQL("SELECT COUNT(*) FROM {};").format(sql.Identifier(table)))
            count = cursor.fetchone()[0]
            ttype = "Lookup / Dim" if table in lookup_tables else "Fact / Entity"
            print(f"{table:<30} | {count:<12,} | {ttype:<15}")

        # 2. Count constraints
        cursor.execute("""
            SELECT constraint_type, COUNT(*)
            FROM information_schema.table_constraints
            WHERE table_schema = 'public'
            GROUP BY constraint_type
            ORDER BY constraint_type;
        """)
        constraints = cursor.fetchall()
        print("\nConstraints Summary:")
        for ctype, count in constraints:
            print(f"  - {ctype:<20}: {count}")

        # 3. Count indexes
        cursor.execute("""
            SELECT COUNT(*)
            FROM pg_indexes
            WHERE schemaname = 'public';
        """)
        idx_count = cursor.fetchone()[0]
        print(f"  - Total Indexes       : {idx_count}")

    print("=" * 70)


def run_database_pipeline(reset: bool = False, with_indexes: bool = False, indexes_only: bool = False, with_views: bool = False, views_only: bool = False):
    """Main database setup controller."""
    if not ensure_database_exists():
        sys.exit(1)

    conn = get_app_connection()

    schema_file = config.DATABASE_DIR / "schema.sql"
    constraints_file = config.DATABASE_DIR / "constraints.sql"
    seed_file = config.DATABASE_DIR / "seed.sql"
    indexes_file = config.DATABASE_DIR / "indexes.sql"
    views_file = config.DATABASE_DIR / "views.sql"

    if indexes_only:
        print("\n[INDEXES ONLY] Executing database/indexes.sql...")
        ok = execute_sql_file(indexes_file, conn)
        conn.close()
        return ok

    if views_only:
        print("\n[VIEWS ONLY] Executing database/views.sql...")
        ok = execute_sql_file(views_file, conn)
        conn.close()
        return ok

    print(f"\n--- Initializing Database: {config.DB_NAME} (Reset={reset}) ---")

    # 1. Schema DDL
    if not execute_sql_file(schema_file, conn):
        conn.close()
        return False

    # 2. Constraints DDL
    if not execute_sql_file(constraints_file, conn):
        conn.close()
        return False

    # 3. Reference Seed Data
    if not execute_sql_file(seed_file, conn):
        conn.close()
        return False

    # 4. Optional Indexes
    if with_indexes:
        if not execute_sql_file(indexes_file, conn):
            conn.close()
            return False

    # 5. Optional Views
    if with_views:
        if not execute_sql_file(views_file, conn):
            conn.close()
            return False

    # Summary
    print_table_and_seed_summary(conn)
    conn.close()
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PostgreSQL Database Runner for Road Safety Project")
    parser.add_argument("--reset", action="store_true", help="Recreate schema, constraints, and seed lookups")
    parser.add_argument("--with-indexes", action="store_true", help="Build performance indexes immediately")
    parser.add_argument("--indexes-only", action="store_true", help="Run only indexes.sql")
    parser.add_argument("--with-views", action="store_true", help="Create analytical views and materialized views")
    parser.add_argument("--views-only", action="store_true", help="Run only views.sql")

    args = parser.parse_args()
    success = run_database_pipeline(
        reset=args.reset,
        with_indexes=args.with_indexes,
        indexes_only=args.indexes_only,
        with_views=args.with_views,
        views_only=args.views_only
    )
    if not success:
        sys.exit(1)
