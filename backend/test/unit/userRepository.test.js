import { jest } from '@jest/globals';
import * as userRepository from '../../src/repositories/userRepository.js';

describe('UserRepository', () => {
  let mockPool;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('returns user without password_hash', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ id: '123', email: 'test@test.com' }] });
      const result = await userRepository.findById('123', mockPool);
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, email, role, athlete_id, created_at FROM users WHERE id = $1'),
        ['123']
      );
      expect(result).toEqual({ id: '123', email: 'test@test.com' });
    });

    it('returns null if not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });
      const result = await userRepository.findById('999', mockPool);
      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('returns full user including password_hash', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ id: '123', email: 'test@test.com', password_hash: 'hashed' }] });
      const result = await userRepository.findByEmail('test@test.com', mockPool);
      
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE email = $1', ['test@test.com']);
      expect(result.password_hash).toBe('hashed');
    });
  });

  describe('create', () => {
    it('inserts and returns new user without password_hash', async () => {
      const userData = {
        email: 'new@test.com',
        password_hash: 'hashed123',
        role: 'tecnico',
        athlete_id: null,
      };
      mockPool.query.mockResolvedValue({ rows: [{ id: 'new-123', email: 'new@test.com', role: 'tecnico', athlete_id: null }] });
      
      const result = await userRepository.create(userData, mockPool);
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        [userData.email, userData.password_hash, userData.role, userData.athlete_id]
      );
      expect(mockPool.query.mock.calls[0][0]).toContain('RETURNING id, email, role, athlete_id, created_at');
      expect(result.password_hash).toBeUndefined();
    });
  });

  describe('update', () => {
    it('updates allowed fields and returns user without password_hash', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ id: '123', email: 'updated@test.com' }] });
      
      const result = await userRepository.update('123', { email: 'updated@test.com', ignored: 'val' }, mockPool);
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        ['123', 'updated@test.com']
      );
      expect(mockPool.query.mock.calls[0][0]).toContain('email = $2');
      expect(mockPool.query.mock.calls[0][0]).toContain('RETURNING id, email, role, athlete_id, created_at');
      expect(result.email).toBe('updated@test.com');
    });
  });
});
