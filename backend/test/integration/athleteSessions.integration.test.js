import request from 'supertest';
import app from '../../src/app.js';
import { pool } from '../../src/db.js';
import { signUserToken } from '../../src/utils/jwt.js';
import crypto from 'crypto';
import * as sessionRepository from '../../src/repositories/sessionRepository.js';

describe('Athlete Sessions Integration', () => {
  let athleteId;
  let noSessionsAthleteId;
  let atletaToken;
  let sessionIds = [];

  beforeAll(async () => {
    atletaToken = signUserToken({ sub: crypto.randomUUID(), role: 'atleta' });
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE sessions CASCADE');
    await pool.query('TRUNCATE athletes CASCADE');

    const { rows: a1 } = await pool.query(
      `INSERT INTO athletes (name) VALUES ('With Sessions Athlete') RETURNING id`
    );
    athleteId = a1[0].id;

    const { rows: a2 } = await pool.query(
      `INSERT INTO athletes (name) VALUES ('No Sessions Athlete') RETURNING id`
    );
    noSessionsAthleteId = a2[0].id;

    const query = `
      INSERT INTO sessions (athlete_id, source_filename, sync_status, created_at, started_at, duration_minutes)
      VALUES 
        ($1, 's1.ndjson', 'processed', now(), '2025-01-01T10:00:00Z', 60),
        ($1, 's2.ndjson', 'processed', now(), '2025-01-15T15:30:00Z', 90),
        ($1, 's3.ndjson', 'processed', now(), '2025-02-01T08:00:00Z', 45)
      RETURNING id, started_at
    `;
    const { rows: sRows } = await pool.query(query, [athleteId]);
    
    sRows.sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
    sessionIds = sRows.map(r => r.id);

    await pool.query(
      `INSERT INTO session_metrics (session_id, total_distance_m, max_speed_kmh, sprint_count, player_load)
       VALUES ($1, 5000, 25, 5, 150)`,
      [sessionIds[0]]
    );
  });

  afterAll(async () => {
    await pool.query('TRUNCATE sessions CASCADE');
    await pool.query('TRUNCATE athletes CASCADE');
    await pool.end();
  });

  describe('Repository: findByAthleteId', () => {
    it('R1: Returns [] when athlete has no sessions', async () => {
      const result = await sessionRepository.findByAthleteId(noSessionsAthleteId);
      expect(result).toEqual([]);
    });

    it('R2: Returns all sessions, ordered DESC by started_at', async () => {
      const result = await sessionRepository.findByAthleteId(athleteId);
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe(sessionIds[0]);
      expect(result[1].id).toBe(sessionIds[1]);
      expect(result[2].id).toBe(sessionIds[2]);
    });

    it('R3: from filter, returns sessions on/after cutoff', async () => {
      const result = await sessionRepository.findByAthleteId(athleteId, { from: '2025-01-15' });
      expect(result).toHaveLength(2);
      expect(result.map(r => r.id)).toEqual([sessionIds[0], sessionIds[1]]);
    });

    it('R4: to filter, returns sessions on/before cutoff', async () => {
      const result = await sessionRepository.findByAthleteId(athleteId, { to: '2025-01-15' });
      expect(result).toHaveLength(2);
      expect(result.map(r => r.id)).toEqual([sessionIds[1], sessionIds[2]]);
    });

    it('R5: Both from and to filters in range', async () => {
      const result = await sessionRepository.findByAthleteId(athleteId, { from: '2025-01-10', to: '2025-01-20' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(sessionIds[1]);
    });

    it('R6: Session with processed metrics has a metrics object', async () => {
      const result = await sessionRepository.findByAthleteId(athleteId);
      expect(result[0].metrics).toBeDefined();
      expect(result[0].metrics).not.toBeNull();
      expect(result[0].metrics.total_distance_m).toBe(5000);
    });

    it('R7: Session without metrics has metrics: null', async () => {
      const result = await sessionRepository.findByAthleteId(athleteId);
      expect(result[1].metrics).toBeNull();
    });
  });

  describe('HTTP: GET /api/athletes/:id/sessions', () => {
    it('H1: Returns 401 if missing auth token', async () => {
      await request(app).get(`/api/athletes/${athleteId}/sessions`).expect(401);
    });

    it('H2: Returns 404 for non-existent athlete', async () => {
      const unknownId = crypto.randomUUID();
      const res = await request(app)
        .get(`/api/athletes/${unknownId}/sessions`)
        .set('Authorization', `Bearer ${atletaToken}`);
      
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('athlete_not_found');
    });

    it('H3: Valid athlete, no sessions, returns []', async () => {
      const res = await request(app)
        .get(`/api/athletes/${noSessionsAthleteId}/sessions`)
        .set('Authorization', `Bearer ${atletaToken}`)
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('H4: Valid athlete, multiple sessions, returns full array in DESC order', async () => {
      const res = await request(app)
        .get(`/api/athletes/${athleteId}/sessions`)
        .set('Authorization', `Bearer ${atletaToken}`)
        .expect(200);

      expect(res.body).toHaveLength(3);
      expect(res.body[0].id).toBe(sessionIds[0]);
    });

    it('H5: from param filters correctly', async () => {
      const res = await request(app)
        .get(`/api/athletes/${athleteId}/sessions?from=2025-01-15`)
        .set('Authorization', `Bearer ${atletaToken}`)
        .expect(200);

      expect(res.body).toHaveLength(2);
    });

    it('H6: to param filters correctly', async () => {
      const res = await request(app)
        .get(`/api/athletes/${athleteId}/sessions?to=2025-01-15`)
        .set('Authorization', `Bearer ${atletaToken}`)
        .expect(200);

      expect(res.body).toHaveLength(2);
    });

    it('H7: Both from and to filters work together', async () => {
      const res = await request(app)
        .get(`/api/athletes/${athleteId}/sessions?from=2025-01-10&to=2025-01-20`)
        .set('Authorization', `Bearer ${atletaToken}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
    });

    it('H8: 422 if from/to not in YYYY-MM-DD format', async () => {
      const res = await request(app)
        .get(`/api/athletes/${athleteId}/sessions?from=10-01-2025`)
        .set('Authorization', `Bearer ${atletaToken}`)
        .expect(422);
      
      expect(res.body.error).toBe('validation_error');
    });

    it('H9: Date range with no matches returns []', async () => {
      const res = await request(app)
        .get(`/api/athletes/${athleteId}/sessions?from=2026-01-01`)
        .set('Authorization', `Bearer ${atletaToken}`)
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('H10: Session with metrics included', async () => {
      const res = await request(app)
        .get(`/api/athletes/${athleteId}/sessions`)
        .set('Authorization', `Bearer ${atletaToken}`)
        .expect(200);

      expect(res.body[0].metrics).toBeDefined();
      expect(res.body[0].metrics).not.toBeNull();
      expect(res.body[1].metrics).toBeNull();
    });

    it('H11: Session list objects include all required fields', async () => {
      const res = await request(app)
        .get(`/api/athletes/${athleteId}/sessions`)
        .set('Authorization', `Bearer ${atletaToken}`)
        .expect(200);

      const session = res.body[0];
      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('athlete_id');
      expect(session).toHaveProperty('started_at');
      expect(session).toHaveProperty('duration_minutes');
      expect(session).toHaveProperty('source_filename');
      expect(session).toHaveProperty('sync_status');
    });
  });
});
