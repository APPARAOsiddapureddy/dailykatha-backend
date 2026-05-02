import { Router } from 'express';
import { HttpError } from '../utils/errorHandler.js';
import { query } from '../db/pool.js';
import { mapCardRow } from '../utils/cardMapper.js';
import { invalidateUserFeedCache } from '../services/redis.js';

const router = Router();

const ALLOWED_LANGS = ['te', 'hi', 'ta', 'kn', 'ml', 'en'];

// GET /v1/cards/search?q=&lang=&category=&page=
router.get('/search', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q || q.length < 2) {
      return res.status(400).json({ error: { code: 'INVALID_QUERY', message: 'Query must be at least 2 characters' } });
    }

    const rawLang = req.lang || 'te';
    const lang = ALLOWED_LANGS.includes(rawLang) ? rawLang : 'te';
    const category = req.query.category ? String(req.query.category) : null;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;

    const like = `%${q}%`;

    const searchQuery = `
      WITH ranked AS (
        SELECT
          c.*,
          (
            COALESCE(similarity(unaccent(c.quote->>'${lang}'), unaccent($1)), 0) * 1.0 +
            COALESCE(similarity(unaccent(c.quote->>'en'), unaccent($1)), 0) * 0.5 +
            COALESCE(similarity(unaccent(c.quote->>'te'), unaccent($1)), 0) * 0.4 +
            COALESCE(similarity(unaccent(c.quote->>'hi'), unaccent($1)), 0) * 0.4 +
            COALESCE(similarity(unaccent(c.quote->>'ta'), unaccent($1)), 0) * 0.3 +
            COALESCE(similarity(unaccent(c.quote->>'kn'), unaccent($1)), 0) * 0.3 +
            COALESCE(similarity(unaccent(c.quote->>'ml'), unaccent($1)), 0) * 0.3
          ) AS relevance_score,
          CASE WHEN
            c.quote->>'${lang}' ILIKE $2
            OR c.quote->>'en' ILIKE $2
            OR c.quote->>'te' ILIKE $2
            OR c.quote->>'hi' ILIKE $2
          THEN 0.3 ELSE 0 END AS exact_boost
        FROM cards c
        WHERE c.is_active = true
          ${category ? 'AND c.category = $3' : ''}
          AND (
            similarity(unaccent(c.quote->>'${lang}'), unaccent($1)) > 0.1
            OR similarity(unaccent(c.quote->>'en'), unaccent($1)) > 0.1
            OR similarity(unaccent(c.quote->>'te'), unaccent($1)) > 0.1
            OR similarity(unaccent(c.quote->>'hi'), unaccent($1)) > 0.1
            OR c.quote->>'${lang}' ILIKE $2
            OR c.quote->>'en' ILIKE $2
            OR c.quote->>'te' ILIKE $2
            OR c.quote->>'hi' ILIKE $2
          )
      )
      SELECT *, (relevance_score + exact_boost) AS final_score
      FROM ranked
      WHERE (relevance_score + exact_boost) > 0.05
      ORDER BY final_score DESC, created_at DESC
      LIMIT $${category ? 4 : 3} OFFSET $${category ? 5 : 4}
    `;

    const params = category ? [q, like, category, limit, offset] : [q, like, limit, offset];
    const result = await query(searchQuery, params);

    const countQuery = `
      SELECT COUNT(*)::int FROM cards
      WHERE is_active = true
        ${category ? 'AND category = $3' : ''}
        AND (
          quote->>'${lang}' ILIKE $1
          OR quote->>'en' ILIKE $1
          OR quote->>'te' ILIKE $1
          OR quote->>'hi' ILIKE $1
          OR similarity(unaccent(quote->>'${lang}'), unaccent($2)) > 0.1
          OR similarity(unaccent(quote->>'en'), unaccent($2)) > 0.1
        )
    `;
    const countParams = category ? [like, q, category] : [like, q];
    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count, 10);

    res.json({
      cards: result.rows.map((r) => mapCardRow(r, lang)),
      query: q,
      lang,
      total,
      nextPage: offset + limit < total ? page + 1 : null,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT * FROM cards WHERE id = $1 AND is_active = TRUE`, [req.params.id]);
    if (!rows.length) throw new HttpError(404, 'NOT_FOUND', 'Card not found');
    res.json({ card: mapCardRow(rows[0], req.lang) });
  } catch (e) {
    next(e);
  }
});

const allowed = new Set(['liked', 'saved', 'shared', 'viewed', 'skipped']);

router.post('/:id/interact', async (req, res, next) => {
  try {
    const action = req.body?.action;
    if (!allowed.has(action)) throw new HttpError(400, 'INVALID_ACTION', 'Invalid action');
    const { rows: c0 } = await query(`SELECT id FROM cards WHERE id = $1 AND is_active = TRUE`, [req.params.id]);
    if (!c0.length) throw new HttpError(404, 'NOT_FOUND', 'Card not found');
    await query(`INSERT INTO interactions (user_id, card_id, action) VALUES ($1, $2, $3)`, [
      req.user.id,
      req.params.id,
      action,
    ]);
    await invalidateUserFeedCache(req.user.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
