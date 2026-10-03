# Milestone 4: STATS19 Bulk Data Loading & Relational Verification Report

**Project**: Smart Road Accident Hotspot Analysis and Risk Prediction System  
**Database**: PostgreSQL 16 (`road_safety`)  
**Generated At**: 2026-10-03  
**Execution Environment**: macOS, Python 3.14 (`./venv`), `psycopg2-binary`  

---

## 1. Executive Summary

This report documents the bulk data loading, constraint enforcement, post-load index creation, and referential integrity verification for the UK Department for Transport STATS19 road casualty dataset (2021–2025).

All **513,801 collisions**, **937,265 vehicles**, and **652,821 casualties** were successfully loaded into the PostgreSQL schema in **under 1 minute** (40.74s COPY time, 55.48s total pipeline time) inside a **single atomic transaction** using `psycopg2.copy_expert`. Performance indexes were constructed post-load in 4.11s, and PostgreSQL optimizer statistics were refreshed via `ANALYZE`.

Comprehensive verification using `verify_load.py` confirmed **100% row count parity**, **0 orphan foreign keys**, and **0 constraint violations**.

---

## 2. Loading Pipeline Architecture & Timing Benchmarks

### 2.1 Bulk Loading Strategy
- **Mechanism**: Memory-buffered streaming using PostgreSQL `COPY ... FROM STDIN WITH (FORMAT text, NULL '\N', DELIMITER '\t')` via `psycopg2.cursor.copy_expert`.
- **Atomicity**: All three fact tables (`accident`, `vehicle`, `casualty`) are loaded within a single explicit transaction (`BEGIN` ... `COMMIT`). If an error occurs on any record, the entire batch is rolled back (`ROLLBACK`), leaving zero orphan or partial state.
- **Idempotency**: The script supports the `--reset` flag, which truncates child and fact tables in reverse dependency order (`TRUNCATE TABLE casualty, vehicle, accident CASCADE;`).
- **Post-Load Indexing**: Indexes are created *after* data loading to eliminate index maintenance overhead during bulk ingestion, maximizing throughput.

### 2.2 Execution Timings

| Pipeline Stage | Operation | Records / Entities | Duration | Throughput |
|---|---|---|---|---|
| **1. Data Ingestion** | In-memory CSV parsing (`pandas`) | 2,103,887 rows across 3 CSVs | 7.80s | ~270,000 rows/sec |
| **2. Buffer Preparation** | In-memory formatting & NULL conversion | 2,103,887 rows | 2.28s | ~920,000 rows/sec |
| **3. Database COPY** | Streaming `accident` table | 513,801 rows (34 cols) | 14.43s | 35,606 rows/sec |
| **3. Database COPY** | Streaming `vehicle` table | 937,265 rows (3 cols) | 15.08s | 62,152 rows/sec |
| **3. Database COPY** | Streaming `casualty` table | 652,821 rows (4 cols) | 11.23s | 58,131 rows/sec |
| **Transaction Commit** | Atomic Transaction Commit | Full Dataset | <0.01s | Instantaneous |
| **4. Index Creation** | Execute `database/indexes.sql` | 10 B-tree & Partial Indexes | 4.11s | - |
| **5. Optimizer Analyze** | `ANALYZE accident, vehicle, casualty` | 4 Fact/Summary Tables | 0.52s | - |
| **Total Pipeline** | **End-to-End Bulk Load** | **2,103,887 records loaded & indexed** | **55.48s** | **~37,900 rows/sec** |

---

## 3. Data Integrity & Constraint Handling

Per project standards, rows violating business rules were not silently dropped; instead, explicit constraint rules were logged and applied:

1. **Coordinate Invariant (`has_valid_coords = FALSE`)**:
   - **Records Affected**: 53 collisions
   - **Rule**: Retain collision record for macro and annual counts, but set `latitude = NULL`, `longitude = NULL`, `easting = NULL`, and `northing = NULL` to prevent GIS rendering errors and spatial corruption.
   - **Audit Result**: Verified in PostgreSQL with `SELECT COUNT(*) FROM accident WHERE has_valid_coords = FALSE AND (latitude IS NOT NULL OR longitude IS NOT NULL);` $\rightarrow$ **0 violations**.

2. **Speed Limit Validation**:
   - **Records Affected**: 3 collisions (containing invalid sentinels)
   - **Rule**: Valid UK speed limits are constrained to `[20, 30, 40, 50, 60, 70]`. Non-standard values were converted to `NULL`.
   - **Audit Result**: Verified all populated `speed_limit` values are within standard legal bands.

3. **Hotspot Foreign Key Placeholder**:
   - `accident.hotspot_id` remains `NULL` across all 513,801 collision records, awaiting spatial clustering in Milestone 5.

---

## 4. Referential Integrity & Orphan Audit

Every foreign key relationship was verified using `python/db/verify_load.py`:

| Foreign Key Relationship | Source Table | Referenced Table | Orphan Rows Found | Status |
|---|---|---|---|---|
| `fk_vehicle_accident` | `vehicle` | `accident(accident_index)` | **0** | **PASSED** |
| `fk_casualty_accident` | `casualty` | `accident(accident_index)` | **0** | **PASSED** |
| `fk_accident_severity` | `accident` | `severity(severity_id)` | **0** | **PASSED** |
| `fk_casualty_severity` | `casualty` | `severity(severity_id)` | **0** | **PASSED** |
| `fk_casualty_class` | `casualty` | `casualty_class(casualty_class_id)` | **0** | **PASSED** |
| `fk_vehicle_type` | `vehicle` | `vehicle_type(vehicle_type_id)` | **0** | **PASSED** |
| `fk_police_force` | `accident` | `police_force(police_force_id)` | **0** | **PASSED** |
| `fk_district` | `accident` | `local_authority_district(district_id)` | **0** | **PASSED** |
| `fk_weather_condition` | `accident` | `weather_condition(weather_condition_id)` | **0** | **PASSED** |
| `fk_road_surface` | `accident` | `road_surface_condition(road_surface_condition_id)` | **0** | **PASSED** |
| `fk_light_condition` | `accident` | `light_condition(light_condition_id)` | **0** | **PASSED** |
| `fk_road_type` | `accident` | `road_type(road_type_id)` | **0** | **PASSED** |
| `fk_road_class` | `accident` | `road_class(road_class_id)` | **0** | **PASSED** |
| `fk_junction_detail` | `accident` | `junction_detail(junction_detail_id)` | **0** | **PASSED** |
| `fk_junction_control` | `accident` | `junction_control(junction_control_id)` | **0** | **PASSED** |
| `fk_urban_rural` | `accident` | `urban_rural_area(urban_rural_id)` | **0** | **PASSED** |

---

## 5. Analytical Sanity Verification

SQL queries executed against the populated database matched the Python quality report (`data/processed/quality_report.json`):

### 5.1 Collisions by Calendar Year
```sql
SELECT accident_year, COUNT(*) AS count, ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS pct
FROM accident
GROUP BY accident_year
ORDER BY accident_year;
```
- **2021**: 101,087 collisions (19.67%)
- **2022**: 106,004 collisions (20.63%)
- **2023**: 104,258 collisions (20.29%)
- **2024**: 100,927 collisions (19.64%)
- **2025**: 101,525 collisions (19.76%)
- **Total**: 513,801 collisions (100.0%)

### 5.2 Severity Distribution & Machine Learning Target Invariant
```sql
SELECT s.severity_name, COUNT(*) AS count, ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS pct
FROM accident a
JOIN severity s ON a.severity_id = s.severity_id
GROUP BY s.severity_id, s.severity_name
ORDER BY s.severity_id;
```
- **Fatal** (`severity_id = 1`): 7,553 collisions (1.47%)
- **Serious** (`severity_id = 2`): 116,813 collisions (22.74%)
- **Slight** (`severity_id = 3`): 389,435 collisions (75.79%)
- **Combined Severe Target (`is_severe = 1`)**: 124,366 collisions (24.21%) $\rightarrow$ **Exact Match with Preprocessing Quality Report**
- **Slight Target (`is_severe = 0`)**: 389,435 collisions (75.79%) $\rightarrow$ **Exact Match with Preprocessing Quality Report**

---

## 6. Sample 5 Joined Records

```text
--- [Sample Row 1] Collision Index: 2021010287148 ---
  Date & Time:      2021-01-01 at 02:05:00
  Severity:         Slight (Speed Limit: 30 mph)
  Location:         District: Unassigned | Police: Metropolitan Police
  Environment:      Weather: Fog or mist | Surface: Frost or ice | Light: Darkness - lights lit
  Vehicle Involved: Ref #2 (Car)
  Casualty Record:  Ref #1 (Driver or rider - Slight)

--- [Sample Row 2] Collision Index: 2021010287148 ---
  Date & Time:      2021-01-01 at 02:05:00
  Severity:         Slight (Speed Limit: 30 mph)
  Location:         District: Unassigned | Police: Metropolitan Police
  Environment:      Weather: Fog or mist | Surface: Frost or ice | Light: Darkness - lights lit
  Vehicle Involved: Ref #3 (Car)
  Casualty Record:  Ref #1 (Driver or rider - Slight)

--- [Sample Row 3] Collision Index: 2021010287148 ---
  Date & Time:      2021-01-01 at 02:05:00
  Severity:         Slight (Speed Limit: 30 mph)
  Location:         District: Unassigned | Police: Metropolitan Police
  Environment:      Weather: Fog or mist | Surface: Frost or ice | Light: Darkness - lights lit
  Vehicle Involved: Ref #1 (Car)
  Casualty Record:  Ref #1 (Driver or rider - Slight)

--- [Sample Row 4] Collision Index: 2021010287149 ---
  Date & Time:      2021-01-01 at 03:30:00
  Severity:         Serious (Speed Limit: 30 mph)
  Location:         District: Unassigned | Police: Metropolitan Police
  Environment:      Weather: Fine no high winds | Surface: Dry | Light: Darkness - lights lit
  Vehicle Involved: Ref #1 (Car)
  Casualty Record:  Ref #1 (Passenger - Slight)

--- [Sample Row 5] Collision Index: 2021010287149 ---
  Date & Time:      2021-01-01 at 03:30:00
  Severity:         Serious (Speed Limit: 30 mph)
  Location:         District: Unassigned | Police: Metropolitan Police
  Environment:      Weather: Fine no high winds | Surface: Dry | Light: Darkness - lights lit
  Vehicle Involved: Ref #2 (Car)
  Casualty Record:  Ref #1 (Passenger - Slight)
```

---

## 7. ACID Transaction Management Demonstration

To illustrate DBMS transaction control and atomicity concepts for college viva examination, `database/transactions_demo.sql` was created. It demonstrates:
1. `BEGIN`: Starts transaction block.
2. `INSERT`: Stages batch audit records.
3. `SAVEPOINT pre_risky_load`: Creates an intermediate recovery point.
4. `INSERT` (simulated failure): Simulates an erroneous data insertion.
5. `ROLLBACK TO SAVEPOINT pre_risky_load`: Selectively rolls back erroneous operation without discarding previously validated rows.
6. `COMMIT`: Persists consistent state to durable storage.

---

## 8. Conclusion

Milestone 4 is complete. The PostgreSQL database is fully populated, indexed, verified, and ready for spatial hotspot clustering and exploratory SQL analytical queries.
