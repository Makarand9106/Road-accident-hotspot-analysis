import { Router } from 'express';
import { listAccidents, getStats, getTrends } from '../controllers/accidentController.js';

const router = Router();

router.get('/accidents', listAccidents);
router.get('/accidents/stats', getStats);
router.get('/accidents/trends', getTrends);

export default router;
