# Spatial Accident Hotspot Detection & Risk Scoring Methodology

> **Project:** Smart Road Accident Hotspot Analysis and Risk Prediction System  
> **Dataset:** UK Department for Transport STATS19 (2021–2025 Complete 5-Year National Archive)  
> **Coordinate Reference System:** British National Grid (OSGB36 / EPSG:27700 Easting & Northing in Metres)  
> **Algorithm:** Density-Based Spatial Clustering of Applications with Noise (DBSCAN with KD-Tree)  

---

## 1. Executive Overview & The Wording Rule

This document establishes the scientific, mathematical, and spatial engineering methodology used to detect geographic collision hotspots across Great Britain and rank them by empirical multi-criteria risk.

> [!IMPORTANT]
> ### The Core Wording Rule (Mandatory Scientific Guardrail)
> **Spatial clusters identified by DBSCAN represent empirical patterns of collision density and casualty severity in the historical STATS19 dataset. They do NOT constitute absolute proof that a geographic location or road infrastructure is inherently or objectively dangerous.**  
> Because the dataset contains **no traffic exposure data** (e.g. annual average daily traffic, vehicle-kilometres travelled, or pedestrian footfall counts), high collision counts frequently reflect high exposure (e.g. busy multi-lane highway interchanges or dense urban centres) rather than intrinsically hazardous road design.

---

## 2. Why DBSCAN on Projected Metre Coordinates?

### 2.1 Why DBSCAN Over Alternative Algorithms?
We specifically selected **DBSCAN** (*Density-Based Spatial Clustering of Applications with Noise*) over $K$-Means, Hierarchical Clustering, or Kernel Density Estimation (KDE) for four fundamental reasons:

1. **Arbitrary Geometric Morphologies**: Road infrastructure follows linear ribbons, dual-carriageway corridors, and complex grade-separated junctions. $K$-Means enforces spherical/isotropic clusters of roughly equal variance, which catastrophically fragments elongated road networks. DBSCAN seamlessly traces complex linear road corridors.
2. **Deterministic Noise Handling**: In road safety, the vast majority of collisions occur as isolated, dispersed events across rural and suburban distributor roads. DBSCAN explicitly classifies low-density points as noise ($\text{label} = -1$) rather than forcing every collision into a cluster.
3. **No A Priori Cluster Count ($k$)**: Unlike $K$-Means, DBSCAN does not require guessing the number of clusters in advance.
4. **Computational Scalability**: With `algorithm='kd_tree'`, spatial querying over 513,748 points executes in **0.41 seconds** ($O(N \log N)$ complexity).

### 2.2 Why Projected Metres (OSGB36 / EPSG:27700)?
Clustering on raw spherical angular coordinates (`latitude` and `longitude` in degrees) introduces severe spatial distortion across Great Britain:
* At the latitude of London ($51.5^\circ\text{ N}$), $1^\circ$ of longitude spans $\approx 69.4\text{ km}$, whereas at Inverness ($57.5^\circ\text{ N}$), $1^\circ$ spans $\approx 59.8\text{ km}$.
* A fixed Euclidean degree radius produces oblong, distorted ellipses that shrink longitudinally as latitude increases.
* STATS19 provides high-precision British National Grid coordinates (`location_easting_osgr` and `location_northing_osgr`) in **metres**, guaranteeing that an $\varepsilon = 150\text{ m}$ radius represents an exact, isotropic 150-metre ground distance anywhere in England, Scotland, or Wales.

---

## 3. Parameter Selection Justification ($\varepsilon = 150\text{ m}, \text{min\_samples} = 30$)

### 3.1 The $k$-Distance Elbow Method ($k = 30$)
To determine the natural density threshold of the spatial point pattern, we computed the 30-nearest neighbor ($30$-NN) Euclidean distance for all 513,748 valid coordinate collisions using a spatial KD-Tree.

![30-NN Distance Elbow Curve](file:///Users/makarandkulkarni/Myspace/DV%20Project/docs/figures/hotspot/01_k_distance_elbow.png)

* The $k$-distance curve displays a pronounced sharp elbow between **$120\text{ m}$ and $180\text{ m}$**.
* Below $100\text{ m}$, the search radius fragments continuous complex urban intersections.
* Above $200\text{ m}$, the radius begins chaining unrelated parallel city streets and cross-town corridors into massive artificial mega-clusters.
* **Choice:** $\varepsilon = 150\text{ m}$ sits squarely in the stable elbow plateau.

### 3.2 Parameter Sensitivity Grid Search
We evaluated 9 parameter permutations over $\varepsilon \in [100, 150, 250]\text{ m}$ and $\text{min\_samples} \in [20, 30, 50]$:

| $\varepsilon$ (m) | `min_samples` | Clusters Found | Collisions Clustered | Share Clustered (%) | Mean Cluster Size | Max Diameter (m) | Rationale / Assessment |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **100** | 20 | 1,194 | 59,888 | 11.66% | 50.2 | 1,842.1 | Over-fragments junctions into sub-nodes |
| **100** | 30 | 475 | 31,958 | 6.22% | 67.3 | 1,620.4 | Too restrictive; misses regional blackspots |
| **100** | 50 | 128 | 10,147 | 1.98% | 79.3 | 1,210.0 | Severe under-clustering |
| **150** | 20 | 1,553 | 104,569 | 20.35% | 67.3 | 2,840.5 | Captures excess peripheral minor incidents |
| **150** | **30** | **704** | **63,879** | **12.43%** | **90.7** | **3,142.8** | **[OPTIMAL BASELINE] Balanced density & discrete nodes** |
| **150** | 50 | 241 | 29,165 | 5.68% | 121.0 | 2,410.2 | Omits significant high-severity secondary junctions |
| **250** | 20 | 1,881 | 188,772 | 36.74% | 100.4 | 6,850.1 | Massive spatial chaining across urban wards |
| **250** | 30 | 939 | 135,058 | 26.29% | 143.8 | 5,420.7 | Chains entire motorway corridors into single blobs |
| **250** | 50 | 362 | 78,307 | 15.24% | 216.3 | 4,910.3 | Blurs distinct local traffic management authorities |

*Saved to [`hotspot_parameter_sensitivity.csv`](file:///Users/makarandkulkarni/Myspace/DV%20Project/docs/results/hotspot_parameter_sensitivity.csv).*

---

## 4. Hotspot Cluster Metric Engineering

For every detected cluster $C_k$ containing member collisions $\{x_i\}_{i=1}^{N_k}$, we compute:

1. **Centroid Coordinates**:
   $$\text{centre\_lat}_k = \frac{1}{N_k}\sum_{i=1}^{N_k} \text{latitude}_i, \quad \text{centre\_lon}_k = \frac{1}{N_k}\sum_{i=1}^{N_k} \text{longitude}_i$$
2. **Bounding Radius ($r_k$) and Diameter ($d_k$)**:
   $$r_k = \max_{i} \sqrt{(E_i - \bar{E}_k)^2 + (N_i - \bar{N}_k)^2}, \quad d_k = 2 \cdot r_k$$
3. **Corridor Flag ($d_k > 1500\text{ m}$)**:
   * 33 out of 704 clusters span $> 1.5\text{ km}$, flagging continuous arterial corridors (e.g. A406 North Circular, M25 junctions, Birmingham ring roads).
4. **Severity Proportions**:
   $$\text{severe\_ratio}_k = \frac{\text{fatal\_count}_k + \text{serious\_count}_k}{N_k}$$
5. **Annual Collision Trend Slope (OLS)**:
   * Computed using Ordinary Least Squares regression on annual counts across complete post-pandemic baseline years (2021–2025):
   $$\text{slope}_k = \frac{\sum (y - \bar{y})(C_y - \bar{C})}{\sum (y - \bar{y})^2}$$
   * *Note:* The year 2020 was excluded from the baseline trend calculation due to COVID-19 mobility anomalies.

---

## 5. Multi-Criteria Composite Risk Scoring

### 5.1 Formulation
Raw counts, severity ratios, and trend slopes operate on vastly different numerical scales. To ensure equal and robust multi-attribute weighting without outlier distortion, we apply **percentile rank transformation** across all 704 clusters:

1. **Frequency Percentile ($F$)**: Percentile rank of collisions per year ($\text{rank}(N_k / 5) / K$).
2. **Severity Percentile ($S$)**: Percentile rank of $\text{severe\_ratio}_k$.
3. **Trend Percentile ($T$)**: Percentile rank of $\text{trend\_slope}_k$.

The composite risk score is defined as:
$$\text{Risk Score} = 100 \times \left( \frac{F + S + T}{3} \right) \in [0, 100]$$

```
+-------------------------------------------------------------------------+
|                  MULTI-CRITERIA RISK SCORING MODEL                      |
|                                                                         |
|  [Annual Collision Volume] ---> Percentile Rank (F) ---\                |
|                                                         \               |
|  [Severe Injury Ratio]    ---> Percentile Rank (S) ------> (F + S + T)/3|
|                                                         /    * 100      |
|  [Multi-Year Trend Slope] ---> Percentile Rank (T) ---/       |         |
|                                                               v         |
|                                                     [COMPOSITE SCORE]   |
|                                                               |         |
|                     +--------------------+--------------------+         |
|                     |                    |                    |         |
|                     v                    v                    v         |
|                 Top 20%              Next 30%             Bottom 50%    |
|               [HIGH RISK]         [MEDIUM RISK]           [LOW RISK]    |
+-------------------------------------------------------------------------+
```

### 5.2 Risk Tier Classification
* **High Risk Tier**: Top 20% of hotspots ($\text{Risk Score} \ge 67.57$, $N = 141$ hotspots).
* **Medium Risk Tier**: Next 30% of hotspots ($48.33 \le \text{Risk Score} < 67.57$, $N = 211$ hotspots).
* **Low Risk Tier**: Bottom 50% of hotspots ($\text{Risk Score} < 48.33$, $N = 352$ hotspots).

### 5.3 Weight Sensitivity Analysis
We evaluated the stability of the ranking by testing alternative weighting schemes:
1. **Frequency-Heavy** ($0.5 \cdot F + 0.3 \cdot S + 0.2 \cdot T$): Spearman rank correlation with equal weighting = **$\rho = 0.8741$** ($p < 10^{-200}$).
2. **Trend-Heavy** ($0.2 \cdot F + 0.3 \cdot S + 0.5 \cdot T$): Spearman rank correlation with equal weighting = **$\rho = 0.8855$** ($p < 10^{-200}$).

The extremely high rank correlations ($\rho > 0.87$) confirm that the ranking is structurally robust and not an artifact of arbitrary weight choices.

---

## 6. Methodology Figures & Visual Distribution

### Figure 1: Parameter Selection Elbow Curve
![30-NN Distance](file:///Users/makarandkulkarni/Myspace/DV%20Project/docs/figures/hotspot/01_k_distance_elbow.png)

### Figure 2: Cluster Size Distribution
![Cluster Size Distribution](file:///Users/makarandkulkarni/Myspace/DV%20Project/docs/figures/hotspot/02_cluster_size_distribution.png)
* *Insight:* Median cluster size is 61 collisions; mean is 90.7 collisions. The distribution exhibits a heavy right tail of high-volume urban road intersections.

### Figure 3: Risk Score Distribution & Risk Tiers
![Risk Score Distribution](file:///Users/makarandkulkarni/Myspace/DV%20Project/docs/figures/hotspot/03_risk_score_distribution.png)
* *Insight:* Composite risk scores span 13.54 to 96.45, creating a smooth bell-shaped distribution across Low, Medium, and High risk tiers.

### Figure 4: Top 10 High-Risk Hotspots Ranked
![Top 10 Hotspots](file:///Users/makarandkulkarni/Myspace/DV%20Project/docs/figures/hotspot/04_top10_hotspots_ranked.png)
* *Insight:* Top-ranked hotspots combine high collision frequency ($N > 150$), elevated severe casualty rates ($> 25\%$), and positive year-over-year crash trends.

---

## 7. Relational Database Integration & Views

1. **Table `hotspot`**: Populated with 704 rows containing centroids, metrics, risk scores, and tiers.
2. **Table `accident.hotspot_id`**: 63,879 collision records (12.43% of national total) foreign-key linked to their parent cluster.
3. **View `v_hotspot_summary`**: Joins `hotspot` to `local_authority_district` for instant web mapping.
4. **View `v_grid_density`**: 500m uniform spatial binning across Great Britain for choropleths and density surface rendering.

---

## 8. Summary of Methodology Limitations for Viva Defense

When explaining this model in an academic examination or technical presentation, emphasize the following honest caveats:

1. **Exposure Limitation**: STATS19 records only collision outcomes. A junction with 100 crashes and 10 million passing vehicles is safer per trip than a junction with 20 crashes and 50,000 vehicles.
2. **Reporting Bias**: Slight injury collisions are under-reported by up to 20–30% in police records compared to hospital admissions.
3. **Spatial Chaining**: In dense urban areas, DBSCAN can occasionally chain contiguous streets into a corridor. The $1.5\text{ km}$ diameter flag identifies these instances for separate corridor-level analysis.
4. **COVID-19 Baseline Shift**: Mobility restrictions in 2020 artificially reduced crash counts; hence 2020 is excluded from trend calculations.
