-- =============================================================================
-- Smart Road Accident Hotspot Analysis and Risk Prediction System
-- DDL Schema Definition (PostgreSQL 13+)
-- Designed in 3NF with Explicit Primary Keys, Foreign Keys, and Default Values
-- =============================================================================

-- Clean existing tables if resetting
DROP TABLE IF EXISTS model_metrics CASCADE;
DROP TABLE IF EXISTS casualty CASCADE;
DROP TABLE IF EXISTS vehicle CASCADE;
DROP TABLE IF EXISTS accident CASCADE;
DROP TABLE IF EXISTS hotspot CASCADE;
DROP TABLE IF EXISTS casualty_class CASCADE;
DROP TABLE IF EXISTS vehicle_type CASCADE;
DROP TABLE IF EXISTS urban_rural_area CASCADE;
DROP TABLE IF EXISTS road_class CASCADE;
DROP TABLE IF EXISTS junction_control CASCADE;
DROP TABLE IF EXISTS junction_detail CASCADE;
DROP TABLE IF EXISTS road_type CASCADE;
DROP TABLE IF EXISTS light_condition CASCADE;
DROP TABLE IF EXISTS road_surface_condition CASCADE;
DROP TABLE IF EXISTS weather_condition CASCADE;
DROP TABLE IF EXISTS local_authority_district CASCADE;
DROP TABLE IF EXISTS police_force CASCADE;
DROP TABLE IF EXISTS severity CASCADE;

-- =============================================================================
-- 1. DIMENSION & LOOKUP TABLES
-- =============================================================================

CREATE TABLE severity (
    severity_id SMALLINT PRIMARY KEY,
    severity_name VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE police_force (
    police_force_id SMALLINT PRIMARY KEY,
    police_force_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE local_authority_district (
    district_id SMALLINT PRIMARY KEY,
    district_name VARCHAR(100) NOT NULL
);

CREATE TABLE weather_condition (
    weather_condition_id SMALLINT PRIMARY KEY,
    weather_condition_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE road_surface_condition (
    road_surface_condition_id SMALLINT PRIMARY KEY,
    road_surface_condition_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE light_condition (
    light_condition_id SMALLINT PRIMARY KEY,
    light_condition_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE road_type (
    road_type_id SMALLINT PRIMARY KEY,
    road_type_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE junction_detail (
    junction_detail_id SMALLINT PRIMARY KEY,
    junction_detail_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE junction_control (
    junction_control_id SMALLINT PRIMARY KEY,
    junction_control_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE road_class (
    road_class_id SMALLINT PRIMARY KEY,
    road_class_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE urban_rural_area (
    urban_rural_id SMALLINT PRIMARY KEY,
    area_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE vehicle_type (
    vehicle_type_id SMALLINT PRIMARY KEY,
    vehicle_type_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE casualty_class (
    casualty_class_id SMALLINT PRIMARY KEY,
    casualty_class_name VARCHAR(50) NOT NULL UNIQUE
);

-- =============================================================================
-- 2. ANALYTICAL HOTSPOT TABLE
-- =============================================================================

CREATE TABLE hotspot (
    hotspot_id SERIAL PRIMARY KEY,
    centre_lat NUMERIC(10, 6) NOT NULL,
    centre_lon NUMERIC(10, 6) NOT NULL,
    radius_m NUMERIC(10, 2) NOT NULL,
    accident_count INT NOT NULL,
    fatal_count INT NOT NULL DEFAULT 0,
    serious_count INT NOT NULL DEFAULT 0,
    slight_count INT NOT NULL DEFAULT 0,
    severe_ratio NUMERIC(6, 4) NOT NULL DEFAULT 0.0000,
    trend_slope NUMERIC(8, 4) NOT NULL DEFAULT 0.0000,
    frequency_score NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    severity_score NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    trend_score NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    risk_score NUMERIC(6, 2) NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    nearest_district_id SMALLINT REFERENCES local_authority_district(district_id),
    first_year SMALLINT NOT NULL,
    last_year SMALLINT NOT NULL
);

-- =============================================================================
-- 3. CORE ACCIDENT FACT TABLE
-- =============================================================================

CREATE TABLE accident (
    accident_index VARCHAR(32) PRIMARY KEY,
    accident_reference VARCHAR(32),
    accident_year SMALLINT NOT NULL,
    accident_date DATE NOT NULL,
    accident_time TIME,
    hour SMALLINT,
    month SMALLINT,
    day_of_week_name VARCHAR(15),
    is_weekend SMALLINT NOT NULL DEFAULT 0,
    time_period VARCHAR(30),
    severity_id SMALLINT NOT NULL REFERENCES severity(severity_id),
    is_severe SMALLINT NOT NULL DEFAULT 0,
    latitude NUMERIC(10, 6),
    longitude NUMERIC(10, 6),
    easting NUMERIC(10, 2),
    northing NUMERIC(10, 2),
    has_valid_coords BOOLEAN NOT NULL DEFAULT FALSE,
    police_force_id SMALLINT REFERENCES police_force(police_force_id),
    district_id SMALLINT REFERENCES local_authority_district(district_id),
    weather_condition_id SMALLINT REFERENCES weather_condition(weather_condition_id),
    road_surface_condition_id SMALLINT REFERENCES road_surface_condition(road_surface_condition_id),
    light_condition_id SMALLINT REFERENCES light_condition(light_condition_id),
    road_type_id SMALLINT REFERENCES road_type(road_type_id),
    first_road_class_id SMALLINT REFERENCES road_class(road_class_id),
    junction_detail_id SMALLINT REFERENCES junction_detail(junction_detail_id),
    junction_control_id SMALLINT REFERENCES junction_control(junction_control_id),
    urban_rural_id SMALLINT REFERENCES urban_rural_area(urban_rural_id),
    speed_limit SMALLINT,
    number_of_vehicles SMALLINT NOT NULL DEFAULT 1,
    number_of_casualties SMALLINT NOT NULL DEFAULT 1,
    involves_motorcycle SMALLINT NOT NULL DEFAULT 0,
    involves_hgv SMALLINT NOT NULL DEFAULT 0,
    involves_cyclist SMALLINT NOT NULL DEFAULT 0,
    hotspot_id INT REFERENCES hotspot(hotspot_id) ON DELETE SET NULL
);

-- =============================================================================
-- 4. CHILD ENTITIES (VEHICLE & CASUALTY)
-- =============================================================================

CREATE TABLE vehicle (
    vehicle_id BIGSERIAL PRIMARY KEY,
    accident_index VARCHAR(32) NOT NULL REFERENCES accident(accident_index) ON DELETE CASCADE,
    vehicle_reference SMALLINT NOT NULL,
    vehicle_type_id SMALLINT REFERENCES vehicle_type(vehicle_type_id),
    CONSTRAINT uq_vehicle_accident_ref UNIQUE (accident_index, vehicle_reference)
);

CREATE TABLE casualty (
    casualty_id BIGSERIAL PRIMARY KEY,
    accident_index VARCHAR(32) NOT NULL REFERENCES accident(accident_index) ON DELETE CASCADE,
    casualty_reference SMALLINT NOT NULL,
    casualty_class_id SMALLINT REFERENCES casualty_class(casualty_class_id),
    severity_id SMALLINT REFERENCES severity(severity_id),
    CONSTRAINT uq_casualty_accident_ref UNIQUE (accident_index, casualty_reference)
);

-- =============================================================================
-- 5. MACHINE LEARNING MODEL METRICS
-- =============================================================================

CREATE TABLE model_metrics (
    metric_id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC(10, 6) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
