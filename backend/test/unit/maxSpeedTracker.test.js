import {
  knotsToKmh,
  msToKmh,
  createMaxSpeedTracker,
} from '../../src/services/metrics/maxSpeedTracker.js';

describe('knotsToKmh', () => {
  it('converts 0 knots to 0 km/h', () => {
    expect(knotsToKmh(0)).toBe(0);
  });

  it('converts 1 knot to 1.852 km/h (definition of knot)', () => {
    expect(knotsToKmh(1)).toBe(1.852);
  });

  it('converts 10 knots to 18.52 km/h', () => {
    expect(knotsToKmh(10)).toBe(18.52);
  });

  it('converts known GPRMC value: 7.0 knots -> ~12.964 km/h', () => {
    expect(knotsToKmh(7.0)).toBeCloseTo(12.964, 3);
  });

  it('returns NaN for non-numeric inputs', () => {
    expect(knotsToKmh('10')).toBeNaN();
    expect(knotsToKmh(null)).toBeNaN();
  });
});

describe('msToKmh', () => {
  it('converts 0 m/s to 0 km/h', () => {
    expect(msToKmh(0)).toBe(0);
  });

  it('converts 1 m/s to 3.6 km/h', () => {
    expect(msToKmh(1)).toBe(3.6);
  });

  it('converts sprint threshold 7.0 m/s to 25.2 km/h', () => {
    expect(msToKmh(7.0)).toBeCloseTo(25.2, 3);
  });

  it('returns NaN for non-numeric inputs', () => {
    expect(msToKmh('10')).toBeNaN();
    expect(msToKmh(null)).toBeNaN();
  });
});

describe('createMaxSpeedTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = createMaxSpeedTracker();
  });

  it('returns 0 before any record pushed', () => {
    expect(tracker.getMaxKmh()).toBe(0);
  });

  it('correctly tracks max across ascending stream', () => {
    tracker.push({ speed_ms: 3.1 });
    tracker.push({ speed_ms: 5.2 });
    const max = tracker.push({ speed_ms: 7.0 });

    expect(max).toBeCloseTo(25.2, 3);
    expect(tracker.getMaxKmh()).toBeCloseTo(25.2, 3);
  });

  it('correctly tracks max across non-monotonic stream', () => {
    tracker.push({ speed_ms: 5.0 });
    tracker.push({ speed_ms: 9.0 });
    tracker.push({ speed_ms: 4.0 });
    tracker.push({ speed_ms: 8.0 });

    expect(tracker.getMaxKmh()).toBeCloseTo(32.4, 3);
  });

  it('handles record with missing speed_ms gracefully', () => {
    tracker.push({ speed_ms: 5.0 });
    const max = tracker.push({});

    expect(max).toBe(18.0);
    expect(tracker.getMaxKmh()).toBe(18.0);
  });

  it('handles record with NaN speed_ms gracefully', () => {
    tracker.push({ speed_ms: 5.0 });
    const max = tracker.push({ speed_ms: NaN });

    expect(max).toBe(18.0);
    expect(tracker.getMaxKmh()).toBe(18.0);
  });

  it('handles negative speed gracefully (ignores it)', () => {
    tracker.push({ speed_ms: 5.0 });
    const max = tracker.push({ speed_ms: -10.0 });

    expect(max).toBe(18.0);
    expect(tracker.getMaxKmh()).toBe(18.0);
  });

  it('reset() restores max to 0', () => {
    tracker.push({ speed_ms: 5.0 });
    expect(tracker.getMaxKmh()).toBe(18.0);

    tracker.reset();
    expect(tracker.getMaxKmh()).toBe(0);

    tracker.push({ speed_ms: 2.0 });
    expect(tracker.getMaxKmh()).toBe(7.2);
  });
});
