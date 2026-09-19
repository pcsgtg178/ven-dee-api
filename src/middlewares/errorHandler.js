import { sendError } from '../utils/responseHandler.js';

export const notFoundHandler = (req, res, next) => {
  return sendError(res, `Route not found - ${req.originalUrl}`, 404, 'NOT_FOUND');
};

export const errorHandler = (err, req, res, next) => {
  console.error('Unhandled Error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const details = err.details || err.errors || null;
  return sendError(res, message, status, code, details);
};
