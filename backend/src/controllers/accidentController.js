/**
 * Accident Controller.
 */

import { getAccidents, getAccidentStats, getAccidentTrends } from '../services/accidentService.js';

export async function listAccidents(req, res, next) {
  try {
    const data = await getAccidents(req.query);
    return res.json({
      status: 'success',
      ...data,
    });
  } catch (err) {
    next(err);
  }
}

export async function getStats(req, res, next) {
  try {
    const stats = await getAccidentStats(req.query);
    return res.json({
      status: 'success',
      data: stats,
    });
  } catch (err) {
    next(err);
  }
}

export async function getTrends(req, res, next) {
  try {
    const trends = await getAccidentTrends(req.query);
    return res.json({
      status: 'success',
      data: trends,
    });
  } catch (err) {
    next(err);
  }
}
