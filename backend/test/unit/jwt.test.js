import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { signUserToken, verifyUserToken } from '../../src/utils/jwt.js';
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
});
