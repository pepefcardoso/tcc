import request from 'supertest';
import app from '../../src/app.js';
import { pool } from '../../src/db.js';
import { signUserToken } from '../../src/utils/jwt.js';
import crypto from 'crypto';
import * as sessionRepository from '../../src/repositories/sessionRepository.js';

describe('GET /api/sessions/:id/samples Integration', () => {
  let athleteId;
  let sessionIdWithGps;
  let sessionIdWithoutGps;
  let atletaToken;

  beforeAll(async () => {
    atletaToken = signUserToken({ sub: crypto.randomUUID(), role: 'atleta' });
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE sessions CASCADE');
    await pool.query('TRUNCATE athletes CASCADE');

    const { rows: athleteRows } = await pool.query(
      `INSERT INTO athletes (name) VALUES ('Samples Integration Athlete') RETURNING id`
    );
    athleteId = athleteRows[0].id;

    const { rows: s1Rows } = await pool.query(
      `INSERT INTO sessions (athlete_id, source_filename, sync_status, created_at)
       VALUES ($1, 'test_with_gps.ndjson', 'processed', now()) RETURNING id`,
      [athleteId]
    );
    sessionIdWithGps = s1Rows[0].id;

    const { rows: s2Rows } = await pool.query(
      `INSERT INTO sessions (athlete_id, source_filename, sync_status, created_at)
       VALUES ($1, 'test_no_gps.ndjson', 'processed', now()) RETURNING id`,
      [athleteId]
    );
    sessionIdWithoutGps = s2Rows[0].id;

    const gpsSamples = [
      { time: '2023-11-15T10:00:00.000Z', latitude: -23.5505, longitude: -46.6333, speed_ms: 3.1 },
      { time: '2023-11-15T10:00:00.100Z', latitude: -23.5506, longitude: -46.6334, speed_ms: 3.2 },
      { time: '2023-11-15T10:00:00.200Z', latitude: -23.5507, longitude: -46.6335, speed_ms: 3.3 },
      { time: '2023-11-15T10:00:00.300Z', latitude: -23.5508, longitude: -46.6336, speed_ms: 3.4 },
      { time: '2023-11-15T10:00:00.400Z', latitude: -23.5509, longitude: -46.6337, speed_ms: 3.5 },
      { time: '2023-11-15T10:00:00.500Z', latitude: -23.5510, longitude: -46.6338, speed_ms: 3.6 },
      { time: '2023-11-15T10:00:00.600Z', latitude: -23.5511, longitude: -46.6339, speed_ms: 3.7 },
    ];

    await sessionRepository.insertGpsBatch(sessionIdWithGps, gpsSamples);
  });

  afterAll(async () => {
    await pool.query('TRUNCATE sessions CASCADE');
    await pool.query('TRUNCATE athletes CASCADE');
    await pool.end();
  });

  it('S1: No auth header returns 401', async () => {
    await request(app).get(`/api/sessions/${sessionIdWithGps}/samples`).expect(401);
  });

  it('S2: Unknown session ID returns 404', async () => {
    const unknownId = crypto.randomUUID();
    const res = await request(app)
      .get(`/api/sessions/${unknownId}/samples`)
      .set('Authorization', `Bearer ${atletaToken}`)
      .expect(404);

    expect(res.body.error).toBe('session_not_found');
  });

  it('S3: Valid session, no GPS samples returns empty array', async () => {
    const res = await request(app)
      .get(`/api/sessions/${sessionIdWithoutGps}/samples`)
      .set('Authorization', `Bearer ${atletaToken}`)
      .expect(200);

    expect(res.body.gps).toEqual([]);
  });

  it('S4: Valid session, 7 GPS samples, no downsample returns all 7', async () => {
    const res = await request(app)
      .get(`/api/sessions/${sessionIdWithGps}/samples`)
      .set('Authorization', `Bearer ${atletaToken}`)
      .expect(200);

    expect(res.body.gps).toHaveLength(7);
  });

  it('S5: Valid session, 7 GPS samples, ?downsample=2 returns 4 samples', async () => {
    const res = await request(app)
      .get(`/api/sessions/${sessionIdWithGps}/samples?downsample=2`)
      .set('Authorization', `Bearer ${atletaToken}`)
      .expect(200);

    expect(res.body.gps).toHaveLength(4);
    expect(res.body.gps[0].speed_ms).toBe(3.1);
    expect(res.body.gps[1].speed_ms).toBe(3.3);
    expect(res.body.gps[2].speed_ms).toBe(3.5);
    expect(res.body.gps[3].speed_ms).toBe(3.7);
  });

  it('S6: Valid session, 7 GPS samples, ?downsample=1 returns all 7', async () => {
    const res = await request(app)
      .get(`/api/sessions/${sessionIdWithGps}/samples?downsample=1`)
      .set('Authorization', `Bearer ${atletaToken}`)
      .expect(200);

    expect(res.body.gps).toHaveLength(7);
  });

  it('S7: ?downsample=0 returns 422', async () => {
    const res = await request(app)
      .get(`/api/sessions/${sessionIdWithGps}/samples?downsample=0`)
      .set('Authorization', `Bearer ${atletaToken}`)
      .expect(422);

    expect(res.body.error).toBe('validation_error');
  });

  it('S8: ?downsample=-1 returns 422', async () => {
    const res = await request(app)
      .get(`/api/sessions/${sessionIdWithGps}/samples?downsample=-1`)
      .set('Authorization', `Bearer ${atletaToken}`)
      .expect(422);

    expect(res.body.error).toBe('validation_error');
  });

  it('S9: ?downsample=abc returns 422', async () => {
    const res = await request(app)
      .get(`/api/sessions/${sessionIdWithGps}/samples?downsample=abc`)
      .set('Authorization', `Bearer ${atletaToken}`)
      .expect(422);

    expect(res.body.error).toBe('validation_error');
  });

  it('S10: ?downsample=2.5 returns 422', async () => {
    const res = await request(app)
      .get(`/api/sessions/${sessionIdWithGps}/samples?downsample=2.5`)
      .set('Authorization', `Bearer ${atletaToken}`)
      .expect(422);

    expect(res.body.error).toBe('validation_error');
  });

  it('S11: Response shape validation', async () => {
    const res = await request(app)
      .get(`/api/sessions/${sessionIdWithGps}/samples`)
      .set('Authorization', `Bearer ${atletaToken}`)
      .expect(200);

    const first = res.body.gps[0];
    expect(first).toHaveProperty('time');
    expect(first).toHaveProperty('latitude');
    expect(first).toHaveProperty('longitude');
    expect(first).toHaveProperty('speed_ms');
  });

  it('S12: time is ISO 8601 string', async () => {
    const res = await request(app)
      .get(`/api/sessions/${sessionIdWithGps}/samples`)
      .set('Authorization', `Bearer ${atletaToken}`)
      .expect(200);

    const time = res.body.gps[0].time;
    expect(time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
  });

  it('S13: Values are correct numbers', async () => {
    const res = await request(app)
      .get(`/api/sessions/${sessionIdWithGps}/samples`)
      .set('Authorization', `Bearer ${atletaToken}`)
      .expect(200);

    const first = res.body.gps[0];
    expect(typeof first.latitude).toBe('number');
    expect(typeof first.longitude).toBe('number');
    expect(typeof first.speed_ms).toBe('number');
    expect(first.speed_ms).toBe(3.1);
  });
});
