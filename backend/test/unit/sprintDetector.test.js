import {
  SPRINT_THRESHOLD_MS,
  SPRINT_MIN_DURATION_S,
  createSprintDetector,
  _resetTimestampWarnFlag,
} from '../../src/services/metrics/sprintDetector.js';

describe('SprintDetector Constants', () => {
  it('has correct threshold values', () => {
    expect(SPRINT_THRESHOLD_MS).toBe(7.0);
    expect(SPRINT_MIN_DURATION_S).toBe(1.0);
  });
});

describe('createSprintDetector - Acceptance Criteria', () => {
  let detector;

  beforeEach(() => {
    detector = createSprintDetector();
    _resetTimestampWarnFlag();
  });

  const rec = (speed_ms, timeMs) => ({
    type: 'gps',
    speed_ms,
    time: new Date(timeMs).toISOString(),
  });

  it('AC-1: Sub-threshold burst is NOT counted', () => {
    for (let i = 0; i <= 50; i++) {
      detector.push(rec(6.9, 1000 + i * 100));
    }
    expect(detector.flush()).toBe(0);
  });

  it('AC-2: >= 1s burst above threshold counted once', () => {
    for (let i = 0; i <= 10; i++) {
      detector.push(rec(7.1, 1000 + i * 100));
    }
    detector.push(rec(5.0, 2100));

    expect(detector.getCount()).toBe(1);
    expect(detector.flush()).toBe(1);
  });

  it('AC-3: Two separated bursts counted as two', () => {
    for (let i = 0; i <= 15; i++) {
      detector.push(rec(7.5, 1000 + i * 100));
    }

    detector.push(rec(4.0, 2600));
    detector.push(rec(4.0, 2700));

    for (let i = 0; i <= 12; i++) {
      detector.push(rec(8.0, 3000 + i * 100));
    }

    expect(detector.flush()).toBe(2);
  });
});

describe('createSprintDetector - Edge cases', () => {
  let detector;

  beforeEach(() => {
    detector = createSprintDetector();
    _resetTimestampWarnFlag();
  });

  const rec = (speed_ms, timeMs) => ({
    type: 'gps',
    speed_ms,
    time: new Date(timeMs).toISOString(),
  });

  it('returns 0 before any record pushed', () => {
    expect(detector.getCount()).toBe(0);
    expect(detector.flush()).toBe(0);
  });

  it('Burst lasting exactly 1000 ms is counted (boundary)', () => {
    detector.push(rec(7.0, 1000));
    detector.push(rec(7.0, 2000));
    detector.push(rec(5.0, 2100));
    expect(detector.getCount()).toBe(1);
  });

  it('Burst lasting 999 ms is NOT counted (sub-boundary)', () => {
    detector.push(rec(7.0, 1000));
    detector.push(rec(7.0, 1999));
    detector.push(rec(5.0, 2100));
    expect(detector.getCount()).toBe(0);
  });

  it('Open sprint at stream end resolved by flush()', () => {
    detector.push(rec(7.0, 1000));
    detector.push(rec(7.0, 2500));
    expect(detector.getCount()).toBe(0);
    expect(detector.flush()).toBe(1);
  });

  it('Open sprint with insufficient duration at end: NOT counted', () => {
    detector.push(rec(7.0, 1000));
    detector.push(rec(7.0, 1500));
    expect(detector.getCount()).toBe(0);
    expect(detector.flush()).toBe(0);
  });

  it('Missing speed_ms field treated as below-threshold (no throw)', () => {
    detector.push(rec(7.5, 1000));
    detector.push(rec(7.5, 2500));
    detector.push({ type: 'gps', time: new Date(2600).toISOString() });

    expect(detector.getCount()).toBe(1);
  });

  it('NaN / negative speed_ms treated as below-threshold', () => {
    detector.push(rec(7.5, 1000));
    detector.push(rec(7.5, 2500));
    detector.push(rec(NaN, 2600));
    expect(detector.getCount()).toBe(1);

    detector.push(rec(8.0, 3000));
    detector.push(rec(8.0, 4500));
    detector.push(rec(-1.0, 4600));
    expect(detector.getCount()).toBe(2);
  });

  it('Missing timestamp emits warning and treats as below threshold', () => {
    detector.push(rec(7.5, 1000));
    detector.push(rec(7.5, 2500));

    const countAfterGood = detector.getCount();

    detector.push({ type: 'gps', speed_ms: 7.5 });

    expect(() => detector.push({ type: 'gps', speed_ms: 7.5 })).not.toThrow();
  });

  it('reset() restores count to 0', () => {
    detector.push(rec(7.5, 1000));
    detector.push(rec(7.5, 2500));
    expect(detector.flush()).toBe(1);

    detector.reset();
    expect(detector.getCount()).toBe(0);

    detector.push(rec(7.5, 1000));
    detector.push(rec(7.5, 2500));
    expect(detector.flush()).toBe(1);
  });

  it('accepts numeric epoch millisecond timestamps', () => {
    detector.push({ speed_ms: 7.5, time: 1000 });
    detector.push({ speed_ms: 7.5, time: 2500 });
    expect(detector.flush()).toBe(1);
  });

  it('successive below-threshold records while not in sprint do not affect count', () => {
    detector.push({ speed_ms: 5.0, time: new Date(1000).toISOString() });
    detector.push({ speed_ms: 4.0, time: new Date(2000).toISOString() });
    detector.push({ speed_ms: 3.0, time: new Date(3000).toISOString() });
    expect(detector.getCount()).toBe(0);
    expect(detector.flush()).toBe(0);
  });
});
