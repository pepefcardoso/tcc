import request from 'supertest';
import app from '../../src/app.js';
import { pool } from '../../src/db.js';
import { signUserToken } from '../../src/utils/jwt.js';
import crypto from 'crypto';

describe('Athlete Integration Tests', () => {
  let adminToken;
  let athleteToken;

  beforeAll(() => {
    adminToken = signUserToken({ sub: crypto.randomUUID(), role: 'tecnico' });
    athleteToken = signUserToken({ sub: crypto.randomUUID(), role: 'atleta' });
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE athletes CASCADE');
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('POST /api/athletes', () => {
    const validPayload = {
      name: 'Integration Test Athlete',
      position: 'Zagueiro',
      birth_date: '1995-10-15',
      weight_kg: 85.5,
      height_m: 1.88,
    };

    it('should create an athlete and return 201 when authenticated as a tecnico', async () => {
      const response = await request(app)
        .post('/api/athletes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validPayload)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(validPayload.name);
      expect(response.body.active).toBe(true);
    });

    it('should return 422 if validation fails', async () => {
      const { name, ...invalidPayload } = validPayload;

      const response = await request(app)
        .post('/api/athletes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidPayload)
        .expect(422);

      expect(response.body).toHaveProperty('error', 'validation_error');
    });

    it('should return 401 if unauthenticated', async () => {
      await request(app).post('/api/athletes').send(validPayload).expect(401);
    });

    it('should return 403 if authenticated but lacking sufficient role', async () => {
      await request(app)
        .post('/api/athletes')
        .set('Authorization', `Bearer ${athleteToken}`)
        .send(validPayload)
        .expect(403);
    });
  });

  describe('GET /api/athletes', () => {
    let activeAthleteId;
    let inactiveAthleteId;

    beforeEach(async () => {
      activeAthleteId = crypto.randomUUID();
      inactiveAthleteId = crypto.randomUUID();

      const insertQuery = `
        INSERT INTO athletes (id, name, position, birth_date, weight_kg, height_m, active)
        VALUES 
          ($1, 'Active Athlete', 'Goleiro', '1990-01-01', 80.0, 1.85, true),
          ($2, 'Inactive Athlete', 'Lateral', '1992-02-02', 75.0, 1.75, false)
      `;
      await pool.query(insertQuery, [activeAthleteId, inactiveAthleteId]);
    });

    it('should list only active athletes by default', async () => {
      const response = await request(app)
        .get('/api/athletes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].id).toBe(activeAthleteId);
      expect(response.body[0].name).toBe('Active Athlete');
    });

    it('should list all athletes if includeInactive is true', async () => {
      const response = await request(app)
        .get('/api/athletes?includeInactive=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      
      const ids = response.body.map(a => a.id);
      expect(ids).toContain(activeAthleteId);
      expect(ids).toContain(inactiveAthleteId);
    });

    it('should return 401 if unauthenticated', async () => {
      await request(app).get('/api/athletes').expect(401);
    });
  });

  describe('PATCH /api/athletes/:id', () => {
    let athleteId;

    beforeEach(async () => {
      athleteId = crypto.randomUUID();
      const insertQuery = `
        INSERT INTO athletes (id, name, position, birth_date, weight_kg, height_m, active)
        VALUES ($1, 'Patch Athlete', 'Meia', '1996-03-03', 70.0, 1.70, true)
      `;
      await pool.query(insertQuery, [athleteId]);
    });

    it('should update an athlete partially and return 200', async () => {
      const updatePayload = { weight_kg: 72.5 };

      const response = await request(app)
        .patch(`/api/athletes/${athleteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatePayload)
        .expect(200);

      expect(response.body.id).toBe(athleteId);
      expect(response.body.weight_kg).toBe('72.50');
    });

    it('should return 404 for a non-existent athlete id', async () => {
      const nonExistentId = crypto.randomUUID();
      await request(app)
        .patch(`/api/athletes/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Name' })
        .expect(404);
    });

    it('should return 422 if validation fails', async () => {
      const invalidPayload = { weight_kg: 'not-a-number' };

      const response = await request(app)
        .patch(`/api/athletes/${athleteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidPayload)
        .expect(422);

      expect(response.body).toHaveProperty('error', 'validation_error');
    });
  });

  describe('DELETE /api/athletes/:id', () => {
    let athleteId;

    beforeEach(async () => {
      athleteId = crypto.randomUUID();
      const insertQuery = `
        INSERT INTO athletes (id, name, position, birth_date, weight_kg, height_m, active)
        VALUES ($1, 'Delete Athlete', 'Atacante', '1998-04-04', 78.0, 1.80, true)
      `;
      await pool.query(insertQuery, [athleteId]);
    });

    it('should soft delete the athlete and return 204', async () => {
      await request(app)
        .delete(`/api/athletes/${athleteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      const { rows } = await pool.query('SELECT active FROM athletes WHERE id = $1', [athleteId]);
      expect(rows.length).toBe(1);
      expect(rows[0].active).toBe(false);
    });

    it('should return 404 for a non-existent athlete', async () => {
      const nonExistentId = crypto.randomUUID();
      await request(app)
        .delete(`/api/athletes/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 403 if attempting to delete with insufficient role', async () => {
      await request(app)
        .delete(`/api/athletes/${athleteId}`)
        .set('Authorization', `Bearer ${athleteToken}`)
        .expect(403);
    });
  });
});
