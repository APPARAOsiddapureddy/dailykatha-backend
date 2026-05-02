import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import { errorHandler, getMetrics } from './middleware/errorHandler.js';
import { jwtAuth, internalKeyAuth } from './middleware/auth.js';
import { authLimiter, generalLimiter, internalLimiter } from './middleware/rateLimit.js';
import { languageMiddleware } from './middleware/language.js';
import { httpLogger } from './middleware/logger.js';
import { pingDb, pool } from './db/pool.js';
import { redis } from './services/redis.js';

import authPublic from './routes/auth.js';
import feedRoutes from './routes/feed.js';
import cardsRoutes from './routes/cards.js';
import usersRoutes from './routes/users.js';
import internalRoutes from './routes/internal.js';
import adminRoutes from './routes/admin.js';
import { adminAuth } from './middleware/adminAuth.js';
import { startCronJobs } from './services/cronJobs.js';

/** Short operator hints for /health (no secrets; does not log raw connection strings). */
function dbHealthDiagnostics(err) {
  const code = err?.code != null ? String(err.code) : 'UNKNOWN';
  const hints = {
    ECONNREFUSED: 'Cannot reach DB host:port — check DATABASE_URL and that the Neon project is not suspended.',
    ENOTFOUND:
      'DNS cannot resolve DB hostname — fix typo in DATABASE_URL, remove accidental quotes/newlines, use Neon pooler host (…-pooler…neon.tech).',
    ETIMEDOUT: 'DB connect timed out — use Neon pooler URL; check region / IP allowlist.',
    ECONNRESET: 'Connection reset during DB — prefer Neon pooler; ensure sslmode=require.',
    '28P01': 'Postgres auth failed — wrong user or password in DATABASE_URL (rotate in Neon if unsure).',
    '3D000': 'Database in URL path does not exist (e.g. /neondb must match your Neon DB name).',
  };
  return {
    code,
    hint: hints[code] || 'Open Render → Logs and search for "Health DB check failed".',
  };
}

function fatalUnlessEnv(name) {
  const v = process.env[name];
  if (v == null || String(v).trim() === '') {
    console.error(
      `FATAL: ${name} is required. Add it under Render → Environment for this Web Service (not only on a Postgres resource).`,
    );
    process.exit(1);
  }
}
fatalUnlessEnv('DATABASE_URL');
fatalUnlessEnv('JWT_SECRET');

const app = express();
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);

app.use(
  cors({
    origin: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'X-Internal-Key'],
  }),
);

app.use(express.json({ limit: '2mb' }));
app.use(httpLogger);

app.get('/health', async (_req, res) => {
  const base = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };

  try {
    await pingDb();
  } catch (err) {
    console.error('Health DB check failed:', err.code, err.message);
    return res.status(503).json({
      status: 'error',
      message: 'Service unavailable',
      db: 'error',
      db_diagnostics: dbHealthDiagnostics(err),
      redis: redis ? 'unknown' : 'disabled',
      ...base,
    });
  }

  let redisStatus = 'disabled';
  if (redis) {
    try {
      await redis.ping();
      redisStatus = 'connected';
    } catch (err) {
      // Redis is optional (cache/queues); do not fail liveness if DB is up.
      console.warn('Health Redis check failed:', err.code, err.message);
      redisStatus = 'error';
    }
  }

  res.json({
    status: 'ok',
    db: 'connected',
    redis: redisStatus,
    ...base,
  });
});

app.get('/metrics', (req, res) => {
  const key = req.headers['x-internal-key'];
  if (!key || key !== process.env.INTERNAL_API_KEY) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Internal access only' } });
  }
  res.json({
    errors: getMetrics(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  });
});

app.use('/v1/auth', authLimiter, authPublic);

app.use('/v1/internal', internalLimiter, internalKeyAuth, internalRoutes);

const authed = express.Router();
authed.use(generalLimiter);
authed.use(jwtAuth);
authed.use(languageMiddleware);
authed.use('/feed', feedRoutes);
authed.use('/cards', cardsRoutes);
authed.use('/users', usersRoutes);
authed.use('/admin', adminAuth, adminRoutes);

app.use('/v1', authed);

app.use(errorHandler);

const port = parseInt(process.env.PORT || '3000', 10);
const server = app.listen(port, () => {
  console.log(`Daily Katha API listening on :${port}`);
  startCronJobs();
});

function shutdown(signal) {
  console.log(`${signal} received — shutting down gracefully`);
  server.close(async () => {
    try {
      await pool.end();
    } catch (e) {
      console.warn('pool.end', e.message);
    }
    if (redis) {
      try {
        await redis.quit();
      } catch (e) {
        console.warn('redis.quit', e.message);
      }
    }
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
