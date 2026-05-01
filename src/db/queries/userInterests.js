import { pool } from '../pool.js';

export async function getUserInterests(userId) {
  const result = await pool.query(
    `SELECT interest_id, rank
     FROM user_interests
     WHERE user_id = $1
     ORDER BY rank ASC`,
    [userId],
  );
  return result.rows.map((r) => r.interest_id);
}

export async function setUserInterests(userId, interestIds) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM user_interests WHERE user_id = $1', [userId]);
    for (let i = 0; i < interestIds.length; i++) {
      await client.query(
        `INSERT INTO user_interests (user_id, interest_id, rank)
         VALUES ($1, $2, $3)`,
        [userId, interestIds[i], i],
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

