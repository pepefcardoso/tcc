import { jest } from '@jest/globals';
import { errorHandler, AppError } from '../../src/middleware/errorHandler.js';

describe('Global Error Handler Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {};
    res = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('1. delegates to next(err) if response headers were already sent', () => {
    res.headersSent = true;
    const error = new Error('Stream error');
    
    errorHandler(error, req, res, next);
    
    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('2. handles AppError and maps it correctly', () => {
    const error = new AppError(404, 'not_found', 'Athlete not found');
    
    errorHandler(error, req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'not_found',
      message: 'Athlete not found',
      stack: expect.any(String),
    });
  });

  it('3. maps Express body-parser SyntaxError to 400 bad_request', () => {
    const error = new SyntaxError('Unexpected token');
    error.status = 400;
    
    errorHandler(error, req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'bad_request',
      message: 'Malformed JSON body',
    });
  });

  it('4. maps multer payload too large to 413', () => {
    const error = new Error('Payload too large');
    error.type = 'entity.too.large';
    
    errorHandler(error, req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({
      error: 'file_too_large',
      message: 'Payload too large',
    });
  });
  
  it('4b. maps status 413 error to 413 file_too_large', () => {
    const error = new Error('Payload too large');
    error.status = 413;
    
    errorHandler(error, req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({
      error: 'file_too_large',
      message: 'Payload too large',
    });
  });

  it('5. handles generic Error by returning 500 internal_error and logging to console', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('Database disconnected');
    
    errorHandler(error, req, res, next);
    
    expect(consoleSpy).toHaveBeenCalledWith('[Unhandled Error]', error);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'internal_error',
      message: 'An unexpected internal server error occurred',
      stack: expect.any(String),
    });
    
    consoleSpy.mockRestore();
  });

  it('6. omits stack trace in production environment for AppError', () => {
    process.env.NODE_ENV = 'production';
    const error = new AppError(422, 'validation_error', 'Field missing');
    
    errorHandler(error, req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      error: 'validation_error',
      message: 'Field missing',
    });
  });

  it('7. omits stack trace in production environment for 500 unhandled errors', () => {
    process.env.NODE_ENV = 'production';
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('Boom');
    
    errorHandler(error, req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'internal_error',
      message: 'An unexpected internal server error occurred',
    });
    
    consoleSpy.mockRestore();
  });
});
