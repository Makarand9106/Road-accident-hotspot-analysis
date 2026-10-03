import { Router } from 'express';
import { getMetrics, scoreScenario } from '../controllers/predictController.js';

const router = Router();

router.get('/model/metrics', getMetrics);
router.post('/predict', scoreScenario);

export default router;
