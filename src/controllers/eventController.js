import { eventService } from '../services/eventService.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

/**
 * GET /api/events
 * Get combined schedule events (Shift and Service) in FullCalendar Event Object format.
 * Supports date range filtering (start, end), includeSwapped toggle, and orders by createdAt descending.
 */
export const getEvents = async (req, res, next) => {
  try {
    const events = await eventService.getEvents(req.query);
    return sendSuccess(res, events, 'Events fetched successfully');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};
