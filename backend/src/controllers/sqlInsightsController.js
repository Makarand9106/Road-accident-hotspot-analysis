/**
 * SQL Insights Controller.
 */

import { listAnalyticalQueries, executeStoredQuery } from '../services/sqlInsightsService.js';

export async function listQueries(req, res, next) {
  try {
    const data = listAnalyticalQueries();
    return res.json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
}

export async function runQuery(req, res, next) {
  try {
    const data = await executeStoredQuery(req.params.number);
    return res.json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
}
