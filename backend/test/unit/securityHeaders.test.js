import { jest } from '@jest/globals';
import request from 'supertest';

// Mock env.js to force CORS_ALLOWED_ORIGIN to a known value during test
jest.unstable_mockModule('../../src/config/env.js', () => ({
  env: {
    CORS_ALLOWED_ORIGIN: 'http://localhost:5173',
    NODE_ENV: 'test',
    UPLOAD_TMP_DIR: '/tmp/uploads',
    RATE_LIMIT_LOGIN_WINDOW_MS: 900000,
    RATE_LIMIT_LOGIN_MAX: 10,
    RATE_LIMIT_UPLOAD_WINDOW_MS: 900000,
    RATE_LIMIT_UPLOAD_MAX: 30,
  },
}));

const { default: app } = await import('../../src/app.js');

describe('Security Headers & CORS', () => {
  it('1. should return helmet security headers (CSP, X-Frame-Options, etc.)', async () => {
    const res = await request(app).get('/health');

    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('2. should allow CORS for the listed origin', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://localhost:5173');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('3. should NOT allow CORS for an unlisted origin', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://evil.example.com');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('4. should handle preflight (OPTIONS) for allowed origin correctly', async () => {
    const res = await request(app)
      .options('/health')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-methods']).toBe('GET,POST,PATCH,DELETE,OPTIONS');
  });

  it('5. should NOT handle preflight for an unlisted origin', async () => {
    const res = await request(app)
      .options('/health')
      .set('Origin', 'http://evil.example.com')
      .set('Access-Control-Request-Method', 'POST');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
