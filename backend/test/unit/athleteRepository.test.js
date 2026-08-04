import { jest } from '@jest/globals';
import * as athleteRepository from '../../src/repositories/athleteRepository.js';

describe('AthleteRepository', () => {
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
    it('returns athlete if found', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ id: '123', name: 'Test Athlete' }] });
      const result = await athleteRepository.findById('123', mockPool);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM athletes WHERE id = $1', ['123']);
      expect(result).toEqual({ id: '123', name: 'Test Athlete' });
    });

    it('returns null if not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });
      const result = await athleteRepository.findById('999', mockPool);
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('queries active athletes by default', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ id: '123' }] });
      await athleteRepository.findAll({}, mockPool);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM athletes WHERE active = true ORDER BY name');
    });

    it('queries all athletes if includeInactive is true', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ id: '123' }, { id: '456' }] });
      await athleteRepository.findAll({ includeInactive: true }, mockPool);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM athletes ORDER BY name');
    });
  });

  describe('create', () => {
    it('inserts and returns new athlete', async () => {
      const athleteData = {
        name: 'New Athlete',
        position: 'Forward',
        birth_date: '2000-01-01',
        weight_kg: 70.5,
        height_m: 1.8,
      };
      mockPool.query.mockResolvedValue({ rows: [{ id: 'new-123', ...athleteData }] });
      
      const result = await athleteRepository.create(athleteData, mockPool);
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO athletes'),
        [athleteData.name, athleteData.position, athleteData.birth_date, athleteData.weight_kg, athleteData.height_m]
      );
      expect(result.id).toBe('new-123');
    });
  });

  describe('update', () => {
    it('builds dynamic SET clause and returns updated athlete', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ id: '123', name: 'Updated Name', position: 'Midfielder' }] });
      
      const result = await athleteRepository.update('123', { name: 'Updated Name', position: 'Midfielder', unknown: 'ignored' }, mockPool);
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE athletes'),
        ['123', 'Updated Name', 'Midfielder']
      );
      expect(mockPool.query.mock.calls[0][0]).toContain('name = $2');
      expect(mockPool.query.mock.calls[0][0]).toContain('position = $3');
      expect(result.name).toBe('Updated Name');
    });

    it('returns null if athlete not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });
      const result = await athleteRepository.update('999', { name: 'test' }, mockPool);
      expect(result).toBeNull();
    });
  });

  describe('deactivate', () => {
    it('sets active = false', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ id: '123', active: false }] });
      const result = await athleteRepository.deactivate('123', mockPool);
      
      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE athletes SET active = false WHERE id = $1 RETURNING *',
        ['123']
      );
      expect(result.active).toBe(false);
    });
  });
});
