const errorCounts = new Map();

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const status = err.status || err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred';

  const key = `${status}:${code}`;
  errorCounts.set(key, (errorCounts.get(key) || 0) + 1);

  if (status >= 500) {
    console.error({
      error: err.message,
      code,
      stack: err.stack,
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      lang: req.lang,
      timestamp: new Date().toISOString(),
    });
  }

  res.status(status).json({
    error: {
      code,
      message: status >= 500 ? 'Internal server error' : message,
      ...(process.env.NODE_ENV === 'development' && err.stack ? { stack: err.stack } : {}),
    },
  });
}

export function getMetrics() {
  return Object.fromEntries(errorCounts);
}

export class HttpError extends Error {
  constructor(status, code, message, expose = true) {
    super(message);
    this.status = status;
    this.code = code;
    this.expose = expose;
  }
}
