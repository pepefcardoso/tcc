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
    loginLimiter: rateLimit({
      windowMs: 1000,
      limit: 1,
      skip: () => false,
      handler: makeHandler('rate_limited', 'Too many login attempts. Please try again later.'),
    }),
  };
});

const { default: authRouter } = await import('../../src/routes/auth.js');
const { errorHandler } = await import('../../src/middleware/errorHandler.js');

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use(errorHandler);

describe('POST /api/auth/login Rate Limiting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. returns 429 when rate limit is exceeded', async () => {
    const res1 = await request(app).post('/api/auth/login').send({});
    expect(res1.status).toBe(422);

    const res2 = await request(app).post('/api/auth/login').send({});
    expect(res2.status).toBe(429);
    expect(res2.body).toEqual(
      expect.objectContaining({
        error: 'rate_limited',
        message: 'Too many login attempts. Please try again later.',
      })
    );
  });
});
