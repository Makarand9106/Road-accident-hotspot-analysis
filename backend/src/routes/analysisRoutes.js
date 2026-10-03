import { Router } from 'express';
import {
  getTemporal,
  getEnvironment,
  getRoad,
  getSeverity,
  getVehicles,
} from '../controllers/analysisController.js';

const router = Router();

router.get('/analysis/temporal', getTemporal);
router.get('/analysis/environment', getEnvironment);
router.get('/analysis/road', getRoad);
router.get('/analysis/severity', getSeverity);
router.get('/analysis/vehicles', getVehicles);

export default router;
