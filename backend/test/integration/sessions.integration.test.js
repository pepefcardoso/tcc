import request from 'supertest';
import app from '../../src/app.js';
import { pool } from '../../src/db.js';
import { signUserToken } from '../../src/utils/jwt.js';
import crypto from 'crypto';

describe('GET /api/sessions/:id Integration', () => {
  let athleteId;
  let sessionIdWithoutMetrics;
  let sessionIdWithMetrics;
  let atletaToken;

  beforeAll(async () => {
    atletaToken = signUserToken({ sub: crypto.randomUUID(), role: 'atleta' });
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE sessions CASCADE');

    const { rows: athleteRows } = await pool.query(
      `INSERT INTO athletes (name) VALUES ('GET Session Integration Test Athlete') RETURNING id`
    );
    athleteId = athleteRows[0].id;

    const { rows: session1Rows } = await pool.query(
      `INSERT INTO sessions (athlete_id, source_filename, sync_status, created_at)
       VALUES ($1, 'test_no_metrics.ndjson', 'processing', now()) RETURNING id`,
      [athleteId]
    );
    sessionIdWithoutMetrics = session1Rows[0].id;

    const { rows: session2Rows } = await pool.query(
      `INSERT INTO sessions (athlete_id, source_filename, sync_status, created_at, duration_minutes, pse, session_load)
       VALUES ($1, 'test_metrics.ndjson', 'processed', now(), 90, 8, 720) RETURNING id`,
      [athleteId]
    );
    sessionIdWithMetrics = session2Rows[0].id;

    await pool.query(
      `INSERT INTO session_metrics (session_id, total_distance_m, max_speed_kmh, sprint_count, player_load)
       VALUES ($1, 5000.5, 25.2, 5, 150.75)`,
      [sessionIdWithMetrics]
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM sessions WHERE athlete_id = $1', [athleteId]);
    await pool.query('DELETE FROM athletes WHERE id = $1', [athleteId]);
    await pool.end();
  });

  it('1. returns 401 if missing authorization header', async () => {
    const res = await request(app).get(`/api/sessions/${sessionIdWithMetrics}`);
    expect(res.status).toBe(401);
  });

  it('2. returns 404 for unknown session ID', async () => {
    const unknownId = crypto.randomUUID();
    const res = await request(app)
      .get(`/api/sessions/${unknownId}`)
      .set('Authorization', `Bearer ${atletaToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('session_not_found');
  });

  it('3. returns 200 with metrics: null when session has no metrics', async () => {
    const res = await request(app)
      .get(`/api/sessions/${sessionIdWithoutMetrics}`)
      .set('Authorization', `Bearer ${atletaToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(sessionIdWithoutMetrics);
    expect(res.body.athlete_id).toBe(athleteId);
    expect(res.body.metrics).toBeNull();
    expect(res.body.duration_minutes).toBeNull();
  });

  it('4. returns 200 with properly typed metrics when session has metrics', async () => {
    const res = await request(app)
      .get(`/api/sessions/${sessionIdWithMetrics}`)
      .set('Authorization', `Bearer ${atletaToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(sessionIdWithMetrics);
    expect(res.body.athlete_id).toBe(athleteId);
    expect(res.body.duration_minutes).toBe(90);
    expect(res.body.pse).toBe(8);
    expect(res.body.session_load).toBe(720);
    
    expect(res.body.metrics).toBeDefined();
    expect(res.body.metrics).not.toBeNull();
    expect(res.body.metrics.total_distance_m).toBe(5000.5);
    expect(res.body.metrics.max_speed_kmh).toBe(25.2);
    expect(res.body.metrics.sprint_count).toBe(5);
    expect(res.body.metrics.player_load).toBe(150.75);
  });

  it('5. returns 500 for malformed (non-UUID) session ID (known unguarded behavior)', async () => {
    const res = await request(app)
      .get(`/api/sessions/not-a-uuid`)
      .set('Authorization', `Bearer ${atletaToken}`);

    expect(res.status).toBe(500);
  });

  it('6. response shape includes all required top-level fields', async () => {
    const res = await request(app)
      .get(`/api/sessions/${sessionIdWithMetrics}`)
      .set('Authorization', `Bearer ${atletaToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('athlete_id');
    expect(res.body).toHaveProperty('started_at');
    expect(res.body).toHaveProperty('source_filename');
    expect(res.body).toHaveProperty('sync_status');
    expect(res.body).toHaveProperty('created_at');
    expect(res.body).toHaveProperty('duration_minutes');
    expect(res.body).toHaveProperty('pse');
    expect(res.body).toHaveProperty('session_load');
  });
});
