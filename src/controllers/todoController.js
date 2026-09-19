import { todoService } from '../services/todoService.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

/**
 * POST /api/todos/shift
 * Record shift duty
 */
export const createShiftTodo = async (req, res, next) => {
  try {
    const formattedEvent = await todoService.createShiftTodo(req.body);
    return sendSuccess(res, formattedEvent, 'Shift todo created successfully', 201);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

/**
 * POST /api/todos/service
 * Record customer service task
 */
export const createServiceTodo = async (req, res, next) => {
  try {
    const formattedEvent = await todoService.createServiceTodo(req.body);
    return sendSuccess(res, formattedEvent, 'Service todo created successfully', 201);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};
