import cors from 'cors';
import { env } from '../config/env.js';

export const corsMiddleware = cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (env.corsWhitelist.length === 0) return cb(null, false);
    const allowed = env.corsWhitelist.includes(origin);
    return cb(null, allowed);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'X-Request-Id'],
  credentials: false,
});

