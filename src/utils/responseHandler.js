/**
 * Standard Success Response Format
 */
export const sendSuccess = (res, data = null, message = 'Success', status = 200) => {
  return res.status(status).json({
    status,
    message,
    data,
  });
};

/**
 * Standard Error Response Format
 */
export const sendError = (res, message = 'Error', status = 400, errors = null) => {
  const responseBody = {
    status,
    message,
  };
  if (errors !== null) {
    responseBody.errors = errors;
  }
  return res.status(status).json(responseBody);
};
