import { Router } from 'express';
import { randomUUID } from 'crypto';
import { pool } from '../db/pool.js';
import { invalidateAllFeedCaches } from '../services/redis.js';
import { generationQueue } from '../workers/generationWorker.js';
import { validateCard } from '../validation/cardSchema.js';
import { generateTodaysPicks } from '../services/todaysPicks.js';

const router = Router();

async function logAdminAction(adminId, action, targetType, targetId, payload) {
  try {
    await pool.query(
      `INSERT INTO admin_actions (admin_user_id, action, target_type, target_id, payload)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [adminId, action, targetType, targetId, JSON.stringify(payload || {})],
    );
  } catch (e) {
    console.error('Admin action log failed:', e.message);
  }
}

router.get('/dashboard', async (req, res, next) => {
  try {
    const [users, cards, interactions, jobs] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM cards WHERE is_active = true'),
      pool.query(
        `SELECT action, COUNT(*)::int AS count FROM interactions
         WHERE created_at > NOW() - INTERVAL '7 days'
         GROUP BY action`,
      ),
      pool.query(
        `SELECT status, COUNT(*)::int AS count FROM generation_jobs
         WHERE created_at > NOW() - INTERVAL '7 days'
         GROUP BY status`,
      ),
    ]);

    const topCards = await pool.query(
      `SELECT c.id, c.category, c.quote->>'te' as quote_te,
              COUNT(i.id)::int as like_count
       FROM cards c
       LEFT JOIN interactions i ON i.card_id = c.id AND i.action = 'liked'
       WHERE c.is_active = true
       GROUP BY c.id
       ORDER BY like_count DESC
       LIMIT 10`,
    );

    res.json({
      stats: {
        totalUsers: parseInt(users.rows[0].count, 10),
        totalCards: parseInt(cards.rows[0].count, 10),
        interactions7d: interactions.rows,
        generationJobs7d: jobs.rows,
      },
      topCards: topCards.rows,
    });
  } catch (e) {
    next(e);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 50;
    const offset = (page - 1) * limit;
    const search = String(req.query.search || '');
    const like = search ? `%${search}%` : '';

    const result = await pool.query(
      `SELECT u.*,
        COALESCE(
          json_agg(ui.interest_id ORDER BY ui.rank)
          FILTER (WHERE ui.interest_id IS NOT NULL), '[]'
        ) as interests
       FROM users u
       LEFT JOIN user_interests ui ON ui.user_id = u.id
       WHERE ($1 = '' OR u.phone ILIKE $1 OR u.name ILIKE $1)
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT $2 OFFSET $3`,
      [like, limit, offset],
    );

    const total = await pool.query(
      `SELECT COUNT(*) FROM users WHERE ($1 = '' OR phone ILIKE $1 OR name ILIKE $1)`,
      [like],
    );

    const totalN = parseInt(total.rows[0].count, 10);
    res.json({
      users: result.rows,
      total: totalN,
      page,
      nextPage: offset + limit < totalN ? page + 1 : null,
    });
  } catch (e) {
    next(e);
  }
});

router.get('/cards', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 50;
    const offset = (page - 1) * limit;
    const category = req.query.category ? String(req.query.category) : null;
    const isActive = String(req.query.active || 'true') !== 'false';

    const result = await pool.query(
      `SELECT * FROM cards
       WHERE is_active = $1
         AND ($2::text IS NULL OR category = $2)
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [isActive, category, limit, offset],
    );

    const total = await pool.query(
      `SELECT COUNT(*) FROM cards
       WHERE is_active = $1 AND ($2::text IS NULL OR category = $2)`,
      [isActive, category],
    );

    const totalN = parseInt(total.rows[0].count, 10);
    res.json({
      cards: result.rows,
      total: totalN,
      page,
      nextPage: offset + limit < totalN ? page + 1 : null,
    });
  } catch (e) {
    next(e);
  }
});

router.post('/cards', async (req, res, next) => {
  try {
    const { section, category, mood, isFestival, festival, quote, author } = req.body || {};

    const validation = validateCard({
      clientTempId: randomUUID(),
      section,
      category,
      mood,
      isFestival: !!isFestival,
      festival: festival || null,
      quote,
      author,
    });

    if (!validation.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_FAILED', message: 'Card data invalid', details: validation.error.errors },
      });
    }

    const result = await pool.query(
      `INSERT INTO cards
         (id, section, category, mood, is_festival, festival, quote, author, is_active)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, true)
       RETURNING *`,
      [
        section,
        category,
        mood,
        !!isFestival,
        festival || null,
        JSON.stringify(quote),
        JSON.stringify(author),
      ],
    );

    await invalidateAllFeedCaches();
    await logAdminAction(req.user.id, 'CREATE_CARD', 'card', result.rows[0].id, { category, mood });
    res.status(201).json({ card: result.rows[0] });
  } catch (e) {
    next(e);
  }
});

router.put('/cards/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { section, category, mood, isFestival, festival, quote, author, isActive } = req.body || {};

    const result = await pool.query(
      `UPDATE cards SET
         section = COALESCE($1, section),
         category = COALESCE($2, category),
         mood = COALESCE($3, mood),
         is_festival = COALESCE($4, is_festival),
         festival = COALESCE($5, festival),
         quote = COALESCE($6::jsonb, quote),
         author = COALESCE($7::jsonb, author),
         is_active = COALESCE($8, is_active)
       WHERE id = $9
       RETURNING *`,
      [
        section ?? null,
        category ?? null,
        mood ?? null,
        typeof isFestival === 'boolean' ? isFestival : null,
        festival ?? null,
        quote ? JSON.stringify(quote) : null,
        author ? JSON.stringify(author) : null,
        typeof isActive === 'boolean' ? isActive : null,
        id,
      ],
    );

    if (!result.rows.length) return res.status(404).json({ error: { code: 'CARD_NOT_FOUND', message: 'Card not found' } });
    await invalidateAllFeedCaches();
    await logAdminAction(req.user.id, 'UPDATE_CARD', 'card', id, req.body);
    res.json({ card: result.rows[0] });
  } catch (e) {
    next(e);
  }
});

router.delete('/cards/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE cards SET is_active = false WHERE id = $1', [id]);
    await invalidateAllFeedCaches();
    await logAdminAction(req.user.id, 'DELETE_CARD', 'card', id, {});
    res.json({ success: true, message: 'Card deactivated' });
  } catch (e) {
    next(e);
  }
});

router.post('/generate', async (req, res, next) => {
  try {
    const { interestIds, cardsRequested = 20, contentLanguage = 'te', religionId = null } = req.body || {};
    if (!Array.isArray(interestIds) || interestIds.length === 0) {
      return res.status(400).json({ error: { code: 'MISSING_INTERESTS', message: 'interestIds array required' } });
    }

    const jobId = randomUUID();
    const payload = {
      jobId,
      interestIds,
      contentLanguage,
      religionId,
      localDate: new Date().toISOString().slice(0, 10),
      timezone: 'Asia/Kolkata',
      occasions: [],
      constraints: {
        cardsRequested,
        maxCharsPerQuoteLine: 42,
        maxQuoteLines: 4,
        forbidCopyrightFilmQuotes: true,
        forbidRealPoliticianNames: true,
        forbidMedicalClaims: true,
      },
    };

    await pool.query(
      `INSERT INTO generation_jobs (id, status, input_payload)
       VALUES ($1, 'pending', $2::jsonb)`,
      [jobId, JSON.stringify(payload)],
    );

    await generationQueue.add('generate', { jobId, payload });
    await logAdminAction(req.user.id, 'TRIGGER_GENERATION', 'generation_job', jobId, { interestIds, cardsRequested });

    res.status(202).json({ message: 'Generation job queued', jobId, dbId: jobId });
  } catch (e) {
    next(e);
  }
});

router.get('/jobs', async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, status, input_payload, output_cards, error, model,
              created_at, completed_at
       FROM generation_jobs
       ORDER BY created_at DESC
       LIMIT 50`,
    );
    res.json({ jobs: result.rows });
  } catch (e) {
    next(e);
  }
});

router.get('/jobs/:id', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM generation_jobs WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: { code: 'JOB_NOT_FOUND', message: 'Job not found' } });
    res.json({ job: result.rows[0] });
  } catch (e) {
    next(e);
  }
});

router.post('/today-picks/generate', async (req, res, next) => {
  try {
    const result = await generateTodaysPicks();
    await logAdminAction(req.user.id, 'GENERATE_TODAY_PICKS', null, null, {});
    res.json({ message: "Today's picks generation triggered", result });
  } catch (e) {
    next(e);
  }
});

router.get('/actions', async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT aa.*, u.name as admin_name, u.phone as admin_phone
       FROM admin_actions aa
       LEFT JOIN users u ON u.id = aa.admin_user_id
       ORDER BY aa.created_at DESC
       LIMIT 100`,
    );
    res.json({ actions: result.rows });
  } catch (e) {
    next(e);
  }
});

export default router;

