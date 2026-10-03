/**
 * Meta & Health Controller.
 */

import { query } from '../db/pool.js';
import { getFilterOptions } from '../services/accidentService.js';

/**
 * Health check endpoint verifying API server and database connectivity.
 */
export async function getHealth(req, res, next) {
  try {
    const start = Date.now();
    const dbRes = await query(`
      SELECT 
        (SELECT COUNT(*) FROM accident) AS accident_count,
        (SELECT COUNT(*) FROM vehicle) AS vehicle_count,
        (SELECT COUNT(*) FROM casualty) AS casualty_count,
        (SELECT COUNT(*) FROM hotspot) AS hotspot_count,
        (SELECT COUNT(*) FROM model_metrics) AS model_metrics_count;
    `);
    const dbLatencyMs = Date.now() - start;

    const row = dbRes.rows[0];

    return res.json({
      status: 'ok',
      service: 'Smart Road Accident Hotspot Analysis and Risk Prediction API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(process.uptime()),
      database: {
        connected: true,
        latency_ms: dbLatencyMs,
        counts: {
          accidents: parseInt(row.accident_count, 10),
          vehicles: parseInt(row.vehicle_count, 10),
          casualties: parseInt(row.casualty_count, 10),
          hotspots: parseInt(row.hotspot_count, 10),
          model_metrics: parseInt(row.model_metrics_count, 10),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Filter options endpoint for dynamic frontend dropdowns.
 */
export async function getFilters(req, res, next) {
  try {
    const options = await getFilterOptions();
    return res.json({
      status: 'success',
      data: options,
    });
  } catch (err) {
    next(err);
  }
}
