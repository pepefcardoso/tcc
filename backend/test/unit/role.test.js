import { jest } from '@jest/globals';
import { requireRole } from '../../src/middleware/role.js';

describe('Role Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it('1. returns 403 when req.user is undefined (e.g. device token or missing auth)', () => {
    const middleware = requireRole('tecnico');
    middleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'forbidden', message: 'Insufficient role' });
    expect(next).not.toHaveBeenCalled();
  });

  it('2. returns 403 when req.user.role is not in the allowed roles list', () => {
    req.user = { role: 'atleta' };
    const middleware = requireRole('tecnico', 'preparador');
    middleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'forbidden', message: 'Insufficient role' });
    expect(next).not.toHaveBeenCalled();
  });

  it('3. calls next() when req.user.role matches one of the allowed roles', () => {
    req.user = { role: 'tecnico' };
    const middleware = requireRole('tecnico');
    middleware(req, res, next);
    
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('4. Single-role guard — requireRole(\'tecnico\'), caller is \'atleta\' -> 403', () => {
    req.user = { role: 'atleta' };
    const middleware = requireRole('tecnico');
    middleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('5. Single-role guard — requireRole(\'atleta\'), caller is \'atleta\' -> next()', () => {
    req.user = { role: 'atleta' };
    const middleware = requireRole('atleta');
    middleware(req, res, next);
    
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('6. Multi-role guard — requireRole(\'tecnico\', \'preparador\'), caller is \'tecnico\' -> next()', () => {
    req.user = { role: 'tecnico' };
    const middleware = requireRole('tecnico', 'preparador');
    middleware(req, res, next);
    
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('7. Multi-role guard — requireRole(\'tecnico\', \'preparador\'), caller is \'preparador\' -> next()', () => {
    req.user = { role: 'preparador' };
    const middleware = requireRole('tecnico', 'preparador');
    middleware(req, res, next);
    
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('8. Multi-role guard — requireRole(\'tecnico\', \'preparador\'), caller is \'atleta\' -> 403', () => {
    req.user = { role: 'atleta' };
    const middleware = requireRole('tecnico', 'preparador');
    middleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
