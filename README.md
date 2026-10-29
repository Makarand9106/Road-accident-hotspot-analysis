# Smart Road Accident Hotspot Analysis & Risk Prediction System

## Summary
The **Smart Road Accident Hotspot Analysis and Risk Prediction System** is an end-to-end Data Visualization and DBMS/SQL project that identifies high-risk road collision locations (hotspots) and predicts accident severity using historical road safety records. Built on the UK Department for Transport's STATS19 dataset across five complete years (2021–2025), the system combines:

- **Spatial clustering** (DBSCAN in British National Grid metres) → 704 hotspot clusters
- **Binary risk classification** (Logistic Regression for severity prediction)
- **Interactive dashboard** (React + Vite + Leaflet + Recharts)
- **Power BI 6-page analytics report** (descriptive → prescriptive analytics)
- **Node.js/Express RESTful API** + **PostgreSQL** database

> 🔗 **Power BI blueprint:** `docs/powerbi_analytics_blueprint.md`  
> 📊 **Power BI setup guide:** `powerbi/README_PowerBI.md`  
> 📝 **Full project report:** `report/project_report.md`

---

## Pipeline Architecture

```
[UK DfT STATS19 CSVs]  (Collisions, Vehicles, Casualties: 2021-2025)
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  Python Preprocessing Pipeline                          │
│  preprocessing/run_all_preprocessing.py                 │
│  ├── Clean (duplicates, nulls, sentinels, coords)       │
│  ├── Feature engineering (is_severe, time_period, BNG)  │
│  ├── Split into 3 normalized tables                     │
│  └── 20-figure EDA visualization suite                  │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
[PostgreSQL Database]     [Python ML & Spatial]
 18 tables, star schema    DBSCAN → 704 clusters
 87 constraints, 42 idx    Logistic Regression
 4 views + materialized    JSON model export
          │                         │
          └────────────┬────────────┘
                       │
                       ▼
          [Node.js + Express API — Port 4000]
          RESTful endpoints + in-memory scoring
                       │
                       ▼
          [React + Vite Frontend — Port 5173]
          Leaflet maps, Recharts, Risk Predictor
```

---

## Folder Structure

```
Road-accident-hotspot-analysis/
├── README.md                              ← This file
├── .env.example                           ← Environment config template
├── preprocessing/                         ← NEW: Preprocessing package
│   ├── run_all_preprocessing.py           ← Master pipeline runner
│   ├── __init__.py
│   ├── load_data.py                       ← CSV/Parquet loading utilities
│   ├── clean_data.py                      ← Cleaning (duplicates, nulls, etc.)
│   ├── split_data.py                      ← Train/val/test split
│   ├── aggregate_data.py                  ← GroupBy aggregation utilities
│   ├── visualize_eda.py                   ← EDA visualization helpers
│   └── results_of_preprocessing/          ← NEW: Consolidated output folder
│       ├── README.md                      ← What's in this folder
│       ├── preprocessing_summary.md       ← Human-readable cleaning summary
│       ├── accidents_clean.csv            ← Copied from data/processed/
│       ├── vehicles_clean.csv             ← Copied from data/processed/
│       ├── casualties_clean.csv           ← Copied from data/processed/
│       └── quality_report.json            ← Full JSON quality report
├── python/                                ← Full Python analytics stack
│   ├── config.py
│   ├── requirements.txt
│   ├── ingestion/                         ← Download + validation scripts
│   ├── preprocessing/                     ← Core cleaning + feature engineering
│   │   ├── clean.py                       ← Modular cleaning functions
│   │   ├── features.py                    ← Feature engineering
│   │   └── run_pipeline.py                ← End-to-end pipeline runner
│   ├── analysis/
│   │   └── run_eda.py                     ← NEW: 20-figure EDA runner
│   ├── visualization/
│   │   └── eda_plots.py                   ← Reusable plot functions
│   ├── hotspot/                           ← DBSCAN spatial clustering
│   ├── prediction/                        ← Logistic Regression + export
│   ├── db/                                ← PostgreSQL ETL scripts
│   ├── notebooks/                         ← Jupyter notebooks
│   └── tests/                             ← Unit tests
├── database/                              ← SQL schemas, views, queries
├── backend/                               ← Node.js + Express API
│   ├── package.json
│   └── src/
│       ├── server.js
│       ├── app.js
│       ├── routes/
│       ├── controllers/
│       ├── services/
│       ├── db/
│       └── utils/
├── frontend/                              ← React + Vite + Tailwind dashboard
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── pages/                         ← Overview, Analysis, Hotspots, Prediction, SQL, Methodology
│       ├── components/                    ← Layout, Sidebar, Header, KpiCard, etc.
│       ├── charts/                        ← Recharts wrappers
│       ├── maps/                          ← Leaflet map components
│       ├── prediction/                    ← Risk predictor form + result card
│       ├── services/                      ← API client
│       └── context/                       ← Global filter context
├── models/                                ← Trained model artifacts
│   ├── risk_model.joblib
│   ├── risk_model.json                    ← JS-portable model weights
│   └── all_pipelines.joblib
├── powerbi/                               ← Power BI report files
│   └── README_PowerBI.md                  ← Setup & launch guide
├── report/
│   └── project_report.md                  ← Full project report
├── data/
│   ├── raw/                               ← Raw STATS19 CSVs (gitignored)
│   ├── reference/                         ← 76 lookup/codebook CSVs
│   └── processed/                         ← Cleaned pipeline outputs
└── docs/
    ├── powerbi_analytics_blueprint.md     ← 6-page Power BI design spec
    ├── figures/eda/                       ← 20 EDA visualization PNGs
    ├── results/                           ← Query outputs, metrics
    ├── api.md                             ← API documentation
    └── (other docs...)
```

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| **Python** | 3.10+ | Preprocessing, ML, EDA |
| **Node.js** | v18.0+ LTS | Backend API + Frontend dev server |
| **npm** | 9.0+ | Package management |
| **PostgreSQL** | 14+ | Database (port 5432) |
| **Power BI Desktop** | Latest | Analytics report (free download) |

---

## Step-by-Step Setup & Launch Guide

### ① Environment Setup

```bash
# Clone the repository
git clone <repo-url>
cd Road-accident-hotspot-analysis

# Create Python virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate       # macOS/Linux
# venv\Scripts\activate        # Windows

# Install Python dependencies
pip install -r python/requirements.txt
```

---

### ② Configure Environment Variables

```bash
# Copy the environment template
cp .env.example .env

# Edit .env with your PostgreSQL credentials
nano .env   # or use any text editor
```

Required `.env` variables:
```env
PGHOST=localhost
PGPORT=5432
PGDATABASE=road_safety_db
PGUSER=your_username
PGPASSWORD=your_password
BACKEND_PORT=4000
VITE_API_BASE_URL=http://localhost:4000
```

---

### ③ Download Raw STATS19 Data

```bash
# Download raw STATS19 CSVs into data/raw/
python python/ingestion/download_data.py

# Extract official reference code tables into data/reference/
python python/ingestion/build_reference_tables.py

# Validate raw data integrity, schema, and geographic bounds
python python/ingestion/validate_data.py
```

> ⏱️ Download takes 5–15 minutes depending on internet speed.  
> Data is ~500MB. Raw files are gitignored.

---

### ④ Run Full Preprocessing Pipeline

**Option A — Single command (recommended):**
```bash
# Run everything: clean, feature engineering, EDA visualizations, copy results
python preprocessing/run_all_preprocessing.py

# If data already downloaded, skip the download step:
python preprocessing/run_all_preprocessing.py --skip-download
```

**Option B — Step by step:**
```bash
# Step 1: Run unit tests on cleaning functions
pytest -v python/tests/test_preprocessing.py

# Step 2: Execute full cleaning + feature engineering pipeline
python python/preprocessing/run_pipeline.py

# Step 3: Inspect quality report
cat data/processed/quality_report.json

# Step 4: Generate all 20 EDA visualizations
python python/analysis/run_eda.py
```

**Outputs produced:**

| File | Location |
|---|---|
| `accidents_clean.csv` | `data/processed/` and `preprocessing/results_of_preprocessing/` |
| `vehicles_clean.csv` | `data/processed/` and `preprocessing/results_of_preprocessing/` |
| `casualties_clean.csv` | `data/processed/` and `preprocessing/results_of_preprocessing/` |
| `quality_report.json` | `data/processed/` and `preprocessing/results_of_preprocessing/` |
| `preprocessing_summary.md` | `preprocessing/results_of_preprocessing/` |
| 20 EDA figures (PNG) | `docs/figures/eda/` |

---

### ⑤ Database Setup & Data Loading

```bash
# Create PostgreSQL database (run once)
createdb road_safety_db   # or create via pgAdmin

# Initialize schema, constraints, indexes, and seed data
python database/run_sql.py --reset

# Bulk load all cleaned STATS19 data into PostgreSQL (~38s)
python python/db/load_data.py --reset

# Verify database integrity and row counts
python python/db/verify_load.py

# Create analytical views and materialized heatmap
python database/run_sql.py --views-only

# Execute all 20 analytical SQL queries (outputs to docs/results/sql/)
python database/run_queries.py
```

---

### ⑥ Spatial Hotspot Detection

```bash
# Generate k-distance elbow curve for DBSCAN parameter tuning
python python/hotspot/tune_parameters.py

# Run DBSCAN clustering (ε=150m, MinPts=30) → 704 clusters
python python/hotspot/detect_hotspots.py

# Sync hotspot results to PostgreSQL
python database/run_sql.py --views-only
```

---

### ⑦ Train & Export Severity Prediction Model

```bash
# Train all model variants (Dummy, Logistic Regression, Decision Tree, Random Forest)
python python/prediction/train.py

# Evaluate model performance and generate diagnostic reports
python python/prediction/evaluate.py

# Export model weights to JSON for Node.js in-memory scoring
python python/prediction/export_model.py
```

**Model outputs:**
- `models/risk_model.json` — Logistic regression weights (JS-portable)
- `models/risk_model.joblib` — Python scikit-learn model
- `models/all_pipelines.joblib` — All 4 trained pipelines
- `docs/results/model/` — Performance metrics, confusion matrix, ROC curve

---

### ⑧ Start Backend API Server

```bash
# Install backend Node.js dependencies
cd backend && npm install

# Run backend tests (30 test cases)
npm test

# Start development server (http://localhost:4000)
npm run dev
```

Verify backend is running:
```bash
curl http://localhost:4000/api/health
# Expected: {"status":"ok","database":{"connected":true,...}}
```

Key API endpoints:
| Endpoint | Description |
|---|---|
| `GET /api/health` | Server and database health check |
| `GET /api/accidents/stats` | KPI statistics with filter support |
| `GET /api/accidents/trends` | Yearly trend data |
| `GET /api/hotspots` | DBSCAN cluster list with risk scores |
| `POST /api/predict/risk` | Severity risk prediction |
| `GET /api/sql/queries` | List of 20 analytical queries |
| `GET /api/sql/run/:queryId` | Execute specific analytical query |

---

### ⑨ Start Frontend Dashboard

```bash
# Open a new terminal tab (keep backend running in previous tab)
cd frontend && npm install

# Start Vite dev server (http://localhost:5173)
npm run dev
```

Open your browser at: **http://localhost:5173**

**Dashboard pages:**
| URL | Page |
|---|---|
| `/` | Executive Overview (KPIs, trends) |
| `/analysis` | Accident Factor Analysis |
| `/hotspots` | Geospatial Hotspot Map |
| `/prediction` | Risk Prediction Simulator |
| `/sql-insights` | SQL Insights Explorer |
| `/methodology` | ERD & System Architecture |

---

### ⑩ Launch Power BI Report

```bash
# 1. Ensure all processed data is ready (Step ④ above)
ls data/processed/  # Should show accidents_clean.csv, vehicles_clean.csv, casualties_clean.csv

# 2. Download Power BI Desktop (free)
# https://powerbi.microsoft.com/en-us/desktop/

# 3. Open the report file
# File: powerbi/RoadAccidentAnalytics.pbix
# (See powerbi/README_PowerBI.md for full instructions)
```

**On first open in Power BI Desktop:**
1. Go to **Home → Transform Data → Data Source Settings**
2. For each table, click **Change Source** and update paths to your `data/processed/` folder
3. Click **Close & Apply** then **Home → Refresh**

**Power BI Report Pages:**

| Page | Content |
|---|---|
| 1. Overview | KPI cards, 5-year trend, severity donut, region ranking |
| 2. Temporal | Hourly bar, day×hour heatmap, monthly seasonality |
| 3. Geographic | Cluster map, DBSCAN hotspot table, risk rankings |
| 4. Diagnostic | Weather/road/light condition severity charts, correlation heatmap |
| 5. ML Evaluation | Confusion matrix, ROC curve, feature importance, prediction explorer |
| 6. Decision Support | Priority investigation ranking, Pareto chart, action recommendations |

---

## Showcasing the Project — Quick Demo

### Show Preprocessing Results
```bash
# Print cleaning summary
cat preprocessing/results_of_preprocessing/preprocessing_summary.md

# Show quality report stats
python -c "
import json
with open('preprocessing/results_of_preprocessing/quality_report.json') as f:
    qr = json.load(f)
acc = qr['row_counts']['accidents']
print(f'Raw accidents: {acc[\"raw\"]:,}')
print(f'Cleaned accidents: {acc[\"cleaned\"]:,}')
print(f'Duplicates removed: {acc[\"duplicates_dropped\"]:,}')
print(f'Valid coordinates: {acc[\"valid_coordinates\"]:,}')
print(f'Severe rate: {qr[\"target_distribution\"][\"severe_percentage\"]}%')
"

# List generated EDA figures
ls docs/figures/eda/
```

### Show All EDA Visualizations
```bash
# Open the EDA figures folder in file manager
xdg-open docs/figures/eda/        # Linux
# open docs/figures/eda/           # macOS

# Or generate them fresh
python python/analysis/run_eda.py
```

### Test Risk Prediction API
```bash
curl -X POST http://localhost:4000/api/predict/risk \
  -H "Content-Type: application/json" \
  -d '{
    "time_period": "Night",
    "day_of_week_name": "Saturday",
    "weather_condition_name": "Raining no high winds",
    "road_surface_condition_name": "Wet or damp",
    "light_condition_name": "Darkness - lights lit",
    "road_type_name": "Single carriageway",
    "road_class_name": "A",
    "junction_detail_name": "T or staggered junction",
    "junction_control_name": "Give way or uncontrolled",
    "urban_rural_name": "Rural",
    "hour": 23,
    "month": 11,
    "speed_limit": 60,
    "number_of_vehicles": 2,
    "is_weekend": 1,
    "involves_motorcycle": 0,
    "involves_hgv": 0,
    "involves_cyclist": 0
  }'
```

### Run Unit Tests
```bash
# Python preprocessing tests
pytest -v python/tests/test_preprocessing.py

# Backend API tests
cd backend && npm test

# Full test suite
pytest -v && cd backend && npm test
```

---

## Troubleshooting

| Issue | Solution |
|---|---|
| `FileNotFoundError: data/raw/...` | Run `python python/ingestion/download_data.py` first |
| `PGPASSWORD authentication failed` | Check `.env` file credentials and PostgreSQL user permissions |
| Backend port 4000 already in use | `lsof -ti:4000 \| xargs kill -9` then restart |
| Frontend blank page | Check that backend is running on port 4000; inspect browser console |
| Power BI "data source not found" | Update paths in Transform Data → Data Source Settings |
| EDA plots not generating | Run `pip install matplotlib seaborn pandas numpy` in venv |
| DBSCAN step slow | Normal — 513,801 coordinate pairs take ~2 minutes |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Raw Data | UK DfT STATS19 CSVs (Open Government Licence v3.0) |
| Preprocessing | Python 3.10, pandas, NumPy |
| Machine Learning | scikit-learn (Logistic Regression, DBSCAN) |
| Visualization (EDA) | Matplotlib, Seaborn |
| Analytics (Power BI) | Power BI Desktop (DAX, M, ArcGIS Maps) |
| Database | PostgreSQL 14+, psycopg2, SQLAlchemy |
| Backend API | Node.js 18+, Express, pg |
| Frontend | React 18, Vite 5, Tailwind CSS 3, Recharts, Leaflet |
| Maps | Leaflet.js, OpenStreetMap tiles |

---

## Milestone Progress

- **Milestone 0:** Project Scaffolding — ✅ Completed
- **Milestone 1:** Data Acquisition & Validation — ✅ Completed (513,801 collisions, 76 reference tables)
- **Milestone 2:** Preprocessing & Feature Engineering — ✅ Completed (3 clean CSVs, quality report, unit tests)
- **Milestone 3:** Database Schema & Constraints — ✅ Completed (18 tables, 87 constraints, 42 indexes)
- **Milestone 4:** Database Loading — ✅ Completed (2.1M records via COPY in ~38s)
- **Milestone 5:** SQL Views & Query Suite — ✅ Completed (4 views, 20 analytical queries)
- **Milestone 6:** EDA & Statistical Profiling — ✅ Completed (20 figures, 95% Wilson CIs)
- **Milestone 7:** Spatial Hotspot Clustering — ✅ Completed (DBSCAN 150m/30, 704 clusters)
- **Milestone 8:** Severity Prediction Model — ✅ Completed (Logistic Regression, JSON export, 6-decimal parity)
- **Milestone 9:** Backend API — ✅ Completed (30 passing tests, RESTful API docs)
- **Milestone 10:** Frontend Dashboard Core — ✅ Completed
- **Milestone 11:** Full Integration & Power BI Report — ✅ Completed (this milestone)

---

## License

Data: Contains public sector information licensed under the [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/).

Code: MIT License (see LICENSE file).

*Academic and Teaching Project: Data Visualization + DBMS Capstone. Not certified for emergency or operational dispatch.*
