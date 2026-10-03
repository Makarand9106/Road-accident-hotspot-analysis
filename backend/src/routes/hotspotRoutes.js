import { Router } from 'express';
import { listHotspots, getSingleHotspot } from '../controllers/hotspotController.js';

const router = Router();

router.get('/hotspots', listHotspots);
router.get('/hotspots/:id', getSingleHotspot);

export default router;
