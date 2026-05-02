#!/usr/bin/env node
/**
 * Smoke-check Neon / Postgres from DATABASE_URL.
 * Usage: DATABASE_URL=postgresql://... node scripts/test-db-connection.mjs
 */
import 'dotenv/config';
import pg from 'pg';
import { normalizeDatabaseUrl } from '../src/db/normalizeDatabaseUrl.js';

const { Pool } = pg;

const url = normalizeDatabaseUrl(process.env.DATABASE_URL);
if (!url) {
  console.error(JSON.stringify({ connection: 'failed', error: 'DATABASE_URL not set' }));
  process.exit(1);
}

const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 15000 });

try {
  await pool.query('SELECT 1');
  const otp = await pool.query('SELECT COUNT(*)::int AS c FROM otp_codes').catch(() => ({
    rows: [{ c: null }],
  }));
  const quotes = await pool.query('SELECT COUNT(*)::int AS c FROM quotes').catch(() => ({
    rows: [{ c: null }],
  }));
  const otpCount = otp.rows[0]?.c;
  const quoteCount = quotes.rows[0]?.c;

  console.log(
    JSON.stringify(
      {
        connection: 'success',
        otp_codes: otpCount,
        quotes: quoteCount,
        hint:
          quoteCount == null
            ? 'quotes table missing — run legacy SQL migrations + seed if using cards schema.'
            : undefined,
      },
      null,
      2,
    ),
  );
} catch (e) {
  console.error(
    JSON.stringify({
      connection: 'failed',
      code: e.code,
      message: e.message,
    }),
  );
  process.exit(1);
} finally {
  await pool.end();
}
