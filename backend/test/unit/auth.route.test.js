import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

jest.unstable_mockModule('../../src/repositories/userRepository.js', () => ({
  findByEmail: jest.fn(),
}));

jest.unstable_mockModule('../../src/utils/password.js', () => ({
  comparePassword: jest.fn(),
}));

jest.unstable_mockModule('../../src/utils/jwt.js', () => ({
  signUserToken: jest.fn(),
}));

const userRepository = await import('../../src/repositories/userRepository.js');
const passwordUtil = await import('../../src/utils/password.js');
const jwtUtil = await import('../../src/utils/jwt.js');
const { default: authRouter } = await import('../../src/routes/auth.js');

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
const { errorHandler } = await import('../../src/middleware/errorHandler.js');
app.use(errorHandler);

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. returns 422 if email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'password123' });

    expect(res.status).toBe(422);
    expect(res.body).toEqual(expect.objectContaining({
      error: 'validation_error',
      message: 'Validation failed: email: Invalid input: expected string, received undefined',
    }));
  });

  it('2. returns 422 if password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(422);
    expect(res.body).toEqual(expect.objectContaining({
      error: 'validation_error',
      message: 'Validation failed: password: Invalid input: expected string, received undefined',
    }));
  });

  it('3. returns 422 if body is empty', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('validation_error');
    expect(res.body.message).toContain('email: Invalid input: expected string, received undefined');
    expect(res.body.message).toContain('password: Invalid input: expected string, received undefined');
  });

  it('4. returns 401 if user is not found', async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'unknown@example.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: 'invalid_credentials',
      message: 'Invalid email or password',
    });
    expect(userRepository.findByEmail).toHaveBeenCalledWith('unknown@example.com');
    expect(passwordUtil.comparePassword).not.toHaveBeenCalled();
  });

  it('5. returns 401 if password mismatch', async () => {
    userRepository.findByEmail.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      password_hash: 'hashed-password',
      role: 'atleta',
    });
    passwordUtil.comparePassword.mockResolvedValue(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: 'invalid_credentials',
      message: 'Invalid email or password',
    });
    expect(userRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
    expect(passwordUtil.comparePassword).toHaveBeenCalledWith('wrongpassword', 'hashed-password');
  });

  it('6. returns 200 with token and safe user object on success', async () => {
    userRepository.findByEmail.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      password_hash: 'hashed-password',
      role: 'atleta',
    });
    passwordUtil.comparePassword.mockResolvedValue(true);
    jwtUtil.signUserToken.mockReturnValue('mocked-jwt-token');

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'correctpassword' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      token: 'mocked-jwt-token',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        role: 'atleta',
      },
    });
    
    expect(res.body.user.password_hash).toBeUndefined();
    
    expect(userRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
    expect(passwordUtil.comparePassword).toHaveBeenCalledWith('correctpassword', 'hashed-password');
    expect(jwtUtil.signUserToken).toHaveBeenCalledWith({ sub: 'user-123', role: 'atleta' });
  });

  it('8. returns 500 if database throws an unexpected error', async () => {
    userRepository.findByEmail.mockRejectedValue(new Error('DB failure'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'error@example.com', password: 'password123' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual(expect.objectContaining({
      error: 'internal_error',
      message: 'An unexpected internal server error occurred',
    }));

    consoleSpy.mockRestore();
  });
});
