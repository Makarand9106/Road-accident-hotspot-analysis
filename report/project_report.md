# Road Accident Hotspot Analysis & Risk Prediction System
## Project Report — Data Visualization & DBMS Capstone

**Dataset:** UK Department for Transport STATS19 Road Safety Data (2021–2025)  
**Total Collisions Analysed:** 513,801  
**Academic Context:** Data Visualization + Database Management Systems Capstone  

---

## 1. Executive Summary

This project builds a full end-to-end data analytics pipeline for UK road accident intelligence. Starting from raw government STATS19 CSVs, the system performs data cleaning, feature engineering, spatial hotspot detection, machine learning severity classification, and presents findings through an interactive web dashboard and a complementary Power BI report.

**Key findings:**
- 513,801 road collisions recorded 2021–2025 across England, Scotland, and Wales
- Severe collision rate (fatal + serious): **24.21%** of all collisions
- **704 geospatial DBSCAN clusters** identified as persistent hotspots
- Logistic Regression achieves **76.3% balanced accuracy** for severity prediction
- Highest-risk periods: **Evening Peak (16:00–19:00) on Fridays**
- Most dangerous conditions: **Wet road + darkness + motorway** combination

---

## 2. Data Pipeline Architecture

```
Raw STATS19 CSVs (DfT)
         │
         ▼
Python Preprocessing Pipeline
├── Duplicate removal
├── Sentinel unknown conversion
├── Date/time standardization
├── Coordinate validation (UK bounds)
├── Orphan record removal
└── Feature engineering
         │
         ▼
PostgreSQL Database (18 tables, star schema)
├── 87 check constraints
├── 42 performance indexes
├── 4 analytical views
└── 1 materialized heatmap view
         │
    ┌────┴────┐
    │         │
    ▼         ▼
Python ML   Node.js/Express API (Port 4000)
DBSCAN      ├── 20+ SQL analytical endpoints
Hotspot     └── In-memory JS risk scoring
Detection
    │
    ▼
React + Vite Frontend (Port 5173)
├── Leaflet interactive maps
├── Recharts visualizations
└── Real-time severity predictor
```

---

## 3. Data Preprocessing Results

### 3.1 Raw Data Loaded

| Dataset | Rows |
|---|---|
| Collisions | 513,801 |
| Vehicles | ~1,020,000 |
| Casualties | ~680,000 |

### 3.2 Cleaning Operations

| Operation | Details |
|---|---|
| Duplicate removal | Exact row duplicates + primary key deduplication |
| Null/sentinel conversion | -1, 9, 99 codes → NaN per domain rules |
| Date parsing | DD/MM/YYYY → ISO 8601; invalid dates flagged |
| Coordinate validation | Against UK bounding box (49.85–60.90°N) |
| Orphan removal | Vehicles/casualties without valid accident_index |

### 3.3 Feature Engineering

| Feature | Derivation | Use |
|---|---|---|
| `is_severe` | accident_severity ∈ {1,2} → 1 | ML target |
| `time_period` | Hour → named period | Analysis, ML |
| `day_of_week_name` | Integer code → day string | Analysis, ML |
| `involves_motorcycle` | Vehicle type flag | ML feature |
| `easting_bng/northing_bng` | WGS84 → OSGB36 metres | DBSCAN clustering |
| `is_weekend` | Sat/Sun flag | ML feature |

---

## 4. Database Schema

### 4.1 Normalized Star Schema (3NF)

The PostgreSQL database follows a **3rd Normal Form** star schema with:

- **Fact table:** `accidents` (513,801 rows)
- **Related tables:** `vehicles`, `casualties`
- **Lookup tables:** 13 seeded reference tables (weather, road type, lighting, etc.)
- **Hotspot table:** `hotspots` (704 DBSCAN clusters)

### 4.2 Key SQL Analytical Queries

The project includes **20 analytical queries** covering:

1. Yearly collision trend with YoY change
2. Severity distribution by year
3. Top 10 highest-risk local authorities
4. Collision counts by hour and day of week
5. Weather condition severity rates
6. Speed limit vs fatal collision rate
7. Junction type collision analysis
8. DBSCAN cluster rankings by risk score
9. Casualty type distributions
10. Seasonal patterns with moving averages

---

## 5. EDA Findings

### 5.1 Temporal Patterns

- **Peak hours:** 08:00–09:00 and 16:00–18:00 (commuter peaks)
- **Peak day:** Friday (highest volume), Sunday (highest severe rate)
- **Peak months:** October–November (worse weather, darker evenings)

### 5.2 Severity Factors

| Factor | Severe Rate |
|---|---|
| Night + no lighting | 38.2% |
| Motorway | 34.1% |
| Speed limit ≥70 mph | 31.5% |
| Snow/ice road surface | 28.4% |
| Single carriageway rural | 27.8% |
| Wet road + rain | 22.1% |
| Urban dry daytime | 16.3% |

### 5.3 Visualization Suite

20 publication-grade figures generated (see `docs/figures/eda/`):

1. 5-year collision volume trend line
2. Severity distribution bar chart
3. Severity composition donut/pie chart
4. Hourly accident frequency bar
5. Day-of-week distribution
6. Monthly heatmap by year
7. Weather condition vs severity (Wilson CI)
8. Road surface vs severity (Wilson CI)
9. Lighting condition vs severity (Wilson CI)
10. Road type vs severity (Wilson CI)
11. Speed limit dual-axis chart
12. Day × Hour heatmap
13. Vehicle type distribution
14. Casualty class breakdown
15. Urban vs rural comparison
16. Time period stacked severity bar
17. Junction type severity chart
18. Annual severity stacked bar
19. Numeric correlation heatmap
20. Vehicles-per-accident distribution

---

## 6. Spatial Hotspot Detection

**Method:** DBSCAN (Density-Based Spatial Clustering of Applications with Noise)

**Parameters:**
- ε (epsilon): 150 metres (British National Grid)
- MinPts: 30 collisions per cluster

**Results:**
- **704 hotspot clusters** identified
- Top cluster: A2 at New Cross Gate (London) — 487 collisions
- Risk score formula: weighted combination of collision count, severe rate, temporal persistence, and casualty count

---

## 7. Machine Learning Model

**Algorithm:** Logistic Regression with class balancing

**Target:** `is_severe` (binary: Fatal/Serious = 1, Slight = 0)

**Features (47):** Time period, day of week, weather, road surface, lighting, road type, road class, junction detail, junction control, urban/rural, speed limit, number of vehicles, involvement flags

**Performance:**
| Metric | Severe Class | Slight Class | Overall |
|---|---|---|---|
| Precision | 0.71 | 0.83 | 0.79 |
| Recall | 0.68 | 0.85 | 0.78 |
| F1-Score | 0.69 | 0.84 | 0.79 |
| Balanced Accuracy | — | — | **76.3%** |

**Parity:** JSON weights exported with 6-decimal precision; Node.js in-memory scoring verified to match Python outputs exactly.

---

## 8. Interactive Web Application

### 8.1 Overview Page
- 6 KPI cards: Total collisions, severe collisions, fatal collisions, casualties, active hotspots, max risk score
- 5-year trend line chart
- Severity donut chart
- Vulnerable user summary cards

### 8.2 Accident Analysis Page
- 15+ Recharts visualizations across weather, time, road conditions
- Global filter bar (year, severity, region)

### 8.3 Geospatial Hotspot Map
- Leaflet/OpenStreetMap interactive cluster map
- Circle markers scaled by risk score
- Click-to-expand hotspot detail panel
- DBSCAN cluster heatmap overlay

### 8.4 Risk Prediction Simulator
- 17-parameter scenario form
- Real-time severity probability gauge (0–100%)
- Feature attribution/logit contribution breakdown
- Model explainability card with metrics

### 8.5 SQL Insights Explorer
- 20 pre-built analytical queries
- Query runner with result tables
- Visual output for each query

### 8.6 Methodology Page
- ERD diagram (interactive)
- Pipeline architecture diagram
- Decision record documentation

---

## 9. Power BI Analytics Report

A companion 6-page Power BI report is designed to complement the interactive dashboard. See `powerbi/README_PowerBI.md` for full setup instructions.

| Page | Focus |
|---|---|
| 1. Overview | KPIs, 5-year trend, severity composition |
| 2. Temporal | Hourly, day-of-week, month heatmaps |
| 3. Geographic | Cluster maps, hotspot rankings |
| 4. Diagnostic | Condition-severity cross-tabs, correlation |
| 5. ML Evaluation | Confusion matrix, ROC, feature importance |
| 6. Decision Support | Priority investigation ranking |

---

## 10. Reproducibility

The entire project is reproducible from scratch with:

```bash
# 1. Download data
python python/ingestion/download_data.py

# 2. Preprocess
python python/preprocessing/run_pipeline.py

# 3. Load database
python python/db/load_data.py --reset

# 4. Detect hotspots
python python/hotspot/detect_hotspots.py

# 5. Train model
python python/prediction/train.py && python python/prediction/export_model.py

# 6. Generate visualizations
python python/analysis/run_eda.py

# 7. Start backend
cd backend && npm run dev

# 8. Start frontend
cd frontend && npm run dev
```

---

## 11. Limitations & Ethical Considerations

- **No exposure data:** Accident counts not normalised by vehicle kilometres travelled; urban areas appear more dangerous partly due to higher traffic volume
- **Temporal gap:** 2020 excluded from baseline due to COVID-19 travel suppression
- **Model scope:** Logistic Regression chosen for explainability; ensemble models would achieve higher accuracy but reduce interpretability
- **Spatial precision:** STATS19 coordinates truncated to 100m grid; precise hotspot boundaries are approximations
- **Caution:** Model predictions should not be used for operational emergency dispatch decisions

---

*UK DfT STATS19 data licensed under the Open Government Licence v3.0*  
*Academic project: Data Visualization + DBMS Capstone — not certified for operational use*
