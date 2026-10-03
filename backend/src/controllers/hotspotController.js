/**
 * Hotspot Controller.
 */

import { getHotspots, getHotspotById } from '../services/hotspotService.js';

export async function listHotspots(req, res, next) {
  try {
    const data = await getHotspots(req.query);
    return res.json({ status: 'success', ...data });
  } catch (err) {
    next(err);
  }
}

export async function getSingleHotspot(req, res, next) {
  try {
    const data = await getHotspotById(req.params.id);
    return res.json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
}
