import { randomUUID } from 'crypto';

/**
 * Structured JSON request logging (Render-friendly).
 */
export function httpLogger(req, res, next) {
  if (req.path === '/health') return next();

  const requestId = randomUUID().slice(0, 8);
  req.requestId = requestId;
  const start = Date.now();

  res.on('finish', () => {
    const log = {
      timestamp: new Date().toISOString(),
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - start,
      lang: req.lang || '-',
      userId: req.user?.id ? String(req.user.id).slice(0, 8) : 'anon',
      ip: req.ip,
      ua: (req.get('user-agent') || '').slice(0, 120),
    };
    const line = JSON.stringify(log);
    if (res.statusCode >= 500) console.error(line);
    else if (res.statusCode >= 400) console.warn(line);
    else console.log(line);
  });

  next();
}
