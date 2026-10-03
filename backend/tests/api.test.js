/**
 * End-to-End API Integration & Smoke Test Suite.
 * Tests endpoints against PostgreSQL database and validates response structures.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import app from '../src/app.js';
import { closePool } from '../src/db/pool.js';

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await closePool();
});

test('GET /api/health - Returns 200 and database counts', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.status, 'ok');
  assert.equal(json.database.connected, true);
  assert.equal(json.database.counts.accidents, 513801);
  assert.equal(json.database.counts.hotspots, 704);
});

test('GET /api/meta/filters - Returns dropdown lookup lists', async () => {
  const res = await fetch(`${baseUrl}/api/meta/filters`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.status, 'success');
  assert.ok(Array.isArray(json.data.years));
  assert.ok(json.data.years.includes(2021));
  assert.ok(Array.isArray(json.data.police_forces));
  assert.ok(Array.isArray(json.data.weather_conditions));
});

test('GET /api/accidents/stats - Returns national baseline KPIs', async () => {
  const res = await fetch(`${baseUrl}/api/accidents/stats`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.status, 'success');
  assert.equal(json.data.total_collisions, 513801);
  assert.equal(json.data.total_severe_collisions, 124366);
  assert.equal(json.data.severe_percentage, 24.21);
  assert.equal(json.data.hotspots.total_national, 704);
});

test('GET /api/accidents/stats?severity=Fatal - Returns filtered stats', async () => {
  const res = await fetch(`${baseUrl}/api/accidents/stats?severity=Fatal`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.status, 'success');
  assert.equal(json.data.total_collisions, 7553);
  assert.equal(json.data.fatal_collisions, 7553);
});

test('GET /api/accidents/trends - Returns yearly and monthly series', async () => {
  const res = await fetch(`${baseUrl}/api/accidents/trends`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.status, 'success');
  assert.equal(json.data.yearly_trends.length, 5);
  assert.equal(json.data.monthly_trends.length, 60);
});

test('GET /api/accidents - Returns paginated accident records with cap', async () => {
  const res = await fetch(`${baseUrl}/api/accidents?limit=25&offset=0`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.status, 'success');
  assert.equal(json.accidents.length, 25);
  assert.equal(json.limit, 25);
  assert.equal(json.total, 513801);
});

test('GET /api/accidents - Hard limit 5000 enforced and flagged', async () => {
  const res = await fetch(`${baseUrl}/api/accidents?limit=99999`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.status, 'success');
  assert.equal(json.limit, 5000);
  assert.equal(json.is_truncated, true);
});

test('GET /api/analysis/temporal - Returns hourly, weekday, and 7x24 heatmap', async () => {
  const res = await fetch(`${baseUrl}/api/analysis/temporal`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.status, 'success');
  assert.equal(json.data.hourly.length, 24);
  assert.equal(json.data.weekday.length, 7);
  assert.equal(json.data.heatmap_7x24.length, 168);
});

test('GET /api/analysis/environment - Returns weather, surface, light splits', async () => {
  const res = await fetch(`${baseUrl}/api/analysis/environment`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.status, 'success');
  assert.ok(json.data.weather.length > 0);
  assert.ok(json.data.road_surface.length > 0);
  assert.ok(json.data.light_condition.length > 0);
});

test('GET /api/analysis/road - Returns road type and speed limit splits', async () => {
  const res = await fetch(`${baseUrl}/api/analysis/road`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.status, 'success');
  assert.ok(json.data.speed_limits.length > 0);
  assert.ok(json.data.road_types.length > 0);
});

test('GET /api/hotspots - Returns hotspot clusters with filters', async () => {
  const res = await fetch(`${baseUrl}/api/hotspots?risk_level=High&limit=10`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.status, 'success');
  assert.equal(json.hotspots.length, 10);
  assert.equal(json.hotspots[0].risk_level, 'High');
});

test('GET /api/hotspots/:id - Returns single hotspot details', async () => {
  const res = await fetch(`${baseUrl}/api/hotspots/1`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.status, 'success');
  assert.equal(json.data.hotspot_id, 1);
  assert.ok(json.data.accident_count > 0);
  assert.ok(Array.isArray(json.data.yearly_progression));
});

test('GET /api/risk - Returns regional safety ranking and top hotspots', async () => {
  const res = await fetch(`${baseUrl}/api/risk`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.status, 'success');
  assert.ok(json.data.regional_rankings.length > 0);
  assert.equal(json.data.top_10_hotspots.length, 10);
});

test('GET /api/sql-insights - Returns 20 stored analytical queries', async () => {
  const res = await fetch(`${baseUrl}/api/sql-insights`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.status, 'success');
  assert.equal(json.data.total_queries, 20);
  assert.equal(json.data.queries[0].query_number, 1);
});

test('GET /api/sql-insights/:number - Executes stored query #1', async () => {
  const res = await fetch(`${baseUrl}/api/sql-insights/1`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.status, 'success');
  assert.equal(json.data.query_number, 1);
  assert.ok(json.data.execution_time_ms >= 0);
  assert.equal(json.data.row_count, 15);
});

test('GET /api/model/metrics - Returns database metrics and active schema', async () => {
  const res = await fetch(`${baseUrl}/api/model/metrics`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.status, 'success');
  assert.equal(json.data.active_model.model_name, 'Logistic Regression Severity Risk Predictor');
  assert.ok(json.data.database_model_metrics['Logistic Regression']);
});

test('POST /api/predict - Validates and scores scenario', async () => {
  const body = {
    time_period: 'Night',
    day_of_week_name: 'Saturday',
    weather_condition_name: 'Snowing no high winds',
    road_surface_condition_name: 'Frost or ice',
    light_condition_name: 'Darkness - no lighting',
    road_type_name: 'Single carriageway',
    road_class_name: 'C',
    junction_detail_name: 'T or staggered junction',
    junction_control_name: 'Give way or uncontrolled',
    urban_rural_name: 'Rural',
    hour: 2,
    month: 1,
    speed_limit: 60,
    number_of_vehicles: 1,
    is_weekend: 1,
    involves_motorcycle: 1,
    involves_hgv: 0,
    involves_cyclist: 0,
  };

  const res = await fetch(`${baseUrl}/api/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.status, 'success');
  assert.ok(json.data.probability > 0.70);
  assert.equal(json.data.risk_tier, 'High');
  assert.ok(json.data.top_risk_factors.length > 0);
});

test('Error Handling - Invalid parameter returns HTTP 400', async () => {
  const res = await fetch(`${baseUrl}/api/accidents?severity=INVALID_VALUE`);
  assert.equal(res.status, 400);
  const json = await res.json();
  assert.equal(json.status, 'error');
  assert.equal(json.statusCode, 400);
  assert.ok(json.message.includes('Invalid severity'));
});

test('Error Handling - Unknown route returns HTTP 404', async () => {
  const res = await fetch(`${baseUrl}/api/non_existent_endpoint`);
  assert.equal(res.status, 404);
  const json = await res.json();
  assert.equal(json.status, 'error');
  assert.equal(json.statusCode, 404);
});
