import request from 'supertest';
import app from '../../src/app.js';
import { pool } from '../../src/db.js';

describe('Integration: GET /health', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('1. returns 200 { status: "ok", db: "connected" } when DB is active', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'ok',
      db: 'connected',
    });
  });
});
