import { jest } from '@jest/globals';
import { z } from 'zod';
import { validate } from '../../src/middleware/validate.js';
import { AppError } from '../../src/middleware/errorHandler.js';

describe('Validate Middleware', () => {
  let req;
  let res;
  let next;

  const schema = z.object({
    pse: z.number().int().min(1).max(10),
  });

  beforeEach(() => {
    req = { body: {} };
    res = {};
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('1. calls next() without arguments when body matches schema', () => {
    req.body = { pse: 5 };
    const middleware = validate(schema);
    
    middleware(req, res, next);
    
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('2. writes coerced data back to req[target]', () => {
    const strictSchema = z.object({
      pse: z.number().int(),
    });
    req.body = { pse: 5, extra: 'should-be-removed' };
    const middleware = validate(strictSchema);
    
    middleware(req, res, next);
    
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body).toEqual({ pse: 5 });
  });

  it('3. missing required field throws AppError', () => {
    req.body = {};
    const middleware = validate(schema);
    
    middleware(req, res, next);
    
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(422);
    expect(err.errorCode).toBe('validation_error');
    expect(err.message).toContain('pse: Invalid input: expected number, received undefined');
  });

  it('4. out of range (too small) throws AppError', () => {
    req.body = { pse: 0 };
    const middleware = validate(schema);
    
    middleware(req, res, next);
    
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.message).toContain('pse: Too small: expected number to be >=1');
  });

  it('5. out of range (too big) throws AppError', () => {
    req.body = { pse: 11 };
    const middleware = validate(schema);
    
    middleware(req, res, next);
    
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.message).toContain('pse: Too big: expected number to be <=10');
  });

  it('6. validates req.params when target is params', () => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    req.params = { id: 'invalid-uuid' };
    const middleware = validate(paramsSchema, 'params');
    
    middleware(req, res, next);
    
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.message).toContain('id: Invalid UUID');
  });
});
