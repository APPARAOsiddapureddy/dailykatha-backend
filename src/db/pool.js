import 'dotenv/config';
import pg from 'pg';
import { normalizeDatabaseUrl } from './normalizeDatabaseUrl.js';

const { Pool } = pg;

export { normalizeDatabaseUrl } from './normalizeDatabaseUrl.js';

function isTransientDbError(err) {
  const c = err?.code;
  const msg = String(err?.message || '');
  return (
    c === 'ECONNRESET' ||
    c === 'ETIMEDOUT' ||
    c === 'EPIPE' ||
    c === 'ECONNREFUSED' ||
    c === '57P01' ||
    msg.includes('ECONNRESET')
  );
}

const connectionString = normalizeDatabaseUrl(process.env.DATABASE_URL);

/** Tuned for Neon serverless + small Render instances (avoid stale pooled sockets). */
export const pool = new Pool({
  connectionString,
  max: Math.min(25, Math.max(1, Number(process.env.PG_POOL_MAX || 10))),
  idleTimeoutMillis: Number(process.env.PG_IDLE_MS || 10_000),
  connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS || 15_000),
  allowExitOnIdle: true,
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.code || err.errno, err.message);
});

/** Single SELECT 1 with one retry on transient disconnect (Neon idle close / ECONNRESET). */
export async function pingDb() {
  const run = () => pool.query('SELECT 1');
  try {
    await run();
  } catch (e) {
    if (isTransientDbError(e)) {
      await run();
      return;
    }
    throw e;
  }
}

export async function query(text, params) {
  return pool.query(text, params);
}
