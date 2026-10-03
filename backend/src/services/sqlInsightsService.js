/**
 * SQL Insights Service Layer.
 * Exposes the 20 DBMS course analytical queries and executes stored queries safely.
 */

import { query } from '../db/pool.js';
import { getAnalyticalQueries, getAnalyticalQueryByNumber } from '../utils/sqlParser.js';
import { badRequest, notFound } from '../utils/errors.js';

/**
 * List all 20 course analytical queries with descriptions and SQL text.
 */
export function listAnalyticalQueries() {
  const queries = getAnalyticalQueries();
  return {
    total_queries: queries.length,
    queries: queries.map((q) => ({
      query_number: q.query_number,
      title: q.title,
      question: q.question,
      concepts: q.concepts,
      why_it_matters: q.why_it_matters,
      viva_explanation: q.viva_explanation,
      sql: q.sql,
    })),
  };
}

/**
 * Execute a single predefined stored query by number (1 to 20).
 * Never accepts or executes arbitrary user SQL.
 * @param {number} queryNumber
 */
export async function executeStoredQuery(queryNumber) {
  const qNum = parseInt(queryNumber, 10);
  if (isNaN(qNum) || qNum < 1 || qNum > 20) {
    throw badRequest('Invalid query number. Must be an integer between 1 and 20.');
  }

  const queryObj = getAnalyticalQueryByNumber(qNum);
  if (!queryObj) {
    throw notFound(`Analytical query #${qNum} not found in database/analytical_queries.sql.`);
  }

  const start = performance.now();
  const res = await query(queryObj.sql);
  const elapsedMs = Number((performance.now() - start).toFixed(2));

  return {
    query_number: qNum,
    title: queryObj.title,
    question: queryObj.question,
    concepts: queryObj.concepts,
    viva_explanation: queryObj.viva_explanation,
    sql: queryObj.sql,
    execution_time_ms: elapsedMs,
    row_count: res.rows.length,
    rows: res.rows,
  };
}
