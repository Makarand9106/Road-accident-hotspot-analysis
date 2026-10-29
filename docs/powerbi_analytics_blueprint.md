# Power BI Analytics Blueprint for the Road Accident Hotspot Analysis Project

## 1. Project framing

This project should be positioned as a road-accident intelligence and risk-detection system, with Power BI as the primary analytical interface and the Python pipeline supplying the model outputs. The dashboard should not be treated as a cosmetic chart pack; it should demonstrate a full analytical workflow:

- Data understanding
- Data cleaning and validation
- Exploratory data analysis
- Statistical comparison
- Interactive visualization
- Machine learning evaluation
- Decision support and prioritization

The repository already contains an operational foundation for:

- DBSCAN-based spatial clustering
- Multi-criteria hotspot risk scoring
- Logistic-regression severity classification
- Temporal and severity analysis
- SQL-based analytics and database views

The Power BI layer should therefore build on those assets rather than reinvent them.

---

## 2. Recommended architecture

### Component A — Power BI analytics layer
This layer is the main analytical experience for the end user. It should provide:

- KPI monitoring for accidents, casualties, and severe outcomes
- Time-series trend analysis
- Geographic clustering and hotspot exploration
- Drill-down investigation across location, time, and conditions
- Statistical summaries and comparisons
- Model outputs presented in an interpretable way
- A rank-order view of investigation priorities

### Component B — Python detection and prediction layer
The repository already supports two strong analytical models:

1. DBSCAN spatial clustering for hotspot identification
2. Logistic regression for severe vs non-severe accident classification

A third, complementary feature is recommended only if the dataset supports it:

3. Emerging hotspot anomaly detection using time-series comparison across location-period pairs

This model should look for unusual recent increases relative to historical baseline counts, and it should be reported clearly as anomalous accident frequency rather than absolute accident risk when exposure data is absent.

### Component C — Decision-support layer
The Power BI design should convert model outputs into actionable insight by showing:

- Which hotspots are rising
- Which areas have severe crash burden
- Which time windows matter most
- Why those locations stand out
- Which locations should be investigated first

---

## 3. Analytical questions the report should answer

The dashboard should answer five questions explicitly:

1. What is happening?
2. Why might it be happening?
3. Where and when are accidents concentrated?
4. What unusual patterns can we detect?
5. What locations should authorities investigate next?

These map directly to descriptive, diagnostic, spatial, anomalous, and prescriptive analytics.

---

## 4. Recommended six-page Power BI report structure

## Page 1 — Accident Intelligence Overview

Purpose: Provide the headline view of the accident burden and the direction of change.

Suggested visuals:

- KPI cards for total accidents, casualties, fatalities, severe accidents, and severe percentage
- Year-over-year trend cards with absolute and percentage change
- Monthly trend line for accident counts
- Stacked column by year and severity
- Horizontal bar chart for top 10 regions or locations
- Donut chart for severity distribution
- Decomposition tree for severe accidents by selected determinants

Recommended DAX patterns:

```DAX
Total Accidents = DISTINCTCOUNT(Accidents[accident_id])

Total Casualties = DISTINCTCOUNT(Casualties[casualty_id])

Severe Accidents =
CALCULATE(
    [Total Accidents],
    Accidents[is_severe] = TRUE()
)

Severe Accident Percentage =
DIVIDE([Severe Accidents], [Total Accidents], 0) * 100
```

Notes:

- Use real table and column names from the data model.
- Keep KPIs clickable and synchronized to detailed pages.
- Add drill-through actions from a selected region to the geographic analysis.

---

## Page 2 — Temporal Analytics and Pattern Discovery

Purpose: Reveal when accidents occur and whether the burden is concentrated in certain time windows.

Suggested visuals:

- Hourly accident distribution
- Day-of-week distribution
- Day x hour heatmap for accident count
- Secondary day x hour heatmap for severe accidents
- Monthly trend line with seasonal patterns
- Year-over-year comparison
- 100% stacked bar chart by hour and severity
- Weekend vs weekday comparison
- Calendar matrix for unusual dates
- Trend decomposition or moving average line

Key analytical focus:

- Identify the most accident-prone hours and days
- Compare severe-accident burden by time window
- Flag recurring temporal clusters that align with high-risk periods

This page should include statistical summaries such as:

- Mean accidents per day
- Median daily accidents
- Standard deviation
- Weekday vs weekend difference
- Seasonal variance

For any comparison that implies a meaningful difference, use an appropriate statistical test or count model rather than assuming raw differences are significant.

---

## Page 3 — Geographic Intelligence and Hotspot Detection

Purpose: Map where accidents cluster and how risky those areas are.

Suggested visuals:

- Interactive map of accident points or aggregated locations
- DBSCAN cluster map with cluster labels
- Density map or hotspot intensity overlay
- Hotspot ranking table by accident count
- Risk ranking by cluster and weighted severity
- Scatter plot of accident count vs severity burden
- Cluster severity chart
- Region-level comparison

Analytical interpretation:

- Distinguish dense accident locations from severe-accident hotspots
- Separate historical concentration from emerging abnormal increase
- Link cluster selection to the rest of the report through cross-filtering and drill-through

Important: DBSCAN identifies dense spatial clusters, but it does not prove that a location is becoming more dangerous over time. This page should present a rigorous distinction between:

- Accident density
- Severity-weighted burden
- Emerging hotspots
- Exposure-adjusted risk, if exposure data is available

---

## Page 4 — Diagnostic Analytics: What Factors Are Associated With Accidents?

Purpose: Explain which conditions are most associated with accident occurrence and severe outcomes.

Suggested visuals:

- Weather vs severity
- Road surface vs severity
- Lighting vs severity
- Road type vs severity
- Junction type vs severity
- Speed limit vs severity
- Vehicle type vs casualty burden
- Correlation heatmap for numeric variables
- Decomposition tree for severe accidents
- Key influencers analysis

Most valuable chart:

A severity interaction heatmap with:

- Rows: road surface condition
- Columns: lighting condition
- Values: severe accident percentage
- Tooltip: total accidents and severe accidents

This allows users to explore interaction effects instead of looking at single factors in isolation.

Statistical validation should be reported where appropriate:

- Chi-square tests for categorical associations
- Confidence intervals
- Effect sizes
- Logistic regression for adjusted association
- Multiple-comparison correction when many tests are evaluated

This page must make it clear that association is not causation.

---

## Page 5 — Machine Learning and Risk Detection

Purpose: Show the model as an analytical instrument, not just a score.

This page should integrate the repository’s existing severity model and a complementary emerging-hotspot detector.

### 5.1 Severity prediction model

Recommended visuals:

- Confusion matrix
- Precision, recall, F1-score, and support
- ROC curve
- Precision-recall curve
- Calibration plot
- Feature importance chart
- Probability distribution for predicted severe outcomes
- Actual vs predicted severity comparison
- Prediction explorer table

Key requirement:

- Report precision and recall for the severe class, not only total accuracy
- Use macro F1 or balanced metrics when the data is imbalanced
- Avoid presenting uncalibrated probabilities as exact risk values if calibration is poor

### 5.2 Emerging hotspot detector

This is the new detection capability recommended for the Power BI layer.

For each location and time period, the model should calculate:

- Observed accident count
- Expected accident count
- Historical baseline
- Change relative to baseline
- Severe-accident count
- Anomaly score or statistical evidence

Recommended visuals:

- Emerging hotspot map
- Observed vs expected line chart
- Anomaly score distribution
- Ranked alert table
- Severity breakdown of flagged alerts
- Hotspot timeline
- Region-level alert counts

This should complement DBSCAN instead of duplicating it.

Important validation conditions:

- The dataset must contain enough location granularity and historical periods
- The detector should be evaluated on historical holdout periods
- Alerts should be checked for persistence and for whether severe-accident burden also rises
- If exposure data is unavailable, report results as anomalous accident frequency, not absolute risk

---

## Page 6 — Road Safety Decision Support

Purpose: Convert statistical evidence into a ranked list of locations for investigation.

Suggested visuals:

- Top priority locations table
- Map of flagged locations
- Risk vs severity scatter plot
- Hotspot trend chart
- Pareto chart of investigation priorities
- Risk-factor decomposition for selected locations
- Intervention tracking table, if a tracking dataset exists

Example priority categories:

- Priority 1: High historical burden and statistically supported recent increase
- Priority 2: High historical burden without a strong recent rise
- Priority 3: Lower accident count but elevated severe-outcome pattern
- Monitor: Limited evidence or insufficient time series signal

The dashboard should explain why a location is ranked as it is, not merely display a numeric score without interpretation.

This page is where recommendations become operational, such as:

- review site and confirm the anomaly
- run a road-safety audit
- assess lighting and visibility
- inspect drainage and wet-weather risk
- review junction design and traffic control

---

## 5. Data model recommendation for Power BI

The repository describes a normalized PostgreSQL schema, but Power BI should use a reporting model designed around analytical grains rather than direct table joins at the wrong level.

Suggested reporting tables:

| Table | Grain | Purpose |
|---|---|---|
| FactAccidents | One row per accident | Accident attributes and outcomes |
| FactCasualties | One row per casualty | Casualty-level analysis |
| FactVehicles | One row per vehicle | Vehicle-related analysis |
| DimDate | One row per date | Time intelligence |
| DimLocation | One row per defined geography | Geographic filtering |
| DimRoadCondition | One row per condition category | Environmental and road-state analysis |
| FactHotspots | One row per hotspot and period | Cluster and hotspot metrics |
| FactHotspotAlerts | One row per alert | Emerging-anomaly analysis |
| FactPredictions | One row per evaluated prediction | Model evaluation and prediction exploration |

Critical rule:

Do not flatten accident, vehicle, and casualty tables into a single table without accounting for their different grains. One accident may involve multiple vehicles and multiple casualties, and naive joining will inflate counts and distort totals.

---

## 6. Dashboard interaction model

The report should behave like one coherent system rather than six independent pages.

Example flow:

1. Overview identifies a worsening severe-accident pattern
2. Temporal page highlights the time windows driving the increase
3. Geographic page isolates the relevant locations
4. Diagnostic page explains the conditions associated with those incidents
5. Machine learning page checks whether the rise is statistically unusual
6. Decision-support page ranks locations for investigation

Recommended interactions:

- Synchronized date slicers
- Geographic selection that propagates to hotspot and severity visuals
- Drill-through from hotspot summary to detailed accident records
- Filters that do not accidentally alter model evaluation metrics unless intentionally intended

Model performance metrics should be calculated on a defined evaluation set, not recomputed from arbitrary page-level selections.

---

## 7. Implementation guidance for this repository

The repository already contains the right building blocks. The most practical path is:

1. Confirm the processed data includes a reliable spatial identifier and repeated observation periods for hotspot anomaly checks
2. Reuse the existing DBSCAN hotspot outputs in the Power BI layer
3. Reuse the existing logistic-regression severity model for the model page
4. Add an emerging-hotspot detector only if time-series and spatial granularity are sufficient
5. Export model outputs in a clean format for Power BI consumption
6. Build the report around the actual data model and the real outputs that exist in the repo

This aligns with the repository’s described capabilities without creating redundant or unsupported claims.

---

## 8. Completion checklist

### Data quality
- Missing-value checks
- Duplicate removal
- Invalid coordinate validation
- Completeness monitoring
- Records with missing geography filtered or flagged

### Descriptive analytics
- KPI cards
- Distribution analysis
- Summary statistics
- High-level trend review

### Temporal analytics
- Hourly trends
- Day-of-week and seasonal variation
- Day x hour heatmaps
- Moving averages and decomposition

### Geographic analytics
- Cluster maps
- Accident density analysis
- Severity-weighted hotspot review
- Regional and location ranking

### Diagnostic analytics
- Cross-tabulations
- Decomposition trees
- Condition-specific severity comparisons

### Statistical analysis
- Confidence intervals
- Association tests
- Effect sizes
- Count-model comparisons when relevant

### Hotspot analytics
- Cluster ranking
- Multi-criteria scoring
- Location prioritization

### Anomaly detection
- Observed-vs-expected comparison
- Alert timelines
- Serial pattern checks

### Predictive analytics
- Severity model evaluation
- Probability analysis
- Prediction exploration

### Prescriptive analytics
- Ranked investigation list
- Interpretation of risk drivers
- Recommended action based on evidence

---

## 9. Final recommendation

The strongest and most credible project definition is:

- Power BI is the primary analytics and decision layer
- DBSCAN remains the spatial hotspot method already implemented in the repository
- Logistic regression remains the severity model already implemented in the repository
- An emerging-hotspot anomaly detector is added only as a complementary statistical model if the data supports it

This keeps the project aligned to the actual repository, preserves academic rigor, and delivers a proper analytics story instead of a chart-only dashboard.

The central question for the final system should be:

Which locations are showing an unusual increase in accidents, how severe are those incidents, what conditions characterize them, and which places should authorities investigate first?

That question gives the project a clear purpose, a defensible modeling strategy, and a compelling end-to-end analytics narrative.
