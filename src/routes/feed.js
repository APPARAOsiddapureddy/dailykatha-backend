import { Router } from 'express';
import { pool } from '../db/pool.js';
import { getUserInterests } from '../db/queries/userInterests.js';
import { runRecommendationEngine } from '../recommendations/engine.js';
import { getCachedFeed, setCachedFeed } from '../recommendations/cache.js';
import { getUserTodaysPicks } from '../services/todaysPicks.js';

const router = Router();

// GET /v1/feed — personalised feed strictly filtered by user's selected categories
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const lang = req.lang;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
    const section = req.query.section || null;

    const interests = await getUserInterests(userId);
    if (interests.length === 0) {
      return res.json({
        cards: [],
        nextPage: null,
        total: 0,
        message: 'No interests selected. Please update your profile.',
      });
    }

    const cacheKey = `feed:${userId}:${page}:${limit}:${section || 'all'}`;
    const cached = await getCachedFeed(cacheKey);
    if (cached) return res.json(cached);

    const offset = (page - 1) * limit;
    const { cards, total } = await runRecommendationEngine({
      userId,
      interests,
      lang,
      section,
      limit,
      offset,
    });

    const response = {
      cards: cards.map((c) => formatCard(c, lang)),
      nextPage: offset + limit < total ? page + 1 : null,
      total,
      lang,
    };

    await setCachedFeed(cacheKey, response, 900);
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// GET /v1/feed/morning
router.get('/morning', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const lang = req.lang;
    const interests = await getUserInterests(userId);

    const morningInterests = interests.includes('goodmorning') ? interests : ['goodmorning', ...interests];

    const result = await pool.query(
      `SELECT * FROM cards
       WHERE category = ANY($1::text[])
         AND is_active = true
         AND id NOT IN (
           SELECT card_id FROM interactions
           WHERE user_id = $2 AND action = 'skipped'
         )
       ORDER BY created_at DESC
       LIMIT 20`,
      [morningInterests, userId],
    );

    res.json({
      cards: result.rows.map((c) => formatCard(c, lang)),
      section: 'morning',
    });
  } catch (err) {
    next(err);
  }
});

// GET /v1/feed/festival
router.get('/festival', async (req, res, next) => {
  try {
    const lang = req.lang;

    const result = await pool.query(
      `SELECT * FROM cards
       WHERE (category = 'festival' OR is_festival = true)
         AND is_active = true
       ORDER BY created_at DESC
       LIMIT 20`,
    );

    res.json({
      cards: result.rows.map((c) => formatCard(c, lang)),
      section: 'festival',
    });
  } catch (err) {
    next(err);
  }
});

// GET /v1/feed/explore — trending cards filtered by user interests
router.get('/explore', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const lang = req.lang;
    const category = req.query.category || null;
    const interests = await getUserInterests(userId);
    if (interests.length === 0 && !category) return res.json({ cards: [], section: 'trending', filteredBy: [] });

    const filterCategories = category ? [category] : interests;

    const cacheKey = `explore:${userId}:${category || 'all'}`;
    const cached = await getCachedFeed(cacheKey);
    if (cached) return res.json(cached);

    const result = await pool.query(
      `SELECT c.*, COUNT(i.id) as interaction_count
       FROM cards c
       LEFT JOIN interactions i ON i.card_id = c.id
         AND i.created_at > NOW() - INTERVAL '7 days'
         AND i.action IN ('liked', 'shared', 'saved')
       WHERE c.category = ANY($1::text[])
         AND c.is_active = true
       GROUP BY c.id
       ORDER BY interaction_count DESC, c.created_at DESC
       LIMIT 40`,
      [filterCategories],
    );

    const response = {
      cards: result.rows.map((c) => formatCard(c, lang)),
      section: 'trending',
      filteredBy: filterCategories,
    };

    await setCachedFeed(cacheKey, response, 300);
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// GET /v1/feed/today-picks — get today's personalized 5 picks for user
router.get('/today-picks', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const lang = req.lang;
    const picks = await getUserTodaysPicks({ userId, lang });
    res.json({ ...picks, lang, refreshesAt: 'midnight IST' });
  } catch (err) {
    next(err);
  }
});

function formatCard(card, lang) {
  const supportedLangs = ['te', 'hi', 'ta', 'kn', 'ml', 'en'];
  const resolvedLang = supportedLangs.includes(lang) ? lang : 'te';
  const fallbackLang = resolvedLang === 'en' ? 'te' : 'en';

  return {
    id: card.id,
    category: card.category,
    mood: card.mood,
    section: card.section,
    isFestival: card.is_festival,
    festival: card.festival,
    displayQuote: card.quote?.[resolvedLang] || card.quote?.en || '',
    displayAuthor: card.author?.[resolvedLang] || card.author?.en || '',
    subQuote: card.quote?.[fallbackLang] || '',
    quote: card.quote,
    author: card.author,
    lang: resolvedLang,
    createdAt: card.created_at,
  };
}

export default router;
