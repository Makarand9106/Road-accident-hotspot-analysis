# Express REST API Reference & Integration Guide

> **Service:** Smart Road Accident Hotspot Analysis and Risk Prediction System API  
> **Base URL:** `http://localhost:4000/api`  
> **Environment:** Node.js (v18+) with Express, native `pg` Connection Pool, and CORS enabled  
> **Database:** PostgreSQL 13+ (`road_safety` relational schema and analytical views)  

---

## 1. Architecture & Design Principles

1. **Read-Only Analytical API**: Optimized for lightning-fast dashboard analytics and spatial exploration. The only write/mutation endpoint is `POST /api/predict`, which performs ephemeral scenario risk scoring in memory without modifying the database.
2. **Strict Positional Parameterization**: All SQL queries utilize positional placeholders (`$1, $2, ...`) via `pg.Pool`. User input is never interpolated or concatenated into SQL text.
3. **Whitelisted & Bounded Filters**: The shared filter parser strictly validates parameters against domain whitelists and safe numerical ranges, rejecting malformed or out-of-bounds input with HTTP `400 Bad Request`.
4. **Pre-Aggregated & View-Centric Execution**: Heavy analytical calculations are delegated to PostgreSQL views (`v_accident_enriched`, `v_hotspot_summary`, `v_yearly_trend`, `mv_hour_weekday_heatmap`) and relational aggregates, keeping network payloads compact.
5. **In-Memory ML Inference**: Machine learning scoring in `POST /api/predict` computes the vector dot-product and sigmoid transformation in JavaScript from exported weights ([`models/risk_model.json`](file:///Users/makarandkulkarni/Myspace/DV%20Project/models/risk_model.json)), achieving $< 0.05\text{ ms}$ latency with zero Python runtime dependency.

---

## 2. Shared Query Filter Parameters

The following query parameters can be passed to `/api/accidents`, `/api/accidents/stats`, `/api/accidents/trends`, and all `/api/analysis/*` endpoints:

| Parameter | Type | Allowed Values / Format | Description |
| :--- | :---: | :--- | :--- |
| `year_from` | `integer` | `2021` to `2025` | Minimum collision reporting year |
| `year_to` | `integer` | `2021` to `2025` | Maximum collision reporting year |
| `year` | `integer` | `2021` to `2025` | Exact single year match |
| `severity` | `string` | `Fatal`, `Serious`, `Slight`, `Severe`, `1`, `2`, `3` | Collision severity level |
| `police_force` | `int/str` | Police Force ID (e.g. `1`) or Name (e.g. `Metropolitan Police`) | Regional police jurisdiction |
| `district` | `int/str` | District ID or Name (e.g. `Westminster`) | Local authority district |
| `weather` | `int/str` | Weather ID or Name (e.g. `Raining no high winds`) | Atmospheric weather condition |
| `road_surface` | `int/str` | Surface ID or Name (e.g. `Wet or damp`, `Frost or ice`) | Road surface condition |
| `time_period` | `string` | `Morning Peak`, `Daytime`, `Evening Peak`, `Evening`, `Night` | Diurnal commuter proxy |
| `is_weekend` | `int/bool` | `1`, `0`, `true`, `false` | Weekend vs weekday filter |
| `speed_limit` | `integer` | `20`, `30`, `40`, `50`, `60`, `70` | Legal posted speed limit in mph |
| `vehicle_type` | `string` | `motorcycle`, `hgv`, `cyclist`, `all` | Specific vehicle involvement flag |
| `min_lat`, `max_lat` | `float` | `49.5` to `61.0` | Bounding box latitude limits |
| `min_lon`, `max_lon` | `float` | `-8.5` to `2.0` | Bounding box longitude limits |

---

## 3. Core API Endpoints

### 3.1 Health & Metadata

#### `GET /api/health`
Verifies API server status, uptime, and PostgreSQL database connectivity.

**Example Request:**
```bash
curl -s http://localhost:4000/api/health
```

**Response (HTTP 200):**
```json
{
  "status": "ok",
  "service": "Smart Road Accident Hotspot Analysis and Risk Prediction API",
  "version": "1.0.0",
  "timestamp": "2026-10-04T00:40:00.000Z",
  "uptime_seconds": 120,
  "database": {
    "connected": true,
    "latency_ms": 14,
    "counts": {
      "accidents": 513801,
      "vehicles": 937265,
      "casualties": 652821,
      "hotspots": 704,
      "model_metrics": 31
    }
  }
}
```

---

#### `GET /api/meta/filters`
Returns distinct lists of lookup options for populating dynamic frontend filter controls.

**Example Request:**
```bash
curl -s http://localhost:4000/api/meta/filters
```

**Response (HTTP 200, Trimmed):**
```json
{
  "status": "success",
  "data": {
    "years": [2021, 2022, 2023, 2024, 2025],
    "police_forces": [
      { "id": 1, "name": "Metropolitan Police" },
      { "id": 4, "name": "Cumbria" }
    ],
    "weather_conditions": [
      { "id": 1, "name": "Fine no high winds" },
      { "id": 2, "name": "Raining no high winds" }
    ],
    "road_surface_conditions": [
      { "id": 1, "name": "Dry" },
      { "id": 2, "name": "Wet or damp" }
    ],
    "speed_limits": [20, 30, 40, 50, 60, 70],
    "time_periods": ["Morning Peak", "Daytime", "Evening Peak", "Evening", "Night"]
  }
}
```

---

### 3.2 Accident Fact & Statistics Endpoints

#### `GET /api/accidents/stats`
Computes high-level KPIs, severity rates, casualty totals, and hotspot links under applied filters.

**Example Request:**
```bash
curl -s "http://localhost:4000/api/accidents/stats?year=2024&time_period=Night"
```

**Response (HTTP 200):**
```json
{
  "status": "success",
  "data": {
    "total_collisions": 12845,
    "fatal_collisions": 342,
    "serious_collisions": 3812,
    "slight_collisions": 8691,
    "total_severe_collisions": 4154,
    "severe_percentage": 32.34,
    "total_casualties": 16920,
    "total_vehicles_involved": 22105,
    "avg_casualties_per_collision": 1.32,
    "avg_vehicles_per_collision": 1.72,
    "vulnerable_user_collisions": {
      "motorcycle": 2105,
      "hgv": 890,
      "cyclist": 1120
    },
    "hotspots": {
      "active_in_filter": 340,
      "total_national": 704,
      "linked_collisions_in_filter": 1640,
      "highest_risk_score": 96.45,
      "highest_risk_hotspot_id": 215
    }
  }
}
```

---

#### `GET /api/accidents/trends`
Provides yearly and monthly time-series collision and severity breakdowns.

**Example Request:**
```bash
curl -s "http://localhost:4000/api/accidents/trends?police_force=1"
```

**Response (HTTP 200, Trimmed):**
```json
{
  "status": "success",
  "data": {
    "yearly_trends": [
      {
        "year": 2021,
        "total_collisions": 21400,
        "severe_collisions": 3420,
        "fatal_collisions": 95,
        "serious_collisions": 3325,
        "slight_collisions": 17980,
        "severe_percentage": 15.98,
        "total_casualties": 24890
      }
    ],
    "monthly_trends": [
      {
        "year": 2021,
        "month": 1,
        "month_name": "Jan",
        "total_collisions": 1420,
        "severe_collisions": 210,
        "severe_percentage": 14.79
      }
    ]
  }
}
```

---

#### `GET /api/accidents`
Fetches paginated collision records with optional spatial bounding box. Enforces a **hard maximum cap of 5,000 rows** per request.

**Parameters:** `limit` (default: 100, max: 5000), `offset` (default: 0), `sort_by` (`severity` or `date`).

**Example Request:**
```bash
curl -s "http://localhost:4000/api/accidents?limit=2&offset=0&severity=Fatal"
```

**Response (HTTP 200):**
```json
{
  "status": "success",
  "total": 7553,
  "count": 2,
  "limit": 2,
  "offset": 0,
  "is_truncated": false,
  "hard_limit": 5000,
  "accidents": [
    {
      "accident_index": "2021010287201",
      "accident_date": "2021-01-02T00:00:00.000Z",
      "accident_time": "18:45:00",
      "accident_year": 2021,
      "severity_id": 1,
      "severity_name": "Fatal",
      "is_severe": 1,
      "latitude": "51.512400",
      "longitude": "-0.091200",
      "speed_limit": 30,
      "number_of_vehicles": 2,
      "number_of_casualties": 1,
      "time_period": "Evening",
      "day_of_week_name": "Saturday",
      "is_weekend": 1,
      "weather": "Fine no high winds",
      "road_surface": "Dry",
      "light_condition": "Darkness - lights lit",
      "road_type": "Single carriageway",
      "police_force": "Metropolitan Police",
      "district": "City of London",
      "hotspot_id": 42
    }
  ]
}
```

---

### 3.3 Multidimensional Exploratory Analysis

* **`GET /api/analysis/temporal`**: Hourly, Day of Week, Time Period, and 7x24 Matrix.
* **`GET /api/analysis/environment`**: Weather, Surface, and Light condition severity rates.
* **`GET /api/analysis/road`**: Road type, junction layout, speed limit, and urban/rural comparison.
* **`GET /api/analysis/severity`**: Fatal, serious, and slight casualty distributions.
* **`GET /api/analysis/vehicles`**: Motorcycle, HGV, cyclist rates and top vehicle types.

**Example Request:**
```bash
curl -s "http://localhost:4000/api/analysis/environment"
```

**Response (HTTP 200, Trimmed):**
```json
{
  "status": "success",
  "data": {
    "weather": [
      {
        "condition": "Fine no high winds",
        "total_collisions": 412580,
        "severe_collisions": 99420,
        "severe_percentage": 24.10
      }
    ],
    "road_surface": [
      {
        "condition": "Dry",
        "total_collisions": 365200,
        "severe_collisions": 87800,
        "severe_percentage": 24.04
      },
      {
        "condition": "Frost or ice",
        "total_collisions": 8420,
        "severe_collisions": 2480,
        "severe_percentage": 29.45
      }
    ]
  }
}
```

---

### 3.4 Spatial Hotspots & Regional Risk

#### `GET /api/hotspots`
Lists detected DBSCAN clusters with multi-criteria scores. Supports `risk_level` (`High`, `Medium`, `Low`), `min_count`, `sort_by` (`risk_score`, `accident_count`).

**Example Request:**
```bash
curl -s "http://localhost:4000/api/hotspots?risk_level=High&limit=2"
```

**Response (HTTP 200):**
```json
{
  "status": "success",
  "total": 141,
  "count": 2,
  "limit": 2,
  "offset": 0,
  "hotspots": [
    {
      "hotspot_id": 215,
      "centre_lat": 51.520412,
      "centre_lon": -0.054128,
      "radius_m": 245.8,
      "diameter_m": 491.6,
      "is_corridor": false,
      "accident_count": 163,
      "fatal_count": 4,
      "serious_count": 44,
      "slight_count": 115,
      "severe_ratio": 0.2945,
      "severe_percentage": 29.45,
      "trend_slope": 3.2,
      "frequency_score": 98.42,
      "severity_score": 92.15,
      "trend_score": 98.78,
      "risk_score": 96.45,
      "risk_level": "High",
      "district_name": "Tower Hamlets"
    }
  ]
}
```

---

#### `GET /api/hotspots/:id`
Returns single cluster details, severity split, 5-year annual trajectory, and 50 recent member collision records.

**Example Request:**
```bash
curl -s "http://localhost:4000/api/hotspots/215"
```

---

#### `GET /api/risk`
Returns regional safety benchmarking (Query 20 logic using CTE and `PERCENT_RANK()`) alongside top 10 national hotspots.

**Example Request:**
```bash
curl -s "http://localhost:4000/api/risk"
```

---

### 3.5 DBMS Course SQL Insights

#### `GET /api/sql-insights`
Lists all 20 predefined analytical SQL queries parsed from [`database/analytical_queries.sql`](file:///Users/makarandkulkarni/Myspace/DV%20Project/database/analytical_queries.sql) with full questions, concepts, and SQL.

---

#### `GET /api/sql-insights/:number`
Executes predefined query $N \in [1, 20]$ against PostgreSQL and returns real execution time and results. *Arbitrary SQL execution is strictly forbidden.*

**Example Request:**
```bash
curl -s "http://localhost:4000/api/sql-insights/15"
```

**Response (HTTP 200, Trimmed):**
```json
{
  "status": "success",
  "data": {
    "query_number": 15,
    "title": "Speed Limit vs Average Casualties and Severity",
    "question": "What is the relationship between posted speed limit and the average number of casualties, vehicles, and severe collision probability?",
    "execution_time_ms": 38.45,
    "row_count": 6,
    "rows": [
      {
        "speed_limit": 20,
        "total_collisions": "88096",
        "severe_percentage": "19.65",
        "fatal_percentage": "0.47"
      },
      {
        "speed_limit": 70,
        "total_collisions": "41529",
        "severe_percentage": "25.94",
        "fatal_percentage": "3.11"
      }
    ]
  }
}
```

---

### 3.6 Machine Learning Risk Predictor

#### `GET /api/model/metrics`
Returns active model feature schema, classification thresholds, and test metrics stored in PostgreSQL `model_metrics`.

---

#### `POST /api/predict`
Evaluates a driving scenario using in-memory Logistic Regression weights, computing probability, risk level, and top 5 risk/protective factor attributions.

**Request Body (JSON):**
```json
{
  "time_period": "Night",
  "day_of_week_name": "Saturday",
  "weather_condition_name": "Snowing no high winds",
  "road_surface_condition_name": "Frost or ice",
  "light_condition_name": "Darkness - no lighting",
  "road_type_name": "Single carriageway",
  "road_class_name": "A",
  "urban_rural_name": "Rural",
  "speed_limit": 60,
  "number_of_vehicles": 1,
  "is_weekend": 1,
  "involves_motorcycle": 1,
  "involves_hgv": 0,
  "involves_cyclist": 0
}
```

**Example Request:**
```bash
curl -s -X POST http://localhost:4000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"speed_limit": 60, "involves_motorcycle": 1, "time_period": "Night", "urban_rural_name": "Rural", "light_condition_name": "Darkness - no lighting"}'
```

**Response (HTTP 200):**
```json
{
  "status": "success",
  "data": {
    "probability": 0.767556,
    "probability_pct": 76.76,
    "risk_tier": "High",
    "baseline_severe_rate": 0.2421,
    "baseline_severe_rate_pct": 24.21,
    "risk_multiplier": 3.17,
    "logit_score": 1.1945,
    "top_risk_factors": [
      {
        "feature": "involves_motorcycle",
        "description": "Motorcycle Involved",
        "feature_value": 1,
        "weight": 0.768,
        "contribution": 0.768
      },
      {
        "feature": "light_condition_name_Darkness - no lighting",
        "description": "Light: Darkness - no lighting",
        "feature_value": 1,
        "weight": 0.518,
        "contribution": 0.518
      },
      {
        "feature": "speed_limit",
        "description": "Posted Speed Limit",
        "feature_value": 1.679,
        "weight": 0.192,
        "contribution": 0.323
      }
    ],
    "top_protective_factors": [
      {
        "feature": "urban_rural_name_Rural",
        "description": "Area: Rural",
        "feature_value": 1,
        "weight": -0.070,
        "contribution": -0.070
      }
    ]
  }
}
```

---

## 4. Error Handling & Standard Responses

All API errors return consistent JSON responses with standard HTTP status codes:

```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Invalid severity \"Catastrophic\". Allowed: Fatal, Serious, Slight, Severe, 1, 2, 3."
}
```

| HTTP Status | Error Scenario |
| :---: | :--- |
| **`400 Bad Request`** | Invalid filter values, invalid bounding box coordinates, missing required parameters. |
| **`404 Not Found`** | Unknown API endpoint or non-existent hotspot ID (`/api/hotspots/99999`). |
| **`500 Internal Server Error`** | Uncaught database exception or connection pool timeout. |
