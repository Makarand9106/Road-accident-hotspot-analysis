"""
DBSCAN Parameter Tuning & Spatial Sensitivity Suite for Hotspot Detection.
Computes k-distance elbow curve (k=min_samples=30) and parameter sensitivity grid
across eps in {100, 150, 250}m and min_samples in {20, 30, 50}.
"""

import json
import sys
import time
from pathlib import Path
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN
from sklearn.neighbors import NearestNeighbors

# Add repo root to sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(REPO_ROOT))

import python.config as config
from python.analysis.db_access import query_df
import python.visualization.eda_plots as plots


def plot_k_distance_elbow(coords: np.ndarray, k: int = 30, output_path: Path = None):
    """Compute and plot sorted k-NN distance curve to identify the DBSCAN epsilon elbow."""
    print(f"\n[1/2] Computing {k}-nearest neighbor distances for {len(coords):,} points...")
    t0 = time.time()
    nbrs = NearestNeighbors(n_neighbors=k, algorithm="kd_tree", n_jobs=-1).fit(coords)
    distances, _ = nbrs.kneighbors(coords)
    k_distances = np.sort(distances[:, -1])
    print(f"      -> 30-NN distance computed in {time.time() - t0:.2f}s.")

    fig, ax = plt.subplots(figsize=(10, 5.5))
    ax.plot(k_distances, color="#0072B2", linewidth=2.0, label=f"{k}-NN Distance (m)")

    # Highlight chosen default epsilon = 150m
    ax.axhline(150.0, color="#D55E00", linestyle="--", linewidth=1.8, label="Selected eps = 150m (Elbow Threshold)")
    
    # Annotations
    ax.set_title(f"DBSCAN Parameter Justification: {k}-Nearest Neighbor Distance (Elbow Curve)", fontsize=12, fontweight="bold", pad=12)
    ax.set_xlabel("Collision Records (Sorted by Increasing k-NN Distance)", fontsize=11, fontweight="bold")
    ax.set_ylabel(f"Distance to {k}-th Nearest Collision (Metres)", fontsize=11, fontweight="bold")
    ax.set_ylim(0, 800)  # Focus on the relevant elbow region
    ax.legend(loc="upper left", frameon=True, facecolor="#FAFAFA")

    ax.annotate(
        "Elbow Transition Region (~100m–175m)\nSeparates Dense Urban Clusters\nfrom Sparse Rural Noise",
        xy=(len(k_distances) * 0.70, 150),
        xytext=(len(k_distances) * 0.35, 380),
        arrowprops=dict(facecolor="#D55E00", edgecolor="#D55E00", arrowstyle="->", lw=1.5),
        fontsize=9.5,
        bbox=dict(boxstyle="round,pad=0.5", facecolor="#FFF2E6", edgecolor="#D55E00", alpha=0.95)
    )

    if output_path:
        plots.save_figure(fig, output_path)
        print(f"      -> Saved k-distance elbow plot to: {output_path}")


def run_parameter_sensitivity(coords: np.ndarray, output_csv: Path, output_json: Path):
    """Run sensitivity grid search across eps in {100, 150, 250} and min_samples in {20, 30, 50}."""
    print("\n[2/2] Running DBSCAN sensitivity grid search across 9 parameter combinations...")
    eps_values = [100.0, 150.0, 250.0]
    min_samples_values = [20, 30, 50]

    results = []
    total_points = len(coords)

    for eps in eps_values:
        for min_s in min_samples_values:
            t_start = time.time()
            db = DBSCAN(eps=eps, min_samples=min_s, metric="euclidean", algorithm="kd_tree", n_jobs=-1).fit(coords)
            labels = db.labels_
            elapsed = time.time() - t_start

            n_clusters = int(len(set(labels)) - (1 if -1 in labels else 0))
            noise_points = int((labels == -1).sum())
            clustered_points = total_points - noise_points
            pct_clustered = round(clustered_points * 100.0 / total_points, 2)

            # Compute cluster size statistics and max diameter
            if n_clusters > 0:
                cluster_sizes = pd.Series(labels[labels != -1]).value_counts()
                mean_size = round(float(cluster_sizes.mean()), 1)
                median_size = round(float(cluster_sizes.median()), 1)
                max_size = int(cluster_sizes.max())
            else:
                mean_size = median_size = max_size = 0

            rec = {
                "eps_metres": int(eps),
                "min_samples": int(min_s),
                "num_clusters": n_clusters,
                "clustered_collisions": clustered_points,
                "pct_collisions_clustered": pct_clustered,
                "mean_cluster_size": mean_size,
                "median_cluster_size": median_size,
                "max_cluster_size": max_size,
                "execution_seconds": round(elapsed, 2)
            }
            results.append(rec)
            print(f"  eps={eps:3.0f}m, min_samples={min_s:2d} -> {n_clusters:4d} clusters | {clustered_points:6,d} collisions ({pct_clustered:5.2f}%) | Mean Size: {mean_size:5.1f} | Duration: {elapsed:.2f}s")

    df_sens = pd.DataFrame(results)
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    df_sens.to_csv(output_csv, index=False)
    
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print(f"\n      -> Sensitivity table saved to: {output_csv}")
    print(f"      -> JSON summary saved to: {output_json}")
    return df_sens


def main():
    print("=" * 80)
    print("DBSCAN PARAMETER TUNING & SENSITIVITY PIPELINE")
    print("=" * 80)

    fig_dir = REPO_ROOT / "docs" / "figures" / "hotspot"
    res_dir = REPO_ROOT / "docs" / "results"
    fig_dir.mkdir(parents=True, exist_ok=True)
    res_dir.mkdir(parents=True, exist_ok=True)

    print("Loading valid British National Grid coordinates from PostgreSQL...")
    df = query_df("SELECT easting, northing FROM accident WHERE has_valid_coords = TRUE;")
    coords = df[["easting", "northing"]].to_numpy(dtype=np.float64)
    print(f"Loaded {len(coords):,} valid coordinate points.")

    # 1. k-distance elbow curve
    plot_k_distance_elbow(coords, k=30, output_path=fig_dir / "01_k_distance_elbow.png")

    # 2. Parameter sensitivity table
    run_parameter_sensitivity(
        coords,
        output_csv=res_dir / "hotspot_parameter_sensitivity.csv",
        output_json=res_dir / "hotspot_parameter_sensitivity.json"
    )

    print("\n" + "=" * 80)
    print("[SUCCESS] Parameter tuning and sensitivity artifacts generated successfully.")
    print("=" * 80)


if __name__ == "__main__":
    main()
