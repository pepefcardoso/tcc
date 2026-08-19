import request from 'supertest';
import app from '../../src/app.js';
import { pool } from '../../src/db.js';
import { signUserToken } from '../../src/utils/jwt.js';
import crypto from 'crypto';

describe('LGPD Data-Access / Deletion Integration Tests', () => {
  let adminToken;
  let athleteToken;
  let athleteId;
  let sessionId;

  beforeAll(() => {
    adminToken = signUserToken({ sub: crypto.randomUUID(), role: 'tecnico' });
    athleteToken = signUserToken({ sub: crypto.randomUUID(), role: 'atleta' });
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE athletes CASCADE');
    await pool.query('TRUNCATE TABLE users CASCADE');

    athleteId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO athletes (id, name, position, birth_date, weight_kg, height_m, active)
       VALUES ($1, 'LGPD Athlete', 'Meia', '1995-10-15', 75.0, 1.80, true)`,
      [athleteId]
    );

    await pool.query(
      `INSERT INTO users (id, email, password_hash, role, athlete_id, created_at)
       VALUES ($1, 'lgpd@test.com', 'hashed', 'atleta', $2, now())`,
      [crypto.randomUUID(), athleteId]
    );

    sessionId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO sessions (id, athlete_id, started_at, duration_minutes, pse, session_load, device_id, source_filename, sync_status)
       VALUES ($1, $2, now(), 90, 5, 450.0, 'DEV001', 'sess_lgpd_001.ndjson', 'processed')`,
      [sessionId, athleteId]
    );

    await pool.query(
      `INSERT INTO session_metrics (session_id, total_distance_m, max_speed_kmh, sprint_count, player_load)
       VALUES ($1, 5000.5, 26.5, 12, 1000.1234)`,
      [sessionId]
    );

    await pool.query(
      `INSERT INTO gps_samples (session_id, time, latitude, longitude, speed_ms)
       VALUES ($1, now(), -23.5, -46.6, 5.2)`,
      [sessionId]
    );

    await pool.query(
      `INSERT INTO imu_samples (session_id, time, ac_x, ac_y, ac_z, gy_x, gy_y, gy_z)
       VALUES ($1, now(), 1.0, 2.0, 3.0, 0.1, 0.2, 0.3)`,
      [sessionId]
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('GET /api/admin/athletes/:id/export', () => {
    it('should export athlete and sessions with metrics (no samples by default)', async () => {
      const res = await request(app)
        .get(`/api/admin/athletes/${athleteId}/export`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.athlete.id).toBe(athleteId);
      expect(res.body.sessions.length).toBe(1);
      expect(res.body.sessions[0].id).toBe(sessionId);
      expect(res.body.sessions[0].metrics.total_distance_m).toBe(5000.5);

      expect(res.body.sessions[0].gps_samples).toBeUndefined();
      expect(res.body.sessions[0].imu_samples).toBeUndefined();
    });

    it('should include samples when ?includeSamples=true', async () => {
      const res = await request(app)
        .get(`/api/admin/athletes/${athleteId}/export?includeSamples=true`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.sessions[0].gps_samples).toBeDefined();
      expect(Array.isArray(res.body.sessions[0].gps_samples)).toBe(true);
      expect(res.body.sessions[0].gps_samples.length).toBe(1);
      expect(res.body.sessions[0].gps_samples[0].speed_ms).toBe('5.200');

      expect(res.body.sessions[0].imu_samples).toBeDefined();
      expect(Array.isArray(res.body.sessions[0].imu_samples)).toBe(true);
      expect(res.body.sessions[0].imu_samples.length).toBe(1);
    });

    it('should export successfully even if athlete has no sessions', async () => {
      const emptyAthleteId = crypto.randomUUID();
      await pool.query(
        `INSERT INTO athletes (id, name, active) VALUES ($1, 'Empty Athlete', true)`,
        [emptyAthleteId]
      );

      const res = await request(app)
        .get(`/api/admin/athletes/${emptyAthleteId}/export`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.athlete.id).toBe(emptyAthleteId);
      expect(res.body.sessions).toEqual([]);
    });

    it('should return 404 if athlete is not found', async () => {
      await request(app)
        .get(`/api/admin/athletes/${crypto.randomUUID()}/export`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 401 if unauthenticated', async () => {
      await request(app).get(`/api/admin/athletes/${athleteId}/export`).expect(401);
    });

    it('should return 403 if role is insufficient', async () => {
      await request(app)
        .get(`/api/admin/athletes/${athleteId}/export`)
        .set('Authorization', `Bearer ${athleteToken}`)
        .expect(403);
    });
  });

  describe('DELETE /api/admin/athletes/:id/purge', () => {
    it('should completely purge the athlete and all related records, respecting constraints', async () => {
      await request(app)
        .delete(`/api/admin/athletes/${athleteId}/purge`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      const athletes = await pool.query('SELECT * FROM athletes WHERE id = $1', [athleteId]);
      expect(athletes.rowCount).toBe(0);

      const sessions = await pool.query('SELECT * FROM sessions WHERE athlete_id = $1', [
        athleteId,
      ]);
      expect(sessions.rowCount).toBe(0);

      const metrics = await pool.query('SELECT * FROM session_metrics WHERE session_id = $1', [
        sessionId,
      ]);
      expect(metrics.rowCount).toBe(0);

      const gps = await pool.query('SELECT * FROM gps_samples WHERE session_id = $1', [sessionId]);
      expect(gps.rowCount).toBe(0);

      const imu = await pool.query('SELECT * FROM imu_samples WHERE session_id = $1', [sessionId]);
      expect(imu.rowCount).toBe(0);
    });

    it('should set users.athlete_id to NULL without deleting the user account', async () => {
      await request(app)
        .delete(`/api/admin/athletes/${athleteId}/purge`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', ['lgpd@test.com']);
      expect(rows.length).toBe(1);
      expect(rows[0].athlete_id).toBeNull();
    });

    it('should return 404 on already purged athlete (idempotency concern)', async () => {
      await request(app)
        .delete(`/api/admin/athletes/${athleteId}/purge`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      await request(app)
        .delete(`/api/admin/athletes/${athleteId}/purge`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 404 if athlete is not found initially', async () => {
      await request(app)
        .delete(`/api/admin/athletes/${crypto.randomUUID()}/purge`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 401 if unauthenticated', async () => {
      await request(app).delete(`/api/admin/athletes/${athleteId}/purge`).expect(401);
    });

    it('should return 403 if role is insufficient', async () => {
      await request(app)
        .delete(`/api/admin/athletes/${athleteId}/purge`)
        .set('Authorization', `Bearer ${athleteToken}`)
        .expect(403);
    });
  });
});
