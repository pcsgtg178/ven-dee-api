import { Router } from 'express';
import { getMonthlyQuota } from '../controllers/analyticsController.js';

const router = Router();

// GET /analytics/monthly-quota
router.get('/monthly-quota', getMonthlyQuota);

export default router;
