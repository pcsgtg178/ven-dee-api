import { Router } from 'express';
import {
  createService,
  updateServiceStatus,
  deleteService,
  getServices,
} from '../controllers/serviceController.js';
import { validate } from '../middlewares/validate.js';
import {
  createServiceSchema,
  updateServiceStatusSchema,
  serviceIdParamSchema,
  getServicesQuerySchema,
} from '../validators/serviceValidator.js';

const router = Router();

// POST /services
router.post('/', validate(createServiceSchema), createService);

// GET /services
router.get('/', validate(getServicesQuerySchema), getServices);

// PATCH /services/:id/status
router.patch('/:id/status', validate(updateServiceStatusSchema), updateServiceStatus);

// DELETE /services/:id
router.delete('/:id', validate(serviceIdParamSchema), deleteService);

export default router;
