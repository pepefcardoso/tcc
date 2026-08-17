import request from 'supertest';
import app from '../../src/app.js';
import { pool } from '../../src/db.js';
import { signUserToken } from '../../src/utils/jwt.js';
import crypto from 'crypto';

describe('PSE Integration', () => {
  let athleteId;
  let sessionId;
  let atletaToken;
  let invalidToken;

  beforeAll(async () => {
    atletaToken = signUserToken({ sub: crypto.randomUUID(), role: 'atleta' });
    invalidToken = signUserToken({ sub: crypto.randomUUID(), role: 'admin' });
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE sessions CASCADE');

    const { rows: athleteRows } = await pool.query(
      `INSERT INTO athletes (name) VALUES ('PSE Integration Test Athlete') RETURNING id`
    );
    athleteId = athleteRows[0].id;

    const { rows: sessionRows } = await pool.query(
      `INSERT INTO sessions (athlete_id, source_filename, sync_status, duration_minutes, created_at)
       VALUES ($1, 'pse_test.ndjson', 'processed', 90, now()) RETURNING id`,
      [athleteId]
    );
    sessionId = sessionRows[0].id;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM sessions WHERE athlete_id = $1', [athleteId]);
    await pool.query('DELETE FROM athletes WHERE id = $1', [athleteId]);
    await pool.end();
  });

  it('updates PSE and session_load correctly on valid request', async () => {
    const res = await request(app)
      .patch(`/api/sessions/${sessionId}/pse`)
      .set('Authorization', `Bearer ${atletaToken}`)
      .send({ pse: 7 });

    expect(res.status).toBe(200);
    expect(res.body.session_id).toBe(sessionId);
    expect(res.body.pse).toBe(7);
    expect(res.body.session_load).toBe(630);
    expect(res.body.acwr).toEqual({ value: null, zone: null });

    const { rows } = await pool.query('SELECT pse, session_load FROM sessions WHERE id = $1', [
      sessionId,
    ]);
    expect(rows[0].pse).toBe(7);
    expect(parseFloat(rows[0].session_load)).toBe(630);
  });

  it('returns 422 invalid_pse_range when PSE is out of range', async () => {
    const res = await request(app)
      .patch(`/api/sessions/${sessionId}/pse`)
      .set('Authorization', `Bearer ${atletaToken}`)
      .send({ pse: 11 });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('validation_error');

    const { rows } = await pool.query('SELECT pse, session_load FROM sessions WHERE id = $1', [
      sessionId,
    ]);
    expect(rows[0].pse).toBeNull();
  });

  it('returns 404 for unknown session ID', async () => {
    const unknownId = crypto.randomUUID();
    const res = await request(app)
      .patch(`/api/sessions/${unknownId}/pse`)
      .set('Authorization', `Bearer ${atletaToken}`)
      .send({ pse: 5 });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('session_not_found');
  });

  it('returns 403 for unauthorized role', async () => {
    const res = await request(app)
      .patch(`/api/sessions/${sessionId}/pse`)
      .set('Authorization', `Bearer ${invalidToken}`)
      .send({ pse: 7 });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('forbidden');
  });

  it('returns real ACWR zone when athlete has prior session loads', async () => {
    await pool.query(
      `INSERT INTO sessions (athlete_id, source_filename, sync_status, duration_minutes, pse, session_load, started_at, created_at)
       VALUES 
       ($1, 'past1.ndjson', 'processed', 90, 10, 900, now() - interval '25 days', now()),
       ($1, 'past2.ndjson', 'processed', 90, 8, 720, now() - interval '14 days', now()),
       ($1, 'past3.ndjson', 'processed', 90, 8, 720, now() - interval '5 days', now())`,
      [athleteId]
    );

    const res = await request(app)
      .patch(`/api/sessions/${sessionId}/pse`)
      .set('Authorization', `Bearer ${atletaToken}`)
      .send({ pse: 8 });

    expect(res.status).toBe(200);

    expect(res.body.session_load).toBe(720);

    expect(res.body.acwr).toBeDefined();
    expect(typeof res.body.acwr.value).toBe('number');
    expect(res.body.acwr.value).toBeGreaterThan(0);
    expect(['blue', 'green', 'yellow', 'red']).toContain(res.body.acwr.zone);
  });
});
