import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function createIndexes() {
  const sql = fs.readFileSync(path.join(__dirname, 'migrations/004_indexes.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('DB indexes created successfully');
  } catch (err) {
    console.error('Index creation error:', err.message);
    throw err;
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && process.argv[1].endsWith('/indexes.js')) {
  createIndexes().catch(() => process.exit(1));
}

