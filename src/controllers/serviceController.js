import { serviceService } from '../services/serviceService.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

/**
 * POST /services
 * Create customer service appointment
 */
export const createService = async (req, res, next) => {
  try {
    const data = await serviceService.createService(req.body);
    return sendSuccess(res, data, 'สร้างนัดหมายสำเร็จ', 201);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode, error.code, error.details);
    }
    next(error);
  }
};

/**
 * PATCH /services/:id/status
 * Toggle or update service status
 */
export const updateServiceStatus = async (req, res, next) => {
  try {
    const data = await serviceService.updateStatus(req.params.id, req.body.status);
    return sendSuccess(res, data, 'อัปเดตสถานะบริการสำเร็จ');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode, error.code, error.details);
    }
    next(error);
  }
};

/**
 * DELETE /services/:id
 * Delete a service appointment
 */
export const deleteService = async (req, res, next) => {
  try {
    const data = await serviceService.deleteService(req.params.id);
    return sendSuccess(res, data, 'ลบนัดหมายบริการสำเร็จ');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode, error.code, error.details);
    }
    next(error);
  }
};

/**
 * GET /services
 * List services
 */
export const getServices = async (req, res, next) => {
  try {
    const data = await serviceService.getServices(req.query);
    return sendSuccess(res, data, 'ดึงรายการบริการสำเร็จ');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode, error.code, error.details);
    }
    next(error);
  }
};
