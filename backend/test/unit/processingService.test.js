import { jest } from '@jest/globals';

jest.unstable_mockModule('../../src/repositories/sessionRepository.js', () => ({
  insertGpsBatch: jest.fn(),
  insertImuBatch: jest.fn(),
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

  it('drain() flushes partial buffers', async () => {
    await processor.onRecord({ type: 'gps', time: 1 });
    await processor.onRecord({ type: 'gps', time: 2 });
    await processor.onRecord({ type: 'imu', time: 1 });

    expect(sessionRepository.insertGpsBatch).not.toHaveBeenCalled();
    expect(sessionRepository.insertImuBatch).not.toHaveBeenCalled();

    const stats = await processor.drain();

    expect(sessionRepository.insertGpsBatch).toHaveBeenCalledTimes(1);
    expect(sessionRepository.insertImuBatch).toHaveBeenCalledTimes(1);

    expect(stats).toEqual({ totalGps: 2, totalImu: 1 });
    expect(processor.totalGps).toBe(2);
    expect(processor.totalImu).toBe(1);
  });

  it('handles interleaved records without mixing them up', async () => {
    await processor.onRecord({ type: 'gps', time: 1 });
    await processor.onRecord({ type: 'imu', time: 1 });
    await processor.onRecord({ type: 'gps', time: 2 });
    await processor.onRecord({ type: 'imu', time: 2 });

    expect(processor.gpsBuffer.length).toBe(2);
    expect(processor.imuBuffer.length).toBe(2);

    await processor.drain();

    expect(sessionRepository.insertGpsBatch).toHaveBeenCalledWith(
      'test-session-id',
      expect.arrayContaining([expect.objectContaining({ type: 'gps' })]),
      mockPool
    );

    expect(sessionRepository.insertImuBatch).toHaveBeenCalledWith(
      'test-session-id',
      expect.arrayContaining([expect.objectContaining({ type: 'imu' })]),
      mockPool
    );
  });
});
