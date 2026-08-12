import request from 'supertest';
import app from '../../src/app.js';
import { pool } from '../../src/db.js';
import { signUserToken } from '../../src/utils/jwt.js';
import crypto from 'crypto';

describe('Dashboard Integration (T-058)', () => {
  let userToken;

  beforeAll(() => {
    userToken = signUserToken({ sub: crypto.randomUUID(), role: 'tecnico' });
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE sessions CASCADE');
    await pool.query('TRUNCATE athletes CASCADE');
  });

  afterAll(async () => {
    await pool.end();
  });

  it('1. returns 401 if missing token', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(401);
  });

  it('2. returns 200 with empty athletes array when no active athletes exist', async () => {
    await pool.query(
      `INSERT INTO athletes (name, active) VALUES ('Inactive Athlete', false)`
    );

    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.athletes).toEqual([]);
    expect(res.body.high_risk_athlete_ids).toEqual([]);
  });

  it('3. returns 200 with latest_session null when athlete has no sessions', async () => {
    const { rows: athleteRows } = await pool.query(
      `INSERT INTO athletes (name) VALUES ('No Session Athlete') RETURNING id`
    );
    const athleteId = athleteRows[0].id;

    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.athletes).toHaveLength(1);
    expect(res.body.athletes[0].athlete_id).toBe(athleteId);
    expect(res.body.athletes[0].name).toBe('No Session Athlete');
    expect(res.body.athletes[0].latest_session).toBeNull();
    expect(res.body.athletes[0].acwr.zone).toBeNull();
    expect(res.body.high_risk_athlete_ids).toEqual([]);
  });

  it('4 & 5. returns latest session and pse_pending correctly', async () => {
    const { rows: athleteRows } = await pool.query(
      `INSERT INTO athletes (name) VALUES ('Session Athlete') RETURNING id`
    );
    const athleteId = athleteRows[0].id;

    await pool.query(
      `INSERT INTO sessions (athlete_id, source_filename, sync_status, started_at)
       VALUES ($1, 'old.ndjson', 'processed', now() - interval '2 days')`,
      [athleteId]
    );

    const { rows: sessionRows } = await pool.query(
      `INSERT INTO sessions (athlete_id, source_filename, sync_status, started_at)
       VALUES ($1, 'new.ndjson', 'processed', now() - interval '1 day') RETURNING id, started_at`,
      [athleteId]
    );
    const sessionId = sessionRows[0].id;
    const startedAt = sessionRows[0].started_at;

    await pool.query(
      `INSERT INTO session_metrics (session_id, total_distance_m, max_speed_kmh, sprint_count, player_load)
       VALUES ($1, 5000.5, 28.4, 5, 150.25)`,
      [sessionId]
    );

    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.athletes).toHaveLength(1);
    
    const latest = res.body.athletes[0].latest_session;
    expect(latest.session_id).toBe(sessionId);
    expect(latest.date).toBe(startedAt.toISOString());
    expect(latest.total_distance_m).toBe(5000.5);
    expect(latest.max_speed_kmh).toBe(28.4);
    expect(latest.sprint_count).toBe(5);
    expect(latest.player_load).toBe(150.25);
    expect(latest.pse_pending).toBe(true);
  });

  it('6 & 7 & 8. correctly populates ACWR and high_risk_athlete_ids', async () => {
    const { rows: athleteRows } = await pool.query(
      `INSERT INTO athletes (name) VALUES ('High Risk Athlete'), ('Low Risk Athlete') RETURNING id, name`
    );
    
    const highRiskId = athleteRows.find(r => r.name === 'High Risk Athlete').id;
    const lowRiskId = athleteRows.find(r => r.name === 'Low Risk Athlete').id;

    await pool.query(
      `INSERT INTO sessions (athlete_id, source_filename, sync_status, session_load, started_at)
       VALUES 
       ($1, 'hr_s1.ndjson', 'processed', 200, now() - interval '2 days'),
       ($1, 'hr_s2.ndjson', 'processed', 200, now() - interval '10 days')`,
      [highRiskId]
    );

    await pool.query(
      `INSERT INTO sessions (athlete_id, source_filename, sync_status, session_load, started_at)
       VALUES 
       ($1, 'lr_s1.ndjson', 'processed', 100, now() - interval '2 days'),
       ($1, 'lr_s2.ndjson', 'processed', 100, now() - interval '10 days'),
       ($1, 'lr_s3.ndjson', 'processed', 100, now() - interval '18 days'),
       ($1, 'lr_s4.ndjson', 'processed', 100, now() - interval '25 days')`,
      [lowRiskId]
    );

    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    
    const highRiskAthlete = res.body.athletes.find(a => a.athlete_id === highRiskId);
    expect(highRiskAthlete.acwr.value).toBe(2.0);
    expect(highRiskAthlete.acwr.zone).toBe('red');

    const lowRiskAthlete = res.body.athletes.find(a => a.athlete_id === lowRiskId);
    expect(lowRiskAthlete.acwr.value).toBe(1.0);
    expect(lowRiskAthlete.acwr.zone).toBe('green');

    expect(res.body.high_risk_athlete_ids).toEqual([highRiskId]);
  });

  it('9 & 10. excludes inactive athletes and orders by name alphabetically', async () => {
    await pool.query(
      `INSERT INTO athletes (name, active) VALUES 
       ('Zebra', true),
       ('Alpha', true),
       ('Beta', false),
       ('Charlie', true)`
    );

    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.athletes).toHaveLength(3);
    expect(res.body.athletes[0].name).toBe('Alpha');
    expect(res.body.athletes[1].name).toBe('Charlie');
    expect(res.body.athletes[2].name).toBe('Zebra');
  });
});
