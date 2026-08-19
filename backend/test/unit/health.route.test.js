import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

jest.unstable_mockModule('../../src/repositories/healthRepository.js', () => ({
  checkDbConnectivity: jest.fn(),
}));

const healthRepository = await import('../../src/repositories/healthRepository.js');
const { default: healthRouter } = await import('../../src/routes/health.js');

const app = express();
app.use(express.json());
app.use('/health', healthRouter);
const { errorHandler } = await import('../../src/middleware/errorHandler.js');
app.use(errorHandler);

describe('GET /health', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('1. returns 200 { status: "ok", db: "connected" } on success', async () => {
    healthRepository.checkDbConnectivity.mockResolvedValue(true);

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'ok',
      db: 'connected',
    });
    expect(healthRepository.checkDbConnectivity).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('2. returns 503 { status: "degraded", db: "unreachable" } on failure', async () => {
    healthRepository.checkDbConnectivity.mockRejectedValue(new Error('Connection refused'));

    const res = await request(app).get('/health');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      status: 'degraded',
      db: 'unreachable',
    });
    expect(healthRepository.checkDbConnectivity).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith('[Health] DB unreachable:', 'Connection refused');
  });

  it('3. does not require authorization header', async () => {
    healthRepository.checkDbConnectivity.mockResolvedValue(true);

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
  });
});
