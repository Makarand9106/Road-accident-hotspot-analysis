/**
 * JavaScript In-Memory Risk Scoring Engine for Accident Severity.
 * Loads exported model parameters from models/risk_model.json.
 * Executes zero-dependency vector transformations, sigmoid scoring, and feature attribution.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { badRequest } from '../utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODEL_JSON_PATH = path.resolve(__dirname, '../../../models/risk_model.json');

let cachedModel = null;

/**
 * Load and cache risk_model.json from disk.
 * @returns {Object}
 */
export function getRiskModelJson() {
  if (cachedModel) return cachedModel;

  if (!fs.existsSync(MODEL_JSON_PATH)) {
    throw new Error(`Risk model JSON not found at: ${MODEL_JSON_PATH}`);
  }

  const raw = fs.readFileSync(MODEL_JSON_PATH, 'utf-8');
  cachedModel = JSON.parse(raw);
  return cachedModel;
}

/**
 * Clean feature names for user-friendly frontend explanations.
 * @param {string} featKey
 * @returns {string}
 */
function cleanFeatureName(featKey) {
  return featKey
    .replace('weather_condition_name_', 'Weather: ')
    .replace('road_surface_condition_name_', 'Surface: ')
    .replace('light_condition_name_', 'Light: ')
    .replace('road_type_name_', 'Road Type: ')
    .replace('road_class_name_', 'Road Class: ')
    .replace('junction_detail_name_', 'Junction: ')
    .replace('junction_control_name_', 'Control: ')
    .replace('urban_rural_name_', 'Area: ')
    .replace('time_period_', 'Time Period: ')
    .replace('day_of_week_name_', 'Day of Week: ')
    .replace('speed_limit', 'Posted Speed Limit')
    .replace('number_of_vehicles', 'Vehicles Involved')
    .replace('involves_motorcycle', 'Motorcycle Involved')
    .replace('involves_hgv', 'Heavy Goods Vehicle (HGV) Involved')
    .replace('involves_cyclist', 'Cyclist Involved')
    .replace('is_weekend', 'Weekend Collision')
    .replace('hour', 'Hour of Day')
    .replace('month', 'Month of Year');
}

/**
 * Score a single collision scenario using exported Logistic Regression weights.
 * @param {Object} rawInput - Scenario feature object
 * @returns {{
 *   probability: number,
 *   probability_pct: number,
 *   risk_tier: string,
 *   baseline_severe_rate: number,
 *   baseline_severe_rate_pct: number,
 *   risk_multiplier: number,
 *   logit_score: number,
 *   top_risk_factors: Array<{ feature: string, description: string, weight: number, contribution: number }>,
 *   top_protective_factors: Array<{ feature: string, description: string, weight: number, contribution: number }>
 * }}
 */
export function predictRisk(rawInput = {}) {
  const model = getRiskModelJson();
  const { intercept, weights, ordered_features } = model.formula;
  const schema = model.feature_schema;
  const r = model.risk_classification.baseline_training_severe_rate;

  // Validate input type
  if (!rawInput || typeof rawInput !== 'object') {
    throw badRequest('Invalid request body. Expected JSON object with collision scenario parameters.');
  }

  // 1. Build zero-initialized feature vector matching ordered_features
  const x = {};
  for (const feat of ordered_features) {
    x[feat] = 0.0;
  }

  // 2. Encode Categorical Features (One-Hot, handle_unknown = ignore)
  for (const [catFeat, meta] of Object.entries(schema.categorical_features)) {
    if (rawInput[catFeat] !== undefined && rawInput[catFeat] !== null) {
      const val = String(rawInput[catFeat]).trim();
      const featKey = `${catFeat}_${val}`;
      if (x[featKey] !== undefined) {
        x[featKey] = 1.0;
      }
    }
  }

  // 3. Normalize Numerical Features: z = (val - mean) / scale
  for (const [numFeat, meta] of Object.entries(schema.numerical_features)) {
    let val = parseFloat(rawInput[numFeat]);
    if (isNaN(val)) {
      val = meta.default_median;
    }
    const scaledVal = (val - meta.mean) / meta.scale;
    x[numFeat] = scaledVal;
  }

  // 4. Binary Indicator Features
  for (const [binFeat, meta] of Object.entries(schema.binary_features)) {
    let val = rawInput[binFeat];
    if (val === true || val === 1 || val === '1' || val === 'true') {
      x[binFeat] = 1.0;
    } else {
      x[binFeat] = 0.0;
    }
  }

  // 5. Compute Logit: z = intercept + sum(w_i * x_i)
  let logit = intercept;
  const contributions = [];

  for (const feat of ordered_features) {
    const w = weights[feat] || 0.0;
    const val = x[feat] || 0.0;
    const contrib = w * val;
    logit += contrib;

    if (val !== 0.0 && contrib !== 0.0) {
      contributions.push({
        feature: feat,
        description: cleanFeatureName(feat),
        feature_value: val,
        weight: w,
        contribution: contrib,
      });
    }
  }

  // 6. Sigmoid: p = 1 / (1 + exp(-z))
  const probability = 1.0 / (1.0 + Math.exp(-logit));
  const probabilityPct = Number((probability * 100).toFixed(2));

  // 7. Operational Risk Tier Assignment
  let riskTier = 'Low';
  if (probability >= 2 * r) {
    riskTier = 'High';
  } else if (probability >= r) {
    riskTier = 'Medium';
  }

  // 8. Extract Top Risk and Protective Factors
  const riskFactors = contributions
    .filter((c) => c.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 5);

  const protectiveFactors = contributions
    .filter((c) => c.contribution < 0)
    .sort((a, b) => a.contribution - b.contribution)
    .slice(0, 5);

  return {
    probability: Number(probability.toFixed(6)),
    probability_pct: probabilityPct,
    risk_tier: riskTier,
    baseline_severe_rate: Number(r.toFixed(4)),
    baseline_severe_rate_pct: Number((r * 100).toFixed(2)),
    risk_multiplier: Number((probability / r).toFixed(2)),
    logit_score: Number(logit.toFixed(4)),
    top_risk_factors: riskFactors,
    top_protective_factors: protectiveFactors,
  };
}

/**
 * Returns available feature schema for frontend dynamic form rendering.
 */
export function getModelSchema() {
  const model = getRiskModelJson();
  return {
    metadata: model.metadata,
    schema: model.feature_schema,
    thresholds: model.risk_classification,
    performance: model.test_performance,
  };
}
