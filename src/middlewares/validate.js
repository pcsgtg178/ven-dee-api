import { sendError } from '../utils/responseHandler.js';

/**
 * Middleware to validate request against a Zod schema
 * Formats errors conforming to API_REQUIREMENTS.md:
 * {
 *   "success": false,
 *   "error": {
 *     "code": "VALIDATION_ERROR",
 *     "message": "ข้อมูลใน Request Body ไม่ถูกต้องหรือไม่ครบถ้วน",
 *     "details": [
 *       { "field": "shiftType", "issue": "Required" }
 *     ]
 *   }
 * }
 * @param {import('zod').ZodSchema} schema
 */
export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (parsed.body) req.body = parsed.body;
    if (parsed.query && req.query) {
      try {
        req.query = parsed.query;
      } catch {
        Object.assign(req.query, parsed.query);
      }
    }
    if (parsed.params && req.params) {
      try {
        req.params = parsed.params;
      } catch {
        Object.assign(req.params, parsed.params);
      }
    }

    next();
  } catch (err) {
    if (err.errors) {
      const formattedErrors = err.errors.map((e) => ({
        field: e.path.join('.').replace(/^(body|query|params)\./, ''),
        issue: e.message,
        message: e.message,
      }));
      return sendError(
        res,
        'ข้อมูลใน Request ไม่ถูกต้องหรือไม่ครบถ้วน (Validation Error)',
        400,
        'VALIDATION_ERROR',
        formattedErrors
      );
    }
    return sendError(res, err.message || 'Validation Error', 400, 'VALIDATION_ERROR');
  }
};
