# Smart Road Accident Hotspot Analysis and Risk Prediction System

## Summary
The **Smart Road Accident Hotspot Analysis and Risk Prediction System** is an end-to-end Data Visualization and DBMS/SQL project designed to identify high-risk road collision locations (hotspots) and predict accident severity using historical road safety records. Built on the UK Department for Transport's STATS19 dataset across five recent complete years (2021–2025), the system combines spatial clustering (DBSCAN in British National Grid metres) and binary risk classification (Logistic Regression) with an interactive spatial and analytical dashboard (React, Leaflet, Recharts) powered by a lightweight Node.js/Express backend and PostgreSQL relational database. The project prioritizes academic clarity, explainability during viva examinations, and strict reproducibility without heavy cloud or container dependencies.

---

## Pipeline Architecture

```text
+-----------------------------------------------------------------------------------+
|                                  DATA PIPELINE                                    |
|                                                                                   |
|  [UK DfT STATS19 Data]                                                            |
|  (Collisions, Vehicles, Casualties: 2021-2025)                                    |
|         |                                                                         |
|         v                                                                         |
|  [Python Ingestion & Preprocessing]                                               |
|  (Clean, Validate, Derive time_period proxy, Calculate BNG Easting/Northing)      |
|         |                                                                         |
|         +----------------------------------+                                      |
|         |                                  |                                      |
|         v                                  v                                      |
|  [PostgreSQL Database]             [Python ML & Spatial Analysis]                 |
|  - Normalized Star Schema          - DBSCAN Spatial Hotspot Clustering            |
|  - Aggregated Spatial Views        - Logistic Regression (is_severe target)       |
|  - Indexed Spatial & Temporal Data - Model Weights & Metrics Exported as JSON     |
|         |                                  |                                      |
|         +----------------+                 |                                      |
|                          |                 |                                      |
+--------------------------|-----------------|--------------------------------------+
                           |                 |
                           v                 v
+-----------------------------------------------------------------------------------+
|                                BACKEND & SERVING                                  |
|                                                                                   |
|  [Node.js + Express API Server] (Port 4000)                                       |
|  - RESTful Endpoints for Hotspots, Statistics, and Filter Queries                 |
|  - In-memory Risk Scoring Engine using Exported Model JSON (No Python daemon)     |
|  - Direct SQL Queries for Fast Analytics & Aggregations                          |
+-----------------------------------------------------------------------------------+
                           |
                           v
+-----------------------------------------------------------------------------------+
|                               FRONTEND DASHBOARD                                  |
|                                                                                   |
|  [React + Vite + Tailwind CSS]                                                    |
|  - Leaflet / OpenStreetMap: Interactive Cluster & Hotspot Map Visualization        |
|  - Recharts: Severity Breakdown, Weather/Light Analysis, Hourly Trend Graphs      |
|  - Real-time Scenario Risk Predictor Form & Severity Probability Gauge            |
+-----------------------------------------------------------------------------------+
```

---

## Planned Folder Map

```text
DV Project/
├── .env.example               # Template environment configuration
├── .gitignore                  # Git ignore rules for data, env, and build artifacts
├── README.md                   # Project overview, architecture, and setup instructions
├── database/                   # SQL schemas, migrations, and analytical views
├── data/
│   ├── raw/                    # Downloaded raw STATS19 CSV files (gitignored)
│   ├── reference/              # Lookup tables, road safety codebooks & metadata
│   └── processed/              # Cleaned & joined datasets for ingestion/modeling
├── python/
│   ├── config.py               # Central path & DB configuration using pathlib
│   ├── requirements.txt        # Python analytical dependencies
│   ├── ingestion/              # Downloaders and raw data loaders
│   ├── preprocessing/          # Data cleaning, feature engineering & transformations
│   ├── analysis/               # Exploratory data analysis & statistical summaries
│   ├── visualization/          # Static publication/viva charts (Matplotlib/Seaborn)
│   ├── hotspot/                # DBSCAN spatial clustering and ranking algorithms
│   ├── prediction/             # Logistic Regression training & JSON export
│   ├── db/                     # Database loading and ETL scripts (SQLAlchemy/psycopg2)
│   ├── notebooks/              # Jupyter notebooks for iterative analysis & EDA
│   └── tests/                  # Unit and pipeline tests for Python modules
├── backend/
│   ├── src/
│   │   ├── routes/             # Express API route handlers
│   │   ├── controllers/        # Request processing & business logic
│   │   ├── services/           # DB query services & in-memory risk scoring
│   │   ├── db/                 # PostgreSQL pool/client configuration
│   │   └── utils/              # Helper utilities & validators
│   └── tests/                  # API endpoint and service tests
├── frontend/                   # React + Vite + Tailwind + Leaflet + Recharts application
├── models/                     # Trained model weights, parameters & metrics (JSON)
└── docs/
    ├── architecture.md         # Detailed Mermaid architectural diagrams
    ├── DECISIONS.md            # Technical and methodology decision records
    ├── PROGRESS.md             # Running progress log and milestone tracker
    ├── figures/                # Visuals, figures, and plots for reports
    ├── results/                # Evaluation results, tables, and metrics
    ├── viva/                   # Viva examination prep notes & Q&A guide
    └── report/                 # Coursework project report and documentation
```

---

## Prerequisites

Before setting up and running the project, ensure the following software is installed on your machine:

1. **Python**: Python `3.10` or higher (tested on Python 3.10+)
2. **Node.js**: Node.js `v18.0.0` or higher (LTS recommended) and `npm`
3. **PostgreSQL**: PostgreSQL `14` or higher running locally on port `5432`

---

## Get the Data

The raw STATS19 datasets and the official DfT data guide can be downloaded and validated automatically:

```bash
# 1. Create and activate a Python virtual environment
python3 -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r python/requirements.txt

# 3. Download raw STATS19 CSVs and Data Guide into data/raw/ and data/reference/
python python/ingestion/download_data.py

# 4. Extract official code-to-label reference CSV tables into data/reference/
python python/ingestion/build_reference_tables.py

# 5. Run full data integrity, geospatial bounds, and schema validation suite
python python/ingestion/validate_data.py
```

Validation metrics and detailed quality assessments are saved to `docs/results/validation_metrics.json` and documented in [docs/dataset_validation.md](file:///Users/makarandkulkarni/Myspace/DV%20Project/docs/dataset_validation.md).

---

## Data Preprocessing & Feature Engineering

Once raw data is downloaded, execute the end-to-end cleaning and feature engineering pipeline:

```bash
# Run unit tests on preprocessing logic
pytest -v python/tests/test_preprocessing.py

# Execute full preprocessing pipeline (outputs to data/processed/)
python python/preprocessing/run_pipeline.py
```

Cleaned datasets and quality transformation reports are saved to `data/processed/` and documented in [docs/preprocessing.md](file:///Users/makarandkulkarni/Myspace/DV%20Project/docs/preprocessing.md).

---

## Database Setup & Data Ingestion
 
Create the PostgreSQL schema, constraints, performance indexes, official seed reference data, and load the processed STATS19 dataset:
 
```bash
# 1. Initialize or reset schema, constraints, and seed lookups
python database/run_sql.py --reset

# 2. Bulk load cleaned STATS19 dataset (COPY in one transaction), build indexes, and ANALYZE
python python/db/load_data.py --reset

# 3. Verify database integrity, foreign keys, row parity, and analytical queries
python python/db/verify_load.py

# 4. Create analytical views and materialized heatmap view
python database/run_sql.py --views-only

# 5. Execute 16 analytical SQL queries and export benchmark results to docs/results/sql/
python database/run_queries.py

# 6. (Optional) Run ACID transaction management demonstration
python -c "import psycopg2, python.config as config; conn=psycopg2.connect(host=config.DB_HOST, port=config.DB_PORT, user=config.DB_USER, database=config.DB_NAME); cur=conn.cursor(); cur.execute(open('database/transactions_demo.sql').read()); conn.commit(); print('Transactions demo executed successfully'); conn.close()"
```

Schema design rationales, normal form proofs, ER diagrams, load performance reports, and SQL guides are documented in [docs/schema_design.md](file:///Users/makarandkulkarni/Myspace/DV%20Project/docs/schema_design.md), [docs/ERD.md](file:///Users/makarandkulkarni/Myspace/DV%20Project/docs/ERD.md), [docs/data_load_report.md](file:///Users/makarandkulkarni/Myspace/DV%20Project/docs/data_load_report.md), and [docs/sql_guide.md](file:///Users/makarandkulkarni/Myspace/DV%20Project/docs/sql_guide.md).

---

## Exploratory Data Analysis & Visualization
 
Run the automated statistical visualizer and generate publication-grade figures or execute the interactive Jupyter notebook:
 
```bash
# 1. Generate 15 statistical figures in docs/figures/eda/
python python/analysis/run_eda.py

# 2. Execute EDA Jupyter Notebook top-to-bottom
jupyter nbconvert --to notebook --execute --inplace python/notebooks/01_eda.ipynb
```

Detailed visual findings, 95% Wilson Score confidence intervals, and methodological caveats are documented in [docs/eda_findings.md](file:///Users/makarandkulkarni/Myspace/DV%20Project/docs/eda_findings.md).

---

## Spatial Hotspot Clustering & Risk Scoring

Detect geographic collision clusters using DBSCAN on projected metric coordinates (OSGB36 Easting/Northing in metres) and compute multi-criteria risk scores:

```bash
# 1. Generate k-distance elbow curve and parameter sensitivity grid search
./venv/bin/python python/hotspot/tune_parameters.py

# 2. Execute DBSCAN spatial clustering, compute risk scores, and sync to PostgreSQL
./venv/bin/python python/hotspot/detect_hotspots.py

# 3. Apply updated hotspot and 500m grid views
./venv/bin/python database/run_sql.py --views-only

# 4. Execute all 20 DBMS analytical queries and export outputs
./venv/bin/python database/run_queries.py
```

Methodology, parameter tuning justifications, and risk score formulations are documented in [docs/hotspot_methodology.md](file:///Users/makarandkulkarni/Myspace/DV%20Project/docs/hotspot_methodology.md).

---

## Severity-Risk Prediction Model & Parity Export

Train, evaluate, and export an explainable severity classification model (strictly quarantining post-crash casualty metrics to prevent target leakage):

```bash
# 1. Train Dummy, Logistic Regression, Decision Tree, and Random Forest pipelines
./venv/bin/python python/prediction/train.py

# 2. Evaluate diagnostics, temporal validation, and store metrics in PostgreSQL
./venv/bin/python python/prediction/evaluate.py

# 3. Export JSON weights, generate test vectors, and verify 6-decimal parity
./venv/bin/python python/prediction/export_model.py
```

Model performance, calibration curves, odds ratios, and honest limitations are documented in [docs/model_report.md](file:///Users/makarandkulkarni/Myspace/DV%20Project/docs/model_report.md).

---

## Backend API Server (Node.js & Express)

Run the high-performance, read-only Express API server providing parameterized SQL endpoints and in-memory JS risk prediction:

```bash
# 1. Install backend dependencies
cd backend && npm install

# 2. Run automated test suite (filters, risk model parity, API integration smoke tests)
npm test

# 3. Start development server (default: http://localhost:4000)
npm run dev
```

Full API endpoint specifications, parameters, curl commands, and JSON responses are documented in [docs/api.md](file:///Users/makarandkulkarni/Myspace/DV%20Project/docs/api.md).

---

## Frontend Interactive Dashboard (React, Tailwind & Recharts)

Run the interactive React frontend dashboard featuring real-time filter synchronization, executive safety KPIs, 5-year trends, and multidimensional factor analysis:

```bash
# 1. Install frontend dependencies
cd frontend && npm install

# 2. Build for production verification
npm run build

# 3. Start development server (default: http://localhost:5173)
npm run dev
```

---

## Milestone Progress

- **Milestone 0: Project Scaffolding & Configuration** &mdash; *Completed*
- **Milestone 1: Data Acquisition & Validation** &mdash; *Completed* (513,801 collisions validated; 72 reference tables generated; Go decision)
- **Milestone 2: Preprocessing & Feature Engineering** &mdash; *Completed* (3 clean CSVs generated, unit tests passing, quality report created)
- **Milestone 3: Database Schema, Constraints & Seed Data (PostgreSQL)** &mdash; *Completed* (18 tables created, 87 check constraints, 42 indexes, 13 seeded lookup tables)
- **Milestone 4: Bulk Database Loading (PostgreSQL ETL)** &mdash; *Completed* (2.1M records loaded via COPY in ~38s, 10 indexes created, 0 orphans, 100% verified)
- **Milestone 5: SQL Analytical Views & DBMS Query Suite** &mdash; *Completed* (4 views, 1 materialized heatmap view, 16 analytical queries, optimization benchmarks, SQL guide)
- **Milestone 6: Exploratory Data Analysis & Statistical Profiling** &mdash; *Completed* (15 figures generated with 95% Wilson CIs, executed notebook, findings report with caveats)
- **Milestone 7: Spatial Hotspot Clustering & DBMS Queries 17–20** &mdash; *Completed* (DBSCAN 150m/30, 704 clusters, F/S/T risk scoring, PostgreSQL sync, 20 SQL queries passing)
- **Milestone 8: Explainable Severity Prediction Model & Parity Export** &mdash; *Completed* (Balanced Logistic Regression, temporal validation, JSON weights, 6-decimal parity verified)
- **Milestone 9: Backend API Development (Express/Node)** &mdash; *Completed* (RESTful API, strict parameterization, pure JS scoring, 30 passing tests, docs/api.md)
- **Milestone 10: Frontend Core Dashboard (Overview & Accident Analysis)** &mdash; *Completed* (React 18 + Vite + Tailwind, FilterContext, Recharts suite, live API synchronization)
- **Milestone 11: Spatial Map Visualization, Interactive ML Simulator & SQL Runner** &mdash; *Pending*
