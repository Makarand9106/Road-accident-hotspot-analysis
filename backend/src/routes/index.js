/**
 * Central API Router Index.
 * Mounts all sub-routers under /api.
 */

import { Router } from 'express';
import metaRoutes from './metaRoutes.js';
import accidentRoutes from './accidentRoutes.js';
import analysisRoutes from './analysisRoutes.js';
import hotspotRoutes from './hotspotRoutes.js';
import riskRoutes from './riskRoutes.js';
import sqlInsightsRoutes from './sqlInsightsRoutes.js';
import predictRoutes from './predictRoutes.js';

const router = Router();

router.use('/', metaRoutes);
router.use('/', accidentRoutes);
router.use('/', analysisRoutes);
router.use('/', hotspotRoutes);
router.use('/', riskRoutes);
router.use('/', sqlInsightsRoutes);
router.use('/', predictRoutes);

export default router;
