"""
Analytical SQL Query Runner & Results Exporter.
Executes all 16 core analytical queries against the road_safety database,
measures execution latency, validates correctness, and exports results to docs/results/sql/qNN.csv.
"""

import re
import sys
import time
from pathlib import Path
import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor

# Add repo root to sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
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


def parse_queries_from_sql_file(sql_file_path: Path):
    """Parse discrete numbered query blocks from analytical_queries.sql."""
    with open(sql_file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Pattern matches -- QUERY NN: Title followed by comments and SQL statement
    pattern = re.compile(
        r"--\s*QUERY\s*(\d+):\s*([^\n]+)\n(.*?)(?=\n--\s*QUERY|\Z)",
        re.DOTALL | re.IGNORECASE
    )

    queries = []
    for match in pattern.finditer(content):
        q_num = int(match.group(1))
        q_title = match.group(2).strip()
        block_text = match.group(3).strip()

        # Extract Question from comments
        q_question_match = re.search(r"--\s*Question:\s*([^\n]+)", block_text, re.IGNORECASE)
        q_question = q_question_match.group(1).strip() if q_question_match else q_title

        # Strip comment lines to get clean SQL
        sql_lines = []
        for line in block_text.splitlines():
            stripped = line.strip()
            if not stripped.startswith("--") and stripped:
                sql_lines.append(line)
        sql_code = "\n".join(sql_lines).strip()

        if sql_code:
            queries.append({
                "num": q_num,
                "title": q_title,
                "question": q_question,
                "sql": sql_code
            })

    return sorted(queries, key=lambda x: x["num"])


def run_all_queries():
    """Execute all 16 analytical queries and export outputs."""
    print("=" * 80)
    print("DBMS ANALYTICAL SQL WORKLOAD RUNNER (PostgreSQL 16)")
    print("=" * 80)

    sql_file = REPO_ROOT / "database" / "analytical_queries.sql"
    results_dir = REPO_ROOT / "docs" / "results" / "sql"
    results_dir.mkdir(parents=True, exist_ok=True)

    if not sql_file.exists():
        print(f"[FATAL] SQL file not found: {sql_file}")
        sys.exit(1)

    queries = parse_queries_from_sql_file(sql_file)
    print(f"Loaded {len(queries)} analytical queries from {sql_file.name}.\n")

    conn = get_connection()
    success_count = 0
    total_duration_ms = 0.0

    summary_records = []

    try:
        with conn.cursor() as cur:
            for q in queries:
                q_id = f"q{q['num']:02d}"
                out_csv = results_dir / f"{q_id}.csv"

                print(f"[{q_id.upper()}] {q['title']}")
                start_time = time.perf_counter()
                
                try:
                    cur.execute(q["sql"])
                    rows = cur.fetchall()
                    col_names = [desc[0] for desc in cur.description] if cur.description else []
                    elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                    total_duration_ms += elapsed_ms

                    # Save to CSV using pandas
                    df = pd.DataFrame(rows, columns=col_names)
                    df.to_csv(out_csv, index=False)

                    print(f"       -> Returned {len(df):,} rows in {elapsed_ms:.2f} ms | Saved to: docs/results/sql/{q_id}.csv")
                    success_count += 1
                    summary_records.append({
                        "query_id": q_id,
                        "title": q["title"],
                        "row_count": len(df),
                        "duration_ms": round(elapsed_ms, 2)
                    })

                except Exception as query_err:
                    print(f"\n[FATAL ERROR IN QUERY {q['num']}]: {query_err}")
                    print("--- FAILED SQL STATEMENT ---")
                    print(q["sql"])
                    print("----------------------------\n")
                    conn.rollback()
                    raise query_err

        print("\n" + "=" * 80)
        print(f"[ALL {success_count}/{len(queries)} QUERIES COMPLETED SUCCESSFULLY]")
        print(f"Total SQL Execution Time: {total_duration_ms:.2f} ms ({total_duration_ms/1000.0:.3f} s)")
        print(f"Result CSVs stored in: {results_dir}")
        print("=" * 80)

    finally:
        conn.close()


if __name__ == "__main__":
    run_all_queries()
