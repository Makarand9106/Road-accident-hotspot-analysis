/**
 * Prediction & Machine Learning Model Controller.
 */

import { query } from '../db/pool.js';
import { predictRisk, getModelSchema } from '../services/riskModel.js';

export async function getMetrics(req, res, next) {
  try {
    const dbMetrics = await query(`
      SELECT model_name, metric_name, metric_value, created_at
      FROM model_metrics
      ORDER BY model_name, metric_name;
    `);

    const modelInfo = getModelSchema();

    // Group database metrics by model
    const grouped = {};
    for (const r of dbMetrics.rows) {
      if (!grouped[r.model_name]) grouped[r.model_name] = {};
      grouped[r.model_name][r.metric_name] = parseFloat(r.metric_value);
    }

    return res.json({
      status: 'success',
      data: {
        active_model: modelInfo.metadata,
        thresholds: modelInfo.thresholds,
        features_schema: modelInfo.schema,
        database_model_metrics: grouped,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function scoreScenario(req, res, next) {
  try {
    const prediction = predictRisk(req.body);
    return res.json({
      status: 'success',
      data: prediction,
    });
  } catch (err) {
    next(err);
  }
}
