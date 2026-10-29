/**
 * Analytical & Exploratory Data Analysis Service Layer.
 * Pre-aggregates multidimensional distributions in SQL for fast frontend charts.
 */

import { query } from '../db/pool.js';
import { buildAccidentFilters } from '../utils/filters.js';

/**
 * Fetch temporal distributions (Hourly, Day of Week, Month, 7x24 Heatmap).
 * @param {Object} queryParams
 */
export async function getTemporalAnalysis(queryParams = {}) {
  const { whereClause, values } = buildAccidentFilters(queryParams, 'a', 1);

  // Hourly curve
  const hourSql = `
    SELECT 
      a.hour,
      COUNT(*) AS total_collisions,
      SUM(a.is_severe) AS severe_collisions,
      ROUND(SUM(a.is_severe) * 100.0 / NULLIF(COUNT(*), 0), 2) AS severe_percentage
    FROM accident a
    ${whereClause}
    WHERE a.hour IS NOT NULL ${whereClause ? 'AND ' + whereClause.replace('WHERE', '') : ''}
    GROUP BY a.hour
    ORDER BY a.hour ASC;
  `;

  // Day of week
  const weekdaySql = `
    SELECT 
      CASE a.day_of_week_name
        WHEN 'Monday' THEN 1
        WHEN 'Tuesday' THEN 2
        WHEN 'Wednesday' THEN 3
        WHEN 'Thursday' THEN 4
        WHEN 'Friday' THEN 5
        WHEN 'Saturday' THEN 6
        WHEN 'Sunday' THEN 7
        ELSE 8
      END AS day_index,
      a.day_of_week_name,
      COUNT(*) AS total_collisions,
      SUM(a.is_severe) AS severe_collisions,
      ROUND(SUM(a.is_severe) * 100.0 / NULLIF(COUNT(*), 0), 2) AS severe_percentage
    FROM accident a
    ${whereClause}
    WHERE a.day_of_week_name IS NOT NULL ${whereClause ? 'AND ' + whereClause.replace('WHERE', '') : ''}
    GROUP BY a.day_of_week_name
    ORDER BY day_index ASC;
  `;

  // Time period
  const periodSql = `
    SELECT 
      a.time_period,
      COUNT(*) AS total_collisions,
      SUM(a.is_severe) AS severe_collisions,
      ROUND(SUM(a.is_severe) * 100.0 / NULLIF(COUNT(*), 0), 2) AS severe_percentage
    FROM accident a
    ${whereClause}
    WHERE a.time_period IS NOT NULL ${whereClause ? 'AND ' + whereClause.replace('WHERE', '') : ''}
    GROUP BY a.time_period
    ORDER BY total_collisions DESC;
  `;

  // Monthly distribution
  const monthlySql = `
    SELECT 
      a.month,
      TO_CHAR(TO_DATE(a.month::text, 'MM'), 'Mon') AS month_name,
      COUNT(*) AS total_collisions,
      SUM(a.is_severe) AS severe_collisions,
      ROUND(SUM(a.is_severe) * 100.0 / NULLIF(COUNT(*), 0), 2) AS severe_percentage
    FROM accident a
    ${whereClause}
    WHERE a.month IS NOT NULL ${whereClause ? 'AND ' + whereClause.replace('WHERE', '') : ''}
    GROUP BY a.month
    ORDER BY a.month ASC;
  `;

  // 7x24 Heatmap Matrix
  let heatmapSql;
  if (!whereClause) {
    // Fast query on materialized view
    heatmapSql = `
      SELECT 
        day_of_week_index,
        day_of_week_name,
        hour,
        total_collisions,
        severe_collisions,
        severe_percentage
      FROM mv_hour_weekday_heatmap
      ORDER BY day_of_week_index ASC, hour ASC;
    `;
  } else {
    // Dynamic aggregation with applied filters
    heatmapSql = `
      SELECT 
        CASE a.day_of_week_name
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
          WHEN 'Sunday' THEN 7
          ELSE 0
        END AS day_of_week_index,
        a.day_of_week_name,
        a.hour,
        COUNT(*) AS total_collisions,
        SUM(a.is_severe) AS severe_collisions,
        ROUND(SUM(a.is_severe) * 100.0 / NULLIF(COUNT(*), 0), 2) AS severe_percentage
      FROM accident a
      ${whereClause}
      WHERE a.hour IS NOT NULL AND a.day_of_week_name IS NOT NULL ${whereClause ? 'AND ' + whereClause.replace('WHERE', '') : ''}
      GROUP BY a.day_of_week_name, a.hour
      ORDER BY day_of_week_index ASC, a.hour ASC;
    `;
  }

  const [hourRes, weekdayRes, periodRes, monthlyRes, heatmapRes] = await Promise.all([
    query(hourSql, values),
    query(weekdaySql, values),
    query(periodSql, values),
    query(monthlySql, values),
    query(heatmapSql, whereClause ? values : []),
  ]);

  return {
    hourly: hourRes.rows.map((r) => ({
      hour: parseInt(r.hour, 10),
      total_collisions: parseInt(r.total_collisions, 10),
      severe_collisions: parseInt(r.severe_collisions, 10),
      severe_percentage: parseFloat(r.severe_percentage),
    })),
    weekday: weekdayRes.rows.map((r) => ({
      day_index: parseInt(r.day_index, 10),
      day_name: r.day_of_week_name,
      total_collisions: parseInt(r.total_collisions, 10),
      severe_collisions: parseInt(r.severe_collisions, 10),
      severe_percentage: parseFloat(r.severe_percentage),
    })),
    monthly: monthlyRes.rows.map((r) => ({
      month: parseInt(r.month, 10),
      month_name: r.month_name,
      total_collisions: parseInt(r.total_collisions, 10),
      severe_collisions: parseInt(r.severe_collisions, 10),
      severe_percentage: parseFloat(r.severe_percentage),
    })),
    time_period: periodRes.rows.map((r) => ({
      time_period: r.time_period,
      total_collisions: parseInt(r.total_collisions, 10),
      severe_collisions: parseInt(r.severe_collisions, 10),
      severe_percentage: parseFloat(r.severe_percentage),
    })),
    heatmap_7x24: heatmapRes.rows.map((r) => ({
      day_index: parseInt(r.day_of_week_index, 10),
      day_name: r.day_of_week_name,
      hour: parseInt(r.hour, 10),
      total_collisions: parseInt(r.total_collisions, 10),
      severe_collisions: parseInt(r.severe_collisions, 10),
      severe_percentage: parseFloat(r.severe_percentage),
    })),
  };
}

/**
 * Fetch environmental condition breakdown (Weather, Road Surface, Light Condition).
 * @param {Object} queryParams
 */
export async function getEnvironmentalAnalysis(queryParams = {}) {
  const { whereClause, values } = buildAccidentFilters(queryParams, 'a', 1);

  const weatherSql = `
    SELECT 
      COALESCE(wc.weather_condition_name, 'Unknown') AS weather_condition,
      COUNT(*) AS total_collisions,
      SUM(a.is_severe) AS severe_collisions,
      ROUND(SUM(a.is_severe) * 100.0 / NULLIF(COUNT(*), 0), 2) AS severe_percentage
    FROM accident a
    LEFT JOIN weather_condition wc ON a.weather_condition_id = wc.weather_condition_id
    ${whereClause}
    GROUP BY wc.weather_condition_name
    ORDER BY total_collisions DESC;
  `;

  const surfaceSql = `
    SELECT 
      COALESCE(rsc.road_surface_condition_name, 'Unknown') AS road_surface,
      COUNT(*) AS total_collisions,
      SUM(a.is_severe) AS severe_collisions,
      ROUND(SUM(a.is_severe) * 100.0 / NULLIF(COUNT(*), 0), 2) AS severe_percentage
    FROM accident a
    LEFT JOIN road_surface_condition rsc ON a.road_surface_condition_id = rsc.road_surface_condition_id
    ${whereClause}
    GROUP BY rsc.road_surface_condition_name
    ORDER BY total_collisions DESC;
  `;

  const lightSql = `
    SELECT 
      COALESCE(lc.light_condition_name, 'Unknown') AS light_condition,
      COUNT(*) AS total_collisions,
      SUM(a.is_severe) AS severe_collisions,
      ROUND(SUM(a.is_severe) * 100.0 / NULLIF(COUNT(*), 0), 2) AS severe_percentage
    FROM accident a
    LEFT JOIN light_condition lc ON a.light_condition_id = lc.light_condition_id
    ${whereClause}
    GROUP BY lc.light_condition_name
    ORDER BY total_collisions DESC;
  `;

  const [weatherRes, surfaceRes, lightRes] = await Promise.all([
    query(weatherSql, values),
    query(surfaceSql, values),
    query(lightSql, values),
  ]);

  return {
    weather: weatherRes.rows.map((r) => ({
      condition: r.weather_condition,
      total_collisions: parseInt(r.total_collisions, 10),
      severe_collisions: parseInt(r.severe_collisions, 10),
      severe_percentage: parseFloat(r.severe_percentage),
    })),
    road_surface: surfaceRes.rows.map((r) => ({
      condition: r.road_surface,
      total_collisions: parseInt(r.total_collisions, 10),
      severe_collisions: parseInt(r.severe_collisions, 10),
      severe_percentage: parseFloat(r.severe_percentage),
    })),
    light_condition: lightRes.rows.map((r) => ({
      condition: r.light_condition,
      total_collisions: parseInt(r.total_collisions, 10),
      severe_collisions: parseInt(r.severe_collisions, 10),
      severe_percentage: parseFloat(r.severe_percentage),
    })),
  };
}

/**
 * Fetch road layout and infrastructure analysis (Road Type, Junction Detail, Speed Limit, Urban/Rural).
 * @param {Object} queryParams
 */
export async function getRoadAnalysis(queryParams = {}) {
  const { whereClause, values } = buildAccidentFilters(queryParams, 'a', 1);

  const roadTypeSql = `
    SELECT 
      COALESCE(rt.road_type_name, 'Unknown') AS road_type,
      COUNT(*) AS total_collisions,
      SUM(a.is_severe) AS severe_collisions,
      ROUND(SUM(a.is_severe) * 100.0 / NULLIF(COUNT(*), 0), 2) AS severe_percentage
    FROM accident a
    LEFT JOIN road_type rt ON a.road_type_id = rt.road_type_id
    ${whereClause}
    GROUP BY rt.road_type_name
    ORDER BY total_collisions DESC;
  `;

  const junctionSql = `
    SELECT 
      COALESCE(jd.junction_detail_name, 'Unknown') AS junction_detail,
      COUNT(*) AS total_collisions,
      SUM(a.is_severe) AS severe_collisions,
      ROUND(SUM(a.is_severe) * 100.0 / NULLIF(COUNT(*), 0), 2) AS severe_percentage
    FROM accident a
    LEFT JOIN junction_detail jd ON a.junction_detail_id = jd.junction_detail_id
    ${whereClause}
    GROUP BY jd.junction_detail_name
    ORDER BY total_collisions DESC;
  `;

  const speedSql = `
    SELECT 
      a.speed_limit,
      COUNT(*) AS total_collisions,
      SUM(a.is_severe) AS severe_collisions,
      ROUND(SUM(a.is_severe) * 100.0 / NULLIF(COUNT(*), 0), 2) AS severe_percentage,
      SUM(CASE WHEN a.severity_id = 1 THEN 1 ELSE 0 END) AS fatal_collisions,
      ROUND(SUM(CASE WHEN a.severity_id = 1 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 2) AS fatal_percentage,
      ROUND(AVG(a.number_of_casualties), 2) AS avg_casualties
    FROM accident a
    ${whereClause}
    WHERE a.speed_limit IS NOT NULL ${whereClause ? 'AND ' + whereClause.replace('WHERE', '') : ''}
    GROUP BY a.speed_limit
    ORDER BY a.speed_limit ASC;
  `;

  const urbanRuralSql = `
    SELECT 
      COALESCE(ur.area_name, 'Unknown') AS urban_rural,
      COUNT(*) AS total_collisions,
      SUM(a.is_severe) AS severe_collisions,
      ROUND(SUM(a.is_severe) * 100.0 / NULLIF(COUNT(*), 0), 2) AS severe_percentage
    FROM accident a
    LEFT JOIN urban_rural_area ur ON a.urban_rural_id = ur.urban_rural_id
    ${whereClause}
    GROUP BY ur.area_name
    ORDER BY total_collisions DESC;
  `;

  const [roadTypeRes, junctionRes, speedRes, urbanRuralRes] = await Promise.all([
    query(roadTypeSql, values),
    query(junctionSql, values),
    query(speedSql, values),
    query(urbanRuralSql, values),
  ]);

  return {
    road_types: roadTypeRes.rows.map((r) => ({
      road_type: r.road_type,
      total_collisions: parseInt(r.total_collisions, 10),
      severe_collisions: parseInt(r.severe_collisions, 10),
      severe_percentage: parseFloat(r.severe_percentage),
    })),
    junction_details: junctionRes.rows.map((r) => ({
      junction_detail: r.junction_detail,
      total_collisions: parseInt(r.total_collisions, 10),
      severe_collisions: parseInt(r.severe_collisions, 10),
      severe_percentage: parseFloat(r.severe_percentage),
    })),
    speed_limits: speedRes.rows.map((r) => ({
      speed_limit: parseInt(r.speed_limit, 10),
      total_collisions: parseInt(r.total_collisions, 10),
      severe_collisions: parseInt(r.severe_collisions, 10),
      severe_percentage: parseFloat(r.severe_percentage),
      fatal_collisions: parseInt(r.fatal_collisions, 10),
      fatal_percentage: parseFloat(r.fatal_percentage),
      avg_casualties: parseFloat(r.avg_casualties),
    })),
    urban_rural: urbanRuralRes.rows.map((r) => ({
      area: r.urban_rural,
      total_collisions: parseInt(r.total_collisions, 10),
      severe_collisions: parseInt(r.severe_collisions, 10),
      severe_percentage: parseFloat(r.severe_percentage),
    })),
  };
}

/**
 * Fetch severity distribution and casualty injury breakdown.
 * @param {Object} queryParams
 */
export async function getSeverityAnalysis(queryParams = {}) {
  const { whereClause, values } = buildAccidentFilters(queryParams, 'a', 1);

  const sql = `
    SELECT 
      s.severity_name,
      COUNT(*) AS collision_count,
      ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage_of_total,
      SUM(a.number_of_casualties) AS total_casualties,
      ROUND(AVG(a.number_of_casualties), 2) AS avg_casualties,
      ROUND(AVG(a.number_of_vehicles), 2) AS avg_vehicles
    FROM accident a
    JOIN severity s ON a.severity_id = s.severity_id
    ${whereClause}
    GROUP BY s.severity_id, s.severity_name
    ORDER BY s.severity_id ASC;
  `;

  const res = await query(sql, values);
  return {
    severity_distribution: res.rows.map((r) => ({
      severity: r.severity_name,
      collision_count: parseInt(r.collision_count, 10),
      percentage_of_total: parseFloat(r.percentage_of_total),
      total_casualties: parseInt(r.total_casualties, 10),
      avg_casualties: parseFloat(r.avg_casualties),
      avg_vehicles: parseFloat(r.avg_vehicles),
    })),
  };
}

/**
 * Fetch vehicle involvement patterns and top vehicle categories.
 * @param {Object} queryParams
 */
export async function getVehicleAnalysis(queryParams = {}) {
  const { whereClause, values } = buildAccidentFilters(queryParams, 'a', 1);

  // Vulnerable flags
  const flagsSql = `
    SELECT 
      COUNT(*) AS total_collisions,
      SUM(a.involves_motorcycle) AS motorcycle_collisions,
      ROUND(SUM(a.involves_motorcycle) * 100.0 / NULLIF(COUNT(*), 0), 2) AS motorcycle_pct,
      ROUND(SUM(CASE WHEN a.involves_motorcycle = 1 THEN a.is_severe ELSE 0 END) * 100.0 / NULLIF(SUM(a.involves_motorcycle), 0), 2) AS motorcycle_severe_rate,
      
      SUM(a.involves_hgv) AS hgv_collisions,
      ROUND(SUM(a.involves_hgv) * 100.0 / NULLIF(COUNT(*), 0), 2) AS hgv_pct,
      ROUND(SUM(CASE WHEN a.involves_hgv = 1 THEN a.is_severe ELSE 0 END) * 100.0 / NULLIF(SUM(a.involves_hgv), 0), 2) AS hgv_severe_rate,
      
      SUM(a.involves_cyclist) AS cyclist_collisions,
      ROUND(SUM(a.involves_cyclist) * 100.0 / NULLIF(COUNT(*), 0), 2) AS cyclist_pct,
      ROUND(SUM(CASE WHEN a.involves_cyclist = 1 THEN a.is_severe ELSE 0 END) * 100.0 / NULLIF(SUM(a.involves_cyclist), 0), 2) AS cyclist_severe_rate
    FROM accident a
    ${whereClause};
  `;

  // Top 10 vehicle types involved
  const topVehiclesSql = `
    SELECT 
      COALESCE(vt.vehicle_type_name, 'Unknown') AS vehicle_type,
      COUNT(*) AS vehicle_count,
      COUNT(DISTINCT v.accident_index) AS collision_count
    FROM vehicle v
    JOIN accident a ON v.accident_index = a.accident_index
    LEFT JOIN vehicle_type vt ON v.vehicle_type_id = vt.vehicle_type_id
    ${whereClause}
    GROUP BY vt.vehicle_type_name
    ORDER BY vehicle_count DESC
    LIMIT 10;
  `;

  const [flagsRes, topVehiclesRes] = await Promise.all([
    query(flagsSql, values),
    query(topVehiclesSql, values),
  ]);

  const f = flagsRes.rows[0];

  return {
    vulnerable_user_rates: {
      motorcycle: {
        collisions: parseInt(f.motorcycle_collisions, 10),
        share_of_all_crashes_pct: parseFloat(f.motorcycle_pct),
        severe_rate_pct: parseFloat(f.motorcycle_severe_rate || 0),
      },
      hgv: {
        collisions: parseInt(f.hgv_collisions, 10),
        share_of_all_crashes_pct: parseFloat(f.hgv_pct),
        severe_rate_pct: parseFloat(f.hgv_severe_rate || 0),
      },
      cyclist: {
        collisions: parseInt(f.cyclist_collisions, 10),
        share_of_all_crashes_pct: parseFloat(f.cyclist_pct),
        severe_rate_pct: parseFloat(f.cyclist_severe_rate || 0),
      },
    },
    top_vehicle_categories: topVehiclesRes.rows.map((r) => ({
      vehicle_type: r.vehicle_type,
      vehicle_count: parseInt(r.vehicle_count, 10),
      collision_count: parseInt(r.collision_count, 10),
    })),
  };
}
