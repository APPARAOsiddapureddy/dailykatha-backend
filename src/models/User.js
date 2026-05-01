import { query } from '../config/database.js';

export async function findOrCreateUserByEmail(email) {
  const existing = await query('SELECT * FROM users WHERE email = $1', [email]);
  if (existing.rows.length) return existing.rows[0];
  const created = await query(
    `INSERT INTO users (email) VALUES ($1) RETURNING *`,
    [email],
  );
  return created.rows[0];
}

