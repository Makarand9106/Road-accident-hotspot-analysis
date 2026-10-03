import { Router } from 'express';
import { getRiskOverview } from '../controllers/riskController.js';

const router = Router();

router.get('/risk', getRiskOverview);

export default router;
