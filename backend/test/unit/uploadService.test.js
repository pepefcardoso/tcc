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
        drain: jest.fn().mockResolvedValue({ totalGps: 10, totalImu: 20 }),
      };
    }),
  };
});

jest.unstable_mockModule('../../src/repositories/sessionRepository.js', () => ({
  create: jest.fn(),
  markProcessed: jest.fn(),
}));

const ndjsonReader = await import('../../src/services/ndjsonReader.js');
const { ProcessingService } = await import('../../src/services/processingService.js');
const sessionRepository = await import('../../src/repositories/sessionRepository.js');
const uploadService = await import('../../src/services/uploadService.js');

describe('UploadService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(fs, 'unlink').mockImplementation((path, cb) => cb(null));
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

    expect(sessionRepository.create).toHaveBeenCalledWith({
      athlete_id: 'athlete-123',
      source_filename: 'test.ndjson',
    });

    expect(ProcessingService).toHaveBeenCalledWith('session-123');

    const mockProcessorInstance = ProcessingService.mock.results[0].value;
    expect(mockProcessorInstance.onRecord).toHaveBeenCalledTimes(2);
    expect(mockProcessorInstance.onRecord).toHaveBeenNthCalledWith(1, { type: 'gps', time: 1 });
    expect(mockProcessorInstance.onRecord).toHaveBeenNthCalledWith(2, { type: 'imu', time: 2 });

    expect(mockProcessorInstance.drain).toHaveBeenCalledTimes(1);

    expect(sessionRepository.markProcessed).toHaveBeenCalledWith('session-123');

    expect(result).toEqual({
      session_id: 'session-123',
      status: 'processed',
      metrics: null,
    });

    expect(fs.unlink).toHaveBeenCalledWith('/tmp/test.ndjson', expect.any(Function));
  });

  it('cleans up temp file even if processing throws', async () => {
    sessionRepository.create.mockRejectedValue(new Error('DB Error'));

    await expect(
      uploadService.processUpload({
        filePath: '/tmp/test2.ndjson',
        athleteId: 'athlete-123',
        sourceFilename: 'test2.ndjson',
      })
    ).rejects.toThrow('DB Error');

    expect(fs.unlink).toHaveBeenCalledWith('/tmp/test2.ndjson', expect.any(Function));
  });
});
