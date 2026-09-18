import { sendError } from '../utils/responseHandler.js';

export const notFoundHandler = (req, res, next) => {
  return sendError(res, `Route not found - ${req.originalUrl}`, 404);
};

export const errorHandler = (err, req, res, next) => {
  console.error('Unhandled Error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  return sendError(res, message, status);
};
