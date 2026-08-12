import request from 'supertest';
import app from '../../src/app.js';
import { pool } from '../../src/db.js';
import { signUserToken } from '../../src/utils/jwt.js';
import crypto from 'crypto';

describe('ACWR Integration (T-054)', () => {
  let athleteId;
  let userToken;

  beforeAll(() => {
    userToken = signUserToken({ sub: crypto.randomUUID(), role: 'tecnico' });
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE sessions CASCADE');
    await pool.query('TRUNCATE athletes CASCADE');

    const { rows: athleteRows } = await pool.query(
      `INSERT INTO athletes (name) VALUES ('ACWR Integration Test Athlete') RETURNING id`
    );
    athleteId = athleteRows[0].id;
  });

  afterAll(async () => {
    await pool.end();
  });

  it('1. returns 401 if missing token', async () => {
    const res = await request(app).get(`/api/athletes/${athleteId}/acwr`);
    expect(res.status).toBe(401);
  });

  it('2. returns 404 for non-existent UUID', async () => {
    const fakeId = crypto.randomUUID();
    const res = await request(app)
      .get(`/api/athletes/${fakeId}/acwr`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('athlete_not_found');
  });

  it('3. returns 200 with sufficient_history: false for athlete with no sessions', async () => {
    const res = await request(app)
      .get(`/api/athletes/${athleteId}/acwr`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      athlete_id: athleteId,
      acute_load: 0,
      chronic_load: 0,
      acwr: null,
      zone: null,
      sufficient_history: false,
    });
  });

  it('4. returns 200 with sufficient_history: false for athlete with sessions but no PSE', async () => {
    await pool.query(
      `INSERT INTO sessions (athlete_id, source_filename, sync_status, duration_minutes, started_at, created_at)
       VALUES ($1, 'test.ndjson', 'processed', 90, now(), now())`,
      [athleteId]
    );

    const res = await request(app)
      .get(`/api/athletes/${athleteId}/acwr`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      athlete_id: athleteId,
      acute_load: 0,
      chronic_load: 0,
      acwr: null,
      zone: null,
      sufficient_history: false,
    });
  });

  it('5. returns 200 with full >28-day history', async () => {
    await pool.query(
      `INSERT INTO sessions (athlete_id, source_filename, sync_status, duration_minutes, session_load, started_at, created_at)
       VALUES 
       ($1, 's1.ndjson', 'processed', 90, 100, now() - interval '2 days', now()),
       ($1, 's2.ndjson', 'processed', 90, 100, now() - interval '10 days', now()),
       ($1, 's3.ndjson', 'processed', 90, 100, now() - interval '18 days', now()),
       ($1, 's4.ndjson', 'processed', 90, 100, now() - interval '25 days', now())`,
      [athleteId]
    );

    const res = await request(app)
      .get(`/api/athletes/${athleteId}/acwr`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.athlete_id).toBe(athleteId);
    expect(res.body.acute_load).toBe(100);
    expect(res.body.chronic_load).toBe(100);
    expect(res.body.acwr).toBe(1.0);
    expect(res.body.zone).toBe('green');
    expect(res.body.sufficient_history).toBe(true);
  });

  it('6. returns 200 with partial history (7-27 days)', async () => {
    await pool.query(
      `INSERT INTO sessions (athlete_id, source_filename, sync_status, duration_minutes, session_load, started_at, created_at)
       VALUES 
       ($1, 's1.ndjson', 'processed', 90, 200, now() - interval '2 days', now()),
       ($1, 's2.ndjson', 'processed', 90, 200, now() - interval '10 days', now())`,
      [athleteId]
    );

    const res = await request(app)
      .get(`/api/athletes/${athleteId}/acwr`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.athlete_id).toBe(athleteId);
    expect(res.body.acute_load).toBe(200);
    expect(res.body.chronic_load).toBe(100);
    expect(res.body.acwr).toBe(2.0);
    expect(res.body.zone).toBe('red');
    expect(res.body.sufficient_history).toBe(true);
  });

  it('7. returns 200 and echoes correct athlete_id', async () => {
    const res = await request(app)
      .get(`/api/athletes/${athleteId}/acwr`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.athlete_id).toBe(athleteId);
  });
});
