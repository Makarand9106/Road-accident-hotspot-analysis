/**
 * Filter Parser Unit Tests.
 * Tests parameter validation, bounds checking, SQL injection defense, and WHERE clause generation.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAccidentFilters } from '../src/utils/filters.js';
import { ApiError } from '../src/utils/errors.js';

test('Filter Parser - Default / Empty Query', () => {
  const { whereClause, values } = buildAccidentFilters({});
  assert.equal(whereClause, '');
  assert.deepEqual(values, []);
});

test('Filter Parser - Valid Year Range', () => {
  const { whereClause, values } = buildAccidentFilters({ year_from: '2022', year_to: '2024' });
  assert.equal(whereClause, 'WHERE a.accident_year >= $1 AND a.accident_year <= $2');
  assert.deepEqual(values, [2022, 2024]);
});

test('Filter Parser - Invalid Year Range (year_from > year_to)', () => {
  assert.throws(
    () => buildAccidentFilters({ year_from: '2024', year_to: '2021' }),
    (err) => err instanceof ApiError && err.statusCode === 400
  );
});

test('Filter Parser - Severity Whitelist', () => {
  const fatalRes = buildAccidentFilters({ severity: 'Fatal' });
  assert.equal(fatalRes.whereClause, 'WHERE a.severity_id = 1');

  const severeRes = buildAccidentFilters({ severity: 'Severe' });
  assert.equal(severeRes.whereClause, 'WHERE a.is_severe = 1');

  assert.throws(
    () => buildAccidentFilters({ severity: 'Catastrophic' }),
    (err) => err instanceof ApiError && err.statusCode === 400
  );
});

test('Filter Parser - Speed Limit Whitelist', () => {
  const spdRes = buildAccidentFilters({ speed_limit: '30' });
  assert.equal(spdRes.whereClause, 'WHERE a.speed_limit = $1');
  assert.deepEqual(spdRes.values, [30]);

  assert.throws(
    () => buildAccidentFilters({ speed_limit: '95' }),
    (err) => err instanceof ApiError && err.statusCode === 400
  );
});

test('Filter Parser - Time Period Whitelist', () => {
  const tpRes = buildAccidentFilters({ time_period: 'Morning Peak' });
  assert.equal(tpRes.whereClause, 'WHERE a.time_period = $1');
  assert.deepEqual(tpRes.values, ['Morning Peak']);

  assert.throws(
    () => buildAccidentFilters({ time_period: 'Midnight Rush' }),
    (err) => err instanceof ApiError && err.statusCode === 400
  );
});

test('Filter Parser - SQL Injection Attempt in string parameters', () => {
  // Attempt with quote / semicolon injection
  assert.throws(
    () => buildAccidentFilters({ police_force: "Metropolitan Police'; DROP TABLE accident;--" }),
    (err) => err instanceof ApiError && err.statusCode === 400
  );

  assert.throws(
    () => buildAccidentFilters({ district: 'Westminster" OR 1=1--' }),
    (err) => err instanceof ApiError && err.statusCode === 400
  );
});

test('Filter Parser - Bounding Box Validation', () => {
  const bbox = { min_lat: '51.4', max_lat: '51.6', min_lon: '-0.2', max_lon: '0.1' };
  const res = buildAccidentFilters(bbox);
  assert.ok(res.whereClause.includes('a.has_valid_coords = TRUE'));
  assert.ok(res.whereClause.includes('a.latitude >= $1'));
  assert.deepEqual(res.values, [51.4, 51.6, -0.2, 0.1]);

  // Inverted bounding box
  assert.throws(
    () => buildAccidentFilters({ min_lat: '55.0', max_lat: '51.0', min_lon: '-0.2', max_lon: '0.1' }),
    (err) => err instanceof ApiError && err.statusCode === 400
  );
});
