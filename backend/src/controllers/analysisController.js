/**
 * Analysis Controller.
 */

import {
  getTemporalAnalysis,
  getEnvironmentalAnalysis,
  getRoadAnalysis,
  getSeverityAnalysis,
  getVehicleAnalysis,
} from '../services/analysisService.js';

export async function getTemporal(req, res, next) {
  try {
    const data = await getTemporalAnalysis(req.query);
    return res.json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
}

export async function getEnvironment(req, res, next) {
  try {
    const data = await getEnvironmentalAnalysis(req.query);
    return res.json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
}

export async function getRoad(req, res, next) {
  try {
    const data = await getRoadAnalysis(req.query);
    return res.json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
}

export async function getSeverity(req, res, next) {
  try {
    const data = await getSeverityAnalysis(req.query);
    return res.json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
}

export async function getVehicles(req, res, next) {
  try {
    const data = await getVehicleAnalysis(req.query);
    return res.json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
}
