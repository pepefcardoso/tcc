import { jest } from '@jest/globals';
import * as sessionRepository from '../../src/repositories/sessionRepository.js';

describe('SessionRepository', () => {
  let mockPool;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByFilename', () => {
    it('returns session with mapped metrics when found', async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: '123',
            source_filename: 'test.ndjson',
            total_distance_m: '1500.5',
            max_speed_kmh: '25.2',
            sprint_count: '3',
            player_load: '120.4',
            session_load: '80.0',
          },
        ],
      });

      const result = await sessionRepository.findByFilename('test.ndjson', mockPool);

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [
        'test.ndjson',
      ]);
      expect(result.id).toBe('123');
      expect(result.metrics).toEqual({
        total_distance_m: 1500.5,
        max_speed_kmh: 25.2,
        sprint_count: 3,
        player_load: 120.4,
      });
      expect(result.session_load).toBe(80.0);
    });

    it('returns null if not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });
      const result = await sessionRepository.findByFilename('not-found.ndjson', mockPool);
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('inserts and returns new session', async () => {
      const sessionData = { athlete_id: 'a1', source_filename: 'new.ndjson' };
      mockPool.query.mockResolvedValue({ rows: [{ id: 's1', ...sessionData }] });

      const result = await sessionRepository.create(sessionData, mockPool);

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO sessions'), [
        'a1',
        'new.ndjson',
      ]);
      expect(result.id).toBe('s1');
    });
  });

  describe('insertGpsBatch', () => {
    it('returns 0 immediately if samples array is empty', async () => {
      const result = await sessionRepository.insertGpsBatch('s1', [], mockPool);
      expect(result).toBe(0);
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('executes parameterized multi-row insert for a single sample', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 1 });

      const samples = [{ time: 1700000000000, latitude: -23.5, longitude: -46.6, speed_ms: 3.1 }];

      const result = await sessionRepository.insertGpsBatch('s1', samples, mockPool);

      expect(result).toBe(1);
      expect(mockPool.query).toHaveBeenCalledTimes(1);

      const queryText = mockPool.query.mock.calls[0][0];
      const queryValues = mockPool.query.mock.calls[0][1];

      expect(queryText).toContain('INSERT INTO gps_samples');
      expect(queryText).toContain('VALUES ($1, $2, $3, $4, $5)');

      expect(queryValues).toHaveLength(5);
      expect(queryValues[0]).toBe('s1');
      expect(queryValues[1]).toBeInstanceOf(Date);
      expect(queryValues[1].getTime()).toBe(1700000000000);
      expect(queryValues[2]).toBe(-23.5);
      expect(queryValues[3]).toBe(-46.6);
      expect(queryValues[4]).toBe(3.1);
    });

    it('executes parameterized multi-row insert for multiple samples', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 3 });

      const samples = [
        { time: 1000, latitude: -23.1, longitude: -46.1, speed_ms: 1.1 },
        { time: 2000, latitude: -23.2, longitude: -46.2, speed_ms: 2.2 },
        { time: 3000, latitude: -23.3, longitude: -46.3, speed_ms: 3.3 },
      ];

      const result = await sessionRepository.insertGpsBatch('s1', samples, mockPool);

      expect(result).toBe(3);

      const queryText = mockPool.query.mock.calls[0][0];
      const queryValues = mockPool.query.mock.calls[0][1];

      expect(queryText).toContain(
        '($1, $2, $3, $4, $5), ($6, $7, $8, $9, $10), ($11, $12, $13, $14, $15)'
      );
      expect(queryValues).toHaveLength(15);

      expect(queryValues[10]).toBe('s1');
      expect(queryValues[11].getTime()).toBe(3000);
      expect(queryValues[12]).toBe(-23.3);
      expect(queryValues[13]).toBe(-46.3);
      expect(queryValues[14]).toBe(3.3);
    });
  });

  describe('insertImuBatch', () => {
    it('returns 0 immediately if samples array is empty', async () => {
      const result = await sessionRepository.insertImuBatch('s1', [], mockPool);
      expect(result).toBe(0);
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('executes parameterized multi-row insert for a single sample', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 1 });

      const samples = [
        {
          time: 1700000000010,
          ac_x: 0.01,
          ac_y: 0.02,
          ac_z: 0.98,
          gy_x: 0.1,
          gy_y: 0.0,
          gy_z: 0.0,
        },
      ];

      const result = await sessionRepository.insertImuBatch('s1', samples, mockPool);

      expect(result).toBe(1);
      expect(mockPool.query).toHaveBeenCalledTimes(1);

      const queryText = mockPool.query.mock.calls[0][0];
      const queryValues = mockPool.query.mock.calls[0][1];

      expect(queryText).toContain('INSERT INTO imu_samples');
      expect(queryText).toContain('VALUES ($1, $2, $3, $4, $5, $6, $7, $8)');

      expect(queryValues).toHaveLength(8);
      expect(queryValues[0]).toBe('s1');
      expect(queryValues[1]).toBeInstanceOf(Date);
      expect(queryValues[1].getTime()).toBe(1700000000010);
      expect(queryValues[2]).toBe(0.01);
      expect(queryValues[3]).toBe(0.02);
      expect(queryValues[4]).toBe(0.98);
      expect(queryValues[5]).toBe(0.1);
      expect(queryValues[6]).toBe(0.0);
      expect(queryValues[7]).toBe(0.0);
    });

    it('executes parameterized multi-row insert for multiple samples', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 2 });

      const samples = [
        { time: 1000, ac_x: 0.01, ac_y: 0.02, ac_z: 0.98, gy_x: 0.1, gy_y: 0.0, gy_z: 0.0 },
        { time: 2000, ac_x: 0.02, ac_y: 0.03, ac_z: 0.97, gy_x: 0.0, gy_y: 0.1, gy_z: 0.0 },
      ];

      const result = await sessionRepository.insertImuBatch('s1', samples, mockPool);

      expect(result).toBe(2);

      const queryText = mockPool.query.mock.calls[0][0];
      const queryValues = mockPool.query.mock.calls[0][1];

      expect(queryText).toContain(
        '($1, $2, $3, $4, $5, $6, $7, $8), ($9, $10, $11, $12, $13, $14, $15, $16)'
      );
      expect(queryValues).toHaveLength(16);

      expect(queryValues[8]).toBe('s1');
      expect(queryValues[9].getTime()).toBe(2000);
      expect(queryValues[10]).toBe(0.02);
      expect(queryValues[11]).toBe(0.03);
      expect(queryValues[12]).toBe(0.97);
      expect(queryValues[13]).toBe(0.0);
      expect(queryValues[14]).toBe(0.1);
      expect(queryValues[15]).toBe(0.0);
    });
  });

  describe('findById', () => {
    it('returns session with mapped metrics when found', async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: '123',
            source_filename: 'test.ndjson',
            total_distance_m: '1500.5',
            max_speed_kmh: '25.2',
            sprint_count: '3',
            player_load: '120.4',
            session_load: '80.0',
          },
        ],
      });

      const result = await sessionRepository.findById('123', mockPool);

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), ['123']);
      expect(result.id).toBe('123');
      expect(result.total_distance_m).toBe('1500.5');
    });

    it('returns null if not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });
      const result = await sessionRepository.findById('999', mockPool);
      expect(result).toBeNull();
    });
  });

  describe('updatePse', () => {
    it('updates pse and session_load and returns the updated row', async () => {
      const updatedRow = { id: '123', pse: 7, session_load: 630.00, duration_minutes: 90, athlete_id: 'a1' };
      mockPool.query.mockResolvedValue({ rows: [updatedRow] });

      const result = await sessionRepository.updatePse('123', 7, 630.00, mockPool);

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE sessions'), ['123', 7, 630.00]);
      expect(result).toEqual(updatedRow);
    });

    it('returns null if session not found (no rows updated)', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });
      const result = await sessionRepository.updatePse('999', 7, 630.00, mockPool);
      expect(result).toBeNull();
    });
  });
});
