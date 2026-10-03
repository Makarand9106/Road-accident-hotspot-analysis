# Entity-Relationship Diagram (ERD)

This document visualizes the relational database schema of the **Smart Road Accident Hotspot Analysis and Risk Prediction System**.

---

## 1. Complete Relational ERD (Mermaid)

```mermaid
erDiagram
    %% -------------------------------------------------------------
    %% ENTITY DEFINITIONS
    %% -------------------------------------------------------------

    SEVERITY {
        smallint severity_id PK
        varchar severity_name UK
    }

    POLICE_FORCE {
        smallint police_force_id PK
        varchar police_force_name UK
    }

    LOCAL_AUTHORITY_DISTRICT {
        smallint district_id PK
        varchar district_name
    }

    WEATHER_CONDITION {
        smallint weather_condition_id PK
        varchar weather_condition_name UK
    }

    ROAD_SURFACE_CONDITION {
        smallint road_surface_condition_id PK
        varchar road_surface_condition_name UK
    }

    LIGHT_CONDITION {
        smallint light_condition_id PK
        varchar light_condition_name UK
    }

    ROAD_TYPE {
        smallint road_type_id PK
        varchar road_type_name UK
    }

    JUNCTION_DETAIL {
        smallint junction_detail_id PK
        varchar junction_detail_name UK
    }

    JUNCTION_CONTROL {
        smallint junction_control_id PK
        varchar junction_control_name UK
    }

    ROAD_CLASS {
        smallint road_class_id PK
        varchar road_class_name UK
    }

    URBAN_RURAL_AREA {
        smallint urban_rural_id PK
        varchar area_name UK
    }

    VEHICLE_TYPE {
        smallint vehicle_type_id PK
        varchar vehicle_type_name UK
    }

    CASUALTY_CLASS {
        smallint casualty_class_id PK
        varchar casualty_class_name UK
    }

    HOTSPOT {
        int hotspot_id PK
        numeric centre_lat
        numeric centre_lon
        numeric radius_m
        int accident_count
        int fatal_count
        int serious_count
        int slight_count
        numeric severe_ratio
        numeric trend_slope
        numeric frequency_score
        numeric severity_score
        numeric trend_score
        numeric risk_score
        varchar risk_level
        smallint nearest_district_id FK
        smallint first_year
        smallint last_year
    }

    ACCIDENT {
        varchar accident_index PK
        varchar accident_reference
        smallint accident_year
        date accident_date
        time accident_time
        smallint hour
        smallint month
        varchar day_of_week_name
        smallint is_weekend
        varchar time_period
        smallint severity_id FK
        smallint is_severe
        numeric latitude
        numeric longitude
        numeric easting
        numeric northing
        boolean has_valid_coords
        smallint police_force_id FK
        smallint district_id FK
        smallint weather_condition_id FK
        smallint road_surface_condition_id FK
        smallint light_condition_id FK
        smallint road_type_id FK
        smallint first_road_class_id FK
        smallint junction_detail_id FK
        smallint junction_control_id FK
        smallint urban_rural_id FK
        smallint speed_limit
        smallint number_of_vehicles
        smallint number_of_casualties
        smallint involves_motorcycle
        smallint involves_hgv
        smallint involves_cyclist
        int hotspot_id FK
    }

    VEHICLE {
        bigint vehicle_id PK
        varchar accident_index FK
        smallint vehicle_reference
        smallint vehicle_type_id FK
    }

    CASUALTY {
        bigint casualty_id PK
        varchar accident_index FK
        smallint casualty_reference
        smallint casualty_class_id FK
        smallint severity_id FK
    }

    MODEL_METRICS {
        int metric_id PK
        varchar model_name
        varchar metric_name
        numeric metric_value
        timestamp created_at
    }

    %% -------------------------------------------------------------
    %% CARDINALITIES & RELATIONSHIPS
    %% -------------------------------------------------------------

    LOCAL_AUTHORITY_DISTRICT ||--o{ HOTSPOT : "encompasses"
    HOTSPOT ||--o{ ACCIDENT : "contains"

    SEVERITY ||--o{ ACCIDENT : "classifies"
    POLICE_FORCE ||--o{ ACCIDENT : "records"
    LOCAL_AUTHORITY_DISTRICT ||--o{ ACCIDENT : "locates"
    WEATHER_CONDITION ||--o{ ACCIDENT : "environmental_state"
    ROAD_SURFACE_CONDITION ||--o{ ACCIDENT : "surface_state"
    LIGHT_CONDITION ||--o{ ACCIDENT : "lighting_state"
    ROAD_TYPE ||--o{ ACCIDENT : "highway_type"
    ROAD_CLASS ||--o{ ACCIDENT : "road_classification"
    JUNCTION_DETAIL ||--o{ ACCIDENT : "junction_geometry"
    JUNCTION_CONTROL ||--o{ ACCIDENT : "traffic_control"
    URBAN_RURAL_AREA ||--o{ ACCIDENT : "environment_zone"

    ACCIDENT ||--|{ VEHICLE : "involves"
    VEHICLE_TYPE ||--o{ VEHICLE : "categorizes"

    ACCIDENT ||--|{ CASUALTY : "sustains"
    CASUALTY_CLASS ||--o{ CASUALTY : "casualty_role"
    SEVERITY ||--o{ CASUALTY : "casualty_injury_severity"
```

---

## 2. Table Summary & Relationship Cardinalities

| Relationship | Parent Entity | Child Entity | Cardinality | Business Meaning |
|---|---|---|---|---|
| `accident_severity` | `severity` | `accident` | $1 : N$ | Every collision has exactly one severity classification (Fatal, Serious, Slight). |
| `accident_police` | `police_force` | `accident` | $0..1 : N$ | Accidents are recorded under a specific police force jurisdiction. |
| `accident_district` | `local_authority_district` | `accident` | $0..1 : N$ | Accidents occur within a municipal district boundary. |
| `accident_environment` | `weather_condition`, etc. | `accident` | $0..1 : N$ | Situational factors linked via foreign keys. |
| `accident_vehicles` | `accident` | `vehicle` | $1 : 1..N$ | An accident involves one or more vehicles. |
| `accident_casualties` | `accident` | `casualty` | $1 : 1..N$ | A personal-injury accident results in one or more casualties. |
| `hotspot_accidents` | `hotspot` | `accident` | $0..1 : N$ | Accidents identified as density clusters belong to a spatial hotspot. |
| `hotspot_district` | `local_authority_district` | `hotspot` | $0..1 : N$ | Hotspots are assigned to their nearest administrative district. |
