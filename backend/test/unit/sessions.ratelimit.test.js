import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

jest.unstable_mockModule('../../src/middleware/rateLimiter.js', async () => {
  const rateLimit = (await import('express-rate-limit')).default;
  const { AppError } = await import('../../src/middleware/errorHandler.js');

  const makeHandler = (errorCode, message) => {
    return (_req, _res, next) => next(new AppError(429, errorCode, message));
  };

  return {
    uploadLimiter: rateLimit({
      windowMs: 1000,
      limit: 1,
      skip: () => false,
      handler: makeHandler('rate_limited', 'Upload rate limit exceeded. Please try again later.'),
    }),
  };
});

jest.unstable_mockModule('../../src/middleware/multerUpload.js', () => ({
  upload: {
    single: jest.fn(() => (req, res, next) => next()),
  },
}));

const { default: sessionsRouter } = await import('../../src/routes/sessions.js');
const { errorHandler } = await import('../../src/middleware/errorHandler.js');

const app = express();
app.use(express.json());
app.use('/api/sessions', sessionsRouter);
app.use(errorHandler);

describe('POST /api/sessions/upload Rate Limiting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. returns 429 when rate limit is exceeded', async () => {
    const res1 = await request(app).post('/api/sessions/upload').send({});
    expect(res1.status).toBe(401);

    const res2 = await request(app).post('/api/sessions/upload').send({});
    expect(res2.status).toBe(429);
    expect(res2.body).toEqual(
      expect.objectContaining({
        error: 'rate_limited',
        message: 'Upload rate limit exceeded. Please try again later.',
      })
    );
  });
});
