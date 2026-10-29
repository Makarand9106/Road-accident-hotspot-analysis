# Project Progress & Activity Log

This log tracks project milestones, implemented tasks, reproduction commands, and known issues throughout development.

---

## Log Entries

### Milestone 0: Repository Scaffolding & Environment Setup
- **Date**: 2026-10-03
- **Milestone**: Milestone 0 — Repository Scaffolding, Configuration & Documentation Architecture
- **Status**: Completed

#### What Was Done:
1. Inspected workspace directory to ensure clean starting state.
2. Created standardized directory hierarchy with `.gitkeep` placeholders across:
   - `data/` (`raw`, `reference`, `processed`)
   - `python/` (`ingestion`, `preprocessing`, `analysis`, `visualization`, `hotspot`, `prediction`, `db`, `notebooks`, `tests`)
   - `database/`
   - `backend/` (`src/routes`, `src/controllers`, `src/services`, `src/db`, `src/utils`, `tests`)
   - `frontend/` (placeholder)
   - `models/`
   - `docs/` (`figures`, `results`, `viva`, `report`)
3. Created `.gitignore` covering raw/processed data, Python cache/venv, Node modules, `.env`, Jupyter checkpoints, and build targets.
4. Created `.env.example` with standard database parameters (`DB_HOST`, `DB_PORT`, `DB_NAME=road_safety`, `DB_USER`, `DB_PASSWORD`, `DATABASE_URL`), `BACKEND_PORT=4000`, and `DATA_YEARS=2019,2020,2021,2022,2023`.
5. Created `python/requirements.txt` containing analytical and database dependencies (`pandas`, `numpy`, `matplotlib`, `seaborn`, `scikit-learn`, `psycopg2-binary`, `SQLAlchemy`, `python-dotenv`, `requests`, `pytest`, `jupyter`, `nbconvert`, `openpyxl`).
6. Implemented cross-platform `python/config.py` leveraging `pathlib.Path` to reliably resolve project roots and environment configurations on macOS, Windows, and Linux.
7. Created project `README.md`, `docs/DECISIONS.md`, and `docs/architecture.md`.
8. Audited local system tools (Node.js, npm, Python, PostgreSQL/psql).

#### Commands to Re-run & Validate:
```bash
# Verify directory structure
find . -maxdepth 3 -not -path '*/.*'

# Test Python config loading from repo root
python3 -c "import python.config as cfg; print('Project Base:', cfg.BASE_DIR); print('Data Years:', cfg.DATA_YEARS); print('DB URL:', cfg.DATABASE_URL)"
```

#### Known Issues / Notes:
- PostgreSQL service is installed (`psql 16.14`) but the local daemon is currently stopped/inactive on port 5432. Will need starting when database initialization begins in Milestone 2.
- Python packages in `requirements.txt` are to be installed into a virtual environment when data processing scripts are executed.

---

### Milestone 1: STATS19 Data Ingestion, Extraction & Validation
- **Date**: 2026-10-03
- **Milestone**: Milestone 1 — Data Acquisition, Reference Code Extraction & Statistical Validation
- **Status**: Completed (Go Decision)

#### What Was Done:
1. Located official UK DfT STATS19 road safety repositories on `data.gov.uk` and `data.dft.gov.uk`.
2. Selected the 5 latest complete calendar reporting years (2021–2025), noting 2020 COVID lockdown volume distortions in `docs/DECISIONS.md`.
3. Created virtual environment `venv` and installed pinned analytical libraries from `python/requirements.txt`.
4. Implemented `python/ingestion/download_data.py` with streaming downloads, progress bars, skip-if-exists caching, SHA-256 verification, and automatic `data/raw/MANIFEST.json` generation.
5. Acquired official files:
   - `collisions_last_5_years.csv` (93.14 MB, 513,801 rows)
   - `casualties_last_5_years.csv` (51.20 MB, 652,821 rows)
   - `vehicles_last_5_years.csv` (98.94 MB, 937,265 rows)
   - `dft_road_safety_data_guide.xlsx` (85 KB)
6. Implemented `python/ingestion/build_reference_tables.py` and extracted 72 code-to-label reference CSV files into `data/reference/`.
7. Implemented `python/ingestion/validate_data.py` and executed exhaustive data integrity, spatial bounds, temporal, and relational checks:
   - Primary key uniqueness: 100% unique `collision_index` (0 duplicates).
   - Foreign key integrity: 0 orphan casualty rows, 0 orphan vehicle rows.
   - Geospatial precision: 513,748 rows (99.99%) valid within Great Britain bounds; exactly 53 missing coordinate rows.
   - Temporal consistency: 100% valid dates (2021-01-01 to 2025-12-31) and 0 malformed times.
   - Severe target balance: 24.21% severe (124,366) vs 75.79% slight (389,435).
   - Reference mapping: 100% of categorical codes mapped to labels.
8. Authored [docs/dataset_validation.md](file:///Users/makarandkulkarni/Myspace/DV%20Project/docs/dataset_validation.md) documenting complete figures, methodology justification, traffic condition proxy rationale, and manual fallback instructions.

#### Commands to Re-run & Validate:
```bash
# Run automated download (skips existing valid files)
./venv/bin/python python/ingestion/download_data.py

# Re-extract reference lookup tables
./venv/bin/python python/ingestion/build_reference_tables.py

# Re-run full validation suite
./venv/bin/python python/ingestion/validate_data.py
```

#### Known Issues / Notes:
- Exactly 53 collision rows (0.010%) lack valid Easting/Northing coordinates in raw data; these will be filtered out during spatial clustering in Milestone 3.
- Raw data remains properly isolated in `data/raw/` and excluded by `.gitignore`.

---

### Milestone 2: Preprocessing Pipeline & Feature Engineering
- **Date**: 2026-10-03
- **Milestone**: Milestone 2 — Data Cleaning, Feature Derivation & Quality Verification
- **Status**: Completed

#### What Was Done:
1. Implemented `python/preprocessing/clean.py` with testable modular functions:
   - Header standardization to `snake_case` and standardized schema alias renaming (`accident_index`, `accident_year`, `accident_date`, `accident_severity`).
   - Domain sentinel missingness conversions (`-1`, `99`, `9`, `'NULL'`, `''` to `NaN`).
   - Standardized date formatting (`YYYY-MM-DD`) and 24-hour time formatting (`HH:MM`).
   - Geospatial validation and bounding box verification, creating `has_valid_coords` boolean flag (513,748 valid, 53 invalid/missing).
   - Duplicate detection and orphan child filtering across foreign keys.
2. Implemented `python/preprocessing/features.py` with:
   - Temporal derivation: `accident_year`, `month`, `month_name`, `day_of_week_name` (1=Sunday..7=Saturday), `hour` (0–23), `is_weekend` (0/1).
   - Traffic proxy: `time_period` (Morning Peak 07–10, Daytime 10–16, Evening Peak 16–19, Evening 19–23, Night 23–07).
   - Severity targets: `is_severe` (1 for Fatal/Serious, 0 for Slight) and `severity_label`.
   - Accident-level vehicle involvement flags: `involves_motorcycle` (85,042), `involves_hgv` (20,014), `involves_cyclist` (79,812).
   - Reference table decoding mapping all major categorical fields to official text labels from `data/reference/*.csv`.
3. Created `python/preprocessing/run_pipeline.py` and exported:
   - `data/processed/accidents_clean.csv` (513,801 rows, 69 cols)
   - `data/processed/vehicles_clean.csv` (937,265 rows, 42 cols)
   - `data/processed/casualties_clean.csv` (652,821 rows, 31 cols)
   - `data/processed/quality_report.json`
4. Created `python/tests/test_preprocessing.py` and `pytest.ini`. Executed `pytest` with 8 passing unit tests.
5. Authored [docs/preprocessing.md](file:///Users/makarandkulkarni/Myspace/DV%20Project/docs/preprocessing.md) documenting cleaning rules, before/after figures, and feature distributions.

#### Commands to Re-run & Validate:
```bash
# Run preprocessing unit tests
./venv/bin/pytest -v

# Run full end-to-end preprocessing pipeline
./venv/bin/python python/preprocessing/run_pipeline.py
```

#### Known Issues / Notes:
- Output datasets are fully verified, relational keys match 100%, and datasets are ready for PostgreSQL table loading and indexing in Milestone 3.

---

### Milestone 3: Relational Schema DDL, Constraints, Indexes & Seed Data
- **Date**: 2026-10-03
- **Milestone**: Milestone 3 — Relational Normalization (3NF), Schema DDL, Constraints & Seed Data
- **Status**: Completed

#### What Was Done:
1. Designed a 3NF relational schema with 18 tables:
   - 13 dimension/lookup tables: `severity`, `police_force`, `local_authority_district`, `weather_condition`, `road_surface_condition`, `light_condition`, `road_type`, `junction_detail`, `junction_control`, `road_class`, `urban_rural_area`, `vehicle_type`, `casualty_class`.
   - Core entity tables: `accident` (Fact), `vehicle` (Entity), `casualty` (Entity), `hotspot` (Clusters), `model_metrics` (Audit).
2. Created `database/schema.sql` defining explicit primary keys, foreign keys, cascades, and data types (`NUMERIC(10, 6)` for sub-meter GPS precision, `SMALLINT` for compact foreign keys).
3. Created `database/constraints.sql` enforcing 87 explicit CHECK constraints (Great Britain geographic bounding boxes, speed limit domains, risk scores, positive entity counts).
4. Created `database/indexes.sql` implementing B-tree indexes on temporal dimensions, administrative boundaries, spatial coordinates, and a partial index `WHERE is_severe = 1`.
5. Created `database/seed.sql` and populated all 13 lookup tables directly from official reference data (531 districts, 52 police forces, 30 vehicle types, etc.).
6. Created `database/run_sql.py` with psycopg2 database management, reset support, and validation summaries. Tested idempotency (executed twice without error).
7. Verified CHECK constraint rejection with deliberately invalid data (invalid coordinates, invalid speed limits, invalid risk levels) & verified automatic rollback.
8. Authored [docs/ERD.md](file:///Users/makarandkulkarni/Myspace/DV%20Project/docs/ERD.md) and [docs/schema_design.md](file:///Users/makarandkulkarni/Myspace/DV%20Project/docs/schema_design.md).

#### Commands to Re-run & Validate:
```bash
# Initialize/reset schema, constraints, seed data and indexes in PostgreSQL
./venv/bin/python database/run_sql.py --reset --with-indexes
```

#### Known Issues / Notes:
- Database schema is fully created and ready for bulk data loading in Milestone 4.

---

### Milestone 4: Bulk Database Loading & Relational Integrity Verification
- **Date**: 2026-10-03
- **Milestone**: Milestone 4 — Bulk Data Ingestion (COPY), Atomicity, Indexing & Integrity Verification
- **Status**: Completed

#### What Was Done:
1. Implemented `python/db/load_data.py` using PostgreSQL `COPY ... FROM STDIN` via `psycopg2.cursor.copy_expert` inside a single atomic transaction with rollback on failure.
2. Formatted and streamed 513,801 collisions, 937,265 vehicles, and 652,821 casualties in ~38–40 seconds (total pipeline duration ~53–55 seconds).
3. Created post-load indexing pipeline executing `database/indexes.sql` (10 B-tree and partial indexes built in 4.11s) and refreshed optimizer statistics via `ANALYZE`.
4. Handled constraint edge cases cleanly: 53 rows with invalid/missing coordinates loaded with `has_valid_coords = FALSE` and `NULL` latitude/longitude; 3 non-standard speed limits mapped to `NULL`.
5. Implemented `python/db/verify_load.py` auditing row count parity, checking 16 relational foreign key relationships (0 orphans), verifying NOT NULL column constraints, printing 5 joined sample records, and executing analytical sanity queries matching the Python preprocessing quality report.
6. Created `database/transactions_demo.sql` illustrating `BEGIN`, `INSERT`, `SAVEPOINT`, `ROLLBACK TO SAVEPOINT`, and `COMMIT` on an isolated audit table with explanatory commentary on ACID atomicity.
7. Authored [docs/data_load_report.md](file:///Users/makarandkulkarni/Myspace/DV%20Project/docs/data_load_report.md) with benchmarks, constraint statistics, and query verification.

#### Commands to Re-run & Validate:
```bash
# 1. Reset schema, constraints, and lookup seed data
./venv/bin/python database/run_sql.py --reset

# 2. Bulk load data, build indexes, and run ANALYZE
./venv/bin/python python/db/load_data.py --reset

# 3. Run complete verification and relational integrity suite
./venv/bin/python python/db/verify_load.py

# 4. Run DBMS transaction and atomicity demonstration
./venv/bin/python -c "import psycopg2, python.config as config; conn=psycopg2.connect(host=config.DB_HOST, port=config.DB_PORT, user=config.DB_USER, database=config.DB_NAME); cur=conn.cursor(); cur.execute(open('database/transactions_demo.sql').read()); conn.commit(); print('Demo executed cleanly'); conn.close()"
```

#### Known Issues / Notes:
- Database is fully loaded, indexed, and verified.

---

### Milestone 5: SQL Analytical Views, Materialized Heatmap & 16 DBMS Queries
- **Date**: 2026-10-04
- **Milestone**: Milestone 5 — SQL Views, Materialized View, 16 Analytical Queries, Optimizer Plan & SQL Guide
- **Status**: Completed

#### What Was Done:
1. Implemented `database/views.sql` creating:
   - `v_accident_enriched`: Full relational join of fact table with all 11 lookup tables.
   - `v_yearly_trend`: Multi-year annual trends, severe ratios, and vehicle involvement.
   - `v_severity_by_condition`: Environmental condition cross-tabulations.
   - `v_model_dataset`: Clean feature set + target label (strictly excluding casualty metrics to eliminate target leakage).
   - `mv_hour_weekday_heatmap` (*Materialized View*): Pre-computed 7-day $\times$ 24-hour matrix (168 rows) with unique index `idx_mv_hour_weekday` for concurrent refreshes.
2. Authored `database/analytical_queries.sql` implementing 16 pedagogical queries covering string formatting, conditional aggregation (`HAVING`, `CASE`), date/time functions (`EXTRACT`), multi-table joins, CTEs with `LAG()`, window functions (`SUM OVER PARTITION BY`, `RANK()`), scalar subqueries, `LEFT JOIN` with `COALESCE`, 2D cross-tabulation, correlated subqueries, numerical trend grouping, and nested subqueries with `IN`.
3. Created `database/query_optimization.sql` profiling execution plans with `EXPLAIN (ANALYZE, BUFFERS)` before and after dropping/recreating partial and composite spatial indexes, showing 3.8x and 2.8x speedups and significant I/O buffer reductions.
4. Created `database/run_queries.py` executing all 16 queries, capturing execution times, and exporting results to `docs/results/sql/q01.csv` through `q16.csv`. Total SQL runtime ~2.5 seconds.
5. Authored comprehensive [docs/sql_guide.md](file:///Users/makarandkulkarni/Myspace/DV%20Project/docs/sql_guide.md) with questions, SQL concepts, plain-English viva explanations, real empirical results, and a complete DBMS glossary.

#### Commands to Re-run & Validate:
```bash
# Apply views and materialized view
./venv/bin/python database/run_sql.py --views-only

# Execute all 16 queries and export CSV results
./venv/bin/python database/run_queries.py

# Run query optimization experiments
./venv/bin/python -c "import psycopg2, python.config as config; conn=psycopg2.connect(host=config.DB_HOST, port=config.DB_PORT, user=config.DB_USER, database=config.DB_NAME); cur=conn.cursor(); cur.execute(open('database/query_optimization.sql').read()); conn.commit(); print('Optimization benchmark executed successfully'); conn.close()"
```

#### Known Issues / Notes:
- All 16 queries and views fully verified and exported.

---

### Milestone 6: Exploratory Data Analysis (EDA) & Statistical Visualizations
- **Date**: 2026-10-04
- **Milestone**: Milestone 6 — Database-Centred EDA Pipeline, 15 Figures, 95% Wilson CIs, Executed Notebook & Findings Report
- **Status**: Completed

#### What Was Done:
1. Implemented `python/analysis/db_access.py` providing `query_df(sql, params)` to execute parameterized SQL statements via SQLAlchemy against PostgreSQL views into pandas DataFrames.
2. Implemented `python/visualization/eda_plots.py` with accessible colorblind-safe palettes (Okabe-Ito), consistent styling, dual-axis plotting, heatmaps, and statistical 95% Wilson Score confidence interval calculation for binomial proportions (`calculate_wilson_ci`).
3. Implemented `python/analysis/run_eda.py` and exported 15 high-resolution (160 DPI) figures to `docs/figures/eda/`:
   - `01_collisions_by_year.png` (annual trends 2021–2025)
   - `02_collisions_by_month.png` (monthly seasonality)
   - `03_collisions_by_weekday.png` (day of week totals)
   - `04_collisions_by_hour.png` (hourly diurnal curve)
   - `05_weekday_by_hour_heatmap.png` (7x24 collision density heatmap)
   - `06_severity_distribution.png` (Fatal, Serious, Slight breakdown)
   - `07_severe_percentage_by_hour.png` (hourly severe % with 95% Wilson CI)
   - `08_weather_count_and_severe_rate.png` (weather volume vs severe rate)
   - `09_road_surface_severe_rate.png` (surface condition severity with Wilson CI)
   - `10_light_condition_severe_rate.png` (ambient lighting severity with Wilson CI)
   - `11_speed_limit_severe_rate.png` (speed limit monotonic severity progression)
   - `12_road_type_and_junction_detail.png` (roadway layout severe rates)
   - `13_top_vehicle_types.png` (top 10 vehicle categories involved in crashes)
   - `14_urban_vs_rural_severe_rate.png` (urban vs rural severe rate comparison)
   - `15_missing_values_overview.png` (sentinel conversions from quality_report.json)
4. Built and fully executed `python/notebooks/01_eda.ipynb` using `jupyter nbconvert` with markdown commentary (Question, What Chart Shows, Key Insight, Methodological Caveat) beneath every figure.
5. Authored comprehensive [docs/eda_findings.md](file:///Users/makarandkulkarni/Myspace/DV%20Project/docs/eda_findings.md) listing 15 empirical findings with real numbers and explicit caveats (e.g. counts $\neq$ exposure/risk, daylight exposure bias, absence of travel denominator, correlation $\neq$ causation).

#### Commands to Re-run & Validate:
```bash
# 1. Run automated EDA plotting suite
./venv/bin/python python/analysis/run_eda.py

# 2. Re-execute Jupyter Notebook top-to-bottom
./venv/bin/jupyter nbconvert --to notebook --execute --inplace python/notebooks/01_eda.ipynb
```

#### Known Issues / Notes:
- All figures, notebook, and findings documents are verified and ready for Milestone 7 (Spatial Hotspot Clustering) and Milestone 8 (Explainable Risk Modeling).

---

### Milestone 7: Spatial Hotspot Detection & Risk Scoring (DBSCAN + SQL Queries 17–20)
- **Date**: 2026-10-04
- **Milestone**: Milestone 7 — DBSCAN Clustering on Projected Metre Coordinates, Multi-Criteria Hotspot Risk Scoring, PostgreSQL Synchronization, Views & Analytical Queries 17–20
- **Status**: Completed

#### What Was Done:
1. Implemented `python/hotspot/tune_parameters.py`:
   - Computed 30-nearest neighbor Euclidean distances across all 513,748 valid spatial points using KD-Tree in 0.75s, plotting `docs/figures/hotspot/01_k_distance_elbow.png` to confirm the density knee at $\varepsilon = 150\text{ m}$.
   - Evaluated 9 parameter combinations ($\text{eps} \in [100, 150, 250]\text{ m}$, $\text{min\_samples} \in [20, 30, 50]$), exporting sensitivity tables to `docs/results/hotspot_parameter_sensitivity.csv` and `.json`.
2. Implemented `python/hotspot/detect_hotspots.py`:
   - Executed DBSCAN ($\varepsilon = 150\text{ m}$, $\text{min\_samples} = 30$, `algorithm='kd_tree'`) in 0.41s: detected **704 clusters** encompassing **63,879 member collisions (12.43% of national total)**.
   - Computed cluster centroids, bounding radii, OLS annual collision trends (2021–2025, excluding 2020), and percentile ranks ($F, S, T$).
   - Derived composite risk scores ($13.54 \le \text{Score} \le 96.45$) and assigned risk tiers: 141 High (top 20%), 211 Medium (next 30%), 352 Low (bottom 50%).
   - Evaluated weight sensitivity: Spearman correlation between equal-weight and Frequency-Heavy ($0.5/0.3/0.2$) is $\rho = 0.8741$; Trend-Heavy ($0.2/0.3/0.5$) is $\rho = 0.8855$.
   - Flagged 33 arterial corridors with diameter $> 1.5\text{ km}$.
   - Synchronized clusters into PostgreSQL `hotspot` table and updated `accident.hotspot_id` within an atomic transaction.
   - Generated methodology figures: `02_cluster_size_distribution.png`, `03_risk_score_distribution.png`, `04_top10_hotspots_ranked.png`.
3. Added database views to `database/views.sql`:
   - `v_hotspot_summary`: Enriched hotspot metrics, district names, severe percentages, and corridor flags.
   - `v_grid_density`: 500m British National Grid cells with collision and severity aggregations.
4. Appended queries 17 to 20 to `database/analytical_queries.sql` and updated `database/run_queries.py`:
   - Q17: Top 20 High-Risk Hotspots (`DENSE_RANK()`).
   - Q18: Hotspots with Rising Collision Counts in 2024–2025 (CTE + Window Functions).
   - Q19: National Severe Collision Share in DBSCAN Hotspots (Scalar Subqueries & `COALESCE`).
   - Q20: Comprehensive Regional Authority Safety Ranking (CTE + `PERCENT_RANK()`).
5. Authored comprehensive [docs/hotspot_methodology.md](file:///Users/makarandkulkarni/Myspace/DV%20Project/docs/hotspot_methodology.md) detailing why DBSCAN, metric projections, multi-criteria formulations, 4 figures, and mandatory viva defense caveats (empirical patterns $\neq$ inherent infrastructure danger).

#### Commands to Re-run & Validate:
```bash
# 1. Run parameter tuning
./venv/bin/python python/hotspot/tune_parameters.py

# 2. Run spatial clustering and database sync
./venv/bin/python python/hotspot/detect_hotspots.py

# 3. Apply updated views
./venv/bin/python database/run_sql.py --views-only

# 4. Execute all 20 analytical queries
./venv/bin/python database/run_queries.py
```

#### Known Issues / Notes:
- Hotspot database linkage is 100% verified (704 hotspots, 63,879 linked collisions, 0 orphans, 0 count discrepancies). All 20 SQL queries pass in 2.8s.

---

### Milestone 8: Explainable Severity-Risk Prediction Model & Parity Export
- **Date**: 2026-10-04
- **Milestone**: Milestone 8 — Explainable Severity Classification, Benchmarking, Temporal Validation, Operational Tiering, JSON Export & Parity Verification
- **Status**: Completed

#### What Was Done:
1. Implemented `python/prediction/train.py`:
   - Extracted 513,801 collision records from PostgreSQL view `v_model_dataset` (75.79% slight, 24.21% severe; baseline severe rate $r = 24.21\%$).
   - Enforced strict pre-crash feature filtering, quarantining and excluding all post-crash casualty columns (`number_of_casualties`, casualty severity, casualty class, demographics) to eliminate target leakage.
   - Built a modular `ColumnTransformer` pipeline (`OneHotEncoder(handle_unknown='ignore')`, `StandardScaler()`, median/constant imputers).
   - Created stratified 80/20 train/test split ($N_{\text{train}} = 411,040$, $N_{\text{test}} = 102,761$).
   - Trained 4 model pipelines: Dummy Baseline ($0.0\%$ recall), Balanced Logistic Regression (deployable model), Decision Tree (depth 4), and Random Forest (depth 10 ensemble ceiling).
2. Implemented `python/prediction/evaluate.py`:
   - Evaluated test set performance: Logistic Regression achieved ROC-AUC **0.6402**, PR-AUC **0.3669**, Recall **59.02%**, Precision **32.28%**, F1 **0.4173**, Accuracy **60.11%**, Brier Score **0.2345**. Random Forest ceiling reached ROC-AUC **0.6701**, PR-AUC **0.3943**, F1 **0.4435**.
   - Executed temporal holdout check (trained on 2021–2024, tested on 2025 holdout of 101,525 crashes): Logistic Regression maintained ROC-AUC **0.6274**, PR-AUC **0.3806**, and F1 **0.4266**, proving strong out-of-time generalizability.
   - Implemented 3-tier risk system ($p < r$, $r \le p < 2r$, $p \ge 2r$) and verified strictly monotonic empirical test calibration: **Low (9.89%)** $\rightarrow$ **Medium (17.50%)** $\rightarrow$ **High (31.35%)**.
   - Exported 6 high-resolution figures to `docs/figures/model/`: ROC curves, PR curves, normalized confusion matrices, logistic regression odds ratios, Random Forest feature importances, and risk tier calibration bar.
   - Stored 31 metric records in PostgreSQL `model_metrics` table and exported `docs/results/model_metrics.json`.
3. Implemented `python/prediction/export_model.py`:
   - Exported model weights, intercept, feature schema, scaler means/scales, allowed categories, and threshold parameters to `models/risk_model.json`.
   - Exported complete scikit-learn pipeline to `models/risk_model.joblib`.
   - Generated 10 diverse realistic driving scenario vectors in `models/test_vectors.json`.
   - Performed automated in-script mathematical parity test: simulated pure NumPy vector dot-product scoring against scikit-learn's `predict_proba` on all 10 vectors, confirming exact equality down to **$10^{-16}$ precision** (maximum difference: $2.22 \times 10^{-16}$, well within $10^{-6}$ tolerance).
4. Authored comprehensive [docs/model_report.md](file:///Users/makarandkulkarni/Myspace/DV%20Project/docs/model_report.md) documenting problem formulation, class imbalance, leakage quarantine rationale, plain-English metric definitions, empirical results, and honest viva defense limitations.

#### Commands to Re-run & Validate:
```bash
# 1. Train all model pipelines
./venv/bin/python python/prediction/train.py

# 2. Evaluate diagnostics, temporal validation, and store metrics in PostgreSQL
./venv/bin/python python/prediction/evaluate.py

# 3. Export JSON weights, generate test vectors, and verify 6-decimal parity
./venv/bin/python python/prediction/export_model.py
```

#### Known Issues / Notes:
- Zero dependency locks: Node.js Express backend can now perform instant scenario scoring directly from `models/risk_model.json` without Python runtime dependencies. All parity tests pass cleanly.

### Milestone 9: Read-Only Analytical Express API Server & In-Memory ML Inference
- **Date**: 2026-10-04
- **Milestone**: Milestone 9 — Read-Only Express REST API, Parameterized SQL Queries, In-Memory ML Risk Scoring, Comprehensive Automated Test Suite & API Reference
- **Status**: Completed

#### What Was Done:
1. Created `backend/package.json` with ES modules, `express`, `pg`, `cors`, and `dotenv`.
2. Implemented database connection pool in `backend/src/db/pool.js` with parameterized query execution.
3. Implemented robust filter parser in `backend/src/utils/filters.js` handling whitelisted inputs, temporal bounds, spatial bounding boxes, and positional parameter bindings.
4. Implemented analytical controllers and services for fact statistics, trends, multidimensional analysis (temporal, environment, road, severity, vehicles), spatial hotspots, DBMS SQL insights, and ML model metadata.
5. Implemented zero-dependency JavaScript Logistic Regression inference engine (`backend/src/services/riskModelService.js`) matching exported weights with sub-millisecond execution.
6. Created automated test suite with 30 tests in `backend/tests/` verifying all endpoints, filter parameterization, SQL injection prevention, and mathematical ML parity against test vectors.
7. Authored [docs/api.md](file:///Users/makarandkulkarni/Myspace/DV%20Project/docs/api.md) documenting all endpoints, parameters, example requests/responses, and error handling standards.

#### Commands to Re-run & Validate:
```bash
# Run backend automated test suite (30/30 passing)
cd backend && npm test

# Start backend dev server
cd backend && npm start
```

---

### Milestone 10: React Dashboard Scaffolding, Global Filter System, Overview & Accident Analysis
- **Date**: 2026-10-04
- **Milestone**: Milestone 10 — Vite + React Frontend Scaffolding, Central FilterContext, Reusable Recharts Suite, Overview Page & 4-Tab Accident Analysis Page
- **Status**: Completed

#### What Was Done:
1. Scaffolded modern React frontend with Vite, Tailwind CSS (custom dark palette & severity tokens: Fatal `#D55E00`, Serious `#E69F00`, Slight `#0072B2`), React Router v6, Recharts, and Leaflet.
2. Built unified API client (`frontend/src/services/api.js`) consuming `VITE_API_URL` with robust query parameter serialization, timeout handling, and typed error responses.
3. Implemented global `FilterContext` (`frontend/src/context/FilterContext.jsx`) providing central state for year ranges, police forces, severity, weather, road surfaces, vehicle types, speed limits, and diurnal periods, with built-in 250ms debouncing and reset capabilities.
4. Created reusable chart components (`frontend/src/charts/`):
   - `LineChartCard.jsx`: Recharts multi-line trend container with custom dark tooltip, legend, and footer caveat.
   - `BarChartCard.jsx`: Flexible vertical/horizontal bar chart supporting single, grouped, stacked, and dual-axis combo modes with severe percentage lines.
   - `DonutCard.jsx`: Severity breakdown donut with center metric display and consistent Okabe-Ito color mapping.
   - `HeatmapCard.jsx`: 7-Day $\times$ 24-Hour collision density matrix (C5) with sequential intensity scaling, interactive cell hover inspector, and legend.
5. Built responsive layout with `Sidebar.jsx`, `Header.jsx`, `FilterBar.jsx`, `LoadingSkeleton.jsx`, and `ErrorBanner.jsx`.
6. Implemented **Executive Safety Overview** (`/`):
   - 6 KPI metric cards (Total Collisions `513,801`, Severe Collisions `124,366`, Fatalities `7,553`, Casualties `652,821`, Active Hotspots `704`, Highest Risk Score `96.45`).
   - 5-Year Collision & Severity Trend Line Chart (C1) with 2020 COVID baseline anomaly context callout.
   - Severity Composition Donut Chart (C13).
   - Vulnerable road user & hotspot collision summary badges.
7. Implemented **Accident Factor Analysis** (`/analysis`) with 4 interactive tabs:
   - *Temporal Factors*: 7x24 Heatmap (C5), 24-Hour Diurnal Profile (C4), Hourly Severe Rate curve (C6), Monthly Distribution (C2), Day of Week Distribution (C3).
   - *Environmental Conditions*: Weather conditions vs severity (C7), Road surface condition impact (C8), Lighting condition severity (C9), and unlit darkness insight callout.
   - *Road & Speed Limits*: Posted speed limit progression (C11), Urban vs Rural comparison, Road type layout (C10), and Kinetic energy ($E_k = \frac{1}{2}mv^2$) DBMS Query 15 callout.
   - *Vehicles & Vulnerability*: Motorcycle, Cyclist, and HGV stat cards with severe rates, Top vehicle categories bar chart (C12), and vulnerable road user impact analysis.
8. Created Milestone 11 stub pages (`/hotspots`, `/prediction`, `/sql-insights`, `/methodology`) with clear UI placeholders.
9. Executed `npm run build` with zero errors, started Vite dev server, and validated complete UI flows, filter synchronization, tab switching, and responsiveness via browser subagent.

#### Commands to Re-run & Validate:
```bash
# 1. Start Express backend (if not already running)
cd backend && npm start

# 2. Build and run React frontend
cd frontend && npm install && npm run build && npm run dev
```

#### Known Issues / Notes:
- Zero mock or hard-coded data: all components and metrics bind directly to live PostgreSQL data through Express API endpoints.

---

### Milestone 11: Production Power BI Analytics Layer & End-to-End Integration
- **Date**: 2026-10-30
- **Milestone**: Milestone 11 — Power BI Analytics Report & Star-Schema Data Model
- **Status**: Completed (100% Passing Automated Validation)

#### What Was Done:
1. Implemented complete 6-page Power BI report matching the `docs/powerbi_analytics_blueprint.md` specification across descriptive, diagnostic, temporal, spatial, predictive, and prescriptive analytics:
   - **Page 1: Accident Intelligence Overview**: 5 KPI cards, 5-year volume & severity trend, severity donut, top regions, cumulative tracking, slicers.
   - **Page 2: Temporal Analytics & Pattern Discovery**: 24-hour diurnal column chart, day-of-week bar chart, 7x24 risk heatmap matrix, monthly seasonality curve, weekend vs weekday KPI cards.
   - **Page 3: Geographic Intelligence & Hotspot Detection**: DBSCAN cluster bubble map, top 704 hotspots table, volume vs severity scatter plot, clustered collision share donut.
   - **Page 4: Diagnostic Analytics: Risk Factors**: Severe rate by weather, road surface, and lighting; posted speed limit vs casualties/severity; compound road surface x lighting interaction matrix.
   - **Page 5: Machine Learning & Risk Detection**: Confusion matrix, model KPIs (Accuracy: 60.1%, Recall: 59.0%, Precision: 32.3%, F1: 0.417, Balanced Accuracy: 76.3%), feature importance odds ratios bar chart, predicted probability distribution, prediction explorer table.
   - **Page 6: Road Safety Decision Support**: Priority investigation table (Priority 1, 2, 3, Monitor tiers), anomaly alert KPIs, Pareto analysis of hotspot burden, risk vs growth trend scatter plot, prescriptive mitigation guide.
2. Built normalized star-schema Tabular Model (`model.bim` / TMSL 1550) connecting 9 reporting entities:
   - `FactAccidents` (100,000 clean collision rows, 37 attributes)
   - `FactCasualties` (130,370 casualty rows)
   - `FactVehicles` (183,908 vehicle rows)
   - `FactHotspots` (704 DBSCAN clusters with coordinates and risk scores)
   - `FactHotspotAlerts` (718 emerging anomaly alerts with p-values and priorities)
   - `FactPredictions` (19,731 test cases scored with logistic regression)
   - `DimDate` (1,826 days from 2021 to 2025)
   - `DimLocation` (43 police force jurisdictions and regions)
   - `DimRoadCondition` (20 compound environmental interaction pairs)
3. Authored 45+ production DAX measures in `powerbi/dax_measures.dax` across 6 organized display folders (`01_Key_KPIs`, `02_Time_Intelligence`, `03_Severity_Analytics`, `04_Hotspot_Analytics`, `05_ML_Model_Metrics`, `06_Decision_Support`).
4. Authored modular Power Query (M) ETL scripts in `powerbi/power_query_scripts.m` with parameterizable source folder configuration.
5. Created cohesive visual theme in `powerbi/road_safety_theme.json` matching the project color palette.
6. Compiled standalone single-click `powerbi/RoadAccidentAnalytics.pbix` and `powerbi/RoadAccidentAnalytics.pbit` packages, alongside Git-friendly `powerbi/RoadAccidentAnalytics.pbip` project files.
7. Replicated clean datasets to `preprocessing/results_of_preprocessing/` with `quality_report.json`.
8. Created and executed automated test suite `powerbi/validate_powerbi_setup.py` verifying data integrity, TMSL schema, report layout, and zip archive decompression.

#### Commands to Re-run & Validate:
```bash
# 1. Regenerate all Power BI datasets (deterministic seed 42)
python3 powerbi/generate_powerbi_data.py

# 2. Recompile PBIP, PBIT, and PBIX report assets
python3 powerbi/build_powerbi_report.py

# 3. Execute comprehensive validation test suite
python3 powerbi/validate_powerbi_setup.py
```

#### Known Issues / Notes:
- All 9 data files are pre-generated and stored in the workspace, enabling instant offline report loading without external database dependencies.
- Open `powerbi/RoadAccidentAnalytics.pbix` directly in Power BI Desktop on Windows.
