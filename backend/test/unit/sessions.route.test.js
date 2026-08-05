import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

jest.unstable_mockModule('../../src/utils/jwt.js', () => ({
  verifyUserToken: jest.fn(),
  verifyDeviceToken: jest.fn(),
}));

const mockUploadMiddleware = jest.fn((req, res, next) => next());

jest.unstable_mockModule('../../src/middleware/multerUpload.js', () => ({
  upload: {
    single: jest.fn(() => mockUploadMiddleware),
  },
}));

const jwtUtil = await import('../../src/utils/jwt.js');
const multerUpload = await import('../../src/middleware/multerUpload.js');
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

  it('2. returns 401 if valid user token is provided (requires device token)', async () => {
    jwtUtil.verifyUserToken.mockReturnValue({ sub: 'user-123', role: 'tecnico' });

    const res = await request(app)
      .post('/api/sessions/upload')
      .set('Authorization', 'Bearer user-token')
      .send({});

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthorized');
    expect(res.body.message).toBe('This route requires a device token');
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

  it('6. returns 200 with stub response if everything is valid', async () => {
    jwtUtil.verifyUserToken.mockImplementation(() => {
      const err = new Error('Invalid token type');
      err.name = 'JsonWebTokenError';
      throw err;
    });
    jwtUtil.verifyDeviceToken.mockReturnValue({ sub: 'device-123' });

    mockUploadMiddleware.mockImplementation((req, res, next) => {
      req.file = { path: '/tmp/uploads/SESSAO_20260805_120000_device123.ndjson' };
      req.body = { athlete_id: '123e4567-e89b-12d3-a456-426614174000' };
      next();
    });

    const res = await request(app)
      .post('/api/sessions/upload')
      .set('Authorization', 'Bearer device-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      session_id: null,
      status: 'queued',
      file_path: '/tmp/uploads/SESSAO_20260805_120000_device123.ndjson',
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
});
