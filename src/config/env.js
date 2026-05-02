import dotenv from 'dotenv';

dotenv.config();

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function optional(name, fallback = undefined) {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

function optionalInt(name, fallback) {
  const raw = optional(name, undefined);
  if (raw === undefined) return fallback;
  const n = Number.parseInt(String(raw), 10);
  if (Number.isNaN(n)) return fallback;
  return n;
}

/**
 * DATABASE_URL / JWT_SECRET use getters so importing `env` (e.g. from logger) does not
 * throw before Node has finished loading — Render injects env after process start in some paths,
 * and server.js validates required vars explicitly after imports.
 */
export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  environment: optional('ENVIRONMENT', optional('NODE_ENV', 'development')),
  port: optionalInt('PORT', 3000),
  get databaseUrl() {
    return required('DATABASE_URL');
  },
  redisUrl: optional('REDIS_URL', null),
  get jwtSecret() {
    return required('JWT_SECRET');
  },
  corsWhitelist: optional('CORS_WHITELIST', '').split(',').map((s) => s.trim()).filter(Boolean),
  logLevel: optional('LOG_LEVEL', 'info'),
  sentryDsn: optional('SENTRY_DSN', null),
  apiRateLimit: optionalInt('API_RATE_LIMIT', 100),
  serviceName: optional('SERVICE_NAME', 'daily-katha-api'),
  version: optional('APP_VERSION', '0.0.0'),
};

