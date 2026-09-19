import { shiftService } from '../services/shiftService.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

/**
 * GET /shifts
 * Get list of shifts with filters
 */
export const getShifts = async (req, res, next) => {
  try {
    const data = await shiftService.getShifts(req.query);
    return sendSuccess(res, data, 'ดึงรายการเวรสำเร็จ');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode, error.code, error.details);
    }
    next(error);
  }
};

/**
 * POST /shifts
 * Create a new hospital shift
 */
export const createShift = async (req, res, next) => {
  try {
    const data = await shiftService.createShift(req.body);
    return sendSuccess(res, data, 'บันทึกเวรสำเร็จ', 201);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode, error.code, error.details);
    }
    next(error);
  }
};

/**
 * PUT /shifts/:id
 * Update shift department or note
 */
export const updateShift = async (req, res, next) => {
  try {
    const data = await shiftService.updateShift(req.params.id, req.body);
    return sendSuccess(res, data, 'แก้ไขข้อมูลเวรสำเร็จ');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode, error.code, error.details);
    }
    next(error);
  }
};

/**
 * DELETE /shifts/:id
 * Delete a shift (auto-restoring parent shift if applicable)
 */
export const deleteShift = async (req, res, next) => {
  try {
    const data = await shiftService.deleteShift(req.params.id);
    return sendSuccess(
      res,
      data,
      data.restoredParentId
        ? 'ลบเวรสำเร็จและกู้คืนเวรเดิมเรียบร้อยแล้ว'
        : 'ลบเวรสำเร็จ'
    );
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode, error.code, error.details);
    }
    next(error);
  }
};

/**
 * POST /shifts/:id/restore
 * Restore an inactive shift back to active
 */
export const restoreShift = async (req, res, next) => {
  try {
    const data = await shiftService.restoreShift(req.params.id);
    return sendSuccess(res, data, 'กู้คืนเวรสำเร็จ');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode, error.code, error.details);
    }
    next(error);
  }
};

/**
 * POST /shifts/simulate-quota
 * Simulate black shift quota impact
 */
export const simulateQuotaImpact = async (req, res, next) => {
  try {
    const data = await shiftService.simulateQuotaImpact(req.body);
    return sendSuccess(res, data, 'จำลองผลกระทบโควต้าสำเร็จ');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode, error.code, error.details);
    }
    next(error);
  }
};

/**
 * POST /shifts/:id/swap
 * Swap a shift with another person (supports multi-hop swap)
 */
export const swapShift = async (req, res, next) => {
  try {
    const data = await shiftService.swapShift(req.params.id, req.body);
    return sendSuccess(res, data, 'แลกเปลี่ยนเวรสำเร็จ', 201);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode, error.code, error.details);
    }
    next(error);
  }
};

/**
 * POST /shifts/:id/cancel-swap & POST /shifts/:id/undo-swap
 * Cancel a swap and restore the original parent shift
 */
export const cancelSwap = async (req, res, next) => {
  try {
    const data = await shiftService.cancelSwap(req.params.id, req.body);
    return sendSuccess(
      res,
      data,
      'ยกเลิกการแลกเวรสำเร็จ เวรเดิมของคุณได้รับการคืนสถานะแล้ว',
      200
    );
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode, error.code, error.details);
    }
    next(error);
  }
};

/**
 * GET /shifts/:id/chain & GET /shifts/:id/swap-trail
 * Returns full swap chain timeline (Swap Audit Trail)
 */
export const getShiftChain = async (req, res, next) => {
  try {
    const data = await shiftService.getShiftChain(req.params.id);
    return sendSuccess(res, data, 'ดึงประวัติเส้นทางการแลกเวรสำเร็จ');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode, error.code, error.details);
    }
    next(error);
  }
};
