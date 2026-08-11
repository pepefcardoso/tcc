import { jest } from '@jest/globals';

jest.unstable_mockModule('../../src/repositories/sessionRepository.js', () => ({
  insertGpsBatch: jest.fn(),
  insertImuBatch: jest.fn(),
}));

const mockHaversineAccumulator = { push: jest.fn(), getTotal: jest.fn().mockReturnValue(100) };
jest.unstable_mockModule('../../src/services/metrics/haversineCalculator.js', () => ({
  createHaversineAccumulator: jest.fn().mockReturnValue(mockHaversineAccumulator),
}));

const mockMaxSpeedTracker = { push: jest.fn(), getMaxKmh: jest.fn().mockReturnValue(25) };
jest.unstable_mockModule('../../src/services/metrics/maxSpeedTracker.js', () => ({
  createMaxSpeedTracker: jest.fn().mockReturnValue(mockMaxSpeedTracker),
}));

const mockSprintDetector = { push: jest.fn(), flush: jest.fn().mockReturnValue(2) };
jest.unstable_mockModule('../../src/services/metrics/sprintDetector.js', () => ({
  createSprintDetector: jest.fn().mockReturnValue(mockSprintDetector),
}));

const mockPlayerLoadCalculator = { push: jest.fn(), getTotal: jest.fn().mockReturnValue(50) };
jest.unstable_mockModule('../../src/services/metrics/playerLoadCalculator.js', () => ({
  createPlayerLoadCalculator: jest.fn().mockReturnValue(mockPlayerLoadCalculator),
}));

const mockGpsFilter = { processRecord: jest.fn((r) => r) };
jest.unstable_mockModule('../../src/services/metrics/gpsFilter.js', () => ({
  createGpsFilter: jest.fn().mockReturnValue(mockGpsFilter),
}));

const mockGpsInterpolator = { push: jest.fn((r) => [r]) };
jest.unstable_mockModule('../../src/services/metrics/gpsInterpolator.js', () => ({
  createGpsInterpolator: jest.fn().mockReturnValue(mockGpsInterpolator),
}));

const sessionRepository = await import('../../src/repositories/sessionRepository.js');
const { ProcessingService } = await import('../../src/services/processingService.js');

describe('ProcessingService', () => {
  let processor;
  let mockPool;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = {};

    sessionRepository.insertGpsBatch.mockImplementation((id, samples) =>
      Promise.resolve(samples.length)
    );
    sessionRepository.insertImuBatch.mockImplementation((id, samples) =>
      Promise.resolve(samples.length)
    );

    processor = new ProcessingService('test-session-id', mockPool);

    processor.gpsBatchSize = 3;
    processor.imuBatchSize = 5;
  });

  it('buffers GPS records and flushes when batch size is reached', async () => {
    for (let i = 0; i < 2; i++) {
      await processor.onRecord({ type: 'gps', time: i });
    }
    expect(sessionRepository.insertGpsBatch).not.toHaveBeenCalled();

    await processor.onRecord({ type: 'gps', time: 2 });
    expect(sessionRepository.insertGpsBatch).toHaveBeenCalledTimes(1);
    expect(sessionRepository.insertGpsBatch).toHaveBeenCalledWith(
      'test-session-id',
      expect.any(Array),
      mockPool
    );

    expect(processor.gpsBuffer.length).toBe(0);
    expect(processor.totalGps).toBe(3);
  });

  it('buffers IMU records and flushes when batch size is reached', async () => {
    for (let i = 0; i < 4; i++) {
      await processor.onRecord({ type: 'imu', time: i });
    }
    expect(sessionRepository.insertImuBatch).not.toHaveBeenCalled();

    await processor.onRecord({ type: 'imu', time: 4 });
    expect(sessionRepository.insertImuBatch).toHaveBeenCalledTimes(1);
    expect(sessionRepository.insertImuBatch).toHaveBeenCalledWith(
      'test-session-id',
      expect.any(Array),
      mockPool
    );

    expect(processor.imuBuffer.length).toBe(0);
    expect(processor.totalImu).toBe(5);
  });

  it('drain() flushes partial buffers and returns computed metrics', async () => {
    await processor.onRecord({ type: 'gps', time: 1 });
    await processor.onRecord({ type: 'gps', time: 2 });
    await processor.onRecord({ type: 'imu', time: 1 });

    expect(sessionRepository.insertGpsBatch).not.toHaveBeenCalled();
    expect(sessionRepository.insertImuBatch).not.toHaveBeenCalled();

    const stats = await processor.drain();

    expect(sessionRepository.insertGpsBatch).toHaveBeenCalledTimes(1);
    expect(sessionRepository.insertImuBatch).toHaveBeenCalledTimes(1);

    expect(stats).toEqual({
      totalGps: 2,
      totalImu: 1,
      metrics: {
        total_distance_m: 100,
        max_speed_kmh: 25,
        sprint_count: 2,
        player_load: 50,
      },
    });
    expect(mockSprintDetector.flush).toHaveBeenCalledTimes(1);
  });

  it('calls calculator push methods for GPS records', async () => {
    const gpsRecord = { type: 'gps', time: 1, speed_ms: 5 };
    await processor.onRecord(gpsRecord);

    expect(mockGpsFilter.processRecord).toHaveBeenCalledWith(gpsRecord);
    expect(mockGpsInterpolator.push).toHaveBeenCalledWith(gpsRecord);
    expect(mockHaversineAccumulator.push).toHaveBeenCalledWith(gpsRecord);
    expect(mockMaxSpeedTracker.push).toHaveBeenCalledWith(gpsRecord);
    expect(mockSprintDetector.push).toHaveBeenCalledWith(gpsRecord);
  });

  it('skips invalid GPS records (filtered out by gpsFilter)', async () => {
    mockGpsFilter.processRecord.mockReturnValueOnce(null);
    const gpsRecord = { type: 'gps', time: 1, speed_ms: 5 };

    await processor.onRecord(gpsRecord);

    expect(mockGpsFilter.processRecord).toHaveBeenCalledWith(gpsRecord);
    expect(mockGpsInterpolator.push).not.toHaveBeenCalled();
    expect(mockHaversineAccumulator.push).not.toHaveBeenCalled();

    expect(processor.gpsBuffer.length).toBe(1);
  });

  it('IMU records feed playerLoadCalc', async () => {
    const imuRecord = { type: 'imu', time: 1, ac_x: 0.1, ac_y: 0.2, ac_z: 0.98 };
    await processor.onRecord(imuRecord);
    expect(mockPlayerLoadCalculator.push).toHaveBeenCalledWith(imuRecord);
  });
});
