/**
 * Standard Success Response Format
 * Follows API_REQUIREMENTS.md envelope:
 * {
 *   "success": true,
 *   "data": {},
 *   "message": "...",
 *   "meta": { ... }
 * }
 */
export const sendSuccess = (res, data = null, message = 'Success', status = 200, meta = null) => {
  const responseBody = {
    success: true,
    status,
    message,
    data,
  };

  if (meta !== null) {
    responseBody.meta = meta;
  } else {
    responseBody.meta = {
      timestamp: new Date().toISOString(),
    };
  }

  return res.status(status).json(responseBody);
};

/**
 * Standard Error Response Format
 * Follows API_REQUIREMENTS.md error envelope:
 * {
 *   "success": false,
 *   "error": {
 *     "code": "ERROR_CODE",
 *     "message": "...",
 *     "details": [...]
 *   }
 * }
 */
export const sendError = (
  res,
  message = 'Error',
  status = 400,
  code = 'ERROR',
  details = null
) => {
  // If 4th argument was passed as errors array (legacy backward-compatibility):
  let resolvedCode = code;
  let resolvedDetails = details;
  if (Array.isArray(code) || (code !== null && typeof code === 'object')) {
    resolvedDetails = code;
    resolvedCode = 'ERROR';
  }

  const responseBody = {
    success: false,
    status,
    message,
    error: {
      code: resolvedCode,
      message,
      ...(resolvedDetails ? { details: resolvedDetails } : {}),
    },
    ...(resolvedDetails ? { errors: resolvedDetails } : {}),
  };

  return res.status(status).json(responseBody);
};

/**
 * Standard Application Error with HTTP status code, business code, and optional details
 */
export class AppError extends Error {
  constructor(message, statusCode = 400, code = 'ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.errors = details;
  }
}
