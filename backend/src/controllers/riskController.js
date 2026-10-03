/**
 * Risk & Regional Ranking Controller.
 */

import { getRegionalRiskRanking } from '../services/hotspotService.js';

export async function getRiskOverview(req, res, next) {
  try {
    const data = await getRegionalRiskRanking();
    return res.json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
}
