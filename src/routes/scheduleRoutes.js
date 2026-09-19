import { Router } from 'express';
import { getActivities } from '../controllers/scheduleController.js';

const router = Router();

// GET /schedule/activities
router.get('/activities', getActivities);

export default router;
