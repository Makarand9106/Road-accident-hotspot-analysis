-- =============================================================================
-- Smart Road Accident Hotspot Analysis and Risk Prediction System
-- Relational Analytical Views & Materialized Heatmap View (PostgreSQL 13+)
-- =============================================================================

-- Clean up any existing views in reverse dependency order
DROP MATERIALIZED VIEW IF EXISTS mv_hour_weekday_heatmap CASCADE;
DROP VIEW IF EXISTS v_grid_density CASCADE;
DROP VIEW IF EXISTS v_hotspot_summary CASCADE;
DROP VIEW IF EXISTS v_model_dataset CASCADE;
DROP VIEW IF EXISTS v_severity_by_condition CASCADE;
DROP VIEW IF EXISTS v_yearly_trend CASCADE;
DROP VIEW IF EXISTS v_accident_enriched CASCADE;

-- =============================================================================
-- 1. ENRICHED ACCIDENT FACT VIEW (v_accident_enriched)
-- Denormalizes core accident facts with human-readable text labels from all
-- dimension lookup tables for reporting, visualization, and ad-hoc SQL querying.
-- =============================================================================
CREATE OR REPLACE VIEW v_accident_enriched AS
SELECT 
    a.accident_index,
    a.accident_reference,
    a.accident_year,
    a.accident_date,
    a.accident_time,
    a.hour,
    a.month,
    a.day_of_week_name,
    a.is_weekend,
    a.time_period,
    a.severity_id,
    s.severity_name,
    a.is_severe,
    a.latitude,
    a.longitude,
    a.easting,
    a.northing,
    a.has_valid_coords,
    a.police_force_id,
    pf.police_force_name,
    a.district_id,
    COALESCE(lad.district_name, 'Unknown / Unassigned') AS district_name,
    a.weather_condition_id,
    COALESCE(wc.weather_condition_name, 'Unknown') AS weather_condition_name,
    a.road_surface_condition_id,
    COALESCE(rsc.road_surface_condition_name, 'Unknown') AS road_surface_condition_name,
    a.light_condition_id,
    COALESCE(lc.light_condition_name, 'Unknown') AS light_condition_name,
    a.road_type_id,
    COALESCE(rt.road_type_name, 'Unknown') AS road_type_name,
    a.first_road_class_id,
    COALESCE(rc.road_class_name, 'Unknown') AS road_class_name,
    a.junction_detail_id,
    COALESCE(jd.junction_detail_name, 'Unknown') AS junction_detail_name,
    a.junction_control_id,
    COALESCE(jc.junction_control_name, 'Unknown') AS junction_control_name,
    a.urban_rural_id,
    COALESCE(ur.area_name, 'Unknown') AS urban_rural_name,
    a.speed_limit,
    a.number_of_vehicles,
    a.number_of_casualties,
    a.involves_motorcycle,
    a.involves_hgv,
    a.involves_cyclist,
    a.hotspot_id
FROM accident a
JOIN severity s ON a.severity_id = s.severity_id
LEFT JOIN police_force pf ON a.police_force_id = pf.police_force_id
LEFT JOIN local_authority_district lad ON a.district_id = lad.district_id
LEFT JOIN weather_condition wc ON a.weather_condition_id = wc.weather_condition_id
LEFT JOIN road_surface_condition rsc ON a.road_surface_condition_id = rsc.road_surface_condition_id
LEFT JOIN light_condition lc ON a.light_condition_id = lc.light_condition_id
LEFT JOIN road_type rt ON a.road_type_id = rt.road_type_id
LEFT JOIN road_class rc ON a.first_road_class_id = rc.road_class_id
LEFT JOIN junction_detail jd ON a.junction_detail_id = jd.junction_detail_id
LEFT JOIN junction_control jc ON a.junction_control_id = jc.junction_control_id
LEFT JOIN urban_rural_area ur ON a.urban_rural_id = ur.urban_rural_id;

-- =============================================================================
-- 2. YEARLY COLLISION TREND VIEW (v_yearly_trend)
-- Summarizes high-level collision volumes, severity distributions, and vehicle/
-- casualty rates per calendar year for multi-year dashboard cards and trend graphs.
-- =============================================================================
CREATE OR REPLACE VIEW v_yearly_trend AS
SELECT 
    accident_year,
    COUNT(*) AS total_collisions,
    SUM(CASE WHEN severity_id = 1 THEN 1 ELSE 0 END) AS fatal_count,
    SUM(CASE WHEN severity_id = 2 THEN 1 ELSE 0 END) AS serious_count,
    SUM(CASE WHEN severity_id = 3 THEN 1 ELSE 0 END) AS slight_count,
    SUM(is_severe) AS total_severe_count,
    ROUND(SUM(is_severe) * 100.0 / COUNT(*), 2) AS severe_percentage,
    ROUND(AVG(number_of_vehicles), 2) AS avg_vehicles_per_collision,
    ROUND(AVG(number_of_casualties), 2) AS avg_casualties_per_collision,
    SUM(number_of_casualties) AS total_casualties,
    SUM(involves_motorcycle) AS motorcycle_collisions,
    SUM(involves_hgv) AS hgv_collisions,
    SUM(involves_cyclist) AS cyclist_collisions
FROM accident
GROUP BY accident_year
ORDER BY accident_year ASC;

-- =============================================================================
-- 3. SEVERITY BY ENVIRONMENTAL CONDITION VIEW (v_severity_by_condition)
-- Cross-tabulates collision frequency and severity rate across weather,
-- road surface, and lighting condition combinations.
-- =============================================================================
CREATE OR REPLACE VIEW v_severity_by_condition AS
SELECT 
    COALESCE(wc.weather_condition_name, 'Unknown') AS weather_condition,
    COALESCE(rsc.road_surface_condition_name, 'Unknown') AS road_surface_condition,
    COALESCE(lc.light_condition_name, 'Unknown') AS light_condition,
    COUNT(*) AS total_collisions,
    SUM(a.is_severe) AS severe_collisions,
    ROUND(SUM(a.is_severe) * 100.0 / COUNT(*), 2) AS severe_percentage
FROM accident a
LEFT JOIN weather_condition wc ON a.weather_condition_id = wc.weather_condition_id
LEFT JOIN road_surface_condition rsc ON a.road_surface_condition_id = rsc.road_surface_condition_id
LEFT JOIN light_condition lc ON a.light_condition_id = lc.light_condition_id
GROUP BY wc.weather_condition_name, rsc.road_surface_condition_name, lc.light_condition_name
ORDER BY total_collisions DESC;

-- =============================================================================
-- 4. MACHINE LEARNING MODEL DATASET VIEW (v_model_dataset)
-- Clean feature set + target label (is_severe) for risk prediction modeling.
-- CRITICAL NOTE: Excludes all casualty-derived attributes (e.g. number_of_casualties,
-- casualty_severity) to eliminate target leakage (casualty outcomes occur post-collision).
-- =============================================================================
CREATE OR REPLACE VIEW v_model_dataset AS
SELECT 
    a.accident_index,
    a.accident_year,
    a.month,
    a.hour,
    a.day_of_week_name,
    a.is_weekend,
    a.time_period,
    a.police_force_id,
    a.district_id,
    a.weather_condition_id,
    COALESCE(wc.weather_condition_name, 'Unknown') AS weather_condition_name,
    a.road_surface_condition_id,
    COALESCE(rsc.road_surface_condition_name, 'Unknown') AS road_surface_condition_name,
    a.light_condition_id,
    COALESCE(lc.light_condition_name, 'Unknown') AS light_condition_name,
    a.road_type_id,
    COALESCE(rt.road_type_name, 'Unknown') AS road_type_name,
    a.first_road_class_id,
    COALESCE(rc.road_class_name, 'Unknown') AS road_class_name,
    a.junction_detail_id,
    COALESCE(jd.junction_detail_name, 'Unknown') AS junction_detail_name,
    a.junction_control_id,
    COALESCE(jc.junction_control_name, 'Unknown') AS junction_control_name,
    a.urban_rural_id,
    COALESCE(ur.area_name, 'Unknown') AS urban_rural_name,
    a.speed_limit,
    a.number_of_vehicles,
    a.involves_motorcycle,
    a.involves_hgv,
    a.involves_cyclist,
    -- Target Variable
    a.is_severe
FROM accident a
LEFT JOIN weather_condition wc ON a.weather_condition_id = wc.weather_condition_id
LEFT JOIN road_surface_condition rsc ON a.road_surface_condition_id = rsc.road_surface_condition_id
LEFT JOIN light_condition lc ON a.light_condition_id = lc.light_condition_id
LEFT JOIN road_type rt ON a.road_type_id = rt.road_type_id
LEFT JOIN road_class rc ON a.first_road_class_id = rc.road_class_id
LEFT JOIN junction_detail jd ON a.junction_detail_id = jd.junction_detail_id
LEFT JOIN junction_control jc ON a.junction_control_id = jc.junction_control_id
LEFT JOIN urban_rural_area ur ON a.urban_rural_id = ur.urban_rural_id;

-- =============================================================================
-- 5. MATERIALIZED HEATMAP VIEW (mv_hour_weekday_heatmap)
-- Pre-computes 7-day x 24-hour collision density and severity metrics for instant
-- frontend interactive heatmap rendering without scanning 500k+ fact rows.
--
-- REFRESH INSTRUCTION:
-- When new collision batches are loaded or fact tables updated, refresh this view:
--   REFRESH MATERIALIZED VIEW mv_hour_weekday_heatmap;
-- Or concurrently (if unique index exists):
--   REFRESH MATERIALIZED VIEW CONCURRENTLY mv_hour_weekday_heatmap;
-- =============================================================================
CREATE MATERIALIZED VIEW mv_hour_weekday_heatmap AS
SELECT 
    CASE a.day_of_week_name
        WHEN 'Monday'    THEN 1
        WHEN 'Tuesday'   THEN 2
        WHEN 'Wednesday' THEN 3
        WHEN 'Thursday'  THEN 4
        WHEN 'Friday'    THEN 5
        WHEN 'Saturday'  THEN 6
        WHEN 'Sunday'    THEN 7
        ELSE 0
    END AS day_of_week_index,
    a.day_of_week_name,
    a.hour,
    COUNT(*) AS total_collisions,
    SUM(a.is_severe) AS severe_collisions,
    COUNT(*) - SUM(a.is_severe) AS slight_collisions,
    ROUND(SUM(a.is_severe) * 100.0 / COUNT(*), 2) AS severe_percentage,
    ROUND(AVG(a.number_of_vehicles), 2) AS avg_vehicles,
    ROUND(AVG(a.number_of_casualties), 2) AS avg_casualties
FROM accident a
WHERE a.hour IS NOT NULL AND a.day_of_week_name IS NOT NULL
GROUP BY a.day_of_week_name, a.hour
ORDER BY day_of_week_index ASC, a.hour ASC;

-- Create unique index to allow CONCURRENT refreshes and fast index lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_hour_weekday
    ON mv_hour_weekday_heatmap (day_of_week_index, hour);

-- =============================================================================
-- 6. HOTSPOT SUMMARY VIEW (v_hotspot_summary)
-- Joins detected spatial hotspot clusters with administrative district dimensions,
-- computed risk scores, severity breakdowns, and corridor flags.
-- =============================================================================
CREATE OR REPLACE VIEW v_hotspot_summary AS
SELECT 
    h.hotspot_id,
    h.centre_lat,
    h.centre_lon,
    h.radius_m,
    ROUND(h.radius_m * 2.0, 2) AS diameter_m,
    CASE WHEN (h.radius_m * 2.0) > 1500.0 THEN 1 ELSE 0 END AS is_corridor_flag,
    h.accident_count,
    h.fatal_count,
    h.serious_count,
    h.slight_count,
    h.severe_ratio,
    ROUND(h.severe_ratio * 100.0, 2) AS severe_percentage,
    h.trend_slope,
    h.frequency_score,
    h.severity_score,
    h.trend_score,
    h.risk_score,
    h.risk_level,
    h.nearest_district_id,
    COALESCE(lad.district_name, 'Unknown / Unassigned') AS district_name,
    h.first_year,
    h.last_year
FROM hotspot h
LEFT JOIN local_authority_district lad ON h.nearest_district_id = lad.district_id;

-- =============================================================================
-- 7. 500M REGIONAL SPATIAL GRID DENSITY VIEW (v_grid_density)
-- Aggregates collision frequencies and severity metrics into uniform 500m x 500m
-- British National Grid spatial bins for uniform heatmap overlays and choropleths.
-- Excludes collisions without valid OSGR coordinates.
-- =============================================================================
CREATE OR REPLACE VIEW v_grid_density AS
SELECT 
    (FLOOR(a.easting / 500.0) * 500)::INT AS grid_easting_500m,
    (FLOOR(a.northing / 500.0) * 500)::INT AS grid_northing_500m,
    ROUND(AVG(a.latitude), 6) AS approx_lat,
    ROUND(AVG(a.longitude), 6) AS approx_lon,
    COUNT(*) AS total_collisions,
    SUM(a.is_severe) AS severe_collisions,
    SUM(CASE WHEN a.severity_id = 1 THEN 1 ELSE 0 END) AS fatal_collisions,
    SUM(CASE WHEN a.severity_id = 2 THEN 1 ELSE 0 END) AS serious_collisions,
    SUM(CASE WHEN a.severity_id = 3 THEN 1 ELSE 0 END) AS slight_collisions,
    ROUND(SUM(a.is_severe) * 100.0 / COUNT(*), 2) AS severe_percentage
FROM accident a
WHERE a.has_valid_coords = TRUE
  AND a.easting IS NOT NULL
  AND a.northing IS NOT NULL
GROUP BY (FLOOR(a.easting / 500.0) * 500)::INT, (FLOOR(a.northing / 500.0) * 500)::INT;

