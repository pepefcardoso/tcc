import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

jest.unstable_mockModule('../../src/repositories/athleteRepository.js', () => ({
  create: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  findById: jest.fn(),
  deactivate: jest.fn(),
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

describe('GET /api/athletes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. returns 401 if missing authorization header', async () => {
    const res = await request(app).get('/api/athletes');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthorized');
  });

  it('2. returns 200 with active athletes if no query param provided (default)', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'atleta' });
    const mockAthletes = [{ id: '1', name: 'Athlete 1' }];
    athleteRepository.findAll.mockResolvedValue(mockAthletes);

    const res = await request(app)
      .get('/api/athletes')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockAthletes);
    expect(athleteRepository.findAll).toHaveBeenCalledWith({ includeInactive: false });
  });

  it('3. returns 200 and passes includeInactive: true', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'atleta' });
    const mockAthletes = [{ id: '1', name: 'Athlete 1' }, { id: '2', name: 'Inactive Athlete' }];
    athleteRepository.findAll.mockResolvedValue(mockAthletes);

    const res = await request(app)
      .get('/api/athletes?includeInactive=true')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockAthletes);
    expect(athleteRepository.findAll).toHaveBeenCalledWith({ includeInactive: true });
  });

  it('4. returns 200 and passes includeInactive: false when explicitly false', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'atleta' });
    athleteRepository.findAll.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/athletes?includeInactive=false')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(athleteRepository.findAll).toHaveBeenCalledWith({ includeInactive: false });
  });

  it('5. treats any includeInactive value other than true as false', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'atleta' });
    athleteRepository.findAll.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/athletes?includeInactive=yes')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(athleteRepository.findAll).toHaveBeenCalledWith({ includeInactive: false });
  });

  it('6. returns 500 if repository throws unexpected error', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'atleta' });
    athleteRepository.findAll.mockRejectedValue(new Error('DB failure'));
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app)
      .get('/api/athletes')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('internal_error');
    
    consoleSpy.mockRestore();
  });

  it('7. returns 200 with empty array if no athletes exist', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'atleta' });
    athleteRepository.findAll.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/athletes')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('PATCH /api/athletes/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. returns 401 if missing authorization header', async () => {
    const res = await request(app)
      .patch('/api/athletes/123')
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthorized');
  });

  it('2. returns 403 if valid user token, role = atleta', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'atleta' });

    const res = await request(app)
      .patch('/api/athletes/123')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('forbidden');
  });

  it('3. returns 422 if valid token (tecnico), invalid birth_date format', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'tecnico' });

    const res = await request(app)
      .patch('/api/athletes/123')
      .set('Authorization', 'Bearer valid-token')
      .send({ birth_date: 'invalid-date' });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('validation_error');
    expect(res.body.message).toContain('birth_date: Must be YYYY-MM-DD');
  });

  it('4. returns 422 if valid token (tecnico), invalid weight_kg (string)', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'tecnico' });

    const res = await request(app)
      .patch('/api/athletes/123')
      .set('Authorization', 'Bearer valid-token')
      .send({ weight_kg: '75.5' });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('validation_error');
  });

  it('5. returns 200 with updated athlete if valid partial body (name only) (role = tecnico)', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'tecnico' });
    
    const mockUpdated = {
      id: '123',
      name: 'New Name',
      position: 'Atacante',
      active: true,
    };
    athleteRepository.update.mockResolvedValue(mockUpdated);

    const res = await request(app)
      .patch('/api/athletes/123')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'New Name' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockUpdated);
    expect(athleteRepository.update).toHaveBeenCalledWith('123', { name: 'New Name' });
  });

  it('6. returns 200 with updated athlete if full valid body (role = preparador)', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'preparador' });
    
    const mockUpdated = {
      id: '123',
      name: 'Full Update',
      position: 'Goleiro',
      birth_date: '1995-10-10',
      weight_kg: 85.0,
      height_m: 1.90,
      active: true,
    };
    athleteRepository.update.mockResolvedValue(mockUpdated);

    const res = await request(app)
      .patch('/api/athletes/123')
      .set('Authorization', 'Bearer valid-token')
      .send({
        name: 'Full Update',
        position: 'Goleiro',
        birth_date: '1995-10-10',
        weight_kg: 85.0,
        height_m: 1.90
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockUpdated);
    expect(athleteRepository.update).toHaveBeenCalledWith('123', {
        name: 'Full Update',
        position: 'Goleiro',
        birth_date: '1995-10-10',
        weight_kg: 85.0,
        height_m: 1.90
    });
  });

  it('7. returns 404 if athlete id is unknown / repository returns null', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'tecnico' });
    athleteRepository.update.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/athletes/999')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Ghost' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('athlete_not_found');
  });

  it('8. returns 200 if empty body (repository short-circuits to findById and returns athlete)', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'tecnico' });
    
    const mockExisting = { id: '123', name: 'Original Name' };
    athleteRepository.update.mockResolvedValue(mockExisting);

    const res = await request(app)
      .patch('/api/athletes/123')
      .set('Authorization', 'Bearer valid-token')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockExisting);
    expect(athleteRepository.update).toHaveBeenCalledWith('123', {});
  });

  it('9. returns 500 if repository throws unexpected error', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'tecnico' });
    athleteRepository.update.mockRejectedValue(new Error('DB connection failed'));
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app)
      .patch('/api/athletes/123')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Error Case' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('internal_error');
    
    consoleSpy.mockRestore();
  });
});

describe('DELETE /api/athletes/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. returns 401 if missing authorization header', async () => {
    const res = await request(app).delete('/api/athletes/123');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthorized');
  });

  it('2. returns 403 if valid user token, role = atleta', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'atleta' });
    const res = await request(app)
      .delete('/api/athletes/123')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('forbidden');
  });

  it('3. returns 404 if athlete not found (repository returns null)', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'tecnico' });
    athleteRepository.deactivate.mockResolvedValue(null);
    const res = await request(app)
      .delete('/api/athletes/999')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('athlete_not_found');
  });

  it('4. returns 204 with no body on success (role = tecnico)', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'tecnico' });
    athleteRepository.deactivate.mockResolvedValue({ id: '123', active: false });
    const res = await request(app)
      .delete('/api/athletes/123')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
    expect(athleteRepository.deactivate).toHaveBeenCalledWith('123');
  });

  it('5. returns 204 with no body on success (role = preparador)', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'preparador' });
    athleteRepository.deactivate.mockResolvedValue({ id: '456', active: false });
    const res = await request(app)
      .delete('/api/athletes/456')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(204);
    expect(athleteRepository.deactivate).toHaveBeenCalledWith('456');
  });

  it('6. returns 500 if repository throws unexpected error', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'tecnico' });
    athleteRepository.deactivate.mockRejectedValue(new Error('DB failure'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(app)
      .delete('/api/athletes/123')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('internal_error');
    consoleSpy.mockRestore();
  });
});
