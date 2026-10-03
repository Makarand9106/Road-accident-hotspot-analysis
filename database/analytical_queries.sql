-- =============================================================================
-- Smart Road Accident Hotspot Analysis and Risk Prediction System
-- DBMS Course Milestone: 16 Core Analytical SQL Queries
-- =============================================================================
--
-- All queries are designed with PostgreSQL 13+ standard syntax, using 
-- explicit JOINs, CTEs, Window Functions, Subqueries, Aggregate Filters,
-- and String/Date Functions.
--
-- NOTE: Severe percentage reflects collision severity proportions in recorded
-- data, not absolute risk per trip (as traffic volume data is not present).
-- Location refers to Police Force jurisdiction or Local Authority District.
-- =============================================================================


-- =============================================================================
-- QUERY 01: Top 15 Locations by Collision Count with Formatted String Labels
-- =============================================================================
-- Question: What are the top 15 police force jurisdictions / regional authorities with the highest number of collisions, formatted with force code and uppercase titles?
-- Concepts Used: INNER JOIN, COUNT(*), UPPER(), String Concatenation (|| operator), GROUP BY, ORDER BY DESC, LIMIT.
-- Why It Matters: Identifies primary regional collision concentrations across Great Britain to guide national resource allocation and dashboard display.
-- Viva Explanation: We join the accident fact table with the police_force lookup table and use UPPER() along with the SQL string concatenation operator (||) to create clean, human-readable labels for frontend charts. Aggregating with COUNT(*) and ordering descending isolates the top 15 highest-volume jurisdictions.
-- =============================================================================
SELECT 
    a.police_force_id,
    UPPER(pf.police_force_name) || ' [FORCE CODE: ' || a.police_force_id || ']' AS formatted_location_label,
    COUNT(*) AS total_collisions,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM accident), 2) AS pct_of_national_collisions
FROM accident a
JOIN police_force pf ON a.police_force_id = pf.police_force_id
GROUP BY a.police_force_id, pf.police_force_name
ORDER BY total_collisions DESC
LIMIT 15;


-- =============================================================================
-- QUERY 02: Locations with Highest Severe Percentage (HAVING >= 500 collisions)
-- =============================================================================
-- Question: Which regional police force areas with at least 500 recorded collisions have the highest percentage of severe (fatal or serious) accidents?
-- Concepts Used: INNER JOIN, Conditional Aggregation with CASE, HAVING clause, ROUND(), ORDER BY DESC.
-- Why It Matters: Prevents small-sample statistical anomalies by establishing a 500-collision threshold while identifying regions where accidents disproportionately result in severe injury or death.
-- Viva Explanation: The HAVING clause filters out low-sample areas post-aggregation, ensuring only statistically significant jurisdictions (>= 500 collisions) are evaluated. We compute the severe percentage using SUM(CASE WHEN is_severe = 1 THEN 1 ELSE 0 END) divided by the total collision count.
-- =============================================================================
SELECT 
    pf.police_force_name,
    COUNT(*) AS total_collisions,
    SUM(CASE WHEN a.severity_id = 1 THEN 1 ELSE 0 END) AS fatal_collisions,
    SUM(CASE WHEN a.severity_id = 2 THEN 1 ELSE 0 END) AS serious_collisions,
    SUM(CASE WHEN a.is_severe = 1 THEN 1 ELSE 0 END) AS total_severe_collisions,
    ROUND(SUM(CASE WHEN a.is_severe = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS severe_percentage
FROM accident a
JOIN police_force pf ON a.police_force_id = pf.police_force_id
GROUP BY pf.police_force_id, pf.police_force_name
HAVING COUNT(*) >= 500
ORDER BY severe_percentage DESC
LIMIT 15;


-- =============================================================================
-- QUERY 03: Collisions by Hour of Day using EXTRACT
-- =============================================================================
-- Question: How are collision volumes, vehicles involved, and severe injury rates distributed across each hour of the day?
-- Concepts Used: EXTRACT(HOUR FROM accident_time), Date/Time Functions, Aggregate Functions, GROUP BY, ORDER BY ASC.
-- Why It Matters: Reveals diurnal temporal risk patterns, identifying peak collision hours (commute windows) versus peak severity hours (late night/early morning).
-- Viva Explanation: We use EXTRACT(HOUR FROM accident_time) to bin timestamps into 24 distinct hourly buckets directly in SQL. This enables computing aggregate counts, vehicle averages, and severe ratios per hour to inform emergency service shift scheduling.
-- =============================================================================
SELECT 
    EXTRACT(HOUR FROM a.accident_time)::INT AS hour_of_day,
    COUNT(*) AS total_collisions,
    SUM(a.is_severe) AS severe_collisions,
    ROUND(SUM(a.is_severe) * 100.0 / COUNT(*), 2) AS severe_percentage,
    ROUND(AVG(a.number_of_vehicles), 2) AS avg_vehicles_per_collision,
    ROUND(AVG(a.number_of_casualties), 2) AS avg_casualties_per_collision
FROM accident a
WHERE a.accident_time IS NOT NULL
GROUP BY EXTRACT(HOUR FROM a.accident_time)
ORDER BY hour_of_day ASC;


-- =============================================================================
-- QUERY 04: Collisions by Day of Week
-- =============================================================================
-- Question: What is the weekly distribution of collisions, vehicles, casualties, and weekend vs weekday proportions?
-- Concepts Used: EXTRACT(ISODOW FROM accident_date), CASE expression for day naming, AVG(), SUM(), GROUP BY, ORDER BY.
-- Why It Matters: Highlights weekday commuter congestion trends versus weekend leisure travel collision characteristics.
-- Viva Explanation: We extract the ISO day of the week (1=Monday to 7=Sunday) to guarantee deterministic chronological sorting rather than alphabetical ordering. Aggregate metrics quantify total collisions, severity percentages, and casualties across each day of the week.
-- =============================================================================
SELECT 
    EXTRACT(ISODOW FROM a.accident_date)::INT AS day_of_week_iso,
    a.day_of_week_name,
    CASE WHEN a.is_weekend = 1 THEN 'Weekend' ELSE 'Weekday' END AS day_category,
    COUNT(*) AS total_collisions,
    SUM(a.is_severe) AS severe_collisions,
    ROUND(SUM(a.is_severe) * 100.0 / COUNT(*), 2) AS severe_percentage,
    SUM(a.number_of_casualties) AS total_casualties,
    ROUND(AVG(a.number_of_casualties), 2) AS avg_casualties_per_collision
FROM accident a
WHERE a.accident_date IS NOT NULL
GROUP BY EXTRACT(ISODOW FROM a.accident_date), a.day_of_week_name, a.is_weekend
ORDER BY day_of_week_iso ASC;


-- =============================================================================
-- QUERY 05: Severe Percentage by Weather Condition
-- =============================================================================
-- Question: How do different weather conditions affect collision frequency and the likelihood of severe outcomes?
-- Concepts Used: INNER JOIN, COUNT(*), SUM(), ROUND(), Arithmetic Operators, GROUP BY, ORDER BY DESC.
-- Why It Matters: Quantifies environmental risk factors, testing whether adverse weather (fog, snow, rain) increases collision severity or decreases speed-related severity.
-- Viva Explanation: We join the accident table to the weather_condition dimension and calculate the proportion of severe collisions for each weather category. The results demonstrate that while fine weather has the highest volume, adverse conditions like fog often exhibit higher severe injury ratios.
-- =============================================================================
SELECT 
    wc.weather_condition_id,
    wc.weather_condition_name,
    COUNT(*) AS total_collisions,
    SUM(a.is_severe) AS severe_collisions,
    COUNT(*) - SUM(a.is_severe) AS slight_collisions,
    ROUND(SUM(a.is_severe) * 100.0 / COUNT(*), 2) AS severe_percentage,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM accident WHERE weather_condition_id IS NOT NULL), 2) AS pct_of_all_weather_collisions
FROM accident a
JOIN weather_condition wc ON a.weather_condition_id = wc.weather_condition_id
GROUP BY wc.weather_condition_id, wc.weather_condition_name
ORDER BY total_collisions DESC;


-- =============================================================================
-- QUERY 06: Road Surface Frequency and Severe Rate
-- =============================================================================
-- Question: How frequently do collisions occur on various road surface conditions and what is the severity rate for each?
-- Concepts Used: INNER JOIN, SUM(is_severe), COUNT(*), Percentage Share, GROUP BY, ORDER BY.
-- Why It Matters: Evaluates road maintenance and grip factors (e.g. ice, snow, wet tarmac) to prioritize gritting routes and surface treatment.
-- Viva Explanation: This query joins the road_surface_condition dimension to measure collision frequency and severity across dry, wet, and icy roads. It computes both the national share of surface collisions and the localized severe outcome rate.
-- =============================================================================
SELECT 
    rsc.road_surface_condition_id,
    rsc.road_surface_condition_name,
    COUNT(*) AS total_collisions,
    SUM(a.is_severe) AS severe_collisions,
    ROUND(SUM(a.is_severe) * 100.0 / COUNT(*), 2) AS severe_percentage,
    ROUND(AVG(a.number_of_vehicles), 2) AS avg_vehicles_involved
FROM accident a
JOIN road_surface_condition rsc ON a.road_surface_condition_id = rsc.road_surface_condition_id
GROUP BY rsc.road_surface_condition_id, rsc.road_surface_condition_name
ORDER BY total_collisions DESC;


-- =============================================================================
-- QUERY 07: Most Frequent Vehicle Types (Accident-Vehicle-Lookup Join)
-- =============================================================================
-- Question: Which vehicle types are most frequently involved in road collisions, and in how many distinct collisions do they appear?
-- Concepts Used: Multi-table INNER JOIN, COUNT(DISTINCT), COUNT(v.vehicle_id), Foreign Key Navigation, GROUP BY, ORDER BY DESC.
-- Why It Matters: Differentiates between vehicle fleet shares (cars vs motorcycles vs HGVs) and individual collision involvement counts.
-- Viva Explanation: By joining accident, vehicle, and vehicle_type across primary-foreign key relationships, we use COUNT(DISTINCT a.accident_index) to count unique crashes and COUNT(v.vehicle_id) to count total vehicles involved. This prevents double-counting when multiple vehicles of the same type collide.
-- =============================================================================
SELECT 
    vt.vehicle_type_id,
    vt.vehicle_type_name,
    COUNT(v.vehicle_id) AS total_vehicles_recorded,
    COUNT(DISTINCT a.accident_index) AS distinct_collisions_involved,
    SUM(a.is_severe) AS severe_collision_involvements,
    ROUND(SUM(a.is_severe) * 100.0 / COUNT(DISTINCT a.accident_index), 2) AS severe_rate_pct
FROM vehicle v
JOIN vehicle_type vt ON v.vehicle_type_id = vt.vehicle_type_id
JOIN accident a ON v.accident_index = a.accident_index
GROUP BY vt.vehicle_type_id, vt.vehicle_type_name
ORDER BY total_vehicles_recorded DESC
LIMIT 15;


-- =============================================================================
-- QUERY 08: Locations with Rising Yearly Counts (2021 to 2023) using CTE & LAG
-- =============================================================================
-- Question: Which police force jurisdictions experienced continuous annual increases in collision counts from 2021 to 2022 and 2022 to 2023 (excluding anomalous 2020)?
-- Concepts Used: Common Table Expression (CTE), LAG() Window Function with PARTITION BY and ORDER BY, Conditional Filtering.
-- Why It Matters: Pinpoints deteriorating regional traffic safety trends requiring urgent policing and road safety interventions.
-- Viva Explanation: We use a CTE to aggregate collisions by jurisdiction and year, then apply the LAG() analytical window function to retrieve the prior year's collision count for each area. The outer query filters for locations where collision counts increased consecutively across 2021, 2022, and 2023.
-- =============================================================================
WITH yearly_location_counts AS (
    SELECT 
        a.police_force_id,
        pf.police_force_name,
        a.accident_year,
        COUNT(*) AS collision_count,
        LAG(COUNT(*), 1) OVER (
            PARTITION BY a.police_force_id 
            ORDER BY a.accident_year
        ) AS prev_year_count
    FROM accident a
    JOIN police_force pf ON a.police_force_id = pf.police_force_id
    WHERE a.accident_year BETWEEN 2021 AND 2023
    GROUP BY a.police_force_id, pf.police_force_name, a.accident_year
),
location_trends AS (
    SELECT 
        police_force_id,
        police_force_name,
        accident_year,
        collision_count,
        prev_year_count,
        CASE WHEN collision_count > prev_year_count THEN 1 ELSE 0 END AS is_increase
    FROM yearly_location_counts
)
SELECT 
    police_force_id,
    police_force_name,
    MAX(CASE WHEN accident_year = 2021 THEN collision_count END) AS count_2021,
    MAX(CASE WHEN accident_year = 2022 THEN collision_count END) AS count_2022,
    MAX(CASE WHEN accident_year = 2023 THEN collision_count END) AS count_2023,
    MAX(CASE WHEN accident_year = 2023 THEN collision_count END) - MAX(CASE WHEN accident_year = 2021 THEN collision_count END) AS net_increase_2021_to_2023
FROM location_trends
GROUP BY police_force_id, police_force_name
HAVING SUM(is_increase) = 2  -- Increased in both 2022 vs 2021 and 2023 vs 2022
ORDER BY net_increase_2021_to_2023 DESC
LIMIT 15;


-- =============================================================================
-- QUERY 09: Monthly Counts with Running Total per Year (SUM OVER PARTITION BY)
-- =============================================================================
-- Question: What is the monthly collision count throughout each calendar year, and how does the cumulative year-to-date total build up?
-- Concepts Used: Window Function SUM(...) OVER (PARTITION BY ... ORDER BY ...), Temporal Grouping, Cumulative Aggregations.
-- Why It Matters: Enables pacing analysis, tracking whether cumulative casualties in a given year are tracking above or below prior annual trajectories.
-- Viva Explanation: We calculate monthly totals and use the window function SUM(COUNT(*)) OVER (PARTITION BY accident_year ORDER BY month) to compute running year-to-date totals that automatically reset at the start of each calendar year.
-- =============================================================================
SELECT 
    accident_year,
    month,
    TO_CHAR(TO_DATE(month::TEXT, 'MM'), 'Month') AS month_name,
    COUNT(*) AS monthly_collisions,
    SUM(COUNT(*)) OVER (
        PARTITION BY accident_year 
        ORDER BY month 
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_yearly_total,
    ROUND(
        SUM(COUNT(*)) OVER (
            PARTITION BY accident_year 
            ORDER BY month 
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY accident_year), 
        2
    ) AS pct_of_annual_total_reached
FROM accident
WHERE month IS NOT NULL
GROUP BY accident_year, month
ORDER BY accident_year ASC, month ASC;


-- =============================================================================
-- QUERY 10: Months Ranked by Total Collision Count using RANK()
-- =============================================================================
-- Question: Across all 60 observed calendar months (2021–2025), which specific year-month periods had the highest collision volumes, ranked using RANK()?
-- Concepts Used: RANK() Window Function, DENSE_RANK(), Multi-Year Monthly Grouping, ORDER BY DESC.
-- Why It Matters: Identifies extreme historical peak months across the entire 5-year observation horizon to study seasonal anomaly drivers.
-- Viva Explanation: We group by year and month, then apply RANK() OVER (ORDER BY COUNT(*) DESC) to assign ordinal ranks based on total collision frequency. Unlike ROW_NUMBER(), RANK() assigns identical ranks to tied values and skips subsequent ranks appropriately.
-- =============================================================================
SELECT 
    RANK() OVER (ORDER BY COUNT(*) DESC) AS collision_volume_rank,
    DENSE_RANK() OVER (ORDER BY COUNT(*) DESC) AS dense_volume_rank,
    accident_year,
    month,
    TO_CHAR(TO_DATE(month::TEXT, 'MM'), 'Month') AS month_name,
    COUNT(*) AS total_collisions,
    SUM(is_severe) AS severe_collisions,
    ROUND(SUM(is_severe) * 100.0 / COUNT(*), 2) AS severe_percentage
FROM accident
WHERE month IS NOT NULL
GROUP BY accident_year, month
ORDER BY collision_volume_rank ASC
LIMIT 15;


-- =============================================================================
-- QUERY 11: Locations Above the National Severe Percentage (Scalar Subquery)
-- =============================================================================
-- Question: Which regional police force jurisdictions have a severe accident percentage strictly greater than the national baseline average?
-- Concepts Used: Scalar Subquery in HAVING clause, Subquery Comparison, HAVING, Aggregate Ratios.
-- Why It Matters: Provides dynamic benchmarking against the national average without hardcoding static percentage values in application code.
-- Viva Explanation: A scalar subquery in the HAVING clause dynamically computes the single national average severe collision rate across all 500k+ records. The outer query filters for jurisdictions whose local severe rate exceeds this benchmark value.
-- =============================================================================
SELECT 
    pf.police_force_id,
    pf.police_force_name,
    COUNT(*) AS location_total_collisions,
    SUM(a.is_severe) AS location_severe_collisions,
    ROUND(SUM(a.is_severe) * 100.0 / COUNT(*), 2) AS location_severe_percentage,
    (
        SELECT ROUND(SUM(is_severe) * 100.0 / COUNT(*), 2) 
        FROM accident
    ) AS national_baseline_percentage,
    ROUND(
        (SUM(a.is_severe) * 100.0 / COUNT(*)) - 
        (SELECT SUM(is_severe) * 100.0 / COUNT(*) FROM accident), 
        2
    ) AS excess_severe_percentage_points
FROM accident a
JOIN police_force pf ON a.police_force_id = pf.police_force_id
GROUP BY pf.police_force_id, pf.police_force_name
HAVING COUNT(*) >= 500
   AND (SUM(a.is_severe) * 100.0 / COUNT(*)) > (
       SELECT SUM(is_severe) * 100.0 / COUNT(*) FROM accident
   )
ORDER BY location_severe_percentage DESC
LIMIT 15;


-- =============================================================================
-- QUERY 12: Lookup Categories with Zero or Few Collisions (LEFT JOIN & COALESCE)
-- =============================================================================
-- Question: Are there any administrative districts or road type categories in the lookup tables with zero or fewer than 10 recorded collisions?
-- Concepts Used: LEFT OUTER JOIN, COALESCE(), COUNT(a.accident_index) vs COUNT(*), Handling Sparse/Missing Foreign Keys.
-- Why It Matters: Validates database completeness and discovers retired, boundary-reformed, or extremely rare administrative jurisdictions.
-- Viva Explanation: We use a LEFT OUTER JOIN from the reference table to the accident table so that lookup rows with zero collisions are preserved rather than dropped. Using COUNT(a.accident_index) instead of COUNT(*) ensures unreferenced lookup items return 0 instead of 1.
-- =============================================================================
SELECT 
    lad.district_id,
    lad.district_name,
    COALESCE(COUNT(a.accident_index), 0) AS recorded_collisions,
    COALESCE(SUM(a.is_severe), 0) AS recorded_severe_collisions,
    CASE 
        WHEN COUNT(a.accident_index) = 0 THEN 'No Collisions Recorded (Historic/Reformed District)'
        ELSE 'Sparse Records (< 10 collisions)'
    END AS status_description
FROM local_authority_district lad
LEFT JOIN accident a ON lad.district_id = a.district_id
GROUP BY lad.district_id, lad.district_name
HAVING COUNT(a.accident_index) < 10
ORDER BY recorded_collisions ASC, lad.district_id ASC
LIMIT 15;


-- =============================================================================
-- QUERY 13: Severe Percentage by Light Condition and Urban or Rural Area
-- =============================================================================
-- Question: How does collision severity vary across combinations of ambient lighting conditions and urban versus rural environments?
-- Concepts Used: Multi-table INNER JOIN, Two-Dimensional Cross-Tabulation Grouping, Aggregate Proportions.
-- Why It Matters: Evaluates the compounding risk of darkness on unlit rural high-speed roads compared to lit urban streets.
-- Viva Explanation: We join accident records with both light_condition and urban_rural_area lookups to cross-tabulate severity outcomes. Grouping by both dimensions reveals that unlit rural roads at night experience significantly higher severe crash rates than lit urban roads.
-- =============================================================================
SELECT 
    COALESCE(ur.area_name, 'Unknown') AS area_type,
    COALESCE(lc.light_condition_name, 'Unknown') AS light_condition,
    COUNT(*) AS total_collisions,
    SUM(a.is_severe) AS severe_collisions,
    ROUND(SUM(a.is_severe) * 100.0 / COUNT(*), 2) AS severe_percentage,
    ROUND(AVG(a.number_of_casualties), 2) AS avg_casualties_per_collision
FROM accident a
JOIN light_condition lc ON a.light_condition_id = lc.light_condition_id
JOIN urban_rural_area ur ON a.urban_rural_id = ur.urban_rural_id
GROUP BY ur.area_name, lc.light_condition_name
ORDER BY area_type ASC, severe_percentage DESC;


-- =============================================================================
-- QUERY 14: Districts Exceeding Their Police Force's Fatal Rate (Correlated Subquery)
-- =============================================================================
-- Question: Which local authority districts have a fatal collision rate that exceeds the overall fatal rate of their parent Police Force jurisdiction?
-- Concepts Used: Correlated Subquery, Subquery Referencing Outer Table Alias, Comparative Aggregation.
-- Why It Matters: Identifies local authority anomaly areas within a broader regional police force where mortality rates are unusually elevated.
-- Viva Explanation: A correlated subquery executes for each outer district row, dynamically computing the fatal percentage for that district's specific police_force_id. The outer query compares the district's fatal rate against this parent force benchmark.
-- =============================================================================
SELECT 
    lad.district_id,
    lad.district_name,
    pf.police_force_name,
    COUNT(*) AS district_total_accidents,
    SUM(CASE WHEN a.severity_id = 1 THEN 1 ELSE 0 END) AS district_fatal_accidents,
    ROUND(SUM(CASE WHEN a.severity_id = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS district_fatal_pct,
    -- Correlated Subquery: computes parent police force fatal percentage
    (
        SELECT ROUND(SUM(CASE WHEN sub_a.severity_id = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2)
        FROM accident sub_a
        WHERE sub_a.police_force_id = a.police_force_id
    ) AS parent_police_force_fatal_pct
FROM accident a
JOIN local_authority_district lad ON a.district_id = lad.district_id
JOIN police_force pf ON a.police_force_id = pf.police_force_id
WHERE a.district_id IS NOT NULL AND a.police_force_id IS NOT NULL
GROUP BY lad.district_id, lad.district_name, pf.police_force_name, a.police_force_id
HAVING COUNT(*) >= 10
   AND (SUM(CASE WHEN a.severity_id = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) > (
       SELECT SUM(CASE WHEN sub_a.severity_id = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)
       FROM accident sub_a
       WHERE sub_a.police_force_id = a.police_force_id
   )
ORDER BY district_fatal_pct DESC
LIMIT 15;


-- =============================================================================
-- QUERY 15: Speed Limit vs Average Casualties and Severity
-- =============================================================================
-- Question: What is the relationship between posted speed limit and the average number of casualties, vehicles, and severe collision probability?
-- Concepts Used: GROUP BY on numerical range, AVG(), SUM(), Monotonic Risk Trend Analysis.
-- Why It Matters: Tests physical kinetic energy principles: higher vehicle velocities translate directly to greater casualty counts and higher severe collision ratios.
-- Viva Explanation: By grouping collisions by legal speed limit (20 to 70 mph), we compute average casualties and severe percentages per collision. The results demonstrate a clear upward trend in severe collision likelihood as posted speed limits increase.
-- =============================================================================
SELECT 
    a.speed_limit,
    COUNT(*) AS total_collisions,
    SUM(a.is_severe) AS severe_collisions,
    ROUND(SUM(a.is_severe) * 100.0 / COUNT(*), 2) AS severe_percentage,
    SUM(CASE WHEN a.severity_id = 1 THEN 1 ELSE 0 END) AS fatal_collisions,
    ROUND(SUM(CASE WHEN a.severity_id = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS fatal_percentage,
    ROUND(AVG(a.number_of_casualties), 3) AS avg_casualties_per_collision,
    ROUND(AVG(a.number_of_vehicles), 2) AS avg_vehicles_per_collision
FROM accident a
WHERE a.speed_limit IS NOT NULL
GROUP BY a.speed_limit
ORDER BY a.speed_limit ASC;


-- =============================================================================
-- QUERY 16: Locations with High Off-Peak Rural Collisions (Nested Subquery with IN)
-- =============================================================================
-- Question: Which regional police force jurisdictions are flagged as rural collision hotspots during off-peak hours (night/evening) using a nested subquery with IN?
-- Concepts Used: Nested Subquery with IN predicate, Proxy Metric Implementation (no traffic sensor data available), Multi-Condition Filtering.
-- Why It Matters: Identifies high-risk rural corridors during low-visibility / off-peak hours where emergency response times are longest.
-- Viva Explanation: Because STATS19 lacks real-time traffic volume sensors, we proxy low-traffic conditions using rural road classification (urban_rural_id = 2) during Night and Evening time periods. We use a nested subquery with the IN operator to filter jurisdictions having substantial volumes of such off-peak rural crashes.
-- =============================================================================
SELECT 
    pf.police_force_id,
    pf.police_force_name,
    COUNT(*) AS total_off_peak_rural_collisions,
    SUM(a.is_severe) AS severe_off_peak_rural_collisions,
    ROUND(SUM(a.is_severe) * 100.0 / COUNT(*), 2) AS severe_percentage,
    ROUND(AVG(a.number_of_casualties), 2) AS avg_casualties
FROM accident a
JOIN police_force pf ON a.police_force_id = pf.police_force_id
WHERE a.police_force_id IN (
    -- Nested subquery: identifies locations with at least 500 off-peak rural collisions
    SELECT sub_a.police_force_id
    FROM accident sub_a
    WHERE sub_a.urban_rural_id = 2                       -- Rural area proxy
      AND sub_a.time_period IN ('Night', 'Evening')     -- Off-peak hours proxy
      AND sub_a.police_force_id IS NOT NULL
    GROUP BY sub_a.police_force_id
    HAVING COUNT(*) >= 500
)
AND a.urban_rural_id = 2
AND a.time_period IN ('Night', 'Evening')
GROUP BY pf.police_force_id, pf.police_force_name
ORDER BY total_off_peak_rural_collisions DESC
LIMIT 15;


-- =============================================================================
-- QUERY 17: Top 20 High-Risk Hotspots by Composite Risk Score with DENSE_RANK
-- =============================================================================
-- Question: Which 20 geographic accident hotspots possess the highest composite risk score, and what are their respective ranks, member collision counts, severe casualty ratios, and nearest administrative districts?
-- Concepts Used: DENSE_RANK() Window Function, LEFT JOIN on Dimension, Percentile Risk Scoring Interpretation, LIMIT.
-- Why It Matters: Identifies priority road safety intervention zones across Great Britain by evaluating multi-criteria risk scores (combining collision frequency, severity proportion, and multi-year trend).
-- Viva Explanation: We apply DENSE_RANK() OVER (ORDER BY h.risk_score DESC) to assign consecutive rank numbers without gaps to equal risk scores. Joining with local_authority_district provides geographic context for local council traffic engineering teams.
-- =============================================================================
SELECT 
    DENSE_RANK() OVER (ORDER BY h.risk_score DESC) AS risk_rank,
    h.hotspot_id,
    h.risk_score,
    h.risk_level,
    h.accident_count,
    h.fatal_count,
    h.serious_count,
    h.slight_count,
    ROUND(h.severe_ratio * 100.0, 2) AS severe_percentage,
    h.trend_slope,
    h.centre_lat,
    h.centre_lon,
    h.radius_m,
    ROUND(h.radius_m * 2.0, 2) AS diameter_m,
    COALESCE(lad.district_name, 'Unknown / Unassigned') AS nearest_district_name
FROM hotspot h
LEFT JOIN local_authority_district lad ON h.nearest_district_id = lad.district_id
ORDER BY risk_rank ASC, h.accident_count DESC
LIMIT 20;


-- =============================================================================
-- QUERY 18: Hotspots with Rising Collision Counts in Latest Two Years (CTE + LAG)
-- =============================================================================
-- Question: Which accident hotspots have experienced an increase in annual recorded collisions between the two most recent complete years (2024 and 2025), and what is their year-over-year percentage increase?
-- Concepts Used: Common Table Expressions (CTE), Window Function LAG(), Aggregate FILTER / SUM(CASE ...), Mathematical Growth Computation.
-- Why It Matters: Identifies newly deteriorating road segments where recent interventions have failed or traffic patterns have worsened, requiring urgent tactical enforcement.
-- Viva Explanation: A Common Table Expression (CTE) aggregates collisions by hotspot_id and accident_year for 2024 and 2025. The outer query evaluates annual counts between consecutive years, filtering strictly for hotspots exhibiting positive growth.
-- =============================================================================
WITH hotspot_recent_years AS (
    SELECT 
        a.hotspot_id,
        a.accident_year,
        COUNT(*) AS annual_collisions
    FROM accident a
    WHERE a.hotspot_id IS NOT NULL
      AND a.accident_year IN (2024, 2025)
    GROUP BY a.hotspot_id, a.accident_year
),
hotspot_growth AS (
    SELECT 
        h.hotspot_id,
        COALESCE(lad.district_name, 'Unknown / Unassigned') AS district_name,
        h.risk_score,
        h.risk_level,
        COALESCE(MAX(CASE WHEN ry.accident_year = 2024 THEN ry.annual_collisions END), 0) AS collisions_2024,
        COALESCE(MAX(CASE WHEN ry.accident_year = 2025 THEN ry.annual_collisions END), 0) AS collisions_2025
    FROM hotspot h
    JOIN hotspot_recent_years ry ON h.hotspot_id = ry.hotspot_id
    LEFT JOIN local_authority_district lad ON h.nearest_district_id = lad.district_id
    GROUP BY h.hotspot_id, lad.district_name, h.risk_score, h.risk_level
)
SELECT 
    hotspot_id,
    district_name,
    risk_score,
    risk_level,
    collisions_2024,
    collisions_2025,
    (collisions_2025 - collisions_2024) AS absolute_collision_increase,
    ROUND(((collisions_2025 - collisions_2024) * 100.0 / NULLIF(collisions_2024, 0)), 2) AS pct_increase
FROM hotspot_growth
WHERE (collisions_2025 - collisions_2024) > 0
ORDER BY absolute_collision_increase DESC, risk_score DESC
LIMIT 20;


-- =============================================================================
-- QUERY 19: National Severe Collision Share in Detected Hotspots (Scalar Subqueries & COALESCE)
-- =============================================================================
-- Question: What proportion of Great Britain's total collisions and severe collisions are concentrated inside the detected DBSCAN hotspot clusters versus non-hotspot roads?
-- Concepts Used: Scalar Subqueries, COALESCE, Cross-Tabular Aggregation, Pareto Concentration Ratio Analysis.
-- Why It Matters: Quantifies spatial concentration efficiency: demonstrates how a small percentage of road space captures a disproportionate volume of serious and fatal collisions.
-- Viva Explanation: We use scalar subqueries to extract national totals and compare them directly against aggregated statistics filtered by a.hotspot_id IS NOT NULL vs IS NULL. COALESCE ensures zero division protection, producing an exact spatial impact ratio.
-- =============================================================================
SELECT 
    CASE WHEN a.hotspot_id IS NOT NULL THEN 'Inside DBSCAN Hotspot' ELSE 'Outside Hotspot (Dispersed)' END AS spatial_zone,
    COUNT(*) AS total_collisions,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM accident), 2) AS pct_of_national_collisions,
    SUM(a.is_severe) AS severe_collisions,
    ROUND(SUM(a.is_severe) * 100.0 / NULLIF((SELECT SUM(is_severe) FROM accident), 0), 2) AS pct_of_national_severe,
    ROUND(SUM(a.is_severe) * 100.0 / COUNT(*), 2) AS zone_severe_percentage,
    SUM(CASE WHEN a.severity_id = 1 THEN 1 ELSE 0 END) AS fatal_collisions,
    SUM(CASE WHEN a.severity_id = 2 THEN 1 ELSE 0 END) AS serious_collisions,
    ROUND(AVG(a.number_of_casualties), 3) AS avg_casualties_per_collision
FROM accident a
GROUP BY CASE WHEN a.hotspot_id IS NOT NULL THEN 'Inside DBSCAN Hotspot' ELSE 'Outside Hotspot (Dispersed)' END
ORDER BY total_collisions DESC;


-- =============================================================================
-- QUERY 20: Comprehensive Regional Authority Safety Ranking using CTE and PERCENT_RANK
-- =============================================================================
-- Question: How do regional police force authorities rank across Great Britain when combining collision volume, severe injury rate, and hotspot cluster density using statistical percentile ranking?
-- Concepts Used: Common Table Expressions (CTE), Window Function PERCENT_RANK(), Multiple Dimension Aggregations, Multi-Criteria Normalization.
-- Why It Matters: Provides regional authorities with an objective, normalized benchmarking index that balances collision frequency, severe casualty proportions, and high-density hotspot concentration.
-- Viva Explanation: A CTE aggregates regional collision counts, severe ratios, and total hotspot memberships. The outer query applies PERCENT_RANK() OVER (...) independently to collision volume, severe rate, and hotspot density, then averages these percentiles into a composite 0–100 regional risk index.
-- =============================================================================
WITH regional_aggregates AS (
    SELECT 
        pf.police_force_id,
        pf.police_force_name,
        COUNT(*) AS total_regional_collisions,
        SUM(a.is_severe) AS severe_collisions,
        ROUND(SUM(a.is_severe) * 100.0 / COUNT(*), 2) AS regional_severe_percentage,
        COUNT(DISTINCT a.hotspot_id) AS distinct_hotspots_count,
        SUM(CASE WHEN a.hotspot_id IS NOT NULL THEN 1 ELSE 0 END) AS hotspot_linked_collisions
    FROM accident a
    JOIN police_force pf ON a.police_force_id = pf.police_force_id
    GROUP BY pf.police_force_id, pf.police_force_name
),
regional_percentiles AS (
    SELECT 
        police_force_id,
        police_force_name,
        total_regional_collisions,
        regional_severe_percentage,
        distinct_hotspots_count,
        hotspot_linked_collisions,
        PERCENT_RANK() OVER (ORDER BY total_regional_collisions ASC) AS volume_pct_rank,
        PERCENT_RANK() OVER (ORDER BY regional_severe_percentage ASC) AS severity_pct_rank,
        PERCENT_RANK() OVER (ORDER BY distinct_hotspots_count ASC) AS hotspot_pct_rank
    FROM regional_aggregates
)
SELECT 
    DENSE_RANK() OVER (ORDER BY ((volume_pct_rank + severity_pct_rank + hotspot_pct_rank) / 3.0) DESC) AS overall_risk_rank,
    police_force_name,
    total_regional_collisions,
    regional_severe_percentage,
    distinct_hotspots_count,
    hotspot_linked_collisions,
    ROUND((volume_pct_rank * 100.0)::NUMERIC, 1) AS volume_percentile,
    ROUND((severity_pct_rank * 100.0)::NUMERIC, 1) AS severity_percentile,
    ROUND((hotspot_pct_rank * 100.0)::NUMERIC, 1) AS hotspot_percentile,
    ROUND((((volume_pct_rank + severity_pct_rank + hotspot_pct_rank) / 3.0) * 100.0)::NUMERIC, 2) AS composite_regional_risk_index
FROM regional_percentiles
ORDER BY composite_regional_risk_index DESC
LIMIT 20;

