import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const apiRateLimit = rateLimit({
  windowMs: 60_000,
  limit: env.apiRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
});

export const feedRefreshLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

