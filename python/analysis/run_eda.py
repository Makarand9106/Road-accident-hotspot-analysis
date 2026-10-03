"""
Exploratory Data Analysis (EDA) Pipeline for STATS19 Database.
Queries PostgreSQL views through SQLAlchemy, executes statistical aggregations,
and generates 15 publication-grade figures in docs/figures/eda/.
"""

import json
import sys
import time
from pathlib import Path
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

# Add repo root to sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(REPO_ROOT))

import python.config as config
from python.analysis.db_access import query_df
import python.visualization.eda_plots as plots


def generate_all_eda_plots():
    """Run full suite of 15 EDA visualizers reading from PostgreSQL views."""
    print("=" * 80)
    print("STATS19 EXPLORATORY DATA ANALYSIS (EDA) GENERATOR")
    print("Database: PostgreSQL 16 ('road_safety') -> docs/figures/eda/")
    print("=" * 80)

    figures_dir = REPO_ROOT / "docs" / "figures" / "eda"
    figures_dir.mkdir(parents=True, exist_ok=True)
    t0 = time.time()

    # -------------------------------------------------------------------------
    # 1. Collisions by Year
    # -------------------------------------------------------------------------
    print("\n[1/15] Generating 01_collisions_by_year.png...")
    df_year = query_df("""
        SELECT accident_year, total_collisions, severe_percentage 
        FROM v_yearly_trend 
        ORDER BY accident_year ASC;
    """)
    plots.plot_bar(
        df=df_year,
        x_col="accident_year",
        y_col="total_collisions",
        title="Annual Road Collision Volume in Great Britain (2021–2025)",
        x_label="Calendar Year",
        y_label="Total Recorded Collisions",
        output_path=figures_dir / "01_collisions_by_year.png",
        color="#0072B2"
    )

    # -------------------------------------------------------------------------
    # 2. Collisions by Month
    # -------------------------------------------------------------------------
    print("[2/15] Generating 02_collisions_by_month.png...")
    df_month = query_df("""
        SELECT 
            month,
            TO_CHAR(TO_DATE(month::TEXT, 'MM'), 'Mon') AS month_name,
            COUNT(*) AS total_collisions,
            ROUND(SUM(is_severe) * 100.0 / COUNT(*), 2) AS severe_percentage
        FROM v_accident_enriched
        WHERE month IS NOT NULL
        GROUP BY month
        ORDER BY month ASC;
    """)
    plots.plot_bar(
        df=df_month,
        x_col="month_name",
        y_col="total_collisions",
        title="Aggregated Collision Volume by Month (2021–2025)",
        x_label="Month of Year",
        y_label="Total Collisions",
        output_path=figures_dir / "02_collisions_by_month.png",
        color="#0072B2"
    )

    # -------------------------------------------------------------------------
    # 3. Collisions by Weekday
    # -------------------------------------------------------------------------
    print("[3/15] Generating 03_collisions_by_weekday.png...")
    df_weekday = query_df("""
        SELECT 
            day_of_week_index,
            day_of_week_name,
            SUM(total_collisions) AS total_collisions,
            ROUND(SUM(severe_collisions) * 100.0 / SUM(total_collisions), 2) AS severe_percentage
        FROM mv_hour_weekday_heatmap
        GROUP BY day_of_week_index, day_of_week_name
        ORDER BY day_of_week_index ASC;
    """)
    plots.plot_bar(
        df=df_weekday,
        x_col="day_of_week_name",
        y_col="total_collisions",
        title="Collision Distribution by Day of Week (2021–2025)",
        x_label="Day of Week",
        y_label="Total Collisions",
        output_path=figures_dir / "03_collisions_by_weekday.png",
        color="#0072B2"
    )

    # -------------------------------------------------------------------------
    # 4. Collisions by Hour
    # -------------------------------------------------------------------------
    print("[4/15] Generating 04_collisions_by_hour.png...")
    df_hour = query_df("""
        SELECT 
            hour,
            SUM(total_collisions) AS total_collisions
        FROM mv_hour_weekday_heatmap
        GROUP BY hour
        ORDER BY hour ASC;
    """)
    plots.plot_line_trend(
        df=df_hour,
        x_col="hour",
        y_col="total_collisions",
        title="Hourly Diurnal Road Collision Volume Across Great Britain (00:00–23:00)",
        x_label="Hour of Day (24-hour format)",
        y_label="Total Collisions",
        output_path=figures_dir / "04_collisions_by_hour.png",
        color="#0072B2"
    )

    # -------------------------------------------------------------------------
    # 5. Weekday-by-Hour Heatmap
    # -------------------------------------------------------------------------
    print("[5/15] Generating 05_weekday_by_hour_heatmap.png...")
    df_heatmap = query_df("""
        SELECT day_of_week_name, hour, total_collisions 
        FROM mv_hour_weekday_heatmap;
    """)
    plots.plot_weekday_hour_heatmap(
        df=df_heatmap,
        day_col="day_of_week_name",
        hour_col="hour",
        value_col="total_collisions",
        title="Temporal Density Heatmap: Collisions by Weekday and Hour (2021–2025)",
        output_path=figures_dir / "05_weekday_by_hour_heatmap.png"
    )

    # -------------------------------------------------------------------------
    # 6. Severity Distribution Breakdown
    # -------------------------------------------------------------------------
    print("[6/15] Generating 06_severity_distribution.png...")
    df_sev = query_df("""
        SELECT 
            s.severity_name,
            COUNT(*) AS total_collisions,
            ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
        FROM v_accident_enriched a
        JOIN severity s ON a.severity_id = s.severity_id
        GROUP BY s.severity_id, s.severity_name
        ORDER BY s.severity_id ASC;
    """)
    fig, ax = plt.subplots(figsize=(8, 5))
    colors = ["#D55E00", "#E69F00", "#0072B2"]
    bars = ax.bar(df_sev["severity_name"], df_sev["total_collisions"], color=colors, edgecolor="#FFFFFF", width=0.55)
    for bar, pct in zip(bars, df_sev["percentage"]):
        h = bar.get_height()
        ax.text(bar.get_x() + bar.get_width() / 2, h + 5000, f"{h:,}\n({pct}%)", ha="center", va="bottom", fontsize=10, fontweight="bold")
    ax.set_title("Collision Severity Distribution in STATS19 (2021–2025)", fontsize=12, fontweight="bold", pad=12)
    ax.set_ylabel("Total Collisions", fontsize=11, fontweight="bold")
    ax.set_xlabel("Recorded Severity Level", fontsize=11, fontweight="bold")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    plots.save_figure(fig, figures_dir / "06_severity_distribution.png")

    # -------------------------------------------------------------------------
    # 7. Severe Percentage by Hour
    # -------------------------------------------------------------------------
    print("[7/15] Generating 07_severe_percentage_by_hour.png...")
    df_hour_sev = query_df("""
        SELECT 
            hour,
            SUM(total_collisions) AS total_count,
            SUM(severe_collisions) AS severe_count
        FROM mv_hour_weekday_heatmap
        GROUP BY hour
        ORDER BY hour ASC;
    """)
    plots.plot_severity_rate_with_ci(
        df=df_hour_sev,
        category_col="hour",
        severe_count_col="severe_count",
        total_count_col="total_count",
        title="Severe Collision Percentage (Fatal/Serious) by Hour of Day with 95% Wilson CI",
        x_label="Severe Collision Percentage (%)",
        output_path=figures_dir / "07_severe_percentage_by_hour.png",
        figsize=(10, 7)
    )

    # -------------------------------------------------------------------------
    # 8. Weather Count and Severe Rate
    # -------------------------------------------------------------------------
    print("[8/15] Generating 08_weather_count_and_severe_rate.png...")
    df_weather = query_df("""
        SELECT 
            weather_condition_name,
            COUNT(*) AS total_collisions,
            ROUND(SUM(is_severe) * 100.0 / COUNT(*), 2) AS severe_percentage
        FROM v_accident_enriched
        WHERE weather_condition_name != 'Unknown'
        GROUP BY weather_condition_name
        ORDER BY total_collisions DESC;
    """)
    plots.plot_dual_axis_count_and_rate(
        df=df_weather,
        x_col="weather_condition_name",
        count_col="total_collisions",
        rate_col="severe_percentage",
        title="Collision Volume vs Severe Percentage by Atmospheric Weather Condition",
        x_label="Weather Condition",
        count_label="Total Collisions",
        rate_label="Severe Collision Rate (%)",
        rotate_x=30,
        output_path=figures_dir / "08_weather_count_and_severe_rate.png"
    )

    # -------------------------------------------------------------------------
    # 9. Road Surface Condition Severe Rate
    # -------------------------------------------------------------------------
    print("[9/15] Generating 09_road_surface_severe_rate.png...")
    df_surface = query_df("""
        SELECT 
            road_surface_condition_name,
            SUM(is_severe) AS severe_count,
            COUNT(*) AS total_count
        FROM v_accident_enriched
        WHERE road_surface_condition_name != 'Unknown'
        GROUP BY road_surface_condition_name
        ORDER BY total_count DESC;
    """)
    plots.plot_severity_rate_with_ci(
        df=df_surface,
        category_col="road_surface_condition_name",
        severe_count_col="severe_count",
        total_count_col="total_count",
        title="Severe Collision Rate by Road Surface Condition with 95% Wilson CI",
        x_label="Severe Collision Percentage (%)",
        output_path=figures_dir / "09_road_surface_severe_rate.png"
    )

    # -------------------------------------------------------------------------
    # 10. Light Condition Severe Rate
    # -------------------------------------------------------------------------
    print("[10/15] Generating 10_light_condition_severe_rate.png...")
    df_light = query_df("""
        SELECT 
            light_condition_name,
            SUM(is_severe) AS severe_count,
            COUNT(*) AS total_count
        FROM v_accident_enriched
        WHERE light_condition_name != 'Unknown'
        GROUP BY light_condition_name
        ORDER BY total_count DESC;
    """)
    plots.plot_severity_rate_with_ci(
        df=df_light,
        category_col="light_condition_name",
        severe_count_col="severe_count",
        total_count_col="total_count",
        title="Severe Collision Rate by Ambient Light Condition with 95% Wilson CI",
        x_label="Severe Collision Percentage (%)",
        output_path=figures_dir / "10_light_condition_severe_rate.png"
    )

    # -------------------------------------------------------------------------
    # 11. Speed Limit Severe Rate
    # -------------------------------------------------------------------------
    print("[11/15] Generating 11_speed_limit_severe_rate.png...")
    df_speed = query_df("""
        SELECT 
            speed_limit || ' mph' AS speed_label,
            SUM(is_severe) AS severe_count,
            COUNT(*) AS total_count,
            ROUND(AVG(number_of_casualties), 3) AS avg_casualties
        FROM v_accident_enriched
        WHERE speed_limit IN (20, 30, 40, 50, 60, 70)
        GROUP BY speed_limit
        ORDER BY speed_limit ASC;
    """)
    plots.plot_severity_rate_with_ci(
        df=df_speed,
        category_col="speed_label",
        severe_count_col="severe_count",
        total_count_col="total_count",
        title="Severe Collision Percentage Across Legal Speed Limit Zones with 95% Wilson CI",
        x_label="Severe Collision Percentage (%)",
        output_path=figures_dir / "11_speed_limit_severe_rate.png"
    )

    # -------------------------------------------------------------------------
    # 12. Road Type and Junction Detail Severe Rate
    # -------------------------------------------------------------------------
    print("[12/15] Generating 12_road_type_and_junction_detail.png...")
    df_road_type = query_df("""
        SELECT 
            road_type_name,
            SUM(is_severe) AS severe_count,
            COUNT(*) AS total_count
        FROM v_accident_enriched
        WHERE road_type_name != 'Unknown'
        GROUP BY road_type_name
        ORDER BY total_count DESC;
    """)
    plots.plot_severity_rate_with_ci(
        df=df_road_type,
        category_col="road_type_name",
        severe_count_col="severe_count",
        total_count_col="total_count",
        title="Severe Collision Rate Across Road Types with 95% Wilson CI",
        x_label="Severe Collision Percentage (%)",
        output_path=figures_dir / "12_road_type_and_junction_detail.png"
    )

    # -------------------------------------------------------------------------
    # 13. Top Vehicle Types Involvements
    # -------------------------------------------------------------------------
    print("[13/15] Generating 13_top_vehicle_types.png...")
    df_veh_top = query_df("""
        SELECT 
            vt.vehicle_type_name,
            COUNT(v.vehicle_id) AS total_vehicles
        FROM vehicle v
        JOIN vehicle_type vt ON v.vehicle_type_id = vt.vehicle_type_id
        GROUP BY vt.vehicle_type_id, vt.vehicle_type_name
        ORDER BY total_vehicles DESC
        LIMIT 10;
    """)
    plots.plot_bar(
        df=df_veh_top,
        x_col="total_vehicles",
        y_col="vehicle_type_name",
        title="Top 10 Vehicle Types Involved in Road Collisions (2021–2025)",
        x_label="Total Vehicles Recorded in Collisions",
        y_label="Vehicle Classification",
        horizontal=True,
        output_path=figures_dir / "13_top_vehicle_types.png",
        color="#0072B2",
        figsize=(10, 5.5)
    )

    # -------------------------------------------------------------------------
    # 14. Urban vs Rural Severe Rate
    # -------------------------------------------------------------------------
    print("[14/15] Generating 14_urban_vs_rural_severe_rate.png...")
    df_ur = query_df("""
        SELECT 
            urban_rural_name,
            SUM(is_severe) AS severe_count,
            COUNT(*) AS total_count
        FROM v_accident_enriched
        WHERE urban_rural_name != 'Unknown'
        GROUP BY urban_rural_name
        ORDER BY total_count DESC;
    """)
    plots.plot_severity_rate_with_ci(
        df=df_ur,
        category_col="urban_rural_name",
        severe_count_col="severe_count",
        total_count_col="total_count",
        title="Severe Collision Rate: Urban vs Rural Environments with 95% Wilson CI",
        x_label="Severe Collision Percentage (%)",
        output_path=figures_dir / "14_urban_vs_rural_severe_rate.png"
    )

    # -------------------------------------------------------------------------
    # 15. Missing Values & Preprocessing Sentinel Overview
    # -------------------------------------------------------------------------
    print("[15/15] Generating 15_missing_values_overview.png...")
    qr_path = config.PROCESSED_DATA_DIR / "quality_report.json"
    sentinels_data = []
    if qr_path.exists():
        with open(qr_path, "r", encoding="utf-8") as f:
            qr = json.load(f)
        acc_sent = qr.get("cleaning_details", {}).get("accidents", {}).get("sentinels_converted", {})
        # Filter top 10 sentinel conversions
        for col, count in sorted(acc_sent.items(), key=lambda x: x[1], reverse=True)[:10]:
            sentinels_data.append({
                "column_name": col.replace("_", " ").title(),
                "missing_count": count,
                "pct_missing": round(count * 100.0 / 513801, 1)
            })
    df_missing = pd.DataFrame(sentinels_data)
    plots.plot_bar(
        df=df_missing,
        x_col="missing_count",
        y_col="column_name",
        title="Top Data Missingness & Domain Sentinel Conversions (-1/99 to NULL)",
        x_label="Converted Sentinel Records (out of 513,801)",
        y_label="Feature Name",
        horizontal=True,
        output_path=figures_dir / "15_missing_values_overview.png",
        color="#D55E00",
        figsize=(10, 5.5)
    )

    total_time = round(time.time() - t0, 2)
    print("\n" + "=" * 80)
    print(f"[SUCCESS] All 15 figures generated and saved to {figures_dir} in {total_time}s.")
    print("=" * 80)


if __name__ == "__main__":
    generate_all_eda_plots()
