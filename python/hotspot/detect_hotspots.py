"""
Accident Hotspot Detection, Multi-Criteria Risk Scoring, and Database Synchronization.
Executes spatial DBSCAN on British National Grid metre coordinates (EPSG:27700),
calculates multi-criteria risk scores, synchronizes PostgreSQL tables inside an atomic transaction,
and generates methodology figures.
"""

import argparse
import io
import sys
import time
from pathlib import Path
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import psycopg2
from scipy.stats import spearmanr
from sklearn.cluster import DBSCAN

# Add repo root to sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(REPO_ROOT))

import python.config as config
from python.analysis.db_access import query_df
import python.visualization.eda_plots as plots


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


def detect_clusters(df: pd.DataFrame, eps_m: float = 150.0, min_samples: int = 30) -> pd.Series:
    """Run DBSCAN on projected easting and northing coordinates."""
    print(f"\n[1/5] Executing DBSCAN clustering (eps={eps_m}m, min_samples={min_samples}, kd_tree)...")
    t0 = time.time()
    coords = df[["easting", "northing"]].to_numpy(dtype=np.float64)

    db = DBSCAN(
        eps=eps_m,
        min_samples=min_samples,
        metric="euclidean",
        algorithm="kd_tree",
        n_jobs=-1
    ).fit(coords)

    labels = db.labels_
    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    n_clustered = (labels != -1).sum()
    pct_clustered = n_clustered * 100.0 / len(labels)

    print(f"      -> Discovered {n_clusters:,} dense spatial clusters in {time.time() - t0:.2f}s.")
    print(f"      -> {n_clustered:,} / {len(labels):,} collisions ({pct_clustered:.2f}%) assigned to hotspots.")
    return labels


def compute_hotspot_metrics(df: pd.DataFrame, labels: np.ndarray) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """Compute physical dimensions, temporal trends, and multi-criteria risk scores for each cluster."""
    print("\n[2/5] Computing cluster geometries, trend slopes, and multi-criteria risk scores...")
    t0 = time.time()
    df_valid = df.copy()
    df_valid["cluster_label"] = labels

    clustered_df = df_valid[df_valid["cluster_label"] != -1]
    clusters = []

    # Map cluster metrics
    for label, group in clustered_df.groupby("cluster_label"):
        acc_count = len(group)
        centre_lat = float(group["latitude"].mean())
        centre_lon = float(group["longitude"].mean())
        centre_e = float(group["easting"].mean())
        centre_n = float(group["northing"].mean())

        # Radius in metres
        dists = np.sqrt((group["easting"] - centre_e) ** 2 + (group["northing"] - centre_n) ** 2)
        radius_m = max(1.0, float(dists.max()))

        # Severity breakdown
        fatal_cnt = int((group["severity_id"] == 1).sum())
        serious_cnt = int((group["severity_id"] == 2).sum())
        slight_cnt = int((group["severity_id"] == 3).sum())
        severe_ratio = (fatal_cnt + serious_cnt) / acc_count

        # Annual trend slope (2021-2025, centered x = [-2, -1, 0, 1, 2], excluding anomalous 2020)
        yr_counts = group["accident_year"].value_counts()
        y_vals = np.array([yr_counts.get(y, 0) for y in [2021, 2022, 2023, 2024, 2025]], dtype=float)
        x_centered = np.array([-2, -1, 0, 1, 2], dtype=float)
        slope = float(np.sum(x_centered * y_vals) / 10.0)

        # Mode district if present
        valid_districts = group["district_id"].dropna()
        mode_district = int(valid_districts.mode()[0]) if len(valid_districts) > 0 else None

        clusters.append({
            "temp_cluster_id": label,
            "centre_lat": round(centre_lat, 6),
            "centre_lon": round(centre_lon, 6),
            "radius_m": round(radius_m, 2),
            "accident_count": acc_count,
            "fatal_count": fatal_cnt,
            "serious_count": serious_cnt,
            "slight_count": slight_cnt,
            "severe_ratio": round(severe_ratio, 4),
            "trend_slope": round(slope, 4),
            "first_year": int(group["accident_year"].min()),
            "last_year": int(group["accident_year"].max()),
            "nearest_district_id": mode_district,
            "freq_val": acc_count / 5.0
        })

    df_hotspots = pd.DataFrame(clusters)

    # -------------------------------------------------------------------------
    # Multi-Criteria Percentile Ranking
    # -------------------------------------------------------------------------
    df_hotspots["F"] = df_hotspots["freq_val"].rank(pct=True)
    df_hotspots["S"] = df_hotspots["severe_ratio"].rank(pct=True)
    df_hotspots["T"] = df_hotspots["trend_slope"].rank(pct=True)

    df_hotspots["frequency_score"] = (df_hotspots["F"] * 100.0).round(2)
    df_hotspots["severity_score"] = (df_hotspots["S"] * 100.0).round(2)
    df_hotspots["trend_score"] = (df_hotspots["T"] * 100.0).round(2)

    # Composite Risk Score: Equal weighting 100 * (F + S + T) / 3
    df_hotspots["risk_score"] = (100.0 * (df_hotspots["F"] + df_hotspots["S"] + df_hotspots["T"]) / 3.0).round(2)

    # Relative Risk Tiers (Top 20% High, next 30% Medium, bottom 50% Low)
    q80 = df_hotspots["risk_score"].quantile(0.80)
    q50 = df_hotspots["risk_score"].quantile(0.50)
    df_hotspots["risk_level"] = np.where(
        df_hotspots["risk_score"] >= q80, "High",
        np.where(df_hotspots["risk_score"] >= q50, "Medium", "Low")
    )

    # Weight Sensitivity Testing
    score_f_heavy = 100.0 * (0.5 * df_hotspots["F"] + 0.3 * df_hotspots["S"] + 0.2 * df_hotspots["T"])
    score_t_heavy = 100.0 * (0.2 * df_hotspots["F"] + 0.3 * df_hotspots["S"] + 0.5 * df_hotspots["T"])
    rho_f, _ = spearmanr(df_hotspots["risk_score"], score_f_heavy)
    rho_t, _ = spearmanr(df_hotspots["risk_score"], score_t_heavy)

    # Diameter Flag (> 1.5 km)
    large_clusters = (df_hotspots["radius_m"] * 2 > 1500).sum()

    print(f"      -> Processed {len(df_hotspots):,} clusters in {time.time() - t0:.2f}s.")
    print(f"      -> Risk Level Distribution: {df_hotspots['risk_level'].value_counts().to_dict()}")
    print(f"      -> Weight Sensitivity Spearman Correlation: Equal vs F-Heavy (0.5/0.3/0.2) = {rho_f:.4f} | Equal vs T-Heavy (0.2/0.3/0.5) = {rho_t:.4f}")
    print(f"      -> Corridors with diameter > 1.5 km: {large_clusters} clusters flagged.")

    return df_hotspots, df_valid[["accident_index", "cluster_label"]]


def sync_hotspots_to_database(df_hotspots: pd.DataFrame, df_acc_links: pd.DataFrame):
    """Truncate hotspot table, insert new hotspots, and update accident.hotspot_id in one atomic transaction."""
    print("\n[3/5] Synchronizing hotspot records and linking collisions in PostgreSQL...")
    t0 = time.time()
    conn = get_connection()

    try:
        with conn.cursor() as cur:
            # 1. Clear existing assignments
            print("      -> Clearing existing hotspot foreign keys on accident table...")
            cur.execute("UPDATE accident SET hotspot_id = NULL WHERE hotspot_id IS NOT NULL;")
            cur.execute("DELETE FROM hotspot;")
            cur.execute("ALTER SEQUENCE hotspot_hotspot_id_seq RESTART WITH 1;")

            # 2. Insert hotspots and retrieve database-generated hotspot_id
            print(f"      -> Inserting {len(df_hotspots):,} hotspot records into database...")
            insert_sql = """
                INSERT INTO hotspot (
                    centre_lat, centre_lon, radius_m, accident_count,
                    fatal_count, serious_count, slight_count, severe_ratio,
                    trend_slope, frequency_score, severity_score, trend_score,
                    risk_score, risk_level, nearest_district_id, first_year, last_year
                ) VALUES (
                    %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s, %s, %s
                ) RETURNING hotspot_id;
            """
            hotspot_id_map = {}
            for _, r in df_hotspots.iterrows():
                nearest_dist = int(r["nearest_district_id"]) if pd.notna(r["nearest_district_id"]) else None
                cur.execute(insert_sql, (
                    float(r["centre_lat"]), float(r["centre_lon"]), float(r["radius_m"]), int(r["accident_count"]),
                    int(r["fatal_count"]), int(r["serious_count"]), int(r["slight_count"]), float(r["severe_ratio"]),
                    float(r["trend_slope"]), float(r["frequency_score"]), float(r["severity_score"]), float(r["trend_score"]),
                    float(r["risk_score"]), str(r["risk_level"]), nearest_dist,
                    int(r["first_year"]), int(r["last_year"])
                ))
                new_id = cur.fetchone()[0]
                hotspot_id_map[r["temp_cluster_id"]] = new_id

            # 3. Bulk update accident.hotspot_id using temporary staging table + COPY
            print(f"      -> Linking member collisions to assigned hotspot_ids via staging COPY...")
            cur.execute("CREATE TEMP TABLE temp_accident_hotspot_link (accident_index VARCHAR(32) PRIMARY KEY, hotspot_id INT) ON COMMIT DROP;")

            # Filter clustered collisions
            clustered_links = df_acc_links[df_acc_links["cluster_label"] != -1].copy()
            clustered_links["hotspot_id"] = clustered_links["cluster_label"].map(hotspot_id_map)

            buf = io.StringIO()
            clustered_links[["accident_index", "hotspot_id"]].to_csv(buf, index=False, header=False, sep="\t")
            buf.seek(0)

            cur.copy_expert("COPY temp_accident_hotspot_link (accident_index, hotspot_id) FROM STDIN WITH (FORMAT text, DELIMITER '\t');", buf)

            # Fast JOIN UPDATE
            cur.execute("""
                UPDATE accident a
                SET hotspot_id = t.hotspot_id
                FROM temp_accident_hotspot_link t
                WHERE a.accident_index = t.accident_index;
            """)

            # 4. Refresh optimizer statistics
            cur.execute("ANALYZE hotspot; ANALYZE accident;")

        conn.commit()
        print(f"      -> Transaction COMMITTED. {len(clustered_links):,} accidents linked in {time.time() - t0:.2f}s.")

    except Exception as e:
        conn.rollback()
        print(f"[FATAL ERROR] Database hotspot sync failed: {e}")
        conn.close()
        raise e
    finally:
        conn.close()


def generate_methodology_figures(df_hotspots: pd.DataFrame):
    """Generate and save distribution and ranking figures for hotspot methodology report."""
    print("\n[4/5] Generating hotspot methodology figures...")
    fig_dir = REPO_ROOT / "docs" / "figures" / "hotspot"
    fig_dir.mkdir(parents=True, exist_ok=True)

    # 1. Cluster Size Distribution (02_cluster_size_distribution.png)
    fig, ax = plt.subplots(figsize=(9, 5))
    ax.hist(df_hotspots["accident_count"], bins=30, color="#0072B2", edgecolor="#FFFFFF", alpha=0.9)
    ax.set_title("Distribution of Collisions per Detected Hotspot Cluster", fontsize=12, fontweight="bold", pad=12)
    ax.set_xlabel("Number of Collisions in Hotspot", fontsize=11, fontweight="bold")
    ax.set_ylabel("Number of Hotspots (Frequency)", fontsize=11, fontweight="bold")
    ax.axvline(df_hotspots["accident_count"].median(), color="#D55E00", linestyle="--", label=f"Median: {df_hotspots['accident_count'].median():.0f} crashes")
    ax.axvline(df_hotspots["accident_count"].mean(), color="#009E73", linestyle="-.", label=f"Mean: {df_hotspots['accident_count'].mean():.1f} crashes")
    ax.legend(frameon=True, facecolor="#FAFAFA")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    plots.save_figure(fig, fig_dir / "02_cluster_size_distribution.png")

    # 2. Risk Score Distribution (03_risk_score_distribution.png)
    fig, ax = plt.subplots(figsize=(9, 5))
    n_bins, bins, patches = ax.hist(df_hotspots["risk_score"], bins=25, color="#56B4E9", edgecolor="#FFFFFF")
    # Color patches by risk level
    q50 = df_hotspots["risk_score"].quantile(0.50)
    q80 = df_hotspots["risk_score"].quantile(0.80)
    for patch, left_edge in zip(patches, bins[:-1]):
        if left_edge >= q80:
            patch.set_facecolor("#D55E00")  # High Risk (Vermilion)
        elif left_edge >= q50:
            patch.set_facecolor("#E69F00")  # Medium Risk (Amber)
        else:
            patch.set_facecolor("#0072B2")  # Low Risk (Blue)

    ax.set_title("Multi-Criteria Hotspot Risk Score Distribution with Risk Tiers", fontsize=12, fontweight="bold", pad=12)
    ax.set_xlabel("Composite Risk Score (0–100)", fontsize=11, fontweight="bold")
    ax.set_ylabel("Count of Hotspots", fontsize=11, fontweight="bold")
    ax.axvline(q80, color="#D55E00", linestyle="--", linewidth=1.5, label=f"High Risk Tier (Top 20% >= {q80:.1f})")
    ax.axvline(q50, color="#E69F00", linestyle="--", linewidth=1.5, label=f"Medium Risk Tier (Next 30% >= {q50:.1f})")
    ax.legend(frameon=True, facecolor="#FAFAFA")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    plots.save_figure(fig, fig_dir / "03_risk_score_distribution.png")

    # 3. Top 10 Ranked Hotspots Bar (04_top10_hotspots_ranked.png)
    top10 = df_hotspots.sort_values(by="risk_score", ascending=False).head(10).copy()
    top10["label"] = [f"Hotspot #{r['temp_cluster_id']} ({r['centre_lat']:.3f}N, {r['centre_lon']:.3f}W)" for _, r in top10.iterrows()]

    fig, ax = plt.subplots(figsize=(10, 5.5))
    bars = ax.barh(np.arange(len(top10)), top10["risk_score"], color="#D55E00", edgecolor="#FFFFFF", height=0.6)
    for idx, (_, r) in enumerate(top10.iterrows()):
        ax.text(r["risk_score"] + 0.8, idx, f"Score: {r['risk_score']:.1f} | N={r['accident_count']} | Severe: {r['severe_ratio']*100:.1f}%",
                va="center", ha="left", fontsize=8.5, fontweight="bold", color="#222222")
    ax.set_yticks(np.arange(len(top10)))
    ax.set_yticklabels(top10["label"], fontsize=9.5)
    ax.invert_yaxis()
    ax.set_title("Top 10 High-Risk Hotspot Clusters in Great Britain", fontsize=12, fontweight="bold", pad=12)
    ax.set_xlabel("Composite Risk Score (0–100)", fontsize=11, fontweight="bold")
    ax.set_xlim(0, 110)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    plots.save_figure(fig, fig_dir / "04_top10_hotspots_ranked.png")

    print(f"      -> Saved 3 methodology figures to {fig_dir}.")


def verify_database_hotspot_state():
    """Run validation checks on database hotspot linkages."""
    print("\n[5/5] Verifying database integrity and linkage consistency...")
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM hotspot;")
        h_count = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM accident WHERE hotspot_id IS NOT NULL;")
        linked_acc = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM accident a LEFT JOIN hotspot h ON a.hotspot_id = h.hotspot_id WHERE a.hotspot_id IS NOT NULL AND h.hotspot_id IS NULL;")
        orphan_links = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(*)
            FROM (
                SELECT h.hotspot_id, h.accident_count, COUNT(a.accident_index) AS actual_count
                FROM hotspot h
                JOIN accident a ON h.hotspot_id = a.hotspot_id
                GROUP BY h.hotspot_id, h.accident_count
                HAVING h.accident_count != COUNT(a.accident_index)
            ) mismatch;
        """)
        mismatched_counts = cur.fetchone()[0]

        cur.execute("SELECT MIN(risk_score), MAX(risk_score) FROM hotspot;")
        min_risk, max_risk = cur.fetchone()

        cur.execute("SELECT risk_level, COUNT(*), ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) FROM hotspot GROUP BY risk_level ORDER BY COUNT(*) DESC;")
        tiers = cur.fetchall()

    conn.close()

    print(f"  [CHECK] Total Hotspots in DB: {h_count:,} (Expected 704)")
    print(f"  [CHECK] Linked Accidents: {linked_acc:,} (Expected 63,879)")
    print(f"  [CHECK] Orphan Linkages: {orphan_links} (Expected 0)")
    print(f"  [CHECK] Member Count Discrepancies: {mismatched_counts} (Expected 0)")
    print(f"  [CHECK] Risk Score Range: [{min_risk:.2f}, {max_risk:.2f}] (Expected [0, 100])")
    print(f"  [CHECK] Risk Level Tier Proportions:")
    for lvl, cnt, pct in tiers:
        print(f"          - {lvl:<6s}: {cnt:3d} hotspots ({pct}%)")

    assert orphan_links == 0, "Found orphan hotspot foreign keys in accident table!"
    assert mismatched_counts == 0, "Found discrepancy between hotspot.accident_count and linked accidents!"
    print("  -> [PASSED] All database hotspot validations successful.")


def main():
    parser = argparse.ArgumentParser(description="Spatial Hotspot Detection and Risk Scoring")
    parser.add_argument("--eps", type=float, default=150.0, help="DBSCAN epsilon radius in metres (default 150m)")
    parser.add_argument("--min-samples", type=int, default=30, help="DBSCAN min samples threshold (default 30)")
    args = parser.parse_args()

    print("=" * 80)
    print("STATS19 SPATIAL HOTSPOT CLUSTERING & RISK SCORING PIPELINE")
    print("=" * 80)
    total_t0 = time.time()

    # Load valid spatial records
    print("Loading valid collision spatial records from PostgreSQL...")
    df = query_df("""
        SELECT 
            accident_index, easting, northing, latitude, longitude,
            severity_id, accident_year, district_id
        FROM accident 
        WHERE has_valid_coords = TRUE;
    """)
    print(f"Loaded {len(df):,} valid collision records.")

    # 1. Detect clusters
    labels = detect_clusters(df, eps_m=args.eps, min_samples=args.min_samples)

    # 2. Compute metrics & risk scores
    df_hotspots, df_acc_links = compute_hotspot_metrics(df, labels)

    # 3. Synchronize to database inside atomic transaction
    sync_hotspots_to_database(df_hotspots, df_acc_links)

    # 4. Generate figures
    generate_methodology_figures(df_hotspots)

    # 5. Verify database state
    verify_database_hotspot_state()

    print("\n" + "=" * 80)
    print(f"[SUCCESS] Spatial hotspot detection pipeline completed in {time.time() - total_t0:.2f}s.")
    print("=" * 80)


if __name__ == "__main__":
    main()
