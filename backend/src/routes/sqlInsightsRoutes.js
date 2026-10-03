import { Router } from 'express';
import { listQueries, runQuery } from '../controllers/sqlInsightsController.js';

const router = Router();

router.get('/sql-insights', listQueries);
router.get('/sql-insights/:number', runQuery);

export default router;
