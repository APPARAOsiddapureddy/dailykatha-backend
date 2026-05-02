import 'dotenv/config';
import { Queue, Worker } from 'bullmq';
import { pool } from '../db/pool.js';
import { generateCards } from '../services/claude.js';
import { validateAllCards } from '../validation/cardSchema.js';
import { redis, invalidateAllFeedCaches } from '../services/redis.js';

if (!redis) {
  console.error(
    '[worker] REDIS_URL is not set — BullMQ needs Redis. Start worker only when Redis is configured.',
  );
  process.exit(0);
}

function bigrams(s) {
  const t = String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  const m = new Map();
  for (let i = 0; i < t.length - 1; i++) {
    const bg = t.slice(i, i + 2);
    m.set(bg, (m.get(bg) || 0) + 1);
  }
  return m;
}

function jaccardBigram(a, b) {
  const A = bigrams(a);
  const B = bigrams(b);
  let inter = 0;
  let union = 0;
  const keys = new Set([...A.keys(), ...B.keys()]);
  for (const k of keys) {
    const va = A.get(k) || 0;
    const vb = B.get(k) || 0;
    inter += Math.min(va, vb);
    union += Math.max(va, vb);
  }
  return union === 0 ? 0 : inter / union;
}

async function isNearDuplicate(quoteEn, category) {
  const result = await pool.query(
    `SELECT quote->>'en' as en_quote
     FROM cards
     WHERE category = $1
       AND created_at > NOW() - INTERVAL '30 days'
       AND is_active = true
     LIMIT 200`,
    [category],
  );
  for (const row of result.rows) {
    const similarity = jaccardBigram(quoteEn, row.en_quote || '');
    if (similarity > 0.65) return true;
  }
  return false;
}

export const generationQueue = new Queue('generation-queue', { connection: redis });

export const worker = new Worker(
  'generation-queue',
  async (job) => {
    const { jobId, payload } = job.data || {};
    if (!jobId) throw new Error('jobId is required');

    await pool.query(`UPDATE generation_jobs SET status = 'running' WHERE id = $1`, [jobId]);

    let rawOutput;
    try {
      rawOutput = await generateCards(payload);
    } catch (err) {
      await pool.query(
        `UPDATE generation_jobs
         SET status = 'failed',
             error = $1,
             completed_at = NOW()
         WHERE id = $2`,
        [JSON.stringify({ code: 'CLAUDE_API_ERROR', message: err.message }), jobId],
      );
      throw err;
    }

    const { valid, invalid } = validateAllCards(rawOutput.cards || []);

    const accepted = [];
    const rejected = [];
    for (const card of valid) {
      const isDup = await isNearDuplicate(card.quote.en, card.category);
      if (isDup) rejected.push({ card, reason: 'near-duplicate' });
      else accepted.push(card);
    }

    const insertedIds = [];
    for (const card of accepted) {
      const result = await pool.query(
        `INSERT INTO cards
           (id, section, category, mood, is_festival, festival, quote, author, is_active)
         VALUES
           (gen_random_uuid(), $1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, true)
         RETURNING id`,
        [
          card.section,
          card.category,
          card.mood,
          card.isFestival,
          card.festival,
          JSON.stringify(card.quote),
          JSON.stringify(card.author),
        ],
      );
      insertedIds.push(result.rows[0].id);
    }

    await invalidateAllFeedCaches();

    await pool.query(
      `UPDATE generation_jobs
       SET status = 'completed',
           output_cards = $1::jsonb,
           completed_at = NOW(),
           model = $2
       WHERE id = $3`,
      [
        JSON.stringify({
          totalRequested: payload?.constraints?.cardsRequested,
          totalValid: valid.length,
          totalInvalid: invalid.length,
          totalDuplicates: rejected.length,
          totalInserted: insertedIds.length,
          insertedIds,
          invalidSamples: invalid.slice(0, 5),
        }),
        rawOutput.model,
        jobId,
      ],
    );

    return { inserted: insertedIds.length, rejected: rejected.length };
  },
  { connection: redis, concurrency: 2 },
);

worker.on('failed', (job, err) => {
  console.error(`Generation job ${job?.id} failed:`, err.message);
});

