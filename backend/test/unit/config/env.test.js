import { jest } from '@jest/globals';
import { validate } from '../../../src/config/env.js';

describe('Environment Configuration Module', () => {
  let validEnv;

  beforeEach(() => {
    // A completely valid environment payload based on our schema
    validEnv = {
      DATABASE_URL: 'postgresql://test_user:pass@localhost:5432/test_db',
      JWT_USER_SECRET: 'this-is-a-valid-user-secret-with-at-least-32-chars',
      JWT_DEVICE_SECRET: 'this-is-a-valid-device-secret-with-at-least-32-chars',
      // We don't have to provide optionals like PORT, they should default
    };
  });

  it('validates and applies defaults for a valid environment', () => {
    const env = validate(validEnv);
    expect(env.DATABASE_URL).toBe(validEnv.DATABASE_URL);
    expect(env.PORT).toBe(3000); // Default applied
    expect(env.NODE_ENV).toBe('development'); // Default applied
    expect(env.PG_POOL_MAX).toBe(10);
  });

  it('coerces numeric strings into actual numbers', () => {
    validEnv.PORT = '4000';
    validEnv.PG_POOL_MAX = '20';
    
    const env = validate(validEnv);
    expect(env.PORT).toBe(4000);
    expect(env.PG_POOL_MAX).toBe(20);
  });

  it('throws an error if required variable DATABASE_URL is missing', () => {
    delete validEnv.DATABASE_URL;
    
    expect(() => validate(validEnv)).toThrow(/DATABASE_URL/);
  });

  it('throws an error if JWT_USER_SECRET is missing', () => {
    delete validEnv.JWT_USER_SECRET;
    
    expect(() => validate(validEnv)).toThrow(/JWT_USER_SECRET/);
  });

  it('throws an error if JWT_USER_SECRET is too short', () => {
    validEnv.JWT_USER_SECRET = 'too-short';
    
    expect(() => validate(validEnv)).toThrow(/JWT_USER_SECRET must be at least 32 characters long/);
  });

  it('throws an error if JWT_DEVICE_SECRET is the same as JWT_USER_SECRET', () => {
    validEnv.JWT_DEVICE_SECRET = validEnv.JWT_USER_SECRET; // Make them identical
    
    expect(() => validate(validEnv)).toThrow(/JWT_USER_SECRET and JWT_DEVICE_SECRET must be different/);
  });

  it('throws an error if NODE_ENV is invalid', () => {
    validEnv.NODE_ENV = 'staging'; // Not in enum ['development', 'test', 'production']
    
    expect(() => validate(validEnv)).toThrow(/NODE_ENV/);
  });
});
