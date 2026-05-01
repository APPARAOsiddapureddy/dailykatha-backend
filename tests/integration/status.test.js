import request from 'supertest';
import app from '../../src/app.js';

describe('status', () => {
  test('GET /status', async () => {
    const res = await request(app).get('/status').expect(200);
    expect(typeof res.body.uptime).toBe('number');
    expect(typeof res.body.environment).toBe('string');
    expect(typeof res.body.version).toBe('string');
  });
});

