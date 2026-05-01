import { toHttpError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';

/** Used by legacy `server.js` `/metrics` route. */
export function getMetrics() {
  return {};
}

export function errorHandler(err, req, res, _next) {
  const httpErr = toHttpError(err);
  const requestId = req.id || req.headers['x-request-id'];

  logger.error(
    {
      request_id: requestId,
      err,
      status: httpErr.status,
      code: httpErr.code,
      endpoint: req.originalUrl,
      method: req.method,
    },
    'request failed',
  );

  res.status(httpErr.status).json({
    error: {
      code: httpErr.code,
      message: httpErr.message,
      request_id: requestId,
      details: httpErr.details,
    },
  });
}

