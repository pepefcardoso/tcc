import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { signUserToken, verifyUserToken, signDeviceToken, verifyDeviceToken } from '../../src/utils/jwt.js';
import { env } from '../../src/config/env.js';

describe('JWT Utility (User Tokens)', () => {
  const mockPayload = { sub: 'test-user-id', role: 'atleta' };

  it('signUserToken returns a non-empty string', () => {
    const token = signUserToken(mockPayload);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('verifyUserToken on a freshly-signed token decodes { sub, role } correctly', () => {
    const token = signUserToken(mockPayload);
    const decoded = verifyUserToken(token);

    expect(decoded.sub).toBe(mockPayload.sub);
    expect(decoded.role).toBe(mockPayload.role);
    expect(decoded.type).toBe('user');
    expect(decoded.exp).toBeDefined();
    expect(decoded.iat).toBeDefined();
  });

  it('verifyUserToken on an expired token throws TokenExpiredError', () => {
    const expiredToken = jwt.sign(
      { sub: mockPayload.sub, role: mockPayload.role, type: 'user' },
      env.JWT_USER_SECRET,
      { expiresIn: 0 }
    );

    expect(() => verifyUserToken(expiredToken)).toThrow('jwt expired');
    try {
      verifyUserToken(expiredToken);
    } catch (err) {
      expect(err.name).toBe('TokenExpiredError');
    }
  });

  it('verifyUserToken on a tampered token (wrong secret) throws JsonWebTokenError', () => {
    const tamperedToken = jwt.sign(
      { sub: mockPayload.sub, role: mockPayload.role, type: 'user' },
      'wrong-secret-key-12345678901234567890'
    );

    expect(() => verifyUserToken(tamperedToken)).toThrow('invalid signature');
  });

  it("verifyUserToken on a token signed with user secret but type: 'device' throws", () => {
    const wrongTypeToken = jwt.sign({ sub: 'device-id', type: 'device' }, env.JWT_USER_SECRET);

    expect(() => verifyUserToken(wrongTypeToken)).toThrow('Invalid token type');
    try {
      verifyUserToken(wrongTypeToken);
    } catch (err) {
      expect(err.name).toBe('JsonWebTokenError');
    }
  });

  it('returned payload contains both sub and role matching the input values', () => {
    const token = signUserToken({ sub: 'uuid-123', role: 'tecnico' });
    const decoded = verifyUserToken(token);

    expect(decoded).toMatchObject({
      sub: 'uuid-123',
      role: 'tecnico',
    });
  });

  it('verifyUserToken on a token signed with device secret (type: "device") throws', () => {
    const deviceToken = signDeviceToken({ sub: 'device-id' });
    expect(() => verifyUserToken(deviceToken)).toThrow('invalid signature');
  });
});

describe('JWT Utility (Device Tokens)', () => {
  const mockPayload = { sub: 'esp32-device-001' };

  it('signDeviceToken returns a non-empty string', () => {
    const token = signDeviceToken(mockPayload);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('verifyDeviceToken on a freshly-signed token decodes { sub, type } correctly', () => {
    const token = signDeviceToken(mockPayload);
    const decoded = verifyDeviceToken(token);

    expect(decoded.sub).toBe(mockPayload.sub);
    expect(decoded.type).toBe('device');
    expect(decoded.exp).toBeDefined();
    expect(decoded.iat).toBeDefined();
  });

  it('verifyDeviceToken on an expired token throws TokenExpiredError', () => {
    const expiredToken = jwt.sign(
      { sub: mockPayload.sub, type: 'device' },
      env.JWT_DEVICE_SECRET,
      { expiresIn: 0 }
    );

    expect(() => verifyDeviceToken(expiredToken)).toThrow('jwt expired');
    try {
      verifyDeviceToken(expiredToken);
    } catch (err) {
      expect(err.name).toBe('TokenExpiredError');
    }
  });

  it('verifyDeviceToken on a tampered token (wrong secret) throws JsonWebTokenError', () => {
    const tamperedToken = jwt.sign(
      { sub: mockPayload.sub, type: 'device' },
      'wrong-device-secret-key-1234567890'
    );

    expect(() => verifyDeviceToken(tamperedToken)).toThrow('invalid signature');
  });

  it('verifyDeviceToken on a token signed with user secret (type: "user") throws', () => {
    const userToken = signUserToken({ sub: 'user-id', role: 'tecnico' });
    expect(() => verifyDeviceToken(userToken)).toThrow('invalid signature');
  });

  it("verifyDeviceToken on a token signed with device secret but type: 'user' throws", () => {
    const wrongTypeToken = jwt.sign({ sub: 'device-id', type: 'user' }, env.JWT_DEVICE_SECRET);

    expect(() => verifyDeviceToken(wrongTypeToken)).toThrow('Invalid token type');
    try {
      verifyDeviceToken(wrongTypeToken);
    } catch (err) {
      expect(err.name).toBe('JsonWebTokenError');
    }
  });
});
