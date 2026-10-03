-- =============================================================================
-- Smart Road Accident Hotspot Analysis and Risk Prediction System
-- DBMS Course Milestone: Transaction Management & Atomicity Demonstration
-- =============================================================================
--
-- Demonstration of ACID properties in PostgreSQL:
-- 1. Atomicity: All modifications within a transaction succeed or none take effect.
-- 2. Consistency: Constraints and invariants remain preserved across state changes.
-- 3. Isolation: Uncommitted changes are hidden from concurrent connections.
-- 4. Durability: Once committed, data survives system crashes or restarts.
--
-- This script uses a throwaway audit/batch log table to demonstrate:
--   - BEGIN: Starting an explicit transaction block
--   - INSERT: Adding initial staging records
--   - SAVEPOINT: Defining a nested rollback marker within the transaction
--   - ROLLBACK TO SAVEPOINT: Selectively undoing erroneous statements while preserving valid ones
--   - COMMIT: Atomically persisting the final consistent state
-- =============================================================================

-- Step 0: Create an isolated throwaway demonstration table
DROP TABLE IF EXISTS demo_batch_audit;

CREATE TABLE demo_batch_audit (
    batch_id SERIAL PRIMARY KEY,
    batch_name VARCHAR(100) NOT NULL,
    records_processed INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 1: Begin transaction block
BEGIN;

-- Step 2: Insert initial valid batch record
INSERT INTO demo_batch_audit (batch_name, records_processed, status)
VALUES ('2021_STATS19_ACCIDENTS', 101230, 'IN_PROGRESS');

-- Step 3: Establish a nested savepoint before executing experimental or risky operation
SAVEPOINT pre_risky_load;

-- Step 4: Insert a test record that simulates a failure / corrupted payload
INSERT INTO demo_batch_audit (batch_name, records_processed, status)
VALUES ('2021_STATS19_CORRUPTED_FEED', 999999, 'CORRUPTED');

-- Inspect current uncommitted state inside the transaction (shows 2 records)
SELECT * FROM demo_batch_audit;

-- Step 5: Detect error condition and rollback ONLY to the savepoint
-- This discards the corrupted record without aborting the entire transaction!
ROLLBACK TO SAVEPOINT pre_risky_load;

-- Inspect state after partial rollback (the corrupted record is gone, valid record remains)
SELECT * FROM demo_batch_audit;

-- Step 6: Insert valid subsequent record after recovering from savepoint
INSERT INTO demo_batch_audit (batch_name, records_processed, status)
VALUES ('2021_STATS19_VEHICLES', 185420, 'SUCCESS');

-- Step 7: Atomically commit the transaction
COMMIT;

-- Verify final persisted state outside the transaction
SELECT 
    batch_id, 
    batch_name, 
    records_processed, 
    status, 
    created_at 
FROM demo_batch_audit;

-- Step 8: Clean up throwaway table
DROP TABLE IF EXISTS demo_batch_audit;
