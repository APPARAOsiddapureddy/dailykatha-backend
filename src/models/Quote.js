import { query } from '../config/database.js';

export async function getQuoteById(id) {
  const r = await query('SELECT * FROM quotes WHERE id = $1', [id]);
  return r.rows[0] || null;
}

export async function listQuotes({ category, mood, section, limit, offset }) {
  const where = [];
  const params = [];
  let i = 1;

  if (category) {
    where.push(`category = $${i++}`);
    params.push(category);
  }
  if (mood) {
    where.push(`mood = $${i++}`);
    params.push(mood);
  }
  if (section) {
    where.push(`section = $${i++}`);
    params.push(section);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const count = await query(`SELECT COUNT(*)::int AS total FROM quotes ${whereSql}`, params);

  params.push(limit);
  params.push(offset);

  const rows = await query(
    `SELECT * FROM quotes ${whereSql} ORDER BY id DESC LIMIT $${i++} OFFSET $${i++}`,
    params,
  );

  return { total: count.rows[0]?.total || 0, rows: rows.rows };
}

export async function randomQuote({ category, mood, section }) {
  const where = [];
  const params = [];
  let i = 1;

  if (category) {
    where.push(`category = $${i++}`);
    params.push(category);
  }
  if (mood) {
    where.push(`mood = $${i++}`);
    params.push(mood);
  }
  if (section) {
    where.push(`section = $${i++}`);
    params.push(section);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const r = await query(`SELECT * FROM quotes ${whereSql} ORDER BY random() LIMIT 1`, params);
  return r.rows[0] || null;
}

export async function listCategories() {
  const r = await query('SELECT DISTINCT category FROM quotes ORDER BY category ASC');
  return r.rows.map((x) => x.category);
}

export async function listMoods() {
  const r = await query('SELECT DISTINCT mood FROM quotes ORDER BY mood ASC');
  return r.rows.map((x) => x.mood);
}

export async function searchQuotes({ q, limit, offset }) {
  const like = `%${q}%`;
  const count = await query(
    `SELECT COUNT(*)::int AS total
     FROM quotes
     WHERE quote_en ILIKE $1
        OR quote_te ILIKE $1
        OR quote_hi ILIKE $1
        OR quote_ta ILIKE $1
        OR quote_kn ILIKE $1
        OR quote_ml ILIKE $1`,
    [like],
  );
  const rows = await query(
    `SELECT *
     FROM quotes
     WHERE quote_en ILIKE $1
        OR quote_te ILIKE $1
        OR quote_hi ILIKE $1
        OR quote_ta ILIKE $1
        OR quote_kn ILIKE $1
        OR quote_ml ILIKE $1
     ORDER BY id DESC
     LIMIT $2 OFFSET $3`,
    [like, limit, offset],
  );

  return { total: count.rows[0]?.total || 0, rows: rows.rows };
}

