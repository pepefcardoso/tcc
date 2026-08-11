import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

jest.unstable_mockModule('../../src/utils/jwt.js', () => ({
  verifyUserToken: jest.fn(),
  verifyDeviceToken: jest.fn(),
}));

jest.unstable_mockModule('../../src/repositories/sessionRepository.js', () => ({
  findByFilename: jest.fn(),
  findById: jest.fn(),
  updatePse: jest.fn(),
}));

jest.unstable_mockModule('../../src/repositories/athleteRepository.js', () => ({
  findById: jest.fn(),
}));

jest.unstable_mockModule('../../src/services/processingQueue.js', () => ({
  enqueue: jest.fn(async (taskFn) => taskFn()),
}));

jest.unstable_mockModule('../../src/services/uploadService.js', () => ({
  processUpload: jest.fn(),
}));

const mockUploadMiddleware = jest.fn((req, res, next) => next());

jest.unstable_mockModule('../../src/middleware/multerUpload.js', () => ({
  upload: {
    single: jest.fn(() => mockUploadMiddleware),
  },
}));

const jwtUtil = await import('../../src/utils/jwt.js');
const multerUpload = await import('../../src/middleware/multerUpload.js');
const sessionRepository = await import('../../src/repositories/sessionRepository.js');
const athleteRepository = await import('../../src/repositories/athleteRepository.js');
const processingQueue = await import('../../src/services/processingQueue.js');
const uploadService = await import('../../src/services/uploadService.js');
const { default: sessionsRouter } = await import('../../src/routes/sessions.js');
const { authMiddleware } = await import('../../src/middleware/auth.js');
const { errorHandler } = await import('../../src/middleware/errorHandler.js');

const app = express();
app.use(express.json());
app.use('/api/sessions', sessionsRouter);
app.use(errorHandler);

describe('POST /api/sessions/upload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionRepository.findByFilename.mockResolvedValue(null);
    athleteRepository.findById.mockResolvedValue({ id: '123e4567-e89b-12d3-a456-426614174000', name: 'Test Athlete' });
    processingQueue.enqueue.mockClear();
    mockUploadMiddleware.mockImplementation((req, res, next) => {
      req.file = {
        path: '/tmp/uploads/test_session.ndjson',
        originalname: 'test_session.ndjson',
        mimetype: 'application/x-ndjson',
        size: 1024,
      };
      req.body = req.body || {};
      next();
    });
  });

  it('1. returns 401 if missing authorization header', async () => {
    const res = await request(app)
      .post('/api/sessions/upload')
      .send({});

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthorized');
  });

  it('2. returns 403 if athlete user token is provided (requires device or operator token)', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'atleta' });

    const res = await request(app)
      .post('/api/sessions/upload')
      .set('Authorization', 'Bearer user-token')
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('forbidden');
    expect(res.body.message).toBe('Insufficient role or invalid token type for this operation');
  });

  it('3. returns 422 if valid device token, but no file is present', async () => {
    jwtUtil.verifyUserToken.mockImplementation(() => {
      const err = new Error('Invalid token type');
      err.name = 'JsonWebTokenError';
      throw err;
    });
    jwtUtil.verifyDeviceToken.mockReturnValue({ sub: 'device-123' });

    mockUploadMiddleware.mockImplementation((req, res, next) => {
      req.file = undefined;
      req.body = { athlete_id: '123e4567-e89b-12d3-a456-426614174000' };
      next();
    });

    const res = await request(app)
      .post('/api/sessions/upload')
      .set('Authorization', 'Bearer device-token');

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('validation_error');
    expect(res.body.message).toContain('File field "file" is required');
  });

  it('4. returns 422 if valid device token, file present, but missing athlete_id', async () => {
    jwtUtil.verifyUserToken.mockImplementation(() => {
      const err = new Error('Invalid token type');
      err.name = 'JsonWebTokenError';
      throw err;
    });
    jwtUtil.verifyDeviceToken.mockReturnValue({ sub: 'device-123' });

    mockUploadMiddleware.mockImplementation((req, res, next) => {
      req.file = { path: '/tmp/test.ndjson' };
      req.body = {};
      next();
    });

    const res = await request(app)
      .post('/api/sessions/upload')
      .set('Authorization', 'Bearer device-token');

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('validation_error');
    expect(res.body.message).toContain('athlete_id: Invalid input: expected string, received undefined');
  });

  it('5. returns 422 if valid device token, file present, athlete_id is not a UUID', async () => {
    jwtUtil.verifyUserToken.mockImplementation(() => {
      const err = new Error('Invalid token type');
      err.name = 'JsonWebTokenError';
      throw err;
    });
    jwtUtil.verifyDeviceToken.mockReturnValue({ sub: 'device-123' });

    mockUploadMiddleware.mockImplementation((req, res, next) => {
      req.file = { path: '/tmp/test.ndjson' };
      req.body = { athlete_id: 'not-a-uuid' };
      next();
    });

    const res = await request(app)
      .post('/api/sessions/upload')
      .set('Authorization', 'Bearer device-token');

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('validation_error');
    expect(res.body.message).toContain('athlete_id: athlete_id must be a valid UUID');
  });

  it('6. returns 200 with processed response if everything is valid', async () => {
    jwtUtil.verifyUserToken.mockImplementation(() => {
      const err = new Error('Invalid token type');
      err.name = 'JsonWebTokenError';
      throw err;
    });
    jwtUtil.verifyDeviceToken.mockReturnValue({ sub: 'device-123' });

    mockUploadMiddleware.mockImplementation((req, res, next) => {
      req.file = { path: '/tmp/uploads/SESSAO_20260805_120000_device123.ndjson', originalname: 'SESSAO_20260805_120000_device123.ndjson' };
      req.body = { athlete_id: '123e4567-e89b-12d3-a456-426614174000' };
      next();
    });

    uploadService.processUpload.mockResolvedValue({
      session_id: 'session-123',
      status: 'processed',
      metrics: null,
    });

    const res = await request(app)
      .post('/api/sessions/upload')
      .set('Authorization', 'Bearer device-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      session_id: 'session-123',
      status: 'processed',
      metrics: null,
    });
  });

  it('7. returns 413 if multer raises LIMIT_FILE_SIZE error', async () => {
    jwtUtil.verifyUserToken.mockImplementation(() => {
      const err = new Error('Invalid token type');
      err.name = 'JsonWebTokenError';
      throw err;
    });
    jwtUtil.verifyDeviceToken.mockReturnValue({ sub: 'device-123' });

    const multerError = new Error('File too large');
    multerError.name = 'MulterError';
    multerError.code = 'LIMIT_FILE_SIZE';

    const multer = await import('multer');
    const realMulterError = new multer.default.MulterError('LIMIT_FILE_SIZE');

    mockUploadMiddleware.mockImplementation((req, res, next) => {
      next(realMulterError);
    });

    const res = await request(app)
      .post('/api/sessions/upload')
      .set('Authorization', 'Bearer device-token');

    expect(res.status).toBe(413);
    expect(res.body.error).toBe('file_too_large');
  });

  it('8. returns 415 if multer raises WRONG_TYPE error', async () => {
    jwtUtil.verifyUserToken.mockImplementation(() => {
      const err = new Error('Invalid token type');
      err.name = 'JsonWebTokenError';
      throw err;
    });
    jwtUtil.verifyDeviceToken.mockReturnValue({ sub: 'device-123' });

    const multer = await import('multer');
    const realMulterError = new multer.default.MulterError('LIMIT_UNEXPECTED_FILE');
    realMulterError.code = 'WRONG_TYPE';

    mockUploadMiddleware.mockImplementation((req, res, next) => {
      next(realMulterError);
    });

    const res = await request(app)
      .post('/api/sessions/upload')
      .set('Authorization', 'Bearer device-token');

    expect(res.status).toBe(415);
    expect(res.body.error).toBe('unsupported_media_type');
  });

  it('9. returns 500 if unexpected internal error occurs', async () => {
    jwtUtil.verifyUserToken.mockImplementation(() => {
      const err = new Error('Invalid token type');
      err.name = 'JsonWebTokenError';
      throw err;
    });
    jwtUtil.verifyDeviceToken.mockReturnValue({ sub: 'device-123' });

    mockUploadMiddleware.mockImplementation((req, res, next) => {
      next(new Error('Unexpected DB or FS crash'));
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app)
      .post('/api/sessions/upload')
      .set('Authorization', 'Bearer device-token');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('internal_error');

    consoleSpy.mockRestore();
  });

  it('10. returns 200 with duplicate_skipped and existing metrics if duplicate session with metrics is found', async () => {
    jwtUtil.verifyUserToken.mockImplementation(() => {
      const err = new Error('Invalid token type');
      err.name = 'JsonWebTokenError';
      throw err;
    });
    jwtUtil.verifyDeviceToken.mockReturnValue({ sub: 'device-123' });

    mockUploadMiddleware.mockImplementation((req, res, next) => {
      req.file = { path: '/tmp/uploads/SESSAO_20260805_120000_device123.ndjson', originalname: 'SESSAO_20260805_120000_device123.ndjson' };
      req.body = { athlete_id: '123e4567-e89b-12d3-a456-426614174000' };
      next();
    });

    const mockExistingSession = {
      id: 'session-123',
      source_filename: 'SESSAO_20260805_120000_device123.ndjson',
      metrics: {
        total_distance_m: 5000.5,
        max_speed_kmh: 25.2,
        sprint_count: 5,
        player_load: 150.75,
      },
    };
    sessionRepository.findByFilename.mockResolvedValue(mockExistingSession);

    const res = await request(app)
      .post('/api/sessions/upload')
      .set('Authorization', 'Bearer device-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      session_id: 'session-123',
      status: 'duplicate_skipped',
      metrics: mockExistingSession.metrics,
    });
    expect(sessionRepository.findByFilename).toHaveBeenCalledWith('SESSAO_20260805_120000_device123.ndjson');
  });

  it('11. returns 200 with duplicate_skipped and metrics=null if duplicate session exists but metrics are null', async () => {
    jwtUtil.verifyUserToken.mockImplementation(() => {
      const err = new Error('Invalid token type');
      err.name = 'JsonWebTokenError';
      throw err;
    });
    jwtUtil.verifyDeviceToken.mockReturnValue({ sub: 'device-123' });

    mockUploadMiddleware.mockImplementation((req, res, next) => {
      req.file = { path: '/tmp/uploads/SESSAO_20260805_120000_device123.ndjson', originalname: 'SESSAO_20260805_120000_device123.ndjson' };
      req.body = { athlete_id: '123e4567-e89b-12d3-a456-426614174000' };
      next();
    });

    const mockExistingSession = {
      id: 'session-123',
      source_filename: 'SESSAO_20260805_120000_device123.ndjson',
      metrics: null,
    };
    sessionRepository.findByFilename.mockResolvedValue(mockExistingSession);

    const res = await request(app)
      .post('/api/sessions/upload')
      .set('Authorization', 'Bearer device-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      session_id: 'session-123',
      status: 'duplicate_skipped',
      metrics: null,
    });
  });

  it('12. returns 500 if sessionRepository.findByFilename throws unexpectedly', async () => {
    jwtUtil.verifyUserToken.mockImplementation(() => {
      const err = new Error('Invalid token type');
      err.name = 'JsonWebTokenError';
      throw err;
    });
    jwtUtil.verifyDeviceToken.mockReturnValue({ sub: 'device-123' });

    mockUploadMiddleware.mockImplementation((req, res, next) => {
      req.file = { path: '/tmp/uploads/SESSAO_20260805_120000_device123.ndjson', originalname: 'SESSAO_20260805_120000_device123.ndjson' };
      req.body = { athlete_id: '123e4567-e89b-12d3-a456-426614174000' };
      next();
    });

    sessionRepository.findByFilename.mockRejectedValue(new Error('DB down'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app)
      .post('/api/sessions/upload')
      .set('Authorization', 'Bearer device-token');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('internal_error');
    
    consoleSpy.mockRestore();
  });

  it('13. calls enqueue from processingQueue for new uploads', async () => {
    jwtUtil.verifyUserToken.mockImplementation(() => {
      const err = new Error('Invalid token type');
      err.name = 'JsonWebTokenError';
      throw err;
    });
    jwtUtil.verifyDeviceToken.mockReturnValue({ sub: 'device-123' });

    mockUploadMiddleware.mockImplementation((req, res, next) => {
      req.file = { path: '/tmp/uploads/SESSAO_20260805_120000_device123.ndjson', originalname: 'SESSAO_20260805_120000_device123.ndjson' };
      req.body = { athlete_id: '123e4567-e89b-12d3-a456-426614174000' };
      next();
    });

    uploadService.processUpload.mockResolvedValue({
      session_id: 'session-123',
      status: 'processed',
      metrics: null,
    });

    const res = await request(app)
      .post('/api/sessions/upload')
      .set('Authorization', 'Bearer device-token');

    expect(res.status).toBe(200);
    expect(processingQueue.enqueue).toHaveBeenCalledTimes(1);
    expect(processingQueue.enqueue).toHaveBeenCalledWith(expect.any(Function));
  });
  it('14. returns 422 if uploadService throws 422 (e.g. empty file)', async () => {
    jwtUtil.verifyUserToken.mockImplementation(() => {
      const err = new Error('Invalid token type');
      err.name = 'JsonWebTokenError';
      throw err;
    });
    jwtUtil.verifyDeviceToken.mockReturnValue({ sub: 'device-123' });

    mockUploadMiddleware.mockImplementation((req, res, next) => {
      req.file = { path: '/tmp/uploads/empty.ndjson', originalname: 'empty.ndjson' };
      req.body = { athlete_id: '123e4567-e89b-12d3-a456-426614174000' };
      next();
    });

    const AppError = (await import('../../src/middleware/errorHandler.js')).AppError;
    uploadService.processUpload.mockRejectedValue(new AppError(422, 'validation_error', 'Uploaded file is empty'));

    const res = await request(app)
      .post('/api/sessions/upload')
      .set('Authorization', 'Bearer device-token');

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('validation_error');
    expect(res.body.message).toBe('Uploaded file is empty');
  });

  it('15. returns 415 if uploadService throws 415 (e.g. non-NDJSON content)', async () => {
    jwtUtil.verifyUserToken.mockImplementation(() => {
      const err = new Error('Invalid token type');
      err.name = 'JsonWebTokenError';
      throw err;
    });
    jwtUtil.verifyDeviceToken.mockReturnValue({ sub: 'device-123' });

    mockUploadMiddleware.mockImplementation((req, res, next) => {
      req.file = { path: '/tmp/uploads/bad.ndjson', originalname: 'bad.ndjson' };
      req.body = { athlete_id: '123e4567-e89b-12d3-a456-426614174000' };
      next();
    });

    const AppError = (await import('../../src/middleware/errorHandler.js')).AppError;
    uploadService.processUpload.mockRejectedValue(new AppError(415, 'unsupported_media_type', 'File contains no valid NDJSON records'));

    const res = await request(app)
      .post('/api/sessions/upload')
      .set('Authorization', 'Bearer device-token');

    expect(res.status).toBe(415);
    expect(res.body.error).toBe('unsupported_media_type');
    expect(res.body.message).toBe('File contains no valid NDJSON records');
  });
});

describe('PATCH /api/sessions/:id/pse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. returns 401 if missing authorization header', async () => {
    const res = await request(app)
      .patch('/api/sessions/123/pse')
      .send({ pse: 7 });
    expect(res.status).toBe(401);
  });

  it('2. returns 403 if device token is used (no user role)', async () => {
    jwtUtil.verifyUserToken.mockImplementation(() => {
      const err = new Error('Invalid token type');
      err.name = 'JsonWebTokenError';
      throw err;
    });
    jwtUtil.verifyDeviceToken.mockReturnValue({ sub: 'device-123' });

    const res = await request(app)
      .patch('/api/sessions/123/pse')
      .set('Authorization', 'Bearer device-token')
      .send({ pse: 7 });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('forbidden');
  });

  it('3. returns 403 if user token has wrong role', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'admin' });

    const res = await request(app)
      .patch('/api/sessions/123/pse')
      .set('Authorization', 'Bearer user-token')
      .send({ pse: 7 });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('forbidden');
  });

  it('4. returns 422 if pse is missing', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'atleta' });

    const res = await request(app)
      .patch('/api/sessions/123/pse')
      .set('Authorization', 'Bearer user-token')
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('validation_error');
  });

  it('5. returns 422 if pse is non-integer string', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'atleta' });

    const res = await request(app)
      .patch('/api/sessions/123/pse')
      .set('Authorization', 'Bearer user-token')
      .send({ pse: 'seven' });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('validation_error');
  });

  it('6. returns 422 (invalid_pse_range) if pse < 1', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'atleta' });

    const res = await request(app)
      .patch('/api/sessions/123/pse')
      .set('Authorization', 'Bearer user-token')
      .send({ pse: 0 });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('validation_error');
  });

  it('7. returns 422 (invalid_pse_range) if pse > 10', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'atleta' });

    const res = await request(app)
      .patch('/api/sessions/123/pse')
      .set('Authorization', 'Bearer user-token')
      .send({ pse: 11 });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('validation_error');
  });

  it('8. returns 404 if valid token and PSE, but session not found', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'atleta' });
    sessionRepository.findById.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/sessions/123/pse')
      .set('Authorization', 'Bearer user-token')
      .send({ pse: 7 });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('session_not_found');
  });

  it('9. returns 200 with computed session_load and acwr stub when duration_minutes is present', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'atleta' });
    
    sessionRepository.findById.mockResolvedValue({
      id: 'session-123',
      duration_minutes: 90
    });
    
    sessionRepository.updatePse.mockResolvedValue({
      id: 'session-123',
      pse: 7,
      session_load: '630.00'
    });

    const res = await request(app)
      .patch('/api/sessions/session-123/pse')
      .set('Authorization', 'Bearer user-token')
      .send({ pse: 7 });

    expect(sessionRepository.updatePse).toHaveBeenCalledWith('session-123', 7, 630);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      session_id: 'session-123',
      pse: 7,
      session_load: 630,
      acwr: { value: null, zone: null }
    });
  });

  it('10. returns 200 with session_load=0 when duration_minutes is null', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'atleta' });
    
    sessionRepository.findById.mockResolvedValue({
      id: 'session-123',
      duration_minutes: null
    });
    
    sessionRepository.updatePse.mockResolvedValue({
      id: 'session-123',
      pse: 7,
      session_load: '0.00' 
    });

    const res = await request(app)
      .patch('/api/sessions/session-123/pse')
      .set('Authorization', 'Bearer user-token')
      .send({ pse: 7 });

    expect(sessionRepository.updatePse).toHaveBeenCalledWith('session-123', 7, 0);
    expect(res.status).toBe(200);
    expect(res.body.session_load).toBe(0);
  });

  it('11. returns 500 if findById throws', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'atleta' });
    sessionRepository.findById.mockRejectedValue(new Error('DB failure'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app)
      .patch('/api/sessions/123/pse')
      .set('Authorization', 'Bearer user-token')
      .send({ pse: 7 });

    expect(res.status).toBe(500);
    consoleSpy.mockRestore();
  });

  it('12. returns 500 if updatePse throws', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'atleta' });
    sessionRepository.findById.mockResolvedValue({ id: '123', duration_minutes: 90 });
    sessionRepository.updatePse.mockRejectedValue(new Error('DB failure'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app)
      .patch('/api/sessions/123/pse')
      .set('Authorization', 'Bearer user-token')
      .send({ pse: 7 });

    expect(res.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
