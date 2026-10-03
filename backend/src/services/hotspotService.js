/**
 * Hotspot & Regional Risk Service Layer.
 * Queries PostgreSQL hotspot table, v_hotspot_summary view, and regional risk rankings.
 */

import { query } from '../db/pool.js';
import { badRequest, notFound } from '../utils/errors.js';

const VALID_RISK_LEVELS = ['High', 'Medium', 'Low', 'all'];

/**
 * Fetch list of detected DBSCAN hotspots with optional filters and sorting.
 * @param {Object} queryParams
 */
export async function getHotspots(queryParams = {}) {
  const conditions = [];
  const values = [];
  let paramIdx = 1;

  // Filter by risk level
  if (queryParams.risk_level && queryParams.risk_level !== 'all') {
    const lvl = String(queryParams.risk_level).trim();
    if (!['High', 'Medium', 'Low'].includes(lvl)) {
      throw badRequest(`Invalid risk_level "${lvl}". Allowed: High, Medium, Low, all.`);
    }
    conditions.push(`h.risk_level = $${paramIdx++}`);
    values.push(lvl);
  }

  // Filter by minimum collision count
  if (queryParams.min_count !== undefined && queryParams.min_count !== '') {
    const minCnt = parseInt(queryParams.min_count, 10);
    if (isNaN(minCnt) || minCnt < 0) {
      throw badRequest('Invalid min_count parameter. Must be a positive integer.');
    }
    conditions.push(`h.accident_count >= $${paramIdx++}`);
    values.push(minCnt);
  }

  // Filter by corridor flag
  if (queryParams.is_corridor !== undefined && queryParams.is_corridor !== '') {
    const isCorr = queryParams.is_corridor === 'true' || queryParams.is_corridor === '1';
    conditions.push(isCorr ? `(h.radius_m * 2.0) > 1500.0` : `(h.radius_m * 2.0) <= 1500.0`);
  }

  // Sorting
  let sortClause = 'ORDER BY h.risk_score DESC, h.accident_count DESC';
  if (queryParams.sort_by === 'accident_count') {
    sortClause = 'ORDER BY h.accident_count DESC, h.risk_score DESC';
  } else if (queryParams.sort_by === 'severe_ratio') {
    sortClause = 'ORDER BY h.severe_ratio DESC, h.risk_score DESC';
  } else if (queryParams.sort_by === 'radius') {
    sortClause = 'ORDER BY h.radius_m DESC';
  }

  // Limit
  const limit = Math.min(parseInt(queryParams.limit || 1000, 10), 1000);
  const offset = Math.max(parseInt(queryParams.offset || 0, 10), 0);

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT 
      h.hotspot_id,
      h.centre_lat,
      h.centre_lon,
      h.radius_m,
      ROUND(h.radius_m * 2.0, 2) AS diameter_m,
      CASE WHEN (h.radius_m * 2.0) > 1500.0 THEN 1 ELSE 0 END AS is_corridor,
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
    LEFT JOIN local_authority_district lad ON h.nearest_district_id = lad.district_id
    ${whereClause}
    ${sortClause}
    LIMIT $${paramIdx++} OFFSET $${paramIdx++};
  `;

  const countSql = `SELECT COUNT(*) AS total FROM hotspot h ${whereClause};`;

  const [rowsRes, countRes] = await Promise.all([
    query(sql, [...values, limit, offset]),
    query(countSql, values),
  ]);

  return {
    total: parseInt(countRes.rows[0].total, 10),
    count: rowsRes.rows.length,
    limit,
    offset,
    hotspots: rowsRes.rows.map((r) => ({
      hotspot_id: parseInt(r.hotspot_id, 10),
      centre_lat: parseFloat(r.centre_lat),
      centre_lon: parseFloat(r.centre_lon),
      radius_m: parseFloat(r.radius_m),
      diameter_m: parseFloat(r.diameter_m),
      is_corridor: r.is_corridor === 1,
      accident_count: parseInt(r.accident_count, 10),
      fatal_count: parseInt(r.fatal_count, 10),
      serious_count: parseInt(r.serious_count, 10),
      slight_count: parseInt(r.slight_count, 10),
      severe_ratio: parseFloat(r.severe_ratio),
      severe_percentage: parseFloat(r.severe_percentage),
      trend_slope: parseFloat(r.trend_slope),
      frequency_score: parseFloat(r.frequency_score),
      severity_score: parseFloat(r.severity_score),
      trend_score: parseFloat(r.trend_score),
      risk_score: parseFloat(r.risk_score),
      risk_level: r.risk_level,
      nearest_district_id: r.nearest_district_id ? parseInt(r.nearest_district_id, 10) : null,
      district_name: r.district_name,
      first_year: parseInt(r.first_year, 10),
      last_year: parseInt(r.last_year, 10),
    })),
  };
}

/**
 * Fetch detailed metrics, annual progression, and member collision samples for a single hotspot.
 * @param {number} hotspotId
 */
export async function getHotspotById(hotspotId) {
  const id = parseInt(hotspotId, 10);
  if (isNaN(id) || id <= 0) {
    throw badRequest('Invalid hotspot ID.');
  }

  const hotspotSql = `
    SELECT 
      h.*,
      COALESCE(lad.district_name, 'Unknown / Unassigned') AS district_name,
      DENSE_RANK() OVER (ORDER BY h.risk_score DESC) AS national_risk_rank
    FROM hotspot h
    LEFT JOIN local_authority_district lad ON h.nearest_district_id = lad.district_id
    WHERE h.hotspot_id = $1;
  `;

  const yearlySql = `
    SELECT 
      a.accident_year,
      COUNT(*) AS annual_collisions,
      SUM(a.is_severe) AS severe_collisions,
      SUM(CASE WHEN a.severity_id = 1 THEN 1 ELSE 0 END) AS fatal_collisions,
      SUM(CASE WHEN a.severity_id = 2 THEN 1 ELSE 0 END) AS serious_collisions,
      SUM(CASE WHEN a.severity_id = 3 THEN 1 ELSE 0 END) AS slight_collisions
    FROM accident a
    WHERE a.hotspot_id = $1
    GROUP BY a.accident_year
    ORDER BY a.accident_year ASC;
  `;

  const memberSampleSql = `
    SELECT 
      a.accident_index,
      a.accident_date,
      a.accident_time,
      a.accident_year,
      s.severity_name,
      a.is_severe,
      a.latitude,
      a.longitude,
      a.speed_limit,
      a.number_of_vehicles,
      a.number_of_casualties,
      COALESCE(wc.weather_condition_name, 'Unknown') AS weather,
      COALESCE(rsc.road_surface_condition_name, 'Unknown') AS road_surface,
      COALESCE(lc.light_condition_name, 'Unknown') AS light
    FROM accident a
    JOIN severity s ON a.severity_id = s.severity_id
    LEFT JOIN weather_condition wc ON a.weather_condition_id = wc.weather_condition_id
    LEFT JOIN road_surface_condition rsc ON a.road_surface_condition_id = rsc.road_surface_condition_id
    LEFT JOIN light_condition lc ON a.light_condition_id = lc.light_condition_id
    WHERE a.hotspot_id = $1
    ORDER BY a.accident_date DESC
    LIMIT 50;
  `;

  const [hRes, yRes, mRes] = await Promise.all([
    query(hotspotSql, [id]),
    query(yearlySql, [id]),
    query(memberSampleSql, [id]),
  ]);

  if (hRes.rows.length === 0) {
    throw notFound(`Hotspot with ID ${id} not found.`);
  }

  const h = hRes.rows[0];

  return {
    hotspot_id: id,
    national_risk_rank: parseInt(h.national_risk_rank, 10),
    centre_lat: parseFloat(h.centre_lat),
    centre_lon: parseFloat(h.centre_lon),
    radius_m: parseFloat(h.radius_m),
    diameter_m: Number((parseFloat(h.radius_m) * 2.0).toFixed(2)),
    is_corridor: (parseFloat(h.radius_m) * 2.0) > 1500.0,
    accident_count: parseInt(h.accident_count, 10),
    fatal_count: parseInt(h.fatal_count, 10),
    serious_count: parseInt(h.serious_count, 10),
    slight_count: parseInt(h.slight_count, 10),
    severe_ratio: parseFloat(h.severe_ratio),
    severe_percentage: Number((parseFloat(h.severe_ratio) * 100).toFixed(2)),
    trend_slope: parseFloat(h.trend_slope),
    scores: {
      frequency_score: parseFloat(h.frequency_score),
      severity_score: parseFloat(h.severity_score),
      trend_score: parseFloat(h.trend_score),
      composite_risk_score: parseFloat(h.risk_score),
      risk_level: h.risk_level,
    },
    location: {
      nearest_district_id: h.nearest_district_id ? parseInt(h.nearest_district_id, 10) : null,
      district_name: h.district_name,
    },
    yearly_progression: yRes.rows.map((r) => ({
      year: parseInt(r.accident_year, 10),
      annual_collisions: parseInt(r.annual_collisions, 10),
      severe_collisions: parseInt(r.severe_collisions, 10),
      fatal_collisions: parseInt(r.fatal_collisions, 10),
      serious_collisions: parseInt(r.serious_collisions, 10),
      slight_collisions: parseInt(r.slight_collisions, 10),
    })),
    recent_collisions_sample: mRes.rows,
  };
}

/**
 * Fetch comprehensive regional safety rankings (Query 20 logic) and top hotspots.
 */
export async function getRegionalRiskRanking() {
  const rankingSql = `
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
    ORDER BY composite_regional_risk_index DESC;
  `;

  const topHotspotsSql = `
    SELECT 
      h.hotspot_id,
      h.centre_lat,
      h.centre_lon,
      h.radius_m,
      h.accident_count,
      ROUND(h.severe_ratio * 100.0, 2) AS severe_percentage,
      h.risk_score,
      h.risk_level,
      COALESCE(lad.district_name, 'Unknown / Unassigned') AS district_name
    FROM hotspot h
    LEFT JOIN local_authority_district lad ON h.nearest_district_id = lad.district_id
    ORDER BY h.risk_score DESC
    LIMIT 10;
  `;

  const [rankingRes, topHotspotsRes] = await Promise.all([
    query(rankingSql),
    query(topHotspotsSql),
  ]);

  return {
    regional_rankings: rankingRes.rows.map((r) => ({
      overall_risk_rank: parseInt(r.overall_risk_rank, 10),
      police_force_name: r.police_force_name,
      total_collisions: parseInt(r.total_regional_collisions, 10),
      severe_percentage: parseFloat(r.regional_severe_percentage),
      distinct_hotspots_count: parseInt(r.distinct_hotspots_count, 10),
      hotspot_linked_collisions: parseInt(r.hotspot_linked_collisions, 10),
      volume_percentile: parseFloat(r.volume_percentile),
      severity_percentile: parseFloat(r.severity_percentile),
      hotspot_percentile: parseFloat(r.hotspot_percentile),
      composite_risk_index: parseFloat(r.composite_regional_risk_index),
    })),
    top_10_hotspots: topHotspotsRes.rows.map((r) => ({
      hotspot_id: parseInt(r.hotspot_id, 10),
      centre_lat: parseFloat(r.centre_lat),
      centre_lon: parseFloat(r.centre_lon),
      radius_m: parseFloat(r.radius_m),
      accident_count: parseInt(r.accident_count, 10),
      severe_percentage: parseFloat(r.severe_percentage),
      risk_score: parseFloat(r.risk_score),
      risk_level: r.risk_level,
      district_name: r.district_name,
    })),
  };
}
