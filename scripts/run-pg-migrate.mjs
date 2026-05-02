#!/usr/bin/env node
/**
 * Loads backend/.env, validates DATABASE_URL, then runs node-pg-migrate.
 * Avoids libpq defaulting the database name to your OS username (e.g. "siva") when URL has no DB path.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { normalizeDatabaseUrl } from '../src/db/normalizeDatabaseUrl.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(backendRoot, '.env') });

const dbUrl = normalizeDatabaseUrl(process.env.DATABASE_URL?.trim());
if (!dbUrl) {
  console.error(`
DATABASE_URL is not set.

  • Copy backend/.env.example → backend/.env
  • Set DATABASE_URL to a full connection string including the database name, e.g.:
      postgresql://USER:PASS@127.0.0.1:15432/dailykatha
  • If the URL has no database path, Postgres uses your OS login name as the DB (e.g. "siva") — that database usually does not exist.

Render: use the Internal / External Database URL from the dashboard as DATABASE_URL when running migrations.
`);
  process.exit(1);
}

function databaseNamePresent(urlStr) {
  try {
    const normalized = urlStr.replace(/^postgresql:/i, 'http:').replace(/^postgres:/i, 'http:');
    const u = new URL(normalized);
    const name = (u.pathname || '').replace(/^\//, '').split('/')[0];
    return Boolean(name);
  } catch {
    return false;
  }
}

if (!databaseNamePresent(dbUrl)) {
  console.error(`
DATABASE_URL must include a database name in the path (after the host/port).

  Bad:  postgresql://user:pass@localhost:5432
  Good: postgresql://user:pass@localhost:5432/dailykatha
`);
  process.exit(1);
}

const cmd = process.argv[2] || 'up';
const migrateBin = path.join(backendRoot, 'node_modules', 'node-pg-migrate', 'bin', 'node-pg-migrate.js');
const extra = process.argv.slice(3);

const result = spawnSync(process.execPath, [migrateBin, cmd, ...extra], {
  cwd: backendRoot,
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status === null ? 1 : result.status);
