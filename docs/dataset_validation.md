# Dataset Validation & Suitability Report

**Project**: Smart Road Accident Hotspot Analysis and Risk Prediction System  
**Dataset**: UK Department for Transport (DfT) STATS19 Road Safety Open Data  
**Assessment Date**: 2026-10-03  
**Status / Decision**: **GO (Fully Validated & Suitable)**

---

## 1. Executive Summary & Suitability Decision

| Metric | Measured Value | Benchmark / Criteria | Assessment |
|---|---|---|---|
| **Collision Records** | 513,801 rows | >100,000 | Excellent |
| **Casualty Records** | 652,821 rows | >100,000 | Excellent |
| **Vehicle Records** | 937,265 rows | >100,000 | Excellent |
| **Years Covered** | 5 complete calendar years (2021–2025) | 5 years | Complete |
| **Primary Key Uniqueness** | 100% unique (`collision_index`) | 100% | Zero duplicates |
| **Foreign Key Integrity** | 0 orphan casualties, 0 orphan vehicles | 0 orphans | Perfect relational integrity |
| **Valid Geospatial Records** | 513,748 rows (99.99%) | >95% | Sub-meter metric precision |
| **Temporal Integrity** | 100% valid dates & times (0 parse errors) | >99% | Complete temporal coverage |
| **Severe Target Balance** | 24.21% Severe (124,366) vs 75.79% Slight (389,435) | 15–35% | Ideal for binary classification |
| **Categorical Code Mapping** | 100% of dataset codes mapped to reference labels | 100% | Fully decoded |
| **Decision** | **GO** | **GO** | Ready for DB Loading & ML |

---

## 2. Dataset Acquisition & Provenance

The dataset was acquired directly from the official **UK Department for Transport (DfT)** Road Safety Open Data repository hosted on `data.dft.gov.uk` and published under the **Open Government Licence (OGL v3.0)**:
- **Collisions Dataset**: Circumstances of every police-reported injury collision on public roads.
- **Vehicles Dataset**: Vehicle types, maneuvers, points of impact, driver demographics.
- **Casualties Dataset**: Casualty severity, casualty class, age, gender, injury details.
- **Data Guide**: Official DfT variable and lookup specification spreadsheet.

### File Manifest & Integrity Checksums

| File | Size (Bytes) | Formatted Size | SHA-256 Checksum | Total Rows |
|---|---|---|---|---|
| `data/raw/collisions_last_5_years.csv` | 97,669,586 | 93.14 MB | `06a03c0e5504175e23ed98e3e0b4767ac61d396c073405a1bddab9339c18f948` | 513,801 |
| `data/raw/casualties_last_5_years.csv` | 53,685,509 | 51.20 MB | `870be5a934ae10baf5c52163d59eccba0ab2f40327ffa6b2bd354d2e7ee6b108` | 652,821 |
| `data/raw/vehicles_last_5_years.csv` | 103,741,631 | 98.94 MB | `05453dca2651ad8a27b4ac0e6a0450a852c506e4d495111ffca398f3d311e26a` | 937,265 |
| `data/reference/dft_road_safety_data_guide.xlsx` | 85,112 | 0.08 MB | `51b08606ef3dad1ae5d4c8726241b022fc8e4bbdc910ef0e5cc2fb92b054fc12` | &mdash; |

---

## 3. Annual Record Breakdown

| Calendar Year | Collisions | Casualties | Vehicles |
|---|---|---|---|
| **2021** | 101,087 | 128,209 | 185,123 |
| **2022** | 106,004 | 135,480 | 194,547 |
| **2023** | 104,258 | 132,977 | 191,159 |
| **2024** | 100,927 | 127,786 | 182,752 |
| **2025** | 101,525 | 128,369 | 183,684 |
| **TOTAL** | **513,801** | **652,821** | **937,265** |

---

## 4. Key Validation Findings

### 4.1. Primary & Foreign Key Integrity
- **Primary Key (`collision_index`)**: 513,801 unique keys across 513,801 rows (0 duplicates).
- **Foreign Keys**: Every row in `casualties` and `vehicles` successfully links to an existing parent collision in `collisions` (0 orphan records).

### 4.2. Geospatial Precision & Bounding Box
- **Valid Coordinates**: 513,748 records (99.99%) contain non-null, valid coordinates.
- **Missing Coordinates**: Exactly 53 records (0.010%) lack coordinate data and will be safely omitted from spatial clustering pipelines.
- **Coordinate Systems**: Both British National Grid ($Easting, Northing$) metres and WGS84 ($Latitude, Longitude$) are provided.
- **Bounding Box Validation**:
  - Latitude: $49.912210^\circ\text{ N}$ to $60.500008^\circ\text{ N}$
  - Longitude: $-7.486852^\circ\text{ W}$ to $1.759829^\circ\text{ E}$
  - 100% of non-null records fall strictly within Great Britain boundaries.

### 4.3. Temporal Quality
- **Date Range**: January 1, 2021 to December 31, 2025 (5 complete consecutive calendar years).
- **Date Parse Failures**: 0 rows.
- **Time Parse Failures**: 0 rows (all timestamps conform to `HH:MM` standard 24-hour format).

### 4.4. Severity & Target Distribution
- **Raw Severity Classes**:
  - `Fatal` (Code 1): 7,553 collisions (1.47%)
  - `Serious` (Code 2): 116,813 collisions (22.74%)
  - `Slight` (Code 3): 389,435 collisions (75.79%)
- **Engineered Binary Target (`is_severe`)**:
  - `is_severe = 1` (Fatal or Serious): 124,366 collisions (**24.21%**)
  - `is_severe = 0` (Slight): 389,435 collisions (**75.79%**)
- **Suitability**: A positive class ratio of ~24.2% provides an ideal balance for training Logistic Regression classifiers and calculating reliable ROC-AUC and Precision-Recall metrics without extreme synthetic resampling.

### 4.5. Missing Values & Sentinel Code Audit
STATS19 uses standardized integer sentinel codes to indicate unrecorded data:
- `-1`: Data missing or out of range
- `99` / `9`: Unknown
- Crucial environmental fields (weather, light, road surface, road type) have low missingness (<3%).
- Specialized optional fields (e.g. driver journey purpose, vehicle distance banding) exhibit higher sentinel rates, which are retained as explicit `'Unknown'` categories in one-hot encoders.

---

## 5. Domain Categorical Lookups & Reference Extraction

72 reference CSV files were extracted directly from the official DfT Data Guide into `data/reference/`. 100% of categorical codes in the raw dataset match these reference tables.

Key domains extracted:
- `collision_severity.csv` (Fatal, Serious, Slight)
- `police_force.csv` (44 active police forces across England, Wales, Scotland)
- `local_authority_district.csv` (District administrative zones)
- `weather_conditions.csv` (Fine, Raining, Snowing, Fog/Mist, High Winds, Other)
- `light_conditions.csv` (Daylight, Darkness lights lit/unlit/no lighting)
- `road_surface_conditions.csv` (Dry, Wet/Damp, Snow, Frost/Ice, Flood)
- `road_type.csv` (Single carriageway, Dual carriageway, Roundabout, One-way street, Slip road)
- `junction_detail.csv` & `junction_control.csv`
- `urban_or_rural_area.csv` (Urban, Rural)
- `vehicle_type.csv` (Cars, Motorcycles, HGVs, Buses, Cyclists, Light Vans, Powered Personal Transporters)
- `time_period.csv` (Rush-hour and off-peak temporal proxy)

---

## 6. Unavailable Features & Methodological Handling

### Feature: Real-Time Traffic Condition / Volume
- **Issue**: STATS19 records situational post-crash parameters collected by police officers. It contains no real-time traffic volume sensor count, road occupancy, or congestion index at the moment of impact.
- **Handling**: As established in [docs/DECISIONS.md](file:///Users/makarandkulkarni/Myspace/DV%20Project/docs/DECISIONS.md), the raw concept of "traffic condition" is replaced with an explainable, rule-based **`time_period`** proxy:
  1. `Morning Peak` (07:00 – 09:59): Heavy morning commuter traffic proxy.
  2. `Daytime Off-Peak` (10:00 – 15:59): Moderate daytime flow proxy.
  3. `Evening Peak` (16:00 – 18:59): Heavy evening commuter rush proxy.
  4. `Night / Off-Hours` (19:00 – 06:59): Low-density, higher-speed nocturnal proxy.
- **Academic Justification**: This approach is transparent, deterministic, and easily defended in viva examinations without relying on ungrounded synthetic volume assumptions.

---

## 7. Manual Download Fallback Instructions

If automated download via `python/ingestion/download_data.py` is ever blocked by network firewalls or strict proxies, follow these manual steps:

1. Visit the official UK DfT Road Safety Open Data portal:  
   `https://www.gov.uk/government/statistical-data-sets/road-safety-open-data`
2. Download the following three rolling 5-year CSV files:
   - Collision CSV: `dft-road-casualty-statistics-collision-last-5-years.csv`
   - Casualty CSV: `dft-road-casualty-statistics-casualty-last-5-years.csv`
   - Vehicle CSV: `dft-road-casualty-statistics-vehicle-last-5-years.csv`
3. Download the Data Guide spreadsheet:
   - `dft-road-casualty-statistics-road-safety-open-dataset-data-guide-2025.xlsx`
4. Place the three CSV files into `data/raw/` named:
   - `collisions_last_5_years.csv`
   - `casualties_last_5_years.csv`
   - `vehicles_last_5_years.csv`
5. Place the Excel file into `data/reference/` named:
   - `dft_road_safety_data_guide.xlsx`
6. Run the reference builder and validation suite:
   ```bash
   python python/ingestion/build_reference_tables.py
   python python/ingestion/validate_data.py
   ```
