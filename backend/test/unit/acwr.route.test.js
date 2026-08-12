import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

jest.unstable_mockModule('../../src/repositories/athleteRepository.js', () => ({
  findById: jest.fn(),
  create: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  deactivate: jest.fn(),
}));

jest.unstable_mockModule('../../src/services/acwrService.js', () => ({
  calculateAcwr: jest.fn(),
  classifyAcwrZone: jest.fn(),
}));

jest.unstable_mockModule('../../src/utils/jwt.js', () => ({
  verifyUserToken: jest.fn(),
  verifyDeviceToken: jest.fn(),
}));

const athleteRepository = await import('../../src/repositories/athleteRepository.js');
const acwrService = await import('../../src/services/acwrService.js');
const jwtUtil = await import('../../src/utils/jwt.js');
const { default: athletesRouter } = await import('../../src/routes/athletes.js');
const { authMiddleware } = await import('../../src/middleware/auth.js');
const { errorHandler } = await import('../../src/middleware/errorHandler.js');

const app = express();
app.use(express.json());
app.use('/api/athletes', athletesRouter);
app.use(errorHandler);

describe('GET /api/athletes/:id/acwr', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. returns 401 if missing authorization header', async () => {
    const res = await request(app).get('/api/athletes/123/acwr');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthorized');
  });

  it('2. returns 404 if athlete is not found (unknown athlete)', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'atleta' });
    athleteRepository.findById.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/athletes/999/acwr')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('athlete_not_found');
    expect(athleteRepository.findById).toHaveBeenCalledWith('999');
  });

  it('3. returns 200 with sufficient_history: true and correct zone', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'atleta' });
    athleteRepository.findById.mockResolvedValue({ id: '123', name: 'John Doe' });
    
    acwrService.calculateAcwr.mockResolvedValue({
      acute_load: 720,
      chronic_load: 600,
      acwr: 1.2,
      sufficient_history: true
    });
    acwrService.classifyAcwrZone.mockReturnValue('green');

    const res = await request(app)
      .get('/api/athletes/123/acwr')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      athlete_id: '123',
      acute_load: 720,
      chronic_load: 600,
      acwr: 1.2,
      zone: 'green',
      sufficient_history: true
    });
  });

  it('4. returns 200 with sufficient_history: false and null zone/acwr (zero sessions)', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'atleta' });
    athleteRepository.findById.mockResolvedValue({ id: '123', name: 'John Doe' });
    
    acwrService.calculateAcwr.mockResolvedValue({
      acute_load: 0,
      chronic_load: 0,
      acwr: null,
      sufficient_history: false
    });
    acwrService.classifyAcwrZone.mockReturnValue(null);

    const res = await request(app)
      .get('/api/athletes/123/acwr')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      athlete_id: '123',
      acute_load: 0,
      chronic_load: 0,
      acwr: null,
      zone: null,
      sufficient_history: false
    });
  });

  it('5. returns 200 with partial data (<4 weeks but chronic > 0)', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'atleta' });
    athleteRepository.findById.mockResolvedValue({ id: '123', name: 'John Doe' });
    
    acwrService.calculateAcwr.mockResolvedValue({
      acute_load: 400,
      chronic_load: 200,
      acwr: 2.0,
      sufficient_history: true
    });
    acwrService.classifyAcwrZone.mockReturnValue('red');

    const res = await request(app)
      .get('/api/athletes/123/acwr')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      athlete_id: '123',
      acute_load: 400,
      chronic_load: 200,
      acwr: 2.0,
      zone: 'red',
      sufficient_history: true
    });
  });

  it('6. returns 500 if repository throws unexpected error', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'atleta' });
    athleteRepository.findById.mockRejectedValue(new Error('DB connection failed'));
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app)
      .get('/api/athletes/123/acwr')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('internal_error');
    
    consoleSpy.mockRestore();
  });

  it('7. returns 500 if acwrService throws unexpected error', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'atleta' });
    athleteRepository.findById.mockResolvedValue({ id: '123' });
    acwrService.calculateAcwr.mockRejectedValue(new Error('Calculation failed'));
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app)
      .get('/api/athletes/123/acwr')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('internal_error');
    
    consoleSpy.mockRestore();
  });
});
