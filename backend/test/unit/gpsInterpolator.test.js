import { jest } from '@jest/globals';
import {
  interpolateLinear,
  estimateDeadReckoning,
  createGpsInterpolator,
  _resetTimestampWarnFlag,
  computeBearingRad,
} from '../../src/services/metrics/gpsInterpolator.js';

let consoleWarnSpy;

beforeAll(() => {
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  consoleWarnSpy.mockRestore();
});

beforeEach(() => {
  consoleWarnSpy.mockClear();
  _resetTimestampWarnFlag();
});

describe('interpolateLinear', () => {
  const fixA = { type: 'gps', latitude: -23.0, longitude: -43.0, speed_ms: 3.0, time: 0 };
  const fixB = { type: 'gps', latitude: -22.9991, longitude: -42.9991, speed_ms: 6.0, time: 300 };

  it('interpolates 1 dropped fix', () => {
    const b1 = { ...fixB, time: 200 };
    const res = interpolateLinear(fixA, b1, 1);

    expect(res).toHaveLength(1);
    expect(res[0].interpolated).toBe(true);
    expect(res[0].gapSegment).toBe(false);

    expect(res[0].latitude).toBeCloseTo(-22.99955, 5);
    expect(res[0].longitude).toBeCloseTo(-42.99955, 5);
    expect(res[0].speed_ms).toBeCloseTo(4.5, 5);
    expect(new Date(res[0].time).getTime()).toBe(100);
  });

  it('interpolates 2 dropped fixes (hand-calc verification)', () => {
    const res = interpolateLinear(fixA, fixB, 2);

    expect(res).toHaveLength(2);

    expect(res[0].latitude).toBeCloseTo(-22.9997, 5);
    expect(res[0].longitude).toBeCloseTo(-42.9997, 5);
    expect(res[0].speed_ms).toBeCloseTo(4.0, 5);
    expect(new Date(res[0].time).getTime()).toBe(100);

    expect(res[1].latitude).toBeCloseTo(-22.9994, 5);
    expect(res[1].longitude).toBeCloseTo(-42.9994, 5);
    expect(res[1].speed_ms).toBeCloseTo(5.0, 5);
    expect(new Date(res[1].time).getTime()).toBe(200);
  });

  it('interpolates 3 dropped fixes', () => {
    const b3 = { ...fixB, time: 400 };
    const res = interpolateLinear(fixA, b3, 3);

    expect(res).toHaveLength(3);
    expect(new Date(res[0].time).getTime()).toBe(100);
    expect(new Date(res[1].time).getTime()).toBe(200);
    expect(new Date(res[2].time).getTime()).toBe(300);
  });

  it('handles invalid time by returning empty', () => {
    expect(interpolateLinear({ time: 'bad' }, { time: 300 }, 1)).toEqual([]);
  });
});

describe('estimateDeadReckoning', () => {
  const EARTH_R = 6371000;
  const RAD_TO_DEG = 180 / Math.PI;

  it('computes correct bearing due north', () => {
    const f1 = { latitude: 0, longitude: 0 };
    const f2 = { latitude: 1, longitude: 0 };
    expect(computeBearingRad(f1, f2)).toBeCloseTo(0, 5);
  });

  it('computes correct bearing due east', () => {
    const f1 = { latitude: 0, longitude: 0 };
    const f2 = { latitude: 0, longitude: 1 };
    expect(computeBearingRad(f1, f2)).toBeCloseTo(Math.PI / 2, 5);
  });

  it('estimates 4 dropped fixes (hand-calc verification)', () => {
    const penultimate = { latitude: -23.0, longitude: -43.0, speed_ms: 4.0, time: 0 };
    const dLat = ((4.0 * 0.1) / EARTH_R) * RAD_TO_DEG;
    const last = { latitude: -23.0 + dLat, longitude: -43.0, speed_ms: 4.0, time: 100 };

    const count = 4;
    const interval = 100;
    const res = estimateDeadReckoning(last, penultimate, count, interval);

    expect(res).toHaveLength(4);

    res.forEach((r, i) => {
      expect(r.gapSegment).toBe(true);
      expect(r.interpolated).toBe(false);
      expect(r.speed_ms).toBe(4.0);
      expect(new Date(r.time).getTime()).toBe(100 + (i + 1) * 100);

      const expectedLat = last.latitude + (i + 1) * dLat;
      expect(r.latitude).toBeCloseTo(expectedLat, 7);
      expect(r.longitude).toBeCloseTo(last.longitude, 7);
    });
  });

  it('uses last fix position if penultimate is null', () => {
    const last = { latitude: 10, longitude: 20, speed_ms: 5.0, time: 100 };
    const res = estimateDeadReckoning(last, null, 2, 100);

    expect(res).toHaveLength(2);
    expect(res[0].latitude).toBe(10);
    expect(res[0].longitude).toBe(20);
    expect(res[1].latitude).toBe(10);
    expect(res[1].longitude).toBe(20);
    expect(res[0].gapSegment).toBe(true);
  });
});

describe('createGpsInterpolator', () => {
  it('returns first fix as-is', () => {
    const interpolator = createGpsInterpolator();
    const r = { time: 0, latitude: 1, longitude: 1, speed_ms: 1 };
    const res = interpolator.push(r);
    expect(res).toEqual([r]);
  });

  it('returns both if dt matches expected interval (no gap)', () => {
    const interpolator = createGpsInterpolator({ expectedIntervalMs: 100 });
    interpolator.push({ time: 0, latitude: 1, longitude: 1, speed_ms: 1 });
    const res = interpolator.push({ time: 100, latitude: 1, longitude: 1, speed_ms: 1 });
    expect(res).toHaveLength(1);
    expect(res[0].time).toBe(100);
  });

  it('fills 1 dropped fix (RF11-r2)', () => {
    const interpolator = createGpsInterpolator({ expectedIntervalMs: 100 });
    interpolator.push({ time: 0, latitude: 1, longitude: 1, speed_ms: 1 });

    const res = interpolator.push({ time: 200, latitude: 3, longitude: 3, speed_ms: 3 });
    expect(res).toHaveLength(2);
    expect(res[0].interpolated).toBe(true);
    expect(res[0].gapSegment).toBe(false);
    expect(new Date(res[0].time).getTime()).toBe(100);
    expect(new Date(res[1].time).getTime()).toBe(200);
  });

  it('fills 3 dropped fixes (RF11-r2 max)', () => {
    const interpolator = createGpsInterpolator({ expectedIntervalMs: 100 });
    interpolator.push({ time: 0, latitude: 1, longitude: 1, speed_ms: 1 });

    const res = interpolator.push({ time: 400, latitude: 5, longitude: 5, speed_ms: 5 });
    expect(res).toHaveLength(4);
    expect(res[0].interpolated).toBe(true);
    expect(res[1].interpolated).toBe(true);
    expect(res[2].interpolated).toBe(true);
    expect(res[3].interpolated).toBeUndefined();
  });

  it('flags 4 dropped fixes as gap segments (RF11-r3)', () => {
    const interpolator = createGpsInterpolator({ expectedIntervalMs: 100 });
    interpolator.push({ time: 0, latitude: 0, longitude: 0, speed_ms: 4 });
    interpolator.push({ time: 100, latitude: 0.1, longitude: 0, speed_ms: 4 });

    const res = interpolator.push({ time: 600, latitude: 0.5, longitude: 0, speed_ms: 5 });
    expect(res).toHaveLength(5);

    res.slice(0, 4).forEach((r) => {
      expect(r.gapSegment).toBe(true);
      expect(r.interpolated).toBe(false);
    });

    expect(res[4].gapSegment).toBeUndefined();
    expect(res[4].latitude).toBe(0.5);
  });

  it('warns and caps very large gaps', () => {
    const interpolator = createGpsInterpolator({ expectedIntervalMs: 100 });
    interpolator.push({ time: 0, latitude: 0, longitude: 0, speed_ms: 4 });

    const res = interpolator.push({ time: 200100, latitude: 0.5, longitude: 0, speed_ms: 5 });

    expect(res).toHaveLength(1001);
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('exceeds max cap'));
  });

  it('handles invalid timestamps safely', () => {
    const interpolator = createGpsInterpolator();
    interpolator.push({ time: 100, latitude: 0, longitude: 0, speed_ms: 4 });
    const res = interpolator.push({ time: 'invalid', latitude: 0, longitude: 0, speed_ms: 4 });

    expect(res).toHaveLength(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid or out-of-order timestamp')
    );
  });

  it('flush returns empty array', () => {
    const interpolator = createGpsInterpolator();
    expect(interpolator.flush()).toEqual([]);
  });
});
