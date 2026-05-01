import { env } from '../config/env.js';

/** For platforms like Render: reject plain HTTP when behind a TLS-terminating proxy. */
export function requireHttps(req, res, next) {
  const prod = env.nodeEnv === 'production' || env.environment === 'production';
  if (!prod) return next();

  const raw = req.get('x-forwarded-proto') || '';
  const proto = raw.split(',')[0].trim();
  if (proto === 'http') {
    return res.status(403).json({
      error: {
        code: 'HTTPS_REQUIRED',
        message: 'HTTPS is required',
        request_id: req.id || req.headers['x-request-id'],
      },
    });
  }
  return next();
}
