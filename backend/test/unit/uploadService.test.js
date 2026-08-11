import { jest } from '@jest/globals';
import fs from 'fs';

jest.unstable_mockModule('../../src/services/ndjsonReader.js', () => ({
  createNdjsonReadStream: jest.fn(),
}));

jest.unstable_mockModule('../../src/services/processingService.js', () => {
  return {
    ProcessingService: jest.fn().mockImplementation(() => {
      return {
        onRecord: jest.fn(),
        drain: jest.fn().mockResolvedValue({
          totalGps: 10,
          totalImu: 20,
          metrics: { total_distance_m: 100, max_speed_kmh: 25, sprint_count: 2, player_load: 50 },
        }),
      };
    }),
  };
});

jest.unstable_mockModule('../../src/repositories/sessionRepository.js', () => ({
  create: jest.fn(),
  markProcessed: jest.fn(),
  insertMetrics: jest.fn(),
  beginUploadTransaction: jest.fn(),
  rollbackAndRelease: jest.fn(),
}));

const ndjsonReader = await import('../../src/services/ndjsonReader.js');
const { ProcessingService } = await import('../../src/services/processingService.js');
const sessionRepository = await import('../../src/repositories/sessionRepository.js');
const uploadService = await import('../../src/services/uploadService.js');

describe('UploadService', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(fs, 'unlink').mockImplementation((path, cb) => cb(null));
    jest.spyOn(fs.promises, 'stat').mockResolvedValue({ size: 100 });

    mockClient = {
      query: jest.fn().mockResolvedValue(),
      release: jest.fn(),
    };
    sessionRepository.beginUploadTransaction.mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('orchestrates processing stream and returns processed session', async () => {
    sessionRepository.create.mockResolvedValue({ id: 'session-123' });

    const asyncIterable = {
      async *[Symbol.asyncIterator]() {
        yield { type: 'gps', time: 1 };
        yield { type: 'imu', time: 2 };
      },
    };
    ndjsonReader.createNdjsonReadStream.mockReturnValue(asyncIterable);

    const result = await uploadService.processUpload({
      filePath: '/tmp/test.ndjson',
      athleteId: 'athlete-123',
      sourceFilename: 'test.ndjson',
    });

    expect(sessionRepository.beginUploadTransaction).toHaveBeenCalledTimes(1);
    expect(sessionRepository.create).toHaveBeenCalledWith(
      {
        athlete_id: 'athlete-123',
        source_filename: 'test.ndjson',
      },
      mockClient
    );

    expect(ProcessingService).toHaveBeenCalledWith('session-123', mockClient);

    const mockProcessorInstance = ProcessingService.mock.results[0].value;
    expect(mockProcessorInstance.onRecord).toHaveBeenCalledTimes(2);
    expect(mockProcessorInstance.onRecord).toHaveBeenNthCalledWith(1, { type: 'gps', time: 1 });
    expect(mockProcessorInstance.onRecord).toHaveBeenNthCalledWith(2, { type: 'imu', time: 2 });

    expect(mockProcessorInstance.drain).toHaveBeenCalledTimes(1);

    expect(sessionRepository.insertMetrics).toHaveBeenCalledWith(
      'session-123',
      { total_distance_m: 100, max_speed_kmh: 25, sprint_count: 2, player_load: 50 },
      mockClient
    );
    expect(sessionRepository.markProcessed).toHaveBeenCalledWith('session-123', mockClient);

    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(mockClient.release).toHaveBeenCalledTimes(1);
    expect(sessionRepository.rollbackAndRelease).not.toHaveBeenCalled();

    expect(result).toEqual({
      session_id: 'session-123',
      status: 'processed',
      metrics: { total_distance_m: 100, max_speed_kmh: 25, sprint_count: 2, player_load: 50 },
    });

    expect(fs.unlink).toHaveBeenCalledWith('/tmp/test.ndjson', expect.any(Function));
  });

  it('rejects with 422 if file is empty and cleans up', async () => {
    jest.spyOn(fs.promises, 'stat').mockResolvedValue({ size: 0 });

    await expect(
      uploadService.processUpload({
        filePath: '/tmp/empty.ndjson',
        athleteId: 'athlete-123',
        sourceFilename: 'empty.ndjson',
      })
    ).rejects.toMatchObject({
      statusCode: 422,
      errorCode: 'validation_error',
    });

    expect(sessionRepository.beginUploadTransaction).not.toHaveBeenCalled();
    expect(sessionRepository.create).not.toHaveBeenCalled();
    expect(fs.unlink).toHaveBeenCalledWith('/tmp/empty.ndjson', expect.any(Function));
  });

  it('rejects with 415 if file contains no valid NDJSON records', async () => {
    sessionRepository.create.mockResolvedValue({ id: 'session-123' });

    ProcessingService.mockImplementationOnce(() => ({
      onRecord: jest.fn(),
      drain: jest.fn().mockResolvedValue({ totalGps: 0, totalImu: 0, metrics: null }),
    }));

    const asyncIterable = {
      async *[Symbol.asyncIterator]() {
        //
      },
    };
    ndjsonReader.createNdjsonReadStream.mockReturnValue(asyncIterable);

    await expect(
      uploadService.processUpload({
        filePath: '/tmp/test.ndjson',
        athleteId: 'athlete-123',
        sourceFilename: 'test.ndjson',
      })
    ).rejects.toMatchObject({
      statusCode: 415,
      errorCode: 'unsupported_media_type',
    });

    expect(sessionRepository.insertMetrics).not.toHaveBeenCalled();
    expect(mockClient.query).not.toHaveBeenCalledWith('COMMIT');
    expect(sessionRepository.rollbackAndRelease).toHaveBeenCalledWith(mockClient);
    expect(fs.unlink).toHaveBeenCalledWith('/tmp/test.ndjson', expect.any(Function));
  });

  it('rolls back and releases client if processing throws mid-stream', async () => {
    sessionRepository.create.mockResolvedValue({ id: 'session-123' });

    ProcessingService.mockImplementationOnce(() => ({
      onRecord: jest.fn().mockRejectedValue(new Error('Mid-stream DB Error')),
      drain: jest.fn(),
    }));

    const asyncIterable = {
      async *[Symbol.asyncIterator]() {
        yield { type: 'gps', time: 1 };
      },
    };
    ndjsonReader.createNdjsonReadStream.mockReturnValue(asyncIterable);

    await expect(
      uploadService.processUpload({
        filePath: '/tmp/test2.ndjson',
        athleteId: 'athlete-123',
        sourceFilename: 'test2.ndjson',
      })
    ).rejects.toThrow('Mid-stream DB Error');

    expect(sessionRepository.insertMetrics).not.toHaveBeenCalled();
    expect(mockClient.query).not.toHaveBeenCalledWith('COMMIT');
    expect(sessionRepository.rollbackAndRelease).toHaveBeenCalledWith(mockClient);
    expect(fs.unlink).toHaveBeenCalledWith('/tmp/test2.ndjson', expect.any(Function));
  });
});
