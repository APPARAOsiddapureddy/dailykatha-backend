import { query } from '../config/database.js';

export async function addFavorite(userId, quoteId) {
  const q = await query(
    `INSERT INTO favorites (user_id, quote_id) VALUES ($1, $2)
     ON CONFLICT (user_id, quote_id) DO NOTHING
     RETURNING quote_id`,
    [userId, quoteId],
  );
  return q.rows.length > 0;
}

export async function listFavorites(userId) {
  const r = await query(
    `SELECT q.*
     FROM favorites f
     INNER JOIN quotes q ON q.id = f.quote_id
     WHERE f.user_id = $1
     ORDER BY f.created_at DESC`,
    [userId],
  );
  return r.rows;
}

export async function removeFavorite(userId, quoteId) {
  const r = await query(
    `DELETE FROM favorites WHERE user_id = $1 AND quote_id = $2 RETURNING quote_id`,
    [userId, quoteId],
  );
  return (r.rows[0]?.quote_id ?? null) != null;
}
