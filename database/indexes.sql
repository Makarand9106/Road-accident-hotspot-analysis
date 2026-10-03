-- =============================================================================
-- Smart Road Accident Hotspot Analysis and Risk Prediction System
-- Performance Optimization Indexes (PostgreSQL 13+)
-- NOTE: Execute this script AFTER bulk data loading for optimal loading throughput.
-- =============================================================================

-- Optimizes chronological filtering, month-to-month trends, and temporal range queries in dashboard charts
CREATE INDEX IF NOT EXISTS idx_accident_date
    ON accident (accident_date);

-- Accelerates multi-year annual comparison queries and year-level partitioning aggregations
CREATE INDEX IF NOT EXISTS idx_accident_year
    ON accident (accident_year);

-- Enables fast filtering and grouping by accident severity (Fatal, Serious, Slight) for severity ratio computations
CREATE INDEX IF NOT EXISTS idx_accident_severity_id
    ON accident (severity_id);

-- Supports rapid administrative filtering on local authority districts for local council dashboards
CREATE INDEX IF NOT EXISTS idx_accident_district_id
    ON accident (district_id);

-- Accelerates regional aggregation queries filtered by regional UK Police Force jurisdiction
CREATE INDEX IF NOT EXISTS idx_accident_police_force_id
    ON accident (police_force_id);

-- Dramatically speeds up relational joins between accidents and their assigned spatial hotspot clusters
CREATE INDEX IF NOT EXISTS idx_accident_hotspot_id
    ON accident (hotspot_id);

-- Provides composite spatial indexing for Leaflet map bounding-box viewport queries (ST_MakeEnvelope / lat-lon box)
CREATE INDEX IF NOT EXISTS idx_accident_lat_lon
    ON accident (latitude, longitude)
    WHERE has_valid_coords = TRUE;

-- Critical Foreign Key index: Eliminates full table scans when joining accidents to child vehicle records
CREATE INDEX IF NOT EXISTS idx_vehicle_accident_index
    ON vehicle (accident_index);

-- Critical Foreign Key index: Eliminates full table scans when joining accidents to child casualty records
CREATE INDEX IF NOT EXISTS idx_casualty_accident_index
    ON casualty (accident_index);

-- Partial Index: Stores only high-severity collisions (Fatal/Serious ~24% of dataset), reducing index size by ~76% and providing lightning-fast scans for high-risk queries
CREATE INDEX IF NOT EXISTS idx_accident_date_severe_partial
    ON accident (accident_date)
    WHERE is_severe = 1;
