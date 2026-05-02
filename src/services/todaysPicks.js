import { randomUUID } from 'crypto';
import { pool } from '../db/pool.js';
import { redis } from './redis.js';
import { generateCards } from './claude.js';
import { validateAllCards } from '../validation/cardSchema.js';
import { invalidateAllFeedCaches } from './redis.js';

export const ALL_INTERESTS = [
  'goodmorning',
  'goodnight',
  'love',
  'bhakti',
  'motivation',
  'festival',
  'family',
  'cinema',
  'heroes',
  'poetry',
  'friendship',
  'birthday',
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function secondsUntilMidnightIST() {
  const now = new Date();
  // IST = UTC+5:30
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffsetMs);
  const nextIstMidnight = new Date(istNow);
  nextIstMidnight.setUTCHours(18, 30, 0, 0); // 00:00 IST
  if (nextIstMidnight <= istNow) nextIstMidnight.setUTCDate(nextIstMidnight.getUTCDate() + 1);
  return Math.max(60, Math.floor((nextIstMidnight.getTime() - now.getTime()) / 1000));
}

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

export async function generateTodaysPicks({ interests = ALL_INTERESTS } = {}) {
  const date = todayISO();
  const results = { date, generated: [], failed: [] };

  for (const interestId of interests) {
    try {
      const { rows: existing } = await pool.query(
        `SELECT COUNT(*)::int AS n FROM todays_picks WHERE pick_date = $1 AND interest_id = $2`,
        [date, interestId],
      );
      if ((existing[0]?.n || 0) >= 5) {
        results.generated.push({ interestId, status: 'already_exists' });
        continue;
      }

      const payload = {
        jobId: randomUUID(),
        interestIds: [interestId],
        contentLanguage: 'te',
        religionId: null,
        localDate: date,
        timezone: 'Asia/Kolkata',
        occasions: [],
        constraints: {
          cardsRequested: 5,
          maxCharsPerQuoteLine: 42,
          maxQuoteLines: 4,
          forbidCopyrightFilmQuotes: true,
          forbidRealPoliticianNames: true,
          forbidMedicalClaims: true,
        },
      };

      const raw = await generateCards(payload);
      const { valid } = validateAllCards(raw.cards || []);
      if (!valid.length) throw new Error('No valid cards generated');

      const insertedIds = [];
      for (let i = 0; i < Math.min(5, valid.length); i++) {
        const c = valid[i];
        const r = await pool.query(
          `INSERT INTO cards
             (id, section, category, mood, is_festival, festival, quote, author, is_active)
           VALUES
             (gen_random_uuid(), $1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, true)
           RETURNING id`,
          [
            c.section,
            c.category,
            c.mood,
            c.isFestival || false,
            c.festival || null,
            JSON.stringify(c.quote),
            JSON.stringify(c.author),
          ],
        );
        const cardId = r.rows[0].id;
        insertedIds.push(cardId);
        await pool.query(
          `INSERT INTO todays_picks (pick_date, interest_id, card_id, rank, generation_score)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (pick_date, interest_id, rank) DO NOTHING`,
          [date, interestId, cardId, i + 1, c._score ?? 0],
        );
      }

      results.generated.push({ interestId, status: 'success', cardIds: insertedIds });
    } catch (e) {
      results.failed.push({ interestId, error: e.message });
    }
  }

  await invalidateAllFeedCaches();
  if (redis) {
    try {
      const keys = await redis.keys('todays_picks:*');
      if (keys.length) await redis.del(...keys);
    } catch {}
  }

  return results;
}

function distribution(interests) {
  if (interests.length <= 1) return [{ interestId: interests[0], count: 5 }];
  if (interests.length === 2) return [{ interestId: interests[0], count: 3 }, { interestId: interests[1], count: 2 }];
  return [
    { interestId: interests[0], count: 2 },
    { interestId: interests[1], count: 2 },
    { interestId: interests[2], count: 1 },
  ];
}

export async function getUserTodaysPicks({ userId, lang }) {
  const date = todayISO();
  const cacheKey = `todays_picks:${userId}:${date}:${lang}`;
  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  const { rows: irows } = await pool.query(
    `SELECT interest_id FROM user_interests WHERE user_id = $1 ORDER BY rank ASC`,
    [userId],
  );
  const interests = irows.map((r) => r.interest_id);

  const picks = [];
  const plan = interests.length ? distribution(interests) : [{ interestId: null, count: 5 }];

  for (const p of plan) {
    const q =
      p.interestId == null
        ? `SELECT c.*, tp.rank AS pick_rank, tp.interest_id AS pick_interest
           FROM todays_picks tp
           JOIN cards c ON c.id = tp.card_id
           WHERE tp.pick_date = $1 AND c.is_active = true
           ORDER BY tp.rank ASC LIMIT $2`
        : `SELECT c.*, tp.rank AS pick_rank, tp.interest_id AS pick_interest
           FROM todays_picks tp
           JOIN cards c ON c.id = tp.card_id
           WHERE tp.pick_date = $1 AND tp.interest_id = $2 AND c.is_active = true
           ORDER BY tp.rank ASC LIMIT $3`;
    const args =
      p.interestId == null ? [date, p.count] : [date, p.interestId, p.count];
    const { rows } = await pool.query(q, args);
    picks.push(...rows.map((c) => ({ ...formatCard(c, lang), pickRank: c.pick_rank, pickInterest: c.pick_interest })));
  }

  const out = { date, picks: picks.slice(0, 5), generatedFor: interests };

  // Track served picks (best effort)
  try {
    for (let i = 0; i < out.picks.length; i++) {
      const c = out.picks[i];
      await pool.query(
        `INSERT INTO user_todays_picks (user_id, pick_date, card_id, rank, interest_id, shown_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (user_id, pick_date, rank) DO UPDATE
           SET card_id = EXCLUDED.card_id, interest_id = EXCLUDED.interest_id, shown_at = NOW()`,
        [userId, date, c.id, i + 1, c.pickInterest],
      );
    }
  } catch {}

  if (redis) {
    await redis.set(cacheKey, JSON.stringify(out), 'EX', secondsUntilMidnightIST());
  }
  return out;
}

