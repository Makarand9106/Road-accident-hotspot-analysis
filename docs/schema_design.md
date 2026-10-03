# Database Schema Design & Relational Rationale

**Project**: Smart Road Accident Hotspot Analysis and Risk Prediction System  
**RDBMS**: PostgreSQL 13+  
**Target Schema**: `road_safety`  

---

## 1. Schema Overview & Third Normal Form (3NF) Architecture

The database is designed around a **Third Normal Form (3NF) star-relational architecture** separating factual collision events from descriptive categorical dimensions and analytical aggregates.

```text
                               +------------------------+
                               |  POLICE_FORCE (Dim)    |
                               +------------------------+
                                          | (1:N)
+-------------------------+    +------------------------+    +-------------------------+
| LOCAL_AUTHORITY_DISTRICT|--->|    ACCIDENT (Fact)     |<---| WEATHER_CONDITION (Dim) |
+-------------------------+    +------------------------+    +-------------------------+
            |                              |                             |
            | (1:N)                        | (1:N)                       |
            v                              v                             |
+-------------------------+    +------------------------+                |
|      HOTSPOT (Agg)      |<---|    VEHICLE (Entity)    |                |
+-------------------------+    +------------------------+                |
                                           |                             |
                                           | (1:N)                       |
                                           v                             |
                               +------------------------+                |
                               |   CASUALTY (Entity)    |<---------------+ (via severity)
                               +------------------------+
```

---

## 2. Table Specifications & Normalization Details

### 2.1. Dimension & Lookup Tables (1NF $\rightarrow$ 3NF)
In the raw DfT extract, integer codes and string names were partially mixed or stored as numeric codes with external lookup tables. We explicitly created 13 normalized lookup tables:

| Table Name | Primary Key | Attributes | Row Count | Functional Dependency Resolved |
|---|---|---|---|---|
| `severity` | `severity_id` (Smallint) | `severity_name` | 3 | $\text{severity\_id} \rightarrow \text{severity\_name}$ |
| `police_force` | `police_force_id` (Smallint) | `police_force_name` | 52 | $\text{police\_force\_id} \rightarrow \text{police\_force\_name}$ |
| `local_authority_district` | `district_id` (Smallint) | `district_name` | 531 | $\text{district\_id} \rightarrow \text{district\_name}$ |
| `weather_condition` | `weather_condition_id` (Smallint) | `weather_condition_name` | 9 | $\text{weather\_id} \rightarrow \text{weather\_name}$ |
| `road_surface_condition` | `road_surface_condition_id` (Smallint) | `road_surface_condition_name` | 8 | $\text{surface\_id} \rightarrow \text{surface\_name}$ |
| `light_condition` | `light_condition_id` (Smallint) | `light_condition_name` | 5 | $\text{light\_id} \rightarrow \text{light\_name}$ |
| `road_type` | `road_type_id` (Smallint) | `road_type_name` | 7 | $\text{road\_type\_id} \rightarrow \text{road\_type\_name}$ |
| `junction_detail` | `junction_detail_id` (Smallint) | `junction_detail_name` | 6 | $\text{junction\_detail\_id} \rightarrow \text{junction\_detail\_name}$ |
| `junction_control` | `junction_control_id` (Smallint) | `junction_control_name` | 5 | $\text{junction\_control\_id} \rightarrow \text{junction\_control\_name}$ |
| `road_class` | `road_class_id` (Smallint) | `road_class_name` | 6 | $\text{road\_class\_id} \rightarrow \text{road\_class\_name}$ |
| `urban_rural_area` | `urban_rural_id` (Smallint) | `area_name` | 3 | $\text{urban\_rural\_id} \rightarrow \text{area\_name}$ |
| `vehicle_type` | `vehicle_type_id` (Smallint) | `vehicle_type_name` | 30 | $\text{vehicle\_type\_id} \rightarrow \text{vehicle\_type\_name}$ |
| `casualty_class` | `casualty_class_id` (Smallint) | `casualty_class_name` | 3 | $\text{casualty\_class\_id} \rightarrow \text{casualty\_class\_name}$ |

### 2.2. Core Fact Table: `accident`
- **Primary Key**: `accident_index` (`VARCHAR(32)` natural police statutory key).
- **Foreign Keys**: Linked to all 11 environmental/administrative dimension tables, plus a nullable `hotspot_id` referencing identified spatial clusters.
- **Attributes**: Exact spatial coordinates (`latitude`, `longitude`, `easting`, `northing`, `has_valid_coords`), dates, times, speed limits, vehicle counts, and casualty counts.

### 2.3. Child Entity Tables: `vehicle` & `casualty`
- **`vehicle`**: Represents every vehicle involved in a collision.
  - Primary Key: `vehicle_id` (`BIGSERIAL`).
  - Foreign Key: `accident_index` (`REFERENCES accident ON DELETE CASCADE`).
  - Natural Composite Key: `UNIQUE (accident_index, vehicle_reference)`.
- **`casualty`**: Represents every injured person resulting from a collision.
  - Primary Key: `casualty_id` (`BIGSERIAL`).
  - Foreign Key: `accident_index` (`REFERENCES accident ON DELETE CASCADE`).
  - Natural Composite Key: `UNIQUE (accident_index, casualty_reference)`.

### 2.4. Analytical Entities: `hotspot` & `model_metrics`
- **`hotspot`**: Stores spatial clusters discovered by the DBSCAN algorithm along with composite multi-criteria risk scores (`risk_score`, `risk_level`, `severe_ratio`, `trend_slope`).
- **`model_metrics`**: Stores audit logs of machine learning training runs (e.g. Logistic Regression ROC-AUC, Accuracy, Precision, Recall, F1-Score).

---

## 3. 3NF Compliance & Normalization Analysis

### Why 3NF?
A relation is in 3NF if:
1. It is in **2NF** (all non-key attributes are fully functionally dependent on the entire primary key).
2. It has **no transitive dependencies** (non-prime attributes do not determine other non-prime attributes: $X \rightarrow Y \rightarrow Z$).

### Functional Dependencies Removed:
1. **Transitive Lookup Dependencies**:
   - In unnormalized data: $\text{accident\_index} \rightarrow \text{district\_id} \rightarrow \text{district\_name}$.
   - Removed by isolating `local_authority_district(district_id, district_name)`.
2. **Vehicle Type Dependencies**:
   - In unnormalized vehicle data: $\text{vehicle\_id} \rightarrow \text{vehicle\_type\_id} \rightarrow \text{vehicle\_type\_name}$.
   - Removed by isolating `vehicle_type(vehicle_type_id, vehicle_type_name)`.
3. **Benefits**:
   - Eliminates update and deletion anomalies.
   - Saves memory: A `SMALLINT` foreign key (2 bytes) replaces repeating long strings like `"Van / Goods 3.5 tonnes mgw or under"` (~40 bytes) across 937,000 rows, reducing storage by over 35 MB on this column alone.

---

## 4. Controlled & Deliberate Denormalization

While the schema strictly adheres to 3NF for dimensions and entities, specific **derived columns** are deliberately stored on the `accident` table to optimize high-throughput analytical dashboard queries:

| Stored Derived Column | Raw Derivation | Justification for Denormalization |
|---|---|---|
| `hour` | `EXTRACT(HOUR FROM accident_time)` | Avoids runtime timestamp parsing across 513,800 rows during hourly heatmap queries. |
| `month` | `EXTRACT(MONTH FROM accident_date)` | Enables instant monthly trend charts without date math. |
| `day_of_week_name` | Lookup from `day_of_week` integer | Direct categorical grouping in SQL `GROUP BY day_of_week_name`. |
| `is_weekend` | `day_of_week IN (1, 7)` | Instant boolean filtering for weekday vs. weekend risk comparisons. |
| `time_period` | Rush-hour rule categorization | Crucial categorical traffic proxy used in real-time UI filtering and ML training. |
| `is_severe` | `severity_id IN (1, 2)` | Core binary ML target ($0/1$); indexed via partial index for instant severe crash filtering. |
| `involves_motorcycle`<br/>`involves_hgv`<br/>`involves_cyclist` | `COUNT(vehicle_type) > 0` grouped by accident | Eliminates expensive multi-table joins to the 937,000-row `vehicle` table when filtering accidents by vehicle type vulnerability. |

---

## 5. Architectural Q&A for Viva & Course Evaluation

### Q1: Why PostgreSQL?
- **ACID Compliance**: Ensures strict relational integrity across collisions, vehicles, and casualties.
- **Advanced Indexing**: Full support for B-tree, composite spatial indexing, and **partial indexes** (`WHERE is_severe = 1`).
- **Precision Data Types**: Native `NUMERIC(10, 6)` for sub-meter GPS precision, `SMALLINT` (2 bytes) for compact lookup foreign keys, and ISO `DATE` / `TIME`.
- **Node.js Compatibility**: High-performance streaming connection pooling via the standard `pg` driver.

### Q2: Why these Primary and Foreign Keys?
- **`accident_index` (Natural Key)**: Uses the official 32-character statutory reference assigned by UK police forces. This ensures direct traceability back to official publications without arbitrary ID remapping.
- **Surrogate Keys for Children (`vehicle_id`, `casualty_id`)**: Enables clean row identification while enforcing business uniqueness via `UNIQUE (accident_index, vehicle_reference)`.
- **`SMALLINT` Keys for Dimensions**: Sized 2 bytes each (values 1–531), minimizing disk storage and cache footprints.

### Q3: Why these Indexes?
1. **`idx_accident_date` & `idx_accident_year`**: Speeds up time-series trend analysis and date-range slider queries.
2. **`idx_accident_district_id` & `idx_accident_police_force_id`**: Accelerates regional dropdown filters in the web UI.
3. **`idx_accident_lat_lon`**: Composite index supporting bounding-box queries (`ST_MakeEnvelope` or `lat BETWEEN y1 AND y2 AND lon BETWEEN x1 AND x2`) when zooming and panning on the Leaflet map.
4. **`idx_vehicle_accident_index` & `idx_casualty_accident_index`**: Eliminates full table scans when expanding accident details to fetch involved vehicles and casualties.
5. **Partial Index `idx_accident_date_severe_partial` (`WHERE is_severe = 1`)**:
   - Because severe accidents represent only **24.21%** of total data, this partial index is **76% smaller** than a standard index, fitting entirely in RAM and drastically accelerating high-risk emergency queries.
