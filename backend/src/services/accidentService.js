/**
 * Accident Fact & Metadata Service Layer.
 * Queries PostgreSQL accident fact table, views, and dimensions using parameterized SQL.
 */

import { query } from '../db/pool.js';
import { buildAccidentFilters } from '../utils/filters.js';
import { badRequest } from '../utils/errors.js';

const HARD_ROW_LIMIT = 5000;
const DEFAULT_PAGE_LIMIT = 100;

/**
 * Fetch paginated collision records with optional spatial bounding box and filters.
 * @param {Object} queryParams - Express req.query
 */
export async function getAccidents(queryParams = {}) {
  const { whereClause, values, nextIndex } = buildAccidentFilters(queryParams, 'a', 1);

  // Pagination bounds
  let limit = parseInt(queryParams.limit || DEFAULT_PAGE_LIMIT, 10);
  let offset = parseInt(queryParams.offset || 0, 10);

  if (isNaN(limit) || limit < 1) limit = DEFAULT_PAGE_LIMIT;
  if (isNaN(offset) || offset < 0) offset = 0;

  // Enforce 5000 hard safety limit
  let isTruncated = false;
  if (limit > HARD_ROW_LIMIT) {
    limit = HARD_ROW_LIMIT;
    isTruncated = true;
  }

  // Sorting
  const sortCol = queryParams.sort_by === 'severity' ? 'a.severity_id ASC' : 'a.accident_date DESC, a.accident_time DESC';

  // 1. Total matching count query (fast count)
  const countSql = `SELECT COUNT(*) AS total FROM accident a ${whereClause};`;
  const countRes = await query(countSql, values);
  const total = parseInt(countRes.rows[0].total, 10);

  // 2. Paginated rows query
  const limitParamIdx = nextIndex;
  const offsetParamIdx = nextIndex + 1;
  const queryValues = [...values, limit, offset];

  const sql = `
    SELECT 
      a.accident_index,
      a.accident_date,
      a.accident_time,
      a.accident_year,
      a.severity_id,
      s.severity_name,
      a.is_severe,
      a.latitude,
      a.longitude,
      a.easting,
      a.northing,
      a.speed_limit,
      a.number_of_vehicles,
      a.number_of_casualties,
      a.time_period,
      a.day_of_week_name,
      a.is_weekend,
      COALESCE(wc.weather_condition_name, 'Unknown') AS weather,
      COALESCE(rsc.road_surface_condition_name, 'Unknown') AS road_surface,
      COALESCE(lc.light_condition_name, 'Unknown') AS light_condition,
      COALESCE(rt.road_type_name, 'Unknown') AS road_type,
      COALESCE(pf.police_force_name, 'Unknown') AS police_force,
      COALESCE(lad.district_name, 'Unknown') AS district,
      a.hotspot_id
    FROM accident a
    JOIN severity s ON a.severity_id = s.severity_id
    LEFT JOIN weather_condition wc ON a.weather_condition_id = wc.weather_condition_id
    LEFT JOIN road_surface_condition rsc ON a.road_surface_condition_id = rsc.road_surface_condition_id
    LEFT JOIN light_condition lc ON a.light_condition_id = lc.light_condition_id
    LEFT JOIN road_type rt ON a.road_type_id = rt.road_type_id
    LEFT JOIN police_force pf ON a.police_force_id = pf.police_force_id
    LEFT JOIN local_authority_district lad ON a.district_id = lad.district_id
    ${whereClause}
    ORDER BY ${sortCol}
    LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx};
  `;

  const rowsRes = await query(sql, queryValues);

  return {
    total,
    count: rowsRes.rows.length,
    limit,
    offset,
    is_truncated: isTruncated || (rowsRes.rows.length === HARD_ROW_LIMIT && total > HARD_ROW_LIMIT),
    hard_limit: HARD_ROW_LIMIT,
    accidents: rowsRes.rows,
  };
}

/**
 * Fetch high-level summary KPIs and statistics under applied filters.
 * @param {Object} queryParams
 */
export async function getAccidentStats(queryParams = {}) {
  const { whereClause, values } = buildAccidentFilters(queryParams, 'a', 1);

  const sql = `
    SELECT 
      COUNT(*) AS total_collisions,
      COALESCE(SUM(CASE WHEN a.severity_id = 1 THEN 1 ELSE 0 END), 0) AS fatal_collisions,
      COALESCE(SUM(CASE WHEN a.severity_id = 2 THEN 1 ELSE 0 END), 0) AS serious_collisions,
      COALESCE(SUM(CASE WHEN a.severity_id = 3 THEN 1 ELSE 0 END), 0) AS slight_collisions,
      COALESCE(SUM(a.is_severe), 0) AS total_severe_collisions,
      ROUND(COALESCE(SUM(a.is_severe) * 100.0 / NULLIF(COUNT(*), 0), 0.0), 2) AS severe_percentage,
      COALESCE(SUM(a.number_of_casualties), 0) AS total_casualties,
      COALESCE(SUM(a.number_of_vehicles), 0) AS total_vehicles_involved,
      ROUND(COALESCE(AVG(a.number_of_casualties), 0.0), 2) AS avg_casualties_per_collision,
      ROUND(COALESCE(AVG(a.number_of_vehicles), 0.0), 2) AS avg_vehicles_per_collision,
      COALESCE(SUM(a.involves_motorcycle), 0) AS motorcycle_collisions,
      COALESCE(SUM(a.involves_hgv), 0) AS hgv_collisions,
      COALESCE(SUM(a.involves_cyclist), 0) AS cyclist_collisions,
      COUNT(DISTINCT a.hotspot_id) AS active_hotspots_count,
      COALESCE(SUM(CASE WHEN a.hotspot_id IS NOT NULL THEN 1 ELSE 0 END), 0) AS hotspot_linked_collisions
    FROM accident a
    ${whereClause};
  `;

  // Hotspot summary metrics
  const hotspotSql = `
    SELECT 
      COUNT(*) AS total_hotspots_national,
      MAX(risk_score) AS highest_risk_score,
      (SELECT hotspot_id FROM hotspot ORDER BY risk_score DESC LIMIT 1) AS highest_risk_hotspot_id
    FROM hotspot;
  `;

  const [statsRes, hotspotRes] = await Promise.all([
    query(sql, values),
    query(hotspotSql),
  ]);

  const s = statsRes.rows[0];
  const h = hotspotRes.rows[0];

  return {
    total_collisions: parseInt(s.total_collisions, 10),
    fatal_collisions: parseInt(s.fatal_collisions, 10),
    serious_collisions: parseInt(s.serious_collisions, 10),
    slight_collisions: parseInt(s.slight_collisions, 10),
    total_severe_collisions: parseInt(s.total_severe_collisions, 10),
    severe_percentage: parseFloat(s.severe_percentage),
    total_casualties: parseInt(s.total_casualties, 10),
    total_vehicles_involved: parseInt(s.total_vehicles_involved, 10),
    avg_casualties_per_collision: parseFloat(s.avg_casualties_per_collision),
    avg_vehicles_per_collision: parseFloat(s.avg_vehicles_per_collision),
    vulnerable_user_collisions: {
      motorcycle: parseInt(s.motorcycle_collisions, 10),
      hgv: parseInt(s.hgv_collisions, 10),
      cyclist: parseInt(s.cyclist_collisions, 10),
    },
    hotspots: {
      active_in_filter: parseInt(s.active_hotspots_count, 10),
      total_national: parseInt(h.total_hotspots_national, 10),
      linked_collisions_in_filter: parseInt(s.hotspot_linked_collisions, 10),
      highest_risk_score: parseFloat(h.highest_risk_score || 0),
      highest_risk_hotspot_id: h.highest_risk_hotspot_id || null,
    },
  };
}

/**
 * Fetch yearly and monthly collision time-series trends.
 * @param {Object} queryParams
 */
export async function getAccidentTrends(queryParams = {}) {
  const { whereClause, values } = buildAccidentFilters(queryParams, 'a', 1);

  const yearlySql = `
    SELECT 
      a.accident_year,
      COUNT(*) AS total_collisions,
      SUM(a.is_severe) AS severe_collisions,
      SUM(CASE WHEN a.severity_id = 1 THEN 1 ELSE 0 END) AS fatal_collisions,
      SUM(CASE WHEN a.severity_id = 2 THEN 1 ELSE 0 END) AS serious_collisions,
      SUM(CASE WHEN a.severity_id = 3 THEN 1 ELSE 0 END) AS slight_collisions,
      ROUND(SUM(a.is_severe) * 100.0 / NULLIF(COUNT(*), 0), 2) AS severe_percentage,
      SUM(a.number_of_casualties) AS total_casualties
    FROM accident a
    ${whereClause}
    GROUP BY a.accident_year
    ORDER BY a.accident_year ASC;
  `;

  const monthlySql = `
    SELECT 
      a.accident_year,
      a.month,
      TO_CHAR(TO_DATE(a.month::text, 'MM'), 'Mon') AS month_name,
      COUNT(*) AS total_collisions,
      SUM(a.is_severe) AS severe_collisions,
      ROUND(SUM(a.is_severe) * 100.0 / NULLIF(COUNT(*), 0), 2) AS severe_percentage
    FROM accident a
    ${whereClause}
    GROUP BY a.accident_year, a.month
    ORDER BY a.accident_year ASC, a.month ASC;
  `;

  const [yearlyRes, monthlyRes] = await Promise.all([
    query(yearlySql, values),
    query(monthlySql, values),
  ]);

  return {
    yearly_trends: yearlyRes.rows.map((r) => ({
      year: parseInt(r.accident_year, 10),
      total_collisions: parseInt(r.total_collisions, 10),
      severe_collisions: parseInt(r.severe_collisions, 10),
      fatal_collisions: parseInt(r.fatal_collisions, 10),
      serious_collisions: parseInt(r.serious_collisions, 10),
      slight_collisions: parseInt(r.slight_collisions, 10),
      severe_percentage: parseFloat(r.severe_percentage),
      total_casualties: parseInt(r.total_casualties, 10),
    })),
    monthly_trends: monthlyRes.rows.map((r) => ({
      year: parseInt(r.accident_year, 10),
      month: parseInt(r.month, 10),
      month_name: r.month_name,
      total_collisions: parseInt(r.total_collisions, 10),
      severe_collisions: parseInt(r.severe_collisions, 10),
      severe_percentage: parseFloat(r.severe_percentage),
    })),
  };
}

/**
 * Fetch distinct lookup values and options for filter dropdowns.
 */
export async function getFilterOptions() {
  const [
    yearsRes,
    policeRes,
    districtRes,
    weatherRes,
    surfaceRes,
    lightRes,
    roadTypeRes,
    speedRes,
  ] = await Promise.all([
    query('SELECT DISTINCT accident_year FROM accident ORDER BY accident_year ASC;'),
    query('SELECT police_force_id AS id, police_force_name AS name FROM police_force ORDER BY police_force_name ASC;'),
    query('SELECT district_id AS id, district_name AS name FROM local_authority_district WHERE district_name IS NOT NULL ORDER BY district_name ASC;'),
    query('SELECT weather_condition_id AS id, weather_condition_name AS name FROM weather_condition ORDER BY weather_condition_name ASC;'),
    query('SELECT road_surface_condition_id AS id, road_surface_condition_name AS name FROM road_surface_condition ORDER BY road_surface_condition_name ASC;'),
    query('SELECT light_condition_id AS id, light_condition_name AS name FROM light_condition ORDER BY light_condition_name ASC;'),
    query('SELECT road_type_id AS id, road_type_name AS name FROM road_type ORDER BY road_type_name ASC;'),
    query('SELECT DISTINCT speed_limit FROM accident WHERE speed_limit IS NOT NULL ORDER BY speed_limit ASC;'),
  ]);

  return {
    years: yearsRes.rows.map((r) => r.accident_year),
    police_forces: policeRes.rows,
    districts: districtRes.rows,
    weather_conditions: weatherRes.rows,
    road_surface_conditions: surfaceRes.rows,
    light_conditions: lightRes.rows,
    road_types: roadTypeRes.rows,
    speed_limits: speedRes.rows.map((r) => r.speed_limit),
    time_periods: ['Morning Peak', 'Daytime', 'Evening Peak', 'Evening', 'Night'],
    severities: [
      { id: 1, name: 'Fatal' },
      { id: 2, name: 'Serious' },
      { id: 3, name: 'Slight' },
      { id: 'Severe', name: 'Severe (Fatal or Serious)' },
    ],
    vehicle_types: ['motorcycle', 'hgv', 'cyclist', 'car'],
  };
}
