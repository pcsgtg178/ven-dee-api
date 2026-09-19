import { Router } from 'express';
import {
  getShifts,
  createShift,
  updateShift,
  deleteShift,
  restoreShift,
  simulateQuotaImpact,
  swapShift,
  cancelSwap,
  getShiftChain,
} from '../controllers/shiftController.js';
import { validate } from '../middlewares/validate.js';
import {
  getShiftsQuerySchema,
  createShiftSchema,
  updateShiftSchema,
  shiftIdParamSchema,
  simulateQuotaSchema,
  swapShiftSchema,
  cancelSwapSchema,
  shiftChainSchema,
} from '../validators/shiftValidator.js';

const router = Router();

// 1. GET /shifts - List shifts
router.get('/', validate(getShiftsQuerySchema), getShifts);

// 2. POST /shifts - Create shift
router.post('/', validate(createShiftSchema), createShift);

// 3. POST /shifts/simulate-quota - Simulate quota
router.post('/simulate-quota', validate(simulateQuotaSchema), simulateQuotaImpact);

// 4. POST /shifts/:id/swap - Execute shift swap
router.post('/:id/swap', validate(swapShiftSchema), swapShift);

// 5. POST /shifts/:id/undo-swap & /shifts/:id/cancel-swap - Rollback swap
router.post('/:id/undo-swap', validate(cancelSwapSchema), cancelSwap);
router.post('/:id/cancel-swap', validate(cancelSwapSchema), cancelSwap);

// 6. GET /shifts/:id/swap-trail & /shifts/:id/chain - Audit timeline
router.get('/:id/swap-trail', validate(shiftChainSchema), getShiftChain);
router.get('/:id/chain', validate(shiftChainSchema), getShiftChain);

// 7. POST /shifts/:id/restore - Restore inactive shift
router.post('/:id/restore', validate(shiftIdParamSchema), restoreShift);

// 8. PUT /shifts/:id - Update shift
router.put('/:id', validate(updateShiftSchema), updateShift);

// 9. DELETE /shifts/:id - Delete shift (auto-restore parent)
router.delete('/:id', validate(shiftIdParamSchema), deleteShift);

export default router;
