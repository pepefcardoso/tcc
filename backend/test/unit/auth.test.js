import { jest } from '@jest/globals';
import { authMiddleware } from '../../src/middleware/auth.js';
import { signUserToken, signDeviceToken } from '../../src/utils/jwt.js';

describe('Auth Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it('returns 401 when Authorization header is missing', () => {
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'unauthorized' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header does not start with Bearer', () => {
    req.headers.authorization = 'Basic token123';
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Bearer prefix is present but token is empty', () => {
    req.headers.authorization = 'Bearer ';
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('populates req.user and calls next() for a valid user token', () => {
    const token = signUserToken({ sub: 'user-123', role: 'atleta' });
    req.headers.authorization = `Bearer ${token}`;
    
    authMiddleware(req, res, next);
    
    expect(req.user).toEqual({ sub: 'user-123', role: 'atleta' });
    expect(req.device).toBeUndefined();
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('populates req.device and calls next() for a valid device token', () => {
    const token = signDeviceToken({ sub: 'device-456' });
    req.headers.authorization = `Bearer ${token}`;
    
    authMiddleware(req, res, next);
    
    expect(req.device).toEqual({ sub: 'device-456' });
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 for an invalid token', () => {
    req.headers.authorization = 'Bearer invalid-token-string';
    authMiddleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'unauthorized',
      message: 'Invalid or expired token',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
