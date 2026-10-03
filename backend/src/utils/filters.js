/**
 * Shared Query Parameter Filter Parser and SQL Clause Builder.
 * Strictly validates, sanitizes, and parameterizes all user inputs.
 * Never concatenates raw strings into SQL queries.
 */

import { badRequest } from './errors.js';

const VALID_TIME_PERIODS = ['Morning Peak', 'Daytime', 'Evening Peak', 'Evening', 'Night'];
const VALID_SEVERITIES = ['Fatal', 'Serious', 'Slight', 'Severe', '1', '2', '3', 1, 2, 3];
const VALID_SPEED_LIMITS = [20, 30, 40, 50, 60, 70, '20', '30', '40', '50', '60', '70'];
const VALID_VEHICLE_TYPES = ['motorcycle', 'hgv', 'cyclist', 'car', 'all'];

/**
 * Validate and build parameterized WHERE clauses for collision fact queries.
 * @param {Object} queryParams - Express req.query object
 * @param {string} [tablePrefix='a'] - SQL table alias for the accident table
 * @param {number} [startParamIndex=1] - Starting index for SQL placeholders ($1, $2...)
 * @returns {{ whereClause: string, values: Array, nextIndex: number, parsedFilters: Object }}
 */
export function buildAccidentFilters(queryParams = {}, tablePrefix = 'a', startParamIndex = 1) {
  const conditions = [];
  const values = [];
  let paramIdx = startParamIndex;
  const parsedFilters = {};

  const p = (col) => (tablePrefix ? `${tablePrefix}.${col}` : col);

  // 1. Year Range Filtering
  if (queryParams.year_from !== undefined) {
    const yrFrom = parseInt(queryParams.year_from, 10);
    if (isNaN(yrFrom) || yrFrom < 2000 || yrFrom > 2030) {
      throw badRequest('Invalid "year_from" parameter. Must be a 4-digit year (e.g. 2021).');
    }
    conditions.push(`${p('accident_year')} >= $${paramIdx++}`);
    values.push(yrFrom);
    parsedFilters.year_from = yrFrom;
  }

  if (queryParams.year_to !== undefined) {
    const yrTo = parseInt(queryParams.year_to, 10);
    if (isNaN(yrTo) || yrTo < 2000 || yrTo > 2030) {
      throw badRequest('Invalid "year_to" parameter. Must be a 4-digit year (e.g. 2025).');
    }
    conditions.push(`${p('accident_year')} <= $${paramIdx++}`);
    values.push(yrTo);
    parsedFilters.year_to = yrTo;
  }

  if (parsedFilters.year_from && parsedFilters.year_to && parsedFilters.year_from > parsedFilters.year_to) {
    throw badRequest('"year_from" cannot be greater than "year_to".');
  }

  // 2. Exact Year
  if (queryParams.year !== undefined && !queryParams.year_from && !queryParams.year_to) {
    const yr = parseInt(queryParams.year, 10);
    if (isNaN(yr) || yr < 2000 || yr > 2030) {
      throw badRequest('Invalid "year" parameter.');
    }
    conditions.push(`${p('accident_year')} = $${paramIdx++}`);
    values.push(yr);
    parsedFilters.year = yr;
  }

  // 3. Police Force
  if (queryParams.police_force !== undefined && queryParams.police_force !== '' && queryParams.police_force !== 'all') {
    const pf = queryParams.police_force;
    const pfInt = parseInt(pf, 10);
    if (!isNaN(pfInt) && String(pfInt) === String(pf).trim()) {
      conditions.push(`${p('police_force_id')} = $${paramIdx++}`);
      values.push(pfInt);
      parsedFilters.police_force_id = pfInt;
    } else if (typeof pf === 'string') {
      // Validate safe string length
      if (pf.length > 80 || /[;'"\\]/.test(pf)) {
        throw badRequest('Invalid police_force parameter format.');
      }
      conditions.push(`EXISTS (SELECT 1 FROM police_force pf WHERE pf.police_force_id = ${p('police_force_id')} AND pf.police_force_name ILIKE $${paramIdx++})`);
      values.push(pf.trim());
      parsedFilters.police_force_name = pf.trim();
    }
  }

  // 4. District
  if (queryParams.district !== undefined && queryParams.district !== '' && queryParams.district !== 'all') {
    const dist = queryParams.district;
    const distInt = parseInt(dist, 10);
    if (!isNaN(distInt) && String(distInt) === String(dist).trim()) {
      conditions.push(`${p('district_id')} = $${paramIdx++}`);
      values.push(distInt);
      parsedFilters.district_id = distInt;
    } else if (typeof dist === 'string') {
      if (dist.length > 80 || /[;'"\\]/.test(dist)) {
        throw badRequest('Invalid district parameter format.');
      }
      conditions.push(`EXISTS (SELECT 1 FROM local_authority_district lad WHERE lad.district_id = ${p('district_id')} AND lad.district_name ILIKE $${paramIdx++})`);
      values.push(dist.trim());
      parsedFilters.district_name = dist.trim();
    }
  }

  // 5. Severity Filter
  if (queryParams.severity !== undefined && queryParams.severity !== '' && queryParams.severity !== 'all') {
    const sev = String(queryParams.severity).trim();
    if (!VALID_SEVERITIES.includes(sev)) {
      throw badRequest(`Invalid severity "${sev}". Allowed: Fatal, Serious, Slight, Severe, 1, 2, 3.`);
    }
    if (sev === 'Fatal' || sev === '1') {
      conditions.push(`${p('severity_id')} = 1`);
      parsedFilters.severity = 'Fatal';
    } else if (sev === 'Serious' || sev === '2') {
      conditions.push(`${p('severity_id')} = 2`);
      parsedFilters.severity = 'Serious';
    } else if (sev === 'Slight' || sev === '3') {
      conditions.push(`${p('severity_id')} = 3`);
      parsedFilters.severity = 'Slight';
    } else if (sev === 'Severe') {
      conditions.push(`${p('is_severe')} = 1`);
      parsedFilters.severity = 'Severe';
    }
  }

  // 6. Weather Condition
  if (queryParams.weather !== undefined && queryParams.weather !== '' && queryParams.weather !== 'all') {
    const wc = queryParams.weather;
    const wcInt = parseInt(wc, 10);
    if (!isNaN(wcInt) && String(wcInt) === String(wc).trim()) {
      conditions.push(`${p('weather_condition_id')} = $${paramIdx++}`);
      values.push(wcInt);
      parsedFilters.weather_condition_id = wcInt;
    } else if (typeof wc === 'string') {
      if (wc.length > 80 || /[;'"\\]/.test(wc)) {
        throw badRequest('Invalid weather parameter format.');
      }
      conditions.push(`EXISTS (SELECT 1 FROM weather_condition wct WHERE wct.weather_condition_id = ${p('weather_condition_id')} AND wct.weather_condition_name ILIKE $${paramIdx++})`);
      values.push(wc.trim());
      parsedFilters.weather_name = wc.trim();
    }
  }

  // 7. Road Surface Condition
  if (queryParams.road_surface !== undefined && queryParams.road_surface !== '' && queryParams.road_surface !== 'all') {
    const rsc = queryParams.road_surface;
    const rscInt = parseInt(rsc, 10);
    if (!isNaN(rscInt) && String(rscInt) === String(rsc).trim()) {
      conditions.push(`${p('road_surface_condition_id')} = $${paramIdx++}`);
      values.push(rscInt);
      parsedFilters.road_surface_condition_id = rscInt;
    } else if (typeof rsc === 'string') {
      if (rsc.length > 80 || /[;'"\\]/.test(rsc)) {
        throw badRequest('Invalid road_surface parameter format.');
      }
      conditions.push(`EXISTS (SELECT 1 FROM road_surface_condition rsct WHERE rsct.road_surface_condition_id = ${p('road_surface_condition_id')} AND rsct.road_surface_condition_name ILIKE $${paramIdx++})`);
      values.push(rsc.trim());
      parsedFilters.road_surface_name = rsc.trim();
    }
  }

  // 8. Time Period
  if (queryParams.time_period !== undefined && queryParams.time_period !== '' && queryParams.time_period !== 'all') {
    const tp = String(queryParams.time_period).trim();
    if (!VALID_TIME_PERIODS.includes(tp)) {
      throw badRequest(`Invalid time_period "${tp}". Allowed: ${VALID_TIME_PERIODS.join(', ')}.`);
    }
    conditions.push(`${p('time_period')} = $${paramIdx++}`);
    values.push(tp);
    parsedFilters.time_period = tp;
  }

  // 9. Speed Limit
  if (queryParams.speed_limit !== undefined && queryParams.speed_limit !== '' && queryParams.speed_limit !== 'all') {
    const spd = parseInt(queryParams.speed_limit, 10);
    if (isNaN(spd) || !VALID_SPEED_LIMITS.map(Number).includes(spd)) {
      throw badRequest(`Invalid speed_limit "${queryParams.speed_limit}". Allowed: 20, 30, 40, 50, 60, 70.`);
    }
    conditions.push(`${p('speed_limit')} = $${paramIdx++}`);
    values.push(spd);
    parsedFilters.speed_limit = spd;
  }

  // 10. Weekend Flag
  if (queryParams.is_weekend !== undefined && queryParams.is_weekend !== '') {
    const wk = String(queryParams.is_weekend).toLowerCase();
    if (wk === '1' || wk === 'true') {
      conditions.push(`${p('is_weekend')} = 1`);
      parsedFilters.is_weekend = 1;
    } else if (wk === '0' || wk === 'false') {
      conditions.push(`${p('is_weekend')} = 0`);
      parsedFilters.is_weekend = 0;
    } else {
      throw badRequest('Invalid is_weekend parameter. Allowed: 1, 0, true, false.');
    }
  }

  // 11. Vehicle Type Involvement
  if (queryParams.vehicle_type !== undefined && queryParams.vehicle_type !== '' && queryParams.vehicle_type !== 'all') {
    const vt = String(queryParams.vehicle_type).toLowerCase().trim();
    if (vt === 'motorcycle') {
      conditions.push(`${p('involves_motorcycle')} = 1`);
      parsedFilters.vehicle_type = 'motorcycle';
    } else if (vt === 'hgv') {
      conditions.push(`${p('involves_hgv')} = 1`);
      parsedFilters.vehicle_type = 'hgv';
    } else if (vt === 'cyclist') {
      conditions.push(`${p('involves_cyclist')} = 1`);
      parsedFilters.vehicle_type = 'cyclist';
    } else if (vt !== 'all') {
      throw badRequest(`Invalid vehicle_type "${vt}". Allowed: motorcycle, hgv, cyclist, all.`);
    }
  }

  // 12. Geographic Bounding Box (GPS Latitude/Longitude)
  if (
    queryParams.min_lat !== undefined ||
    queryParams.max_lat !== undefined ||
    queryParams.min_lon !== undefined ||
    queryParams.max_lon !== undefined
  ) {
    const minLat = parseFloat(queryParams.min_lat);
    const maxLat = parseFloat(queryParams.max_lat);
    const minLon = parseFloat(queryParams.min_lon);
    const maxLon = parseFloat(queryParams.max_lon);

    if (isNaN(minLat) || isNaN(maxLat) || isNaN(minLon) || isNaN(maxLon)) {
      throw badRequest('Bounding box requires valid numeric min_lat, max_lat, min_lon, max_lon.');
    }
    if (minLat > maxLat || minLon > maxLon) {
      throw badRequest('Invalid bounding box coordinates: min values cannot exceed max values.');
    }

    conditions.push(`${p('has_valid_coords')} = TRUE`);
    conditions.push(`${p('latitude')} >= $${paramIdx++}`);
    values.push(minLat);
    conditions.push(`${p('latitude')} <= $${paramIdx++}`);
    values.push(maxLat);
    conditions.push(`${p('longitude')} >= $${paramIdx++}`);
    values.push(minLon);
    conditions.push(`${p('longitude')} <= $${paramIdx++}`);
    values.push(maxLon);

    parsedFilters.bbox = { minLat, maxLat, minLon, maxLon };
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, values, nextIndex: paramIdx, parsedFilters };
}
