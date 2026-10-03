# Data Preprocessing & Feature Engineering Specification

**Project**: Smart Road Accident Hotspot Analysis and Risk Prediction System  
**Pipeline Script**: `python/preprocessing/run_pipeline.py`  
**Execution Timestamp**: 2026-10-03  
**Status**: Completed & Verified  

---

## 1. Executive Summary & File Transformation Statistics

The preprocessing pipeline transforms raw DfT STATS19 CSV files into clean, fully-typed, and feature-engineered relational tables ready for database loading, spatial DBSCAN clustering, and machine learning.

| Dataset | Raw Input Rows | Cleaned Output Rows | Duplicates Dropped | Orphans Removed | Output File | Columns |
|---|---|---|---|---|---|---|
| **Collisions (Accidents)** | 513,801 | 513,801 | 0 | &mdash; | `data/processed/accidents_clean.csv` | 69 cols |
| **Vehicles** | 937,265 | 937,265 | 0 | 0 | `data/processed/vehicles_clean.csv` | 42 cols |
| **Casualties** | 652,821 | 652,821 | 0 | 0 | `data/processed/casualties_clean.csv` | 31 cols |

---

## 2. Cleaning Rules & Transformations

### 2.1. Column Standardization to `snake_case`
- **Rule**: Convert all raw header strings to normalized lowercase `snake_case`.
- **Naming Alignment**: Standardize DfT naming aliases to uniform schema conventions:
  - `collision_index` $\rightarrow$ `accident_index`
  - `collision_year` $\rightarrow$ `accident_year`
  - `collision_ref_no` $\rightarrow$ `accident_reference`
  - `collision_severity` $\rightarrow$ `accident_severity`
  - `date` $\rightarrow$ `accident_date`

### 2.2. Domain Sentinel Unknowns to `NaN` (Missing)
- **Rule**: In raw STATS19, missing or unknown values are represented by integer sentinel values (`-1`, `99`, `9`), text representations (`"NULL"`, `"null"`, `""`), or special category codes (e.g. `15` for unknown driver journey).
- **Transformation**: Converted all sentinel values to standard `NaN` in numeric/analytical columns while retaining explicit `"Unknown"` labels in decoded categorical text columns.
- **Top Converted Columns**:
  - `special_conditions_at_site`: 161,928 converted (31.5%)
  - `carriageway_hazards`: 19,063 converted (3.7%)
  - `weather_conditions`: 14,578 converted (2.8%)
  - `road_type`: 13,060 converted (2.5%)
  - `road_surface_conditions`: 10,248 converted (2.0%)
  - `light_conditions`: 8,630 converted (1.7%)
  - `speed_limit`: 3 converted (<0.001%)
  - `driver_distance_banding` (vehicles): 651,858 converted (69.5%)
  - `casualty_distance_banding` (casualties): 428,604 converted (65.6%)

### 2.3. Date & Time Standardization
- **Rule**: 
  - Parse `accident_date` using day-first convention (`%d/%m/%Y`) into ISO-8601 string format (`YYYY-MM-DD`).
  - Standardize `time` to strict 24-hour `HH:MM` format (e.g., `"8:30"` $\rightarrow$ `"08:30"`).
- **Validation**:
  - `invalid_dates`: **0 rows** (100% valid dates between 2021-01-01 and 2025-12-31).
  - `invalid_times`: **0 rows** (100% valid times between 00:00 and 23:59).

### 2.4. Geospatial Coordinate Validation & Flagging
- **Rule**: Retain all records and both coordinate systems:
  - Projected Metric: `location_easting_osgr` and `location_northing_osgr` (British National Grid metres)
  - GPS Angular: `latitude` and `longitude` (WGS84 degrees)
- **Flagging**: Compute boolean `has_valid_coords` based on Great Britain geographic bounds ($49.85^\circ\text{N} \le \text{Lat} \le 60.90^\circ\text{N}$, $-8.65^\circ\text{W} \le \text{Lon} \le 1.80^\circ\text{E}$):
  - **Valid Coordinates (`has_valid_coords = True`)**: **513,748 rows (99.99%)**
  - **Missing Coordinates (`has_valid_coords = False`)**: **53 rows (0.010%)**
- **Rationale**: Preserving records with missing coordinates ensures total national statistics (e.g. annual casualty totals) remain complete in DBMS queries, while spatial clustering scripts filter on `has_valid_coords = True`.

### 2.5. Primary Key Uniqueness & Orphan Filtering
- **Primary Key Uniqueness**: `accident_index` is 100% unique across all 513,801 accident records (0 duplicates).
- **Foreign Key Integrity**:
  - Orphan casualty records removed: **0** (100% valid parent matches).
  - Orphan vehicle records removed: **0** (100% valid parent matches).

---

## 3. Feature Engineering

### 3.1. Temporal Features & Traffic Condition Proxy

| Feature | Data Type | Description / Logic | Distribution in Dataset |
|---|---|---|---|
| `accident_year` | Integer | Calendar year of incident (2021–2025) | 2021 (101k), 2022 (106k), 2023 (104k), 2024 (101k), 2025 (101k) |
| `month` | Integer | Month of collision (1–12) | Uniform distribution (~40k–45k / month) |
| `month_name` | String | 'January' ... 'December' | Human-readable reporting label |
| `day_of_week_name` | String | 'Sunday' (1) ... 'Saturday' (7) | Friday (81k), Saturday (78k) are peak collision days |
| `is_weekend` | Integer | 1 if Saturday or Sunday, else 0 | 145,214 weekend (28.3%) vs 368,587 weekday (71.7%) |
| `hour` | Integer | Hour of collision (0–23) | Peak collision hours: 17:00 (46.8k), 16:00 (44.9k), 15:00 (42.1k) |
| **`time_period`** | **String** | **Rush-Hour / Traffic Density Proxy** | **Daytime** (184,238; 35.9%)<br/>**Evening Peak** (123,623; 24.1%)<br/>**Evening** (79,889; 15.5%)<br/>**Morning Peak** (75,998; 14.8%)<br/>**Night** (50,053; 9.7%) |

> [!NOTE]
> **Methodology Note on `time_period`**:
> Because STATS19 contains no real-time traffic volume sensor counts, `time_period` serves as a deterministic and explainable proxy capturing commuter congestion windows and nocturnal risk factors:
> - `Morning Peak`: 07:00 – 09:59
> - `Daytime`: 10:00 – 15:59
> - `Evening Peak`: 16:00 – 18:59
> - `Evening`: 19:00 – 22:59
> - `Night`: 23:00 – 06:59

### 3.2. Severity Classification Target & Labels

| Feature | Logic | Class Count | Percentage | Role in ML & Dashboard |
|---|---|---|---|---|
| **`is_severe`** | **1** if `accident_severity` $\in \{1, 2\}$, else **0** | Severe: **124,366**<br/>Slight: **389,435** | **24.21%**<br/>**75.79%** | **Primary Target Variable** for Logistic Regression risk prediction |
| `severity_label` | 1 $\rightarrow$ 'Fatal', 2 $\rightarrow$ 'Serious', 3 $\rightarrow$ 'Slight' | Fatal: 7,553 (1.5%)<br/>Serious: 116,813 (22.7%)<br/>Slight: 389,435 (75.8%) | 100.0% | UI Charting and presentation |

### 3.3. Vehicle Involvement Aggregation Flags
Aggregated from `vehicles` table to `accidents` level by `accident_index`:

| Feature | Flag Definition | Positive Count | Positive Pct |
|---|---|---|---|
| `involves_motorcycle` | 1 if any vehicle in accident is a Motorcycle (codes 2, 3, 4, 5, 23, 97, 103–106) | 85,042 accidents | 16.55% |
| `involves_hgv` | 1 if any vehicle in accident is an HGV / Goods Vehicle >3.5t (codes 20, 21, 98, 113) | 20,014 accidents | 3.90% |
| `involves_cyclist` | 1 if any vehicle in accident is a Pedal Cycle (code 1) | 79,812 accidents | 15.53% |

---

## 4. Reference Table Lookups & Categorical Decoding

Every categorical field in the dataset has been enriched with an official descriptive label column mapped from `data/reference/*.csv`:

- `police_force_label` (e.g. 'Metropolitan Police', 'Greater Manchester', 'Police Scotland')
- `local_authority_district_label`
- `weather_conditions_label` (e.g. 'Fine no high winds', 'Raining + high winds', 'Fog or mist')
- `light_conditions_label` (e.g. 'Daylight', 'Darkness - lights lit', 'Darkness - no lighting')
- `road_surface_conditions_label` (e.g. 'Dry', 'Wet or damp', 'Frost or ice')
- `road_type_label` (e.g. 'Single carriageway', 'Dual carriageway', 'Roundabout')
- `junction_detail_label` & `junction_control_label`
- `urban_or_rural_area_label` ('Urban', 'Rural')
- `vehicle_type_label` (e.g. 'Car', 'Pedal cycle', 'Motorcycle over 500cc', 'Goods 7.5 tonnes mgw and over')
- `casualty_class_label` ('Driver or rider', 'Passenger', 'Pedestrian')
- `casualty_severity_label` ('Fatal', 'Serious', 'Slight')

---

## 5. Verification & Unit Testing

The preprocessing suite is covered by comprehensive unit tests in [python/tests/test_preprocessing.py](file:///Users/makarandkulkarni/Myspace/DV%20Project/python/tests/test_preprocessing.py) validating:
1. `test_standardize_column_names` &mdash; PASSED
2. `test_convert_sentinel_unknowns` &mdash; PASSED
3. `test_parse_dates_and_times` &mdash; PASSED
4. `test_validate_and_flag_coordinates` &mdash; PASSED
5. `test_remove_orphan_records` &mdash; PASSED
6. `test_derive_temporal_and_time_period_boundaries` &mdash; PASSED
7. `test_derive_severity_features` &mdash; PASSED
8. `test_derive_vehicle_involvement_flags` &mdash; PASSED
