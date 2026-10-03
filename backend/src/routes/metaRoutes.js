import { Router } from 'express';
import { getHealth, getFilters } from '../controllers/metaController.js';

const router = Router();

router.get('/health', getHealth);
router.get('/meta/filters', getFilters);

export default router;
