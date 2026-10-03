# Architectural and Design Decisions Record (ADR)

This document records the foundational architectural, methodological, and engineering decisions made for the **Smart Road Accident Hotspot Analysis and Risk Prediction System**.

---

## 1. Dataset Selection & Alternatives Rejected

### Decision:
Use the **UK Department for Transport (DfT) STATS19 Road Safety Data** across the five latest complete reporting years published by DfT (2021–2025). The data comprises three relational CSV files:
1. **Collisions (Accidents)**: Exact spatial coordinates (OSGR Easting/Northing and WGS84 Latitude/Longitude), date, time, weather, road surface, light conditions, speed limits, junction types, and severity.
2. **Vehicles**: Vehicle types, maneuvers, point of impact, driver demographics, and propulsion.
3. **Casualties**: Casualty severity, class (pedestrian, cyclist, driver, passenger), age, and injury details.

**Note on Historical & COVID-19 Years**:
The 2020 calendar year experienced abnormal travel restrictions and lockdown anomalies due to COVID-19, leading to an atypical ~25% drop in national traffic and incident volume. The 2021–2025 five-year window captures modern, post-lockdown mobility patterns while providing over 513,000 verified collision records and complete spatial/temporal coverage.

### Rationale:
- **Official & High Quality**: Collected under statutory reporting standards by UK police forces with comprehensive data dictionaries and standardized codebooks.
- **Relational Integrity**: Clean foreign keys (`collision_index`) enabling DBMS schema design and advanced SQL joins.
- **Exact Coordinates**: Consistent British National Grid (Easting/Northing) and GPS coordinates for precision spatial clustering.

### Alternatives Considered & Rejected:
- **US Accidents Dataset (Kaggle)**: Rejected due to inconsistent coordinate precision, lack of formal relational schemas (casualties/vehicles are aggregated), and non-standardized multi-source scraping anomalies.
- **US FARS (Fatality Analysis Reporting System)**: Rejected because it contains exclusively fatal crashes, making binary classification of accident severity impossible due to lack of a slight/minor injury baseline.
- **Indian MoRTH / State Datasets**: Rejected due to absence of open, row-level spatial coordinates (latitude/longitude or Easting/Northing) suitable for geospatial clustering.

---

## 2. Traffic Condition Proxy & Temporal Features

### Decision:
Drop explicit "traffic condition / congestion" fields from the feature set and replace them with a labeled **`time_period`** categorical proxy:
- `Morning Peak` (07:00 – 09:59): Morning rush-hour commuter traffic proxy.
- `Daytime` (10:00 – 15:59): Daytime inter-peak moderate traffic proxy.
- `Evening Peak` (16:00 – 18:59): Evening commuter rush-hour proxy.
- `Evening` (19:00 – 22:59): Late evening leisure traffic proxy.
- `Night` (23:00 – 06:59): Low-density, higher-speed nocturnal traffic proxy.

### Rationale:
- The STATS19 schema records post-crash environmental and situational parameters but does not record real-time traffic volume or congestion indices at the timestamp of collision.
- Attempting to synthesize or guess continuous traffic volume introduces ungrounded assumptions. A rule-based `time_period` proxy captures commuter rush hours and nocturnal risk factors cleanly and explainably for academic evaluation.

---

## 2.1. Vehicle Involvement Aggregation Flags

### Decision:
Derive accident-level vehicle flags from the one-to-many `vehicles` table:
- `involves_motorcycle`: 1 if any vehicle in the collision is a motorcycle, else 0.
- `involves_hgv`: 1 if any vehicle is a heavy goods vehicle (>3.5 tonnes), else 0.
- `involves_cyclist`: 1 if any vehicle is a pedal cycle, else 0.

### Rationale:
- Vulnerable road users (cyclists, motorcyclists) and heavy commercial vehicles have distinct severity outcomes. Aggregating these to the collision level allows the tabular prediction model and SQL analytical queries to incorporate vehicle-type vulnerability directly.

---

## 3. Geographic Granularity: Police Force and Local Authority District

### Decision:
Geographic aggregation and filtering will be conducted at two hierarchical levels:
1. **Police Force Area (`police_force`)**: Primary regional boundary.
2. **Local Authority District (`local_authority_district`)**: Sub-regional municipal boundary.

### Rationale:
- Matches official UK administrative boundaries and STATS19 codebook reference mappings.
- Provides standard categorical filtering for both SQL aggregation queries and frontend interactive dropdowns.

---

## 4. Target Variable Formulation: `is_severe`

### Decision:
Model accident severity as a binary classification target:
- `is_severe = 1`: Fatal or Serious collisions.
- `is_severe = 0`: Slight collisions.

### Rationale:
- In raw STATS19, fatal accidents represent a small fraction (~1-2%) while slight accidents constitute ~78-80%. Grouping Fatal and Serious into `is_severe` yields a well-formulated, clinically and operationally meaningful high-risk class (~20-22%) while avoiding extreme class imbalance pitfalls.
- Highly explainable during viva questioning compared to ambiguous multi-class ordinal boundaries.

---

## 5. Machine Learning Model: Balanced Logistic Regression Exported as JSON

### Decision:
Train a **Balanced Logistic Regression** classifier in Python (`class_weight='balanced'`, `max_iter=1000`, `solver='lbfgs'`) using scikit-learn on pre-collision features (strictly excluding all post-collision casualty attributes to prevent target leakage). Validate against Random Forest, Decision Tree, and Prior Dummy baselines, and export model parameters (intercept $\beta_0 = -0.5755$, weights dictionary, ordered features, scaler means/scales, category mappings, and baseline severe rate $r = 0.2421$) to **[`models/risk_model.json`](file:///Users/makarandkulkarni/Myspace/DV%20Project/models/risk_model.json)** and **[`models/risk_model.joblib`](file:///Users/makarandkulkarni/Myspace/DV%20Project/models/risk_model.joblib)**.

### Rationale & Empirical Justification:
- **Viva Explainability**: Logistic regression outputs linear log-odds coefficients ($z = \beta_0 + \sum \beta_i x_i, \quad p = \frac{1}{1 + e^{-z}}$), enabling direct physical interpretation of risk multipliers ($\text{Odds Ratio} = e^{\beta_i}$, e.g. Motorcycle $\text{OR} = 2.84\times$, Darkness without lights $\text{OR} = 1.68\times$).
- **Zero Python Runtime Overhead**: The Express/Node.js backend executes real-time inference in $< 0.05\text{ ms}$ by computing the vector dot-product directly in memory without spawning a Python daemon.
- **Strict Parity Verification**: Validated on 10 realistic test vectors ([`models/test_vectors.json`](file:///Users/makarandkulkarni/Myspace/DV%20Project/models/test_vectors.json)); pure simulation matches scikit-learn `predict_proba` down to **$10^{-16}$ precision** (zero drift).
- **Empirical Tier Calibration**: Defined operational risk tiers relative to training baseline $r = 24.21\%$ (Low: $p < r$, Medium: $r \le p < 2r$, High: $p \ge 2r$). Observed test set severe rates scale strictly monotonically: **$9.89\%$ (Low)** $\rightarrow$ **$17.50\%$ (Medium)** $\rightarrow$ **$31.35\%$ (High)**.

---

## 6. Spatial Hotspot Clustering: DBSCAN on Metric Coordinates (eps=150m, min_samples=30)

### Decision:
Perform density-based spatial clustering using **scikit-learn DBSCAN** (`algorithm='kd_tree'`) on projected **British National Grid (BNG / EPSG:27700) Easting and Northing coordinates in metres**, with baseline parameters **$\varepsilon = 150\text{ metres}$** and **$\text{min\_samples} = 30\text{ collisions}$**.

### Rationale & Empirical Justification:
- **Projected Metric Precision**: Easting and Northing represent true metric Cartesian coordinates, avoiding non-linear spherical distortions inherent in latitude/longitude degrees across Great Britain.
- **$k$-Distance Elbow Analysis ($k = 30$)**: Evaluated on all 513,748 valid spatial points, revealing a pronounced inflection elbow between $120\text{ m}$ and $180\text{ m}$. Setting $\varepsilon = 150\text{ m}$ sits at the natural density knee.
- **Sensitivity Analysis**: Evaluated 9 parameter combinations ($\text{eps} \in [100, 150, 250]\text{ m}$, $\text{min\_samples} \in [20, 30, 50]$). The selected default yields **704 discrete hotspot clusters** encompassing **63,879 collisions (12.43% of national total)** with a mean cluster size of 90.7 collisions, effectively isolating hazardous junctions while minimizing artificial corridor chaining (only 33 clusters have diameter $> 1.5\text{ km}$).

---

## 7. Hotspot Composite Scoring: Equal-Weight Multi-Criteria Percentiles

### Decision:
Score and tier detected spatial clusters using a normalized 3-factor composite risk formula based on percentile ranks:
$$\text{Risk Score} = 100 \times \left( \frac{F + S + T}{3} \right)$$
Where:
- $F = \text{Percentile Rank of annual collisions } (N_k / 5)$
- $S = \text{Percentile Rank of severe casualty proportion } (\text{severe\_ratio}_k)$
- $T = \text{Percentile Rank of OLS annual trend slope } (\text{slope}_k, \text{post-2020 post-lockdown baseline})$

**Risk Tiers**:
- **High Risk**: Top 20% of hotspots ($\ge 67.57$, $N = 141$).
- **Medium Risk**: Next 30% of hotspots ($48.33 \le \text{Score} < 67.57$, $N = 211$).
- **Low Risk**: Bottom 50% of hotspots ($< 48.33$, $N = 352$).

### Rationale:
- **Robustness & Stability**: Avoids arbitrary raw score scaling. Weight sensitivity testing against Frequency-Heavy ($0.5/0.3/0.2$) and Trend-Heavy ($0.2/0.3/0.5$) models yielded Spearman rank correlations of **$\rho = 0.8741$** and **$\rho = 0.8855$** ($p < 10^{-200}$), proving structural ranking stability.
- **Viva Explainability**: Transparent 3-factor decomposition (Frequency, Severity, Trend) readily defendable before examiners.

---

## 8. System Architecture: No Python Web Service

### Decision:
Do not run a live Python web server (e.g., Flask/FastAPI) in production. Python is utilized strictly offline for ETL, database loading, spatial DBSCAN clustering, and ML model training. The production backend is a single Node.js + Express service.

### Rationale:
- **Simplicity**: Single backend process to run (`npm run dev` in `backend/`).
- **Low Resource Usage**: Avoids running multiple servers simultaneously on student laptops.
- **Reliability**: Node.js handles database queries and fast analytical responses via PostgreSQL views, while computing scenario risk scores directly via the exported JSON weights.

---

## 9. Database Normalization (3NF), Constraints & Partial Indexing

### Decision:
Structure PostgreSQL database in strict **Third Normal Form (3NF)** with 13 lookup dimension tables, controlled denormalization of derived temporal and vehicle-involvement flags directly on `accident`, and targeted B-tree/partial indexes.

### Rationale:
- **Storage & Integrity**: Moving repeating categorical strings into `SMALLINT` lookup tables eliminates update/deletion anomalies and reduces disk footprint.
- **Controlled Denormalization**: Storing pre-derived temporal attributes (`hour`, `month`, `time_period`, `is_severe`) and vehicle flags (`involves_motorcycle`, `involves_hgv`, `involves_cyclist`) eliminates costly timestamp parsing and complex multi-table joins across 937,000 vehicle rows during interactive dashboard queries.
- **Partial Indexing**: Creating a partial index on `accident(accident_date) WHERE is_severe = 1` reduces index size by ~76% (severe collisions represent 24.21% of data) while optimizing high-risk casualty analysis queries.
