import { jest } from '@jest/globals';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

jest.unstable_mockModule('../../src/repositories/sessionRepository.js', () => ({
  insertGpsBatch: jest.fn().mockResolvedValue(0),
  insertImuBatch: jest.fn().mockResolvedValue(0),
}));

const { createNdjsonReadStream } = await import('../../src/services/ndjsonReader.js');
const { ProcessingService } = await import('../../src/services/processingService.js');
const { _resetHdopWarnFlag } = await import('../../src/services/metrics/gpsFilter.js');
const { _resetTimestampWarnFlag: _resetTimestampWarnFlagInterp } =
  await import('../../src/services/metrics/gpsInterpolator.js');
const { _resetTimestampWarnFlag: _resetTimestampWarnFlagSprint } =
  await import('../../src/services/metrics/sprintDetector.js');

describe('ProcessingService E2E (Pure Math)', () => {
  let mockPool;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = {};
    _resetHdopWarnFlag();
    _resetTimestampWarnFlagInterp();
    _resetTimestampWarnFlagSprint();
  });

  it('processes sprint_session.ndjson and produces expected metrics', async () => {
    const processor = new ProcessingService('test-session-e2e', mockPool);
    const fixturePath = path.join(__dirname, '../fixtures/sprint_session.ndjson');
    const stream = createNdjsonReadStream(fixturePath);

    for await (const record of stream) {
      await processor.onRecord(record);
    }

    const { metrics } = await processor.drain();

    expect(metrics.max_speed_kmh).toBeCloseTo(28.8, 2);

    expect(metrics.sprint_count).toBe(1);

    expect(metrics.total_distance_m).toBeGreaterThan(170);
    expect(metrics.total_distance_m).toBeLessThan(180);

    expect(metrics.player_load).toBeGreaterThanOrEqual(0);
    expect(metrics.player_load).toBeLessThan(1);
  });

  it('handles truncated_session.ndjson without throwing', async () => {
    const processor = new ProcessingService('test-session-trunc', mockPool);
    const fixturePath = path.join(__dirname, '../fixtures/truncated_session.ndjson');
    const stream = createNdjsonReadStream(fixturePath);

    for await (const record of stream) {
      await processor.onRecord(record);
    }

    const { metrics } = await processor.drain();

    expect(metrics).toBeDefined();
    expect(metrics.total_distance_m).toBeGreaterThan(0);
  });
});
