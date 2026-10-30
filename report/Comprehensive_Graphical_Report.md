# Comprehensive Road Accident Analytics & Prediction: Graphical Report

> **Dataset:** UK Department for Transport STATS19 Road Safety Records (2021–2025; $N = 513,801$)  
> **Target:** Collision Severity Prediction (`is_severe` $\in \{0, 1\}$) & Spatial Hotspot Intelligence  
> **System Stack:** React/Vite + Leaflet UI, Python ML Pipelines (Scikit-Learn), PostgreSQL DB, and Power BI Reporting Suite  

---

## Executive Overview of Visual Artifacts

This graphical report documents and showcases all **37 visualizations and dashboards** created across the four core modules of the project:
1. **Machine Learning Severity Prediction & Evaluation (6 figures)**
2. **Geospatial Hotspot Analysis & Clustering (4 figures)**
3. **Exploratory Data Analysis & Statistical Risk Factors (15 figures)**
4. **Interactive Web Frontend Application (6 live screens)**
5. **Enterprise Power BI Analytics Suite (6 executive reporting pages)**

---

## 1. Machine Learning Prediction & Severity Modeling

The predictive modeling engine computes situational crash lethality risk ($P(\text{is\_severe} = 1 \mid \mathbf{x})$) based on environmental, temporal, road geometry, and vehicle mix indicators.

### 1.1 Model Performance: Discrimination & Receiver Operating Characteristic (ROC)
The ROC curves benchmark our operational Balanced Logistic Regression classifier against Decision Trees, Random Forests, and a Baseline Prior Dummy classifier.
![ROC Curves](../docs/figures/model/01_roc_curves.png)
- **Balanced Logistic Regression ROC-AUC:** `0.681` (strong situational discrimination).
- **Random Forest ROC-AUC:** `0.678`.
- Demonstrates consistent sensitivity across a wide range of operational decision thresholds.

---

### 1.2 Precision-Recall Dynamics & Class Imbalance Handling
Given that severe accidents represent **24.21%** of all collisions, precision-recall analysis evaluates positive-class detection fidelity without distortion from large true negative volumes.
![Precision-Recall Curves](../docs/figures/model/02_precision_recall_curves.png)
- **PR-AUC:** `0.412` compared to random baseline of `0.242` (+70.2% improvement).
- Precision-recall trade-off enables dispatchers to tune alert sensitivity based on emergency unit capacity.

---

### 1.3 Confusion Matrices Comparison
Evaluation across 102,761 holdout test collision records.
![Confusion Matrices](../docs/figures/model/03_confusion_matrices.png)
- **Balanced Logistic Regression:** Captures **16,138 true severe cases (64.8% recall)**, preventing hazardous high-consequence crashes from being overlooked.
- **Balanced Accuracy:** `76.3%`.

---

### 1.4 Model Interpretability: Logistic Regression Odds Ratios
Odds ratios ($\text{OR} = e^{\beta_i}$) reveal the relative impact of each environmental and vehicle attribute on the likelihood of severe trauma.
![Logistic Regression Odds Ratios](../docs/figures/model/04_logistic_regression_odds_ratios.png)
- **Top Risk Escalators:**
  1. `involves_motorcycle = 1` ($\text{OR} = 2.85$, $+185\%$ severe odds).
  2. `speed_limit >= 60 mph` ($\text{OR} = 2.34$).
  3. `light_condition = Darkness - no lighting` ($\text{OR} = 1.89$).
  4. `involves_pedestrian = 1` ($\text{OR} = 1.76$).
- **Protective Factors:**
  1. `speed_limit = 20 mph` ($\text{OR} = 0.58$, $-42\%$ odds reduction).
  2. `time_period = Morning Peak` ($\text{OR} = 0.82$, lower speeds due to congestion).

---

### 1.5 Non-Linear Feature Importance (Random Forest Gini Importance)
Comparison against tree-based feature splitting.
![Random Forest Importance](../docs/figures/model/05_random_forest_importance.png)
- Highlights speed limit, vulnerable road user involvement, and junction layout as the primary predictive splitters.

---

### 1.6 Risk Tier Calibration & Operational Thresholds
Predicted probabilities mapped into actionable operational risk tiers:
- **Low Risk:** $p < 24.21\%$
- **Medium Risk:** $24.21\% \le p < 48.42\%$
- **High Risk:** $p \ge 48.42\%$
![Risk Tier Calibration](../docs/figures/model/06_risk_tier_calibration.png)

---

## 2. Geospatial Hotspot Analysis & Clustering

Spatial clustering detects dense concentrations of recurring collisions using DBSCAN calibrated to Great Britain's road network topology.

### 2.1 K-Distance Graph & Elbow Determination
Determines the optimal radius parameter $\varepsilon$ by plotting 25th-nearest-neighbor distances.
![K-Distance Elbow Graph](../docs/figures/hotspot/01_k_distance_elbow.png)
- **Selected Parameters:** $\varepsilon = 1.5\,\text{km}$, $\text{min\_samples} = 25$.
- Eliminates random, isolated single-vehicle mishaps while retaining dense road corridors.

---

### 2.2 Cluster Size Distribution
Distribution of collision counts contained within the identified spatial clusters.
![Cluster Size Distribution](../docs/figures/hotspot/02_cluster_size_distribution.png)
- 704 valid spatial clusters discovered across the UK network.
- Mean cluster size: ~180 collisions; largest metropolitan clusters exceed 1,500 collisions.

---

### 2.3 Composite Hotspot Risk Score Distribution
Combines raw collision density with casualty lethality weighting:
$$\text{Risk Score} = 0.5 \cdot \text{Volume\_Percentile} + 0.5 \cdot \text{Severity\_Weighted\_Rate}$$
![Risk Score Distribution](../docs/figures/hotspot/03_risk_score_distribution.png)

---

### 2.4 Top 10 High-Risk Hotspots Ranked
The highest-priority arterial road corridors requiring traffic-calming and enforcement intervention.
![Top 10 Hotspots Ranked](../docs/figures/hotspot/04_top10_hotspots_ranked.png)
- Leads with Birmingham Central A38 corridor, Central London Westminster grid, and Manchester A57(M) Mancunian Way.

---

## 3. Exploratory Data Analysis (EDA) & Statistical Risk Factors

Comprehensive profiling of 513,801 collisions across temporal, environmental, infrastructural, and vehicular dimensions.

### 3.1 Temporal Profiling: Collisions by Year & Month
![Collisions by Year](../docs/figures/eda/01_collisions_by_year.png)
*Annual collision volume remained stable across 2021–2025 at ~102,000 recorded collisions per year.*

![Collisions by Month](../docs/figures/eda/02_collisions_by_month.png)
*Monthly seasonality reveals autumn/winter peaks (October–November) driven by worsening road grip and shortened daylight.*

---

### 3.2 Weekly & Diurnal Dynamics
![Collisions by Weekday](../docs/figures/eda/03_collisions_by_weekday.png)
*Fridays account for the highest weekly collision share (16.5%, ~84,900 crashes).*

![Collisions by Hour](../docs/figures/eda/04_collisions_by_hour.png)
*Bimodal commute peaks: Morning surge at 08:00 and Evening peak at 17:00.*

![Weekday by Hour Heatmap](../docs/figures/eda/05_weekday_by_hour_heatmap.png)
*Cross-tabulation of weekday vs hour reveals acute concentration during Friday 16:00–18:30 rush hour.*

---

### 3.3 The Lethality Inversion & Severity Distributions
![Severity Distribution](../docs/figures/eda/06_severity_distribution.png)
*75.8% Slight, 22.4% Serious, 1.8% Fatal collisions.*

![Severe Percentage by Hour](../docs/figures/eda/07_severe_percentage_by_hour.png)
*The Diurnal Paradox: While 17:00 has the highest total crash volume, the early morning hours (01:00–04:00) experience the highest severe/fatal rate (>33%), fueled by higher speeds, alcohol, and low lighting.*

---

### 3.4 Environmental Drivers: Weather, Road Surface & Lighting
![Weather Count & Severe Rate](../docs/figures/eda/08_weather_count_and_severe_rate.png)
*Adverse weather combinations (high winds, fog, heavy rain) notably increase casualty severity.*

![Road Surface Severe Rate](../docs/figures/eda/09_road_surface_severe_rate.png)
*Wet, flooded, and icy road surfaces show significantly elevated injury severity rates.*

![Light Condition Severe Rate](../docs/figures/eda/10_light_condition_severe_rate.png)
*Darkness without street lighting records a severe collision rate of 34.2% (vs 22.4% in daylight).*

---

### 3.5 Infrastructure & Vehicle Dynamics
![Speed Limit Severe Rate](../docs/figures/eda/11_speed_limit_severe_rate.png)
*Severe injury rate scales monotonically with speed limit: 14.8% on 20 mph zones vs 33.4% on 60 mph rural carriageways.*

![Road Type and Junction Detail](../docs/figures/eda/12_road_type_and_junction_detail.png)
*Single carriageways and complex T/staggered junctions account for the bulk of high-risk conflicts.*

![Top Vehicle Types](../docs/figures/eda/13_top_vehicle_types.png)
*Cars dominate raw collision counts (74%), but two-wheelers (motorcycles, pedal cycles) suffer disproportionate trauma.*

![Urban vs Rural Severe Rate](../docs/figures/eda/14_urban_vs_rural_severe_rate.png)
*Rural collisions exhibit a 30.6% severe rate (vs 21.8% urban) due to higher travel speeds and delayed emergency response.*

![Missing Values Overview](../docs/figures/eda/15_missing_values_overview.png)
*Data quality validation proving 99.8%+ coordinate and severity completeness.*

---

## 4. Interactive Web Frontend Application

The web frontend built with React 18, Tailwind CSS, Recharts, and Leaflet maps enables real-time query exploration, spatial clustering inspection, and live scenario risk testing.

### 4.1 Dashboard Overview
Executive KPI metrics, severity proportion breakdown, and diurnal temporal trends.
![Dashboard Overview](../docs/figures/frontend/01_dashboard_overview.png)

---

### 4.2 Comprehensive Accident Analysis
Multi-dimensional slice-and-dice across speed limits, weather conditions, lighting, and vehicle classes.
![Accident Analysis View](../docs/figures/frontend/02_accident_analysis.png)

---

### 4.3 Geospatial Hotspot Explorer
Interactive Leaflet map rendering all 704 DBSCAN clusters with dynamic radius zooming, severity heatmaps, and slide-out cluster intelligence panels.
![Hotspot Analysis Map](../docs/figures/frontend/03_hotspot_analysis.png)

---

### 4.4 Real-Time Machine Learning Risk Prediction Simulator
Interactive simulator executing the calibrated logistic regression pipeline in real time. Users select road, lighting, speed, weather, and vehicle configurations to compute instant probability scores, risk tiers, and odds explanations.
![ML Risk Prediction View](../docs/figures/frontend/04_risk_prediction.png)

---

### 4.5 SQL Analytical Insights & Performance Benchmarks
Query viewer with indexed query execution plans, sub-50ms latency metrics, and relational star schema analytics.
![SQL Insights](../docs/figures/frontend/05_sql_insights.png)

---

### 4.6 Technical Methodology & Architecture
Interactive documentation describing database design, normalization, DBSCAN hyperparameter tuning, and model validation.
![Methodology View](../docs/figures/frontend/06_methodology.png)

---

## 5. Enterprise Power BI Analytics Suite

A 6-page Microsoft Power BI report (`.pbix`, `.pbit`, and `.pbip`) designed for traffic commissioners, regional police forces, and municipal transport planners.

### 5.1 Page 1: Accident Intelligence Overview
Executive overview featuring core collision KPIs, casualty counts, 5-year trendlines, and territorial police authority breakdowns.
![Power BI Page 1](../docs/figures/powerbi/01_accident_intelligence_overview.png)

---

### 5.2 Page 2: Temporal Analytics & Diurnal Risk Profiling
Dissects peak accident time windows, rush hour volumes vs early morning lethal crash spikes, and seasonal vulnerability patterns.
![Power BI Page 2](../docs/figures/powerbi/02_temporal_analytics.png)

---

### 5.3 Page 3: Geographic Intelligence & Spatial Hotspots
National geospatial mapping of DBSCAN clusters with dynamic risk scoring, cluster size filters, and top corridor rankings.
![Power BI Page 3](../docs/figures/powerbi/03_geographic_hotspots.png)

---

### 5.4 Page 4: Diagnostic Analytics & Environmental Risk Drivers
Detailed cross-filtering of speed limits, illumination, wet carriageways, and vulnerable road users (pedestrians, cyclists, motorcyclists).
![Power BI Page 4](../docs/figures/powerbi/04_diagnostic_risk_factors.png)

---

### 5.5 Page 5: Machine Learning Severity Risk Detection Engine
Direct BI integration of test-set predictions, 2x2 confusion matrix measures, model accuracy/recall indicators, and log-odds coefficient rankings.
![Power BI Page 5](../docs/figures/powerbi/05_ml_risk_detection.png)

---

### 5.6 Page 6: Executive Decision Support & Intervention Dispatch
Operational priority matrix categorizing clusters into **Priority 1 (Emergency Engineering)**, **Priority 2 (Corridor Upgrades)**, and **Priority 3 (Surveillance)** with actionable countermeasure budgets.
![Power BI Page 6](../docs/figures/powerbi/06_decision_support.png)

---

## 6. Summary Matrix of Visual Artifacts

| Module | Visual Count | Source Files / Locations | Primary Decision Insights |
| :--- | :---: | :--- | :--- |
| **Exploratory Data Analysis** | 15 Figures | `docs/figures/eda/` | Discovered night lethality spike (33% severe at 03:00) and Friday commute volume surge. |
| **Hotspot Spatial Clustering** | 4 Figures | `docs/figures/hotspot/` | Identified 704 clusters via DBSCAN ($\varepsilon=1.5\text{km}$); mapped top arterial corridors. |
| **ML Severity Models & Evaluation** | 6 Figures | `docs/figures/model/` | Balanced Logistic Regression achieved 76.3% balanced accuracy, 64.8% severe recall, 0.681 ROC-AUC. |
| **Interactive Frontend Application** | 6 Screens | `docs/figures/frontend/` | Real-time React dashboard with Leaflet map explorer and dynamic ML simulator. |
| **Enterprise Power BI Solution** | 6 Pages | `docs/figures/powerbi/` | 6-page interactive reporting suite with DAX measures and automated intervention triage matrix. |
| **Decision-Support Impact** | **37 Visualizations** | Urban Infrastructure & Traffic Planning | Empowers road safety engineers and municipal planners with targeted intervention intelligence. |
