import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../services/redis.js';

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
  handler: (_req, res) => {
    res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests. Slow down.' } });
  },
});

/** Only counts when ?refresh=1 on feed (bypass cache / recompute). */
export const feedRefreshLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.query.refresh !== '1' && req.query.refresh !== 'true',
  keyGenerator: (req) => `feedrefresh:${req.user?.id || req.ip}`,
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
  handler: (_req, res) => {
    res.status(429).json({
      error: { code: 'DAILY_LIMIT_REACHED', message: 'You have reached your 3 feed refreshes for today.' },
    });
  },
});

export const internalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.ip,
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
});

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
  handler: (_req, res) => {
    res.status(429).json({ error: { code: 'AUTH_RATE_LIMITED', message: 'Too many auth attempts.' } });
  },
});
