/**
 * Risk Model Mathematical Parity Test Suite.
 * Loads models/test_vectors.json and verifies that pure JavaScript scoring
 * reproduces scikit-learn's exact predicted probabilities down to 6 decimal places.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { predictRisk, getRiskModelJson } from '../src/services/riskModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_VECTORS_PATH = path.resolve(__dirname, '../../models/test_vectors.json');

test('Risk Model - Verify 10 Test Vectors against Sklearn Parity', () => {
  assert.ok(fs.existsSync(TEST_VECTORS_PATH), `test_vectors.json must exist at: ${TEST_VECTORS_PATH}`);

  const raw = fs.readFileSync(TEST_VECTORS_PATH, 'utf-8');
  const testVectors = JSON.parse(raw);

  assert.equal(testVectors.length, 10, 'Must have exactly 10 test vectors');

  let maxDiff = 0.0;

  for (const vec of testVectors) {
    const res = predictRisk(vec.raw_input);
    const expected = vec.sklearn_predicted_probability;
    const diff = Math.abs(res.probability - expected);

    if (diff > maxDiff) maxDiff = diff;

    // Assert 6-decimal parity
    assert.ok(
      diff < 1e-6,
      `Scenario #${vec.scenario_id} (${vec.name}): Probability mismatch. Expected ${expected}, got ${res.probability} (Diff: ${diff})`
    );

    // Assert exact risk tier match
    assert.equal(
      res.risk_tier,
      vec.risk_tier,
      `Scenario #${vec.scenario_id}: Risk tier mismatch. Expected ${vec.risk_tier}, got ${res.risk_tier}`
    );

    // Assert valid factors returned
    assert.ok(Array.isArray(res.top_risk_factors), 'Must return top_risk_factors array');
    assert.ok(Array.isArray(res.top_protective_factors), 'Must return top_protective_factors array');
    assert.ok(res.probability >= 0.0 && res.probability <= 1.0, 'Probability must be in [0, 1]');
  }

  console.log(`[TEST PASSED] Pure JavaScript riskModel parity verified. Max difference: ${maxDiff.toExponential(2)}`);
});

test('Risk Model - Handle Missing / Empty Input Gracefully', () => {
  const res = predictRisk({});
  assert.ok(res.probability > 0.0 && res.probability < 1.0);
  assert.ok(['Low', 'Medium', 'High'].includes(res.risk_tier));
});

test('Risk Model - JSON Model Schema Loaded Properly', () => {
  const model = getRiskModelJson();
  assert.equal(model.metadata.model_name, 'Logistic Regression Severity Risk Predictor');
  assert.ok(typeof model.formula.intercept === 'number');
  assert.ok(Array.isArray(model.formula.ordered_features));
  assert.ok(model.formula.ordered_features.length > 30);
});
