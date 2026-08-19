import { jest } from '@jest/globals';
import { loginLimiter, uploadLimiter } from '../../src/middleware/rateLimiter.js';

describe('rateLimiter middleware', () => {
  it('1. loginLimiter should be a function', () => {
    expect(typeof loginLimiter).toBe('function');
  });

  it('2. uploadLimiter should be a function', () => {
    expect(typeof uploadLimiter).toBe('function');
  });
});
