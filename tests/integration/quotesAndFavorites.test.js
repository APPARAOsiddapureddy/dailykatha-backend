import jwt from 'jsonwebtoken';
import request from 'supertest';
import { pool } from '../../src/config/database.js';
import app from '../../src/app.js';

describe('quotes + favorites integration', () => {
  let userId;
  let quoteId;

  beforeAll(async () => {
    await pool.query('TRUNCATE favorites, quotes RESTART IDENTITY CASCADE');
    await pool.query('TRUNCATE users RESTART IDENTITY CASCADE');

    const u = await pool.query(
      `INSERT INTO users (email) VALUES ('itest@dailykatha.local') RETURNING id`,
    );
    userId = u.rows[0].id;

    const qRow = await pool.query(
      `INSERT INTO quotes (category, mood, quote_en, author_en)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      ['spiritual', 'calm', 'Integration test quote', 'Tester'],
    );
    quoteId = qRow.rows[0].id;
  });

  function bearer() {
    return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { algorithm: 'HS256' });
  }

  test('GET /api/v1/quotes lists seeded quote', async () => {
    const res = await request(app).get('/api/v1/quotes').expect(200);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.quotes)).toBe(true);
  });

  test('GET /api/v1/quotes/:id', async () => {
    const res = await request(app).get(`/api/v1/quotes/${quoteId}`).expect(200);
    expect(res.body.quote.quote.en).toMatch(/Integration/);
  });

  test('GET /api/v1/quotes/random returns a quote when data exists', async () => {
    const res = await request(app).get('/api/v1/quotes/random').expect(200);
    expect(res.body.quote).toBeDefined();
    expect(typeof res.body.quote.id).toBe('number');
  });

  test('GET /api/v1/categories and moods', async () => {
    const cats = await request(app).get('/api/v1/categories').expect(200);
    expect(cats.body.categories).toContain('spiritual');
    const moods = await request(app).get('/api/v1/moods').expect(200);
    expect(moods.body.moods).toContain('calm');
  });

  test('GET /api/v1/search', async () => {
    const res = await request(app).get('/api/v1/search').query({ q: 'Integration' }).expect(200);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  test('POST/GET/DELETE favorites with JWT', async () => {
    const t = bearer();
    const post = await request(app)
      .post('/api/v1/favorites')
      .set('Authorization', `Bearer ${t}`)
      .send({ quote_id: quoteId })
      .expect(201);
    expect(post.body.created).toBe(true);

    const list = await request(app)
      .get('/api/v1/favorites')
      .set('Authorization', `Bearer ${t}`)
      .expect(200);
    expect(list.body.quotes.some((x) => x.id === quoteId)).toBe(true);

    const dup = await request(app)
      .post('/api/v1/favorites')
      .set('Authorization', `Bearer ${t}`)
      .send({ quote_id: quoteId })
      .expect(200);
    expect(dup.body.created).toBe(false);

    await request(app)
      .delete(`/api/v1/favorites/${quoteId}`)
      .set('Authorization', `Bearer ${t}`)
      .expect(204);

    await request(app)
      .get('/api/v1/favorites')
      .set('Authorization', `Bearer ${t}`)
      .expect(200);
  });
});
