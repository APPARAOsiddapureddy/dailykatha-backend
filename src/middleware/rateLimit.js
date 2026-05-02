import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const apiRateLimit = rateLimit({
  windowMs: 60_000,
  limit: env.apiRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
});

/** Same instance/limit as `apiRateLimit` — used by `server.js` for authenticated `/v1` routes. */
export const generalLimiter = apiRateLimit;

/** Public OTP/auth routes — tighter cap (aligned with legacy `routes/index.js`). */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
});

/** `/v1/internal` (key-authenticated). */
export const internalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

export const feedRefreshLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

