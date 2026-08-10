import { jest } from '@jest/globals';
import {
  passesHdopFilter,
  createMedianSpeedFilter,
  createGpsFilter,
  _resetHdopWarnFlag,
} from '../../src/services/metrics/gpsFilter.js';

let consoleWarnSpy;

beforeAll(() => {
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  consoleWarnSpy.mockRestore();
});

beforeEach(() => {
  consoleWarnSpy.mockClear();
  _resetHdopWarnFlag();
});

describe('passesHdopFilter', () => {
  it('passes record with hdop < threshold', () => {
    expect(passesHdopFilter({ hdop: 1.5 }, 2.0)).toBe(true);
  });

  it('passes record with hdop === threshold', () => {
    expect(passesHdopFilter({ hdop: 2.0 }, 2.0)).toBe(true);
  });

  it('rejects record with hdop > threshold', () => {
    expect(passesHdopFilter({ hdop: 2.1 }, 2.0)).toBe(false);
  });

  it('passes record missing hdop and logs warning exactly once', () => {
    const r1 = { type: 'gps', speed_ms: 3.0 };
    const r2 = { type: 'gps', speed_ms: 3.1 };

    expect(passesHdopFilter(r1)).toBe(true);
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[gpsFilter] HDOP field is missing from GPS record. Treating as valid.'
    );

    expect(passesHdopFilter(r2)).toBe(true);
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
  });
});

describe('createMedianSpeedFilter', () => {
  it('computes median correctly with < 5 points (startup behavior)', () => {
    const filter = createMedianSpeedFilter(5);

    expect(filter.filter({ speed_ms: 3.0 }).speed_ms).toBe(3.0);

    expect(filter.filter({ speed_ms: 4.0 }).speed_ms).toBe(3.5);

    expect(filter.filter({ speed_ms: 2.0 }).speed_ms).toBe(3.0);

    expect(filter.filter({ speed_ms: 5.0 }).speed_ms).toBe(3.5);
  });

  it('computes median correctly with exactly 5 points', () => {
    const filter = createMedianSpeedFilter(5);
    [3.0, 3.1, 3.2, 3.4].forEach((s) => filter.filter({ speed_ms: s }));

    const res = filter.filter({ speed_ms: 99.9 });
    expect(res.speed_ms).toBe(3.2);
  });

  it('synthetic outlier test (acceptance criteria)', () => {
    const filter = createMedianSpeedFilter(5);

    filter.filter({ speed_ms: 3.0 });
    filter.filter({ speed_ms: 3.1 });

    const r3 = filter.filter({ speed_ms: 99.9 });

    expect(r3.speed_ms).toBe(3.1);

    filter.filter({ speed_ms: 3.2 });

    const r5 = filter.filter({ speed_ms: 3.0 });

    expect(r5.speed_ms).toBe(3.1);
  });

  it('slides the window correctly after 5 elements', () => {
    const filter = createMedianSpeedFilter(3);
    filter.filter({ speed_ms: 10 });
    filter.filter({ speed_ms: 20 });
    filter.filter({ speed_ms: 30 });

    const res = filter.filter({ speed_ms: 40 });
    expect(res.speed_ms).toBe(30);
  });
});

describe('createGpsFilter (composed)', () => {
  it('returns null if HDOP is above threshold', () => {
    const filter = createGpsFilter({ hdopThreshold: 2.0 });
    const record = { speed_ms: 5.0, hdop: 3.0 };
    expect(filter.processRecord(record)).toBeNull();
  });

  it('processes and returns smoothed record if HDOP is acceptable', () => {
    const filter = createGpsFilter({ hdopThreshold: 2.0, medianWindowSize: 3 });

    const r1 = filter.processRecord({ speed_ms: 5.0, hdop: 1.5 });
    expect(r1).not.toBeNull();
    expect(r1.speed_ms).toBe(5.0);

    const r2 = filter.processRecord({ speed_ms: 100.0, hdop: 1.2 });
    expect(r2.speed_ms).toBe(52.5);
  });

  it('ignores rejected records when updating median window', () => {
    const filter = createGpsFilter();

    filter.processRecord({ speed_ms: 3.0, hdop: 1.0 });
    filter.processRecord({ speed_ms: 3.1, hdop: 1.0 });

    const rejected = filter.processRecord({ speed_ms: 999.0, hdop: 5.0 });
    expect(rejected).toBeNull();

    const r3 = filter.processRecord({ speed_ms: 3.2, hdop: 1.0 });
    expect(r3.speed_ms).toBe(3.1);
  });
});
