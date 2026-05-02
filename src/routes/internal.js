import { Router } from 'express';
import { Queue } from 'bullmq';
import { HttpError } from '../utils/errorHandler.js';
import { query } from '../db/pool.js';
import { redis } from '../services/redis.js';
import { validateGenerationJobPayload } from '../validation/jobSchema.js';

const router = Router();

router.post('/generation-jobs', async (req, res, next) => {
  try {
    if (!redis) return next(new HttpError(503, 'NO_REDIS', 'Redis not configured — generation queue unavailable'));
    const queue = new Queue('generation-queue', { connection: redis });
    const parsed = validateGenerationJobPayload(req.body ?? {});
    if (!parsed.success) {
      return next(new HttpError(400, 'INVALID_JOB', parsed.error.errors.map((e) => e.message).join('; ')));
    }

    const { rows } = await query(
      `INSERT INTO generation_jobs (status, input_payload, model)
       VALUES ('pending', $1::jsonb, $2)
       RETURNING id`,
      [JSON.stringify(parsed.data), 'claude-sonnet-4-20250514'],
    );
    const id = rows[0].id;
    await queue.add('generate', { jobId: id, payload: { ...parsed.data, jobId: id } }, { removeOnComplete: 100, removeOnFail: 50 });
    res.status(202).json({ id, status: 'pending' });
  } catch (e) {
    next(e);
  }
});

router.get('/generation-jobs/:id', async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT * FROM generation_jobs WHERE id = $1`, [req.params.id]);
    if (!rows.length) throw new HttpError(404, 'NOT_FOUND', 'Job not found');
    const j = rows[0];
    res.json({
      id: j.id,
      status: j.status,
      inputPayload: j.input_payload,
      outputCards: j.output_cards,
      error: j.error,
      model: j.model,
      createdAt: j.created_at,
      completedAt: j.completed_at,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
