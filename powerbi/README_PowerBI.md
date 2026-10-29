# Power BI Setup & Usage Guide

## Overview

This guide explains how to connect the **Power BI analytics report** to the Road Accident Hotspot Analysis project data.

The Power BI report (`RoadAccidentAnalytics.pbix`) provides a **6-page interactive dashboard** aligned to the STATS19 UK road safety data pipeline. It covers descriptive, diagnostic, temporal, geographic, ML evaluation, and prescriptive analytics.

---

## Prerequisites

- **Power BI Desktop** (free) — [Download here](https://powerbi.microsoft.com/en-us/desktop/)
- Python preprocessing pipeline completed (run `python python/preprocessing/run_pipeline.py`)
- Processed CSVs available in `data/processed/`
- EDA figures generated in `docs/figures/eda/`

---

## Data Sources for Power BI

The report reads from the following CSV files output by the preprocessing pipeline:

| Power BI Table Name | Source File | Description |
|---|---|---|
| `FactAccidents` | `data/processed/accidents_clean.csv` | One row per collision |
| `FactVehicles` | `data/processed/vehicles_clean.csv` | One row per vehicle involved |
| `FactCasualties` | `data/processed/casualties_clean.csv` | One row per person injured |
| `FactHotspots` | `docs/results/hotspots/hotspot_results.csv` | DBSCAN cluster outputs |
| `FactPredictions` | `docs/results/model/predictions_test.csv` | Logistic regression predictions |
| `DimDate` | (computed in Power BI) | Date dimension table |

---

## How to Launch Power BI

### Step 1 — Generate All Data Files

```bash
# 1. Activate Python environment
source venv/bin/activate   # Windows: venv\Scripts\activate

# 2. Download raw data (first time only)
python python/ingestion/download_data.py

# 3. Run full preprocessing pipeline
python python/preprocessing/run_pipeline.py

# 4. Run DBSCAN hotspot detection
python python/hotspot/detect_hotspots.py

# 5. Train and export ML model
python python/prediction/train.py
python python/prediction/export_model.py

# 6. Generate all EDA visualizations
python python/analysis/run_eda.py
```

### Step 2 — Open Power BI Desktop

1. Download and install **Power BI Desktop** from https://powerbi.microsoft.com/en-us/desktop/
2. Open Power BI Desktop
3. Open the file: `powerbi/RoadAccidentAnalytics.pbix`

### Step 3 — Update Data Source Paths

When first opening the `.pbix` file on a new machine:

1. Go to **Home → Transform Data → Data Source Settings**
2. For each data source, click **Change Source**
3. Update the file path to the absolute path of your local `data/processed/` folder
4. Click **Close & Apply**
5. Refresh all tables

### Step 4 — Refresh Data

Click **Home → Refresh** to reload all tables from the updated CSV files.

---

## Report Pages Summary

| Page | Title | Key Visuals |
|---|---|---|
| 1 | Accident Intelligence Overview | KPI cards, 5-year trend, severity donut, top regions |
| 2 | Temporal Analytics | Hourly bar, day-of-week, day×hour heatmap, monthly trend |
| 3 | Geographic Intelligence | Map clusters, DBSCAN hotspot table, risk scatter |
| 4 | Diagnostic Analytics | Weather/lighting/road type severity charts, correlation heatmap |
| 5 | ML Risk Prediction | Confusion matrix, ROC curve, feature importance, probability distribution |
| 6 | Decision Support | Priority investigation table, risk vs severity scatter, Pareto chart |

---

## Key DAX Measures (Pre-built)

The `.pbix` file includes the following calculated measures:

```DAX
Total Accidents = DISTINCTCOUNT(FactAccidents[accident_index])

Severe Accidents = 
CALCULATE([Total Accidents], FactAccidents[is_severe] = 1)

Severe Accident % = 
DIVIDE([Severe Accidents], [Total Accidents], 0) * 100

Fatal Accidents = 
CALCULATE([Total Accidents], FactAccidents[accident_severity] = 1)

Total Casualties = COUNTROWS(FactCasualties)

Avg Vehicles Per Accident = 
AVERAGE(FactAccidents[number_of_vehicles])

YoY Change % = 
VAR currentYear = SELECTEDVALUE(DimDate[Year])
VAR prevYear = currentYear - 1
VAR current = CALCULATE([Total Accidents], DimDate[Year] = currentYear)
VAR prev = CALCULATE([Total Accidents], DimDate[Year] = prevYear)
RETURN DIVIDE(current - prev, prev, 0) * 100
```

---

## Publishing to Power BI Service (Optional)

If you have a **Power BI Pro** or **Premium** license:

1. Sign in: **File → Publish → Publish to Power BI**
2. Select your workspace
3. Schedule data refresh by connecting to the CSV source via a **data gateway**

---

## Static Image Exports for Reports

All 20 EDA visualization PNGs in `docs/figures/eda/` can be embedded directly into Power BI as **Image visuals** or into the project report document.

To use in Power BI:
1. Insert → Image
2. Browse to `docs/figures/eda/<figure_name>.png`

---

## Troubleshooting

| Issue | Solution |
|---|---|
| "File not found" on data refresh | Update Data Source paths in Transform Data |
| Blank visuals after refresh | Check that preprocessing pipeline ran successfully |
| Map visuals not rendering | Enable **Bing Maps** in Power BI Options → Security |
| Slow performance | Enable **Import Mode** instead of DirectQuery for CSV sources |

---

*Power BI Analytics Blueprint: see `docs/powerbi_analytics_blueprint.md` for the full design specification.*
