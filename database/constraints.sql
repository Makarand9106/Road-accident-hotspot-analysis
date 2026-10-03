-- =============================================================================
-- Smart Road Accident Hotspot Analysis and Risk Prediction System
-- Explicit Domain and Business Rule Constraints (PostgreSQL 13+)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ACCIDENT TABLE CONSTRAINTS
-- -----------------------------------------------------------------------------

-- Geographic Bounds for Great Britain
ALTER TABLE accident
    ADD CONSTRAINT chk_accident_latitude
    CHECK (latitude IS NULL OR (latitude >= 49.000000 AND latitude <= 61.000000));

ALTER TABLE accident
    ADD CONSTRAINT chk_accident_longitude
    CHECK (longitude IS NULL OR (longitude >= -9.000000 AND longitude <= 2.000000));

-- Valid Standard UK Speed Limits
ALTER TABLE accident
    ADD CONSTRAINT chk_accident_speed_limit
    CHECK (speed_limit IS NULL OR speed_limit IN (20, 30, 40, 50, 60, 70));

-- Positive Vehicle and Casualty Counts
ALTER TABLE accident
    ADD CONSTRAINT chk_accident_num_vehicles
    CHECK (number_of_vehicles >= 1);

ALTER TABLE accident
    ADD CONSTRAINT chk_accident_num_casualties
    CHECK (number_of_casualties >= 1);

-- Binary Flags
ALTER TABLE accident
    ADD CONSTRAINT chk_accident_is_severe
    CHECK (is_severe IN (0, 1));

ALTER TABLE accident
    ADD CONSTRAINT chk_accident_is_weekend
    CHECK (is_weekend IN (0, 1));

ALTER TABLE accident
    ADD CONSTRAINT chk_accident_involves_motorcycle
    CHECK (involves_motorcycle IN (0, 1));

ALTER TABLE accident
    ADD CONSTRAINT chk_accident_involves_hgv
    CHECK (involves_hgv IN (0, 1));

ALTER TABLE accident
    ADD CONSTRAINT chk_accident_involves_cyclist
    CHECK (involves_cyclist IN (0, 1));

-- Hour and Month Ranges
ALTER TABLE accident
    ADD CONSTRAINT chk_accident_hour
    CHECK (hour IS NULL OR (hour >= 0 AND hour <= 23));

ALTER TABLE accident
    ADD CONSTRAINT chk_accident_month
    CHECK (month IS NULL OR (month >= 1 AND month <= 12));

-- -----------------------------------------------------------------------------
-- 2. HOTSPOT TABLE CONSTRAINTS
-- -----------------------------------------------------------------------------

-- Risk Score Range
ALTER TABLE hotspot
    ADD CONSTRAINT chk_hotspot_risk_score
    CHECK (risk_score >= 0.00 AND risk_score <= 100.00);

-- Categorical Risk Tiers
ALTER TABLE hotspot
    ADD CONSTRAINT chk_hotspot_risk_level
    CHECK (risk_level IN ('Low', 'Medium', 'High'));

-- Coordinates Bounding Check
ALTER TABLE hotspot
    ADD CONSTRAINT chk_hotspot_centre_lat
    CHECK (centre_lat >= 49.000000 AND centre_lat <= 61.000000);

ALTER TABLE hotspot
    ADD CONSTRAINT chk_hotspot_centre_lon
    CHECK (centre_lon >= -9.000000 AND centre_lon <= 2.000000);

-- Radius Positive Constraint
ALTER TABLE hotspot
    ADD CONSTRAINT chk_hotspot_radius
    CHECK (radius_m > 0);

-- Accident Count Consistency
ALTER TABLE hotspot
    ADD CONSTRAINT chk_hotspot_accident_count
    CHECK (accident_count >= 1);

ALTER TABLE hotspot
    ADD CONSTRAINT chk_hotspot_severity_counts
    CHECK (fatal_count >= 0 AND serious_count >= 0 AND slight_count >= 0);

-- -----------------------------------------------------------------------------
-- 3. VEHICLE & CASUALTY TABLE CONSTRAINTS
-- -----------------------------------------------------------------------------

ALTER TABLE vehicle
    ADD CONSTRAINT chk_vehicle_reference_positive
    CHECK (vehicle_reference >= 1);

ALTER TABLE casualty
    ADD CONSTRAINT chk_casualty_reference_positive
    CHECK (casualty_reference >= 1);
