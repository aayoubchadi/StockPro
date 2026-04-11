export const errorHandler = (error, _request, response, _next) => {
  const statusCode = error.status || (response.statusCode && response.statusCode !== 200 ? response.statusCode : 500);
  const errorCode = error.code || 'INTERNAL_SERVER_ERROR';
  const details = Array.isArray(error.details) ? error.details : [];
  const message =
    statusCode === 500 ? 'Internal server error' : error.message || 'Request failed';

  response.status(statusCode).json({
    error: {
      code: errorCode,
      message,
      details,
    },
  });
};
