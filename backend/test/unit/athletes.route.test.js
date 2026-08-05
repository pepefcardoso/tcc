import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

jest.unstable_mockModule('../../src/repositories/athleteRepository.js', () => ({
  create: jest.fn(),
}));

jest.unstable_mockModule('../../src/utils/jwt.js', () => ({
  verifyUserToken: jest.fn(),
  verifyDeviceToken: jest.fn(),
}));

const athleteRepository = await import('../../src/repositories/athleteRepository.js');
const jwtUtil = await import('../../src/utils/jwt.js');
const { default: athletesRouter } = await import('../../src/routes/athletes.js');
const { authMiddleware } = await import('../../src/middleware/auth.js');

const app = express();
app.use(express.json());
app.use('/api/athletes', athletesRouter);
const { errorHandler } = await import('../../src/middleware/errorHandler.js');
app.use(errorHandler);

describe('POST /api/athletes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. returns 401 if missing authorization header', async () => {
    const res = await request(app)
      .post('/api/athletes')
      .send({ name: 'Test Athlete' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthorized');
  });

  it('2. returns 403 if valid user token, role = atleta', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'atleta' });

    const res = await request(app)
      .post('/api/athletes')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Test Athlete' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('forbidden');
  });

  it('3. returns 422 if valid token (tecnico), missing required name', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'tecnico' });

    const res = await request(app)
      .post('/api/athletes')
      .set('Authorization', 'Bearer valid-token')
      .send({ position: 'Forward' });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('validation_error');
    expect(res.body.message).toContain('name: Invalid input: expected string, received undefined');
  });

  it('4. returns 422 if valid token (preparador), invalid birth_date format', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'preparador' });

    const res = await request(app)
      .post('/api/athletes')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Test Athlete', birth_date: 'invalid-date', weight_kg: 70.0, height_m: 1.80 });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('validation_error');
    expect(res.body.message).toContain('birth_date: Must be YYYY-MM-DD');
  });

  it('5. returns 201 with full athlete object if payload valid (role = tecnico)', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'tecnico' });
    
    const mockAthlete = {
      id: 'athlete-123',
      name: 'João Silva',
      position: 'Atacante',
      birth_date: '1998-05-20',
      weight_kg: 75.5,
      height_m: 1.82,
      active: true,
      created_at: '2026-08-05T00:00:00.000Z'
    };
    athleteRepository.create.mockResolvedValue(mockAthlete);

    const res = await request(app)
      .post('/api/athletes')
      .set('Authorization', 'Bearer valid-token')
      .send({
        name: 'João Silva',
        position: 'Atacante',
        birth_date: '1998-05-20',
        weight_kg: 75.5,
        height_m: 1.82
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(mockAthlete);
    expect(athleteRepository.create).toHaveBeenCalledWith({
      name: 'João Silva',
      position: 'Atacante',
      birth_date: '1998-05-20',
      weight_kg: 75.5,
      height_m: 1.82
    });
  });

  it('6. returns 201 with full athlete object if payload valid (role = preparador)', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'preparador' });
    
    const mockAthlete = {
      id: 'athlete-456',
      name: 'Maria Souza',
      birth_date: '2000-01-01',
      weight_kg: 60.0,
      height_m: 1.65,
      active: true,
      created_at: '2026-08-05T00:00:00.000Z'
    };
    athleteRepository.create.mockResolvedValue(mockAthlete);

    const res = await request(app)
      .post('/api/athletes')
      .set('Authorization', 'Bearer valid-token')
      .send({ 
        name: 'Maria Souza',
        birth_date: '2000-01-01',
        weight_kg: 60.0,
        height_m: 1.65
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(mockAthlete);
  });

  it('7. returns 500 if repository throws unexpected error', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'tecnico' });
    athleteRepository.create.mockRejectedValue(new Error('DB connection failed'));
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app)
      .post('/api/athletes')
      .set('Authorization', 'Bearer valid-token')
      .send({ 
        name: 'Error Athlete',
        birth_date: '2000-01-01',
        weight_kg: 60.0,
        height_m: 1.65
      });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('internal_error');
    
    consoleSpy.mockRestore();
  });
});
