# STATS19 Exploratory Data Analysis (EDA) Findings & Statistical Report

**Project**: Smart Road Accident Hotspot Analysis and Risk Prediction System  
**Database**: PostgreSQL 16 (`road_safety`)  
**Data Scope**: UK Department for Transport STATS19 (2021–2025, 513,801 Collisions)  
**Author**: Makarand Kulkarni  

---

## 1. Executive Summary

This document presents **15 evidence-based empirical findings** derived from PostgreSQL analytical views and Python visualization pipelines across 513,801 road collisions in Great Britain between 2021 and 2025. 

Every finding is accompanied by real statistical metrics, 95% Wilson Score confidence intervals where applicable, and mandatory domain caveats.

> [!IMPORTANT]
> **Core Methodological Caveats**:
> 1. **Counts $\neq$ Risk**: Raw collision volume reflects the joint probability of driving exposure and incident occurrence. More crashes occur in daylight and fine weather simply because far more vehicle-kilometers are driven under those conditions.
> 2. **Absence of Exposure Data**: The STATS19 dataset records incidents, not total vehicle journeys or traffic counts. Therefore, proportions represent outcome severity given a crash, not crash probability per trip.
> 3. **2020 Pandemic Anomaly**: The 2020 calendar year is excluded from primary multi-year trend analysis due to nationwide COVID-19 travel restrictions and artificially suppressed traffic baselines.
> 4. **Association $\neq$ Causation**: Environmental or temporal correlations (e.g. unlit darkness and high severity) reflect compound interactions with speed limit and road classification rather than isolated causal factors.

---

## 2. Comprehensive Analytical Findings & Caveats

### Finding 1: Macro Annual Collision Stability (2021–2025)
- **Empirical Figure**: Total recorded collisions remained tightly bounded between **100,927 (2024)** and **106,004 (2022)**, totaling **513,801 collisions** over the 5-year period.
- **Severe Proportion**: The proportion of severe collisions (Fatal + Serious) remained virtually invariant year-over-year at **24.2% $\pm$ 0.4%**.
- **Caveat**: Aggregate national stability can mask substantial localized shifts at regional council levels and changes in reporting thresholds across individual police forces.

---

### Finding 2: Late Autumn Seasonal Peak in Collisions
- **Empirical Figure**: Collisions reach seasonal lows in **January (33,485)** and **February (31,902)**, ramping steadily to an annual peak in **October (46,478)** and **November (47,562)**.
- **Severe Proportion**: Severe collision rates remain elevated throughout autumn and winter (~24.5%–25.1%).
- **Caveat**: Elevated autumn totals coincide with changing clock times (British Summer Time end), deteriorating evening visibility, and increased commuter traffic; weather alone is not the sole causal mechanism.

---

### Finding 3: Friday Volume Peak vs Weekend Casualty Severity
- **Empirical Figure**: **Friday** experiences the highest total collision volume (**85,311 collisions**, 16.6% of national total), whereas **Sunday** exhibits the lowest volume (**57,781 collisions**).
- **Casualty Impact**: Weekend crashes (Saturday/Sunday) record **1.33–1.35 casualties per collision**, compared to **1.24–1.26** on weekdays.
- **Caveat**: Higher weekend casualties per crash reflect higher vehicle passenger occupancy during leisure travel rather than higher vehicular crash rates.

---

### Finding 4: Bimodal Diurnal Hourly Profile
- **Empirical Figure**: Collisions exhibit distinct peaks during the morning rush hour (**08:00–09:00: 36,086 collisions**) and evening rush hour (**17:00–18:00: 46,012 collisions**).
- **Caveat**: Peak crash hours mirror national traffic flow volumes. Peak hours represent high congestion and low average vehicle speeds, resulting in more minor fender-benders rather than higher lethality.

---

### Finding 5: Nocturnal Crash Lethality Surge (00:00–04:00)
- **Empirical Figure**: Between **00:00 and 04:00**, collision counts drop to their daily minimum (4,106 to 8,110 crashes per hour), but the **severe collision rate surges to 30.1%–30.9%** (95% CI: [29.7%, 31.4%]).
- **Comparison**: Daytime hours (10:00–16:00) average only **22.5%–23.8% severe collisions**.
- **Caveat**: Higher nocturnal severity is driven by higher vehicle speeds on uncongested roads, alcohol/substance involvement, driver fatigue, and reduced lighting, not higher crash probability per trip.

---

### Finding 6: Severity Class Breakdown in STATS19
- **Empirical Figure**: 
  - **Slight**: 389,435 collisions (**75.79%**)
  - **Serious**: 116,813 collisions (**22.74%**)
  - **Fatal**: 7,553 collisions (**1.47%**)
- **Binary Target**: Combined severe collisions (`is_severe = 1`) total **124,366 (24.21%)**.
- **Caveat**: Injury severity definitions rely on police officer assessment at the scene and hospital admission records; minor variations exist across reporting constabularies.

---

### Finding 7: Atmospheric Weather Exposure Paradox
- **Empirical Figure**: Over **82.8% of all collisions (413,632)** occur in **"Fine no high winds"** weather (24.7% severe rate). Rain accounts for **11.2% (55,834)** with a 24.0% severe rate.
- **High Severity Conditions**: **Fog or mist** exhibits the highest severe collision rate at **28.1%** (N=2,374), followed by high-wind conditions (**26.8%–29.7%**).
- **Caveat**: The vast majority of crashes happen in fine weather because the vast majority of vehicle travel occurs in fine weather (exposure bias). Extreme weather causes drivers to adapt with lower travel speeds or cancel journeys altogether.

---

### Finding 8: Road Surface Grip Dynamics
- **Empirical Figure**: **Dry roads** account for **374,268 collisions (72.8%)** with a **24.3% severe rate**; **Wet/damp roads** account for **120,572 collisions (23.5%)** with a **25.4% severe rate** (95% CI: [25.1%, 25.6%]).
- **Frost/Ice**: **6,668 collisions (1.3%)** with a **22.7% severe rate**.
- **Caveat**: The lower severe rate on icy roads illustrates driver risk compensation: visible frost causes motorists to reduce speed, decreasing the kinetic energy of resulting impacts.

---

### Finding 9: Ambient Lighting and Road Illumination
- **Empirical Figure**: Collisions in **"Darkness - no lighting"** record a **31.9% severe rate** (95% CI: [31.5%, 32.4%], N=46,807), compared to **23.3% in daylight** (N=372,217).
- **Lit Darkness**: Street-lit darkness records a **25.5% severe rate** (N=86,147).
- **Caveat**: Unlit darkness is heavily confounded with rural single-carriageway A-roads and 60 mph speed limits; absence of streetlights is not the sole hazard.

---

### Finding 10: Speed Limit vs Severity Monotonicity
- **Empirical Figure**: Severe collision percentages scale monotonically with speed limit:
  - **20 mph**: 19.65% severe (N=88,096) | 0.47% fatal | 1.122 avg casualties
  - **30 mph**: 22.65% severe (N=267,325) | 0.87% fatal | 1.213 avg casualties
  - **40 mph**: 25.69% severe (N=44,750) | 1.80% fatal | 1.366 avg casualties
  - **50 mph**: 28.32% severe (N=22,666) | 2.58% fatal | 1.461 avg casualties
  - **60 mph**: **34.50% severe** (N=62,703) | 3.65% fatal | 1.473 avg casualties
  - **70 mph**: 24.62% severe (N=28,258) | 3.11% fatal | 1.524 avg casualties
- **Caveat**: 70 mph motorways exhibit a lower overall severe percentage than 60 mph rural roads because motorways feature grade separation, central reservation barriers, and no vulnerable road users (pedestrians/cyclists).

---

### Finding 11: Roadway Layout & Junction Merging Safety
- **Empirical Figure**: **Single carriageways** represent **74.1% of collisions (380,483)** with a **24.8% severe rate**. **Roundabouts** represent **44,142 collisions** with the lowest severe rate (**17.5%**, 95% CI: [17.1%, 17.8%]).
- **Caveat**: Roundabouts virtually eliminate high-speed perpendicular (T-bone) and head-on collisions, converting crashes into low-speed glancing side-swipes.

---

### Finding 12: Vehicle Classification Involvements
- **Empirical Figure**: **Passenger cars** dominate total fleet involvement (**637,681 vehicles**, appearing in 433,442 distinct crashes), followed by **pedal cycles (81,486)**, **vans under 3.5t (60,309)**, and **motorcycles (85,042)**.
- **Vulnerability**: Motorcycle-involved collisions exhibit a severe collision rate exceeding **35%**, reflecting lack of physical vehicle cabin protection.
- **Caveat**: Vehicle involvement counts mirror national vehicle registration counts and urban cycling densities.

---

### Finding 13: Urban vs Rural Environment Disparity
- **Empirical Figure**: 
  - **Urban roads**: 360,136 collisions (70.1%) | **21.93% severe rate** (95% CI: [21.8%, 22.1%])
  - **Rural roads**: 153,607 collisions (29.9%) | **29.42% severe rate** (95% CI: [29.2%, 29.7%])
- **Caveat**: Rural roads feature higher average driving speeds, undivided oncoming lanes, roadside hazards (trees, ditches), and longer emergency medical response transit times.

---

### Finding 14: Regional Concentration in Metropolitan Police Area
- **Empirical Figure**: London's **Metropolitan Police Force** jurisdiction accounted for **110,585 collisions (21.52%)**, nearly 5x the volume of the next largest force (**West Midlands: 23,672, 4.61%**).
- **Severity Disparity**: London's urban severe rate is relatively low (**18.2%**), whereas rural forces like **Police Scotland (42.5%)** and **North Wales (36.4%)** record substantially higher injury severities.
- **Caveat**: High London collision counts reflect intense traffic density and pedestrian/cyclist congestion, while lower severe rates reflect lower average vehicle speeds (20–30 mph limits).

---

### Finding 15: Missingness & Legacy Data Code Conversions
- **Empirical Figure**: Quality auditing revealed that **513,607 raw rows (99.96%)** lacked numeric `local_authority_district` codes (having been replaced by Police Force IDs and Easting/Northing OSGR coordinates in recent STATS19 releases).
- **Handling**: Converting sentinel values (`-1`, `99`) to SQL `NULL`s prevented mathematical corruption across all 18 database tables.
- **Caveat**: Modern spatial hotspot identification must rely on GPS coordinates (`latitude`, `longitude`) rather than administrative district codes.

---

## 3. Summary for Viva Defense

| Analytical Dimension | Key Takeaway | Primary Driver | Viva Caveat |
|---|---|---|---|
| **Temporal** | Rush hour peaks in volume; 00:00–04:00 peaks in lethality (30.9% severe) | Traffic volume vs nocturnal speed & visibility | Volume $\neq$ driver risk per km |
| **Environmental** | 82.9% crashes happen in fine weather; fog has highest severity (28.1%) | Exposure bias vs low-visibility hazard | Extreme weather suppresses travel demand |
| **Infrastructure** | 60 mph rural roads peak at 34.5% severe; roundabouts lowest at 17.5% | Kinetic energy ($E_k = \frac{1}{2}mv^2$) & impact angles | Motorways safer due to physical median barriers |
| **Geographic** | Rural roads 29.4% severe vs Urban 21.9% | Speed environment & medical response times | Urban areas have vastly higher collision counts |
