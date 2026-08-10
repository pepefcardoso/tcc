import {
  haversineDistance,
  createHaversineAccumulator,
} from '../../src/services/metrics/haversineCalculator.js';

describe('haversineDistance', () => {
  it('returns 0 for identical points', () => {
    const fixA = { latitude: -23.0, longitude: -43.0 };
    expect(haversineDistance(fixA, fixA)).toBe(0);
  });

  it('calculates LHR to CDG within 0.5% tolerance (~341,547 m)', () => {
    const lhr = { latitude: 51.4775, longitude: -0.4614 };
    const cdg = { latitude: 49.0097, longitude: 2.5479 };

    const distance = haversineDistance(lhr, cdg);
    const expected = 347922;
    const tolerance = expected * 0.005;

    expect(distance).toBeGreaterThan(expected - tolerance);
    expect(distance).toBeLessThan(expected + tolerance);
  });

  it('is symmetric: d(A,B) === d(B,A)', () => {
    const fixA = { latitude: 10.0, longitude: 20.0 };
    const fixB = { latitude: 30.0, longitude: 40.0 };
    expect(haversineDistance(fixA, fixB)).toBe(haversineDistance(fixB, fixA));
  });

  it('calculates short distance ~111 km for 1 degree lat apart at equator', () => {
    const eq1 = { latitude: 0.0, longitude: 0.0 };
    const eq2 = { latitude: 1.0, longitude: 0.0 };

    const distance = haversineDistance(eq1, eq2);
    expect(distance).toBeCloseTo(111194.9, 0);
  });

  it('returns 0 if fixA or fixB is missing lat/lon', () => {
    const valid = { latitude: 10.0, longitude: 20.0 };
    const noLat = { longitude: 20.0 };
    const noLon = { latitude: 10.0 };
    const nanLat = { latitude: NaN, longitude: 20.0 };

    expect(haversineDistance(valid, noLat)).toBe(0);
    expect(haversineDistance(noLon, valid)).toBe(0);
    expect(haversineDistance(nanLat, valid)).toBe(0);
    expect(haversineDistance(valid, null)).toBe(0);
    expect(haversineDistance(undefined, valid)).toBe(0);
  });
});

describe('createHaversineAccumulator', () => {
  let accumulator;

  beforeEach(() => {
    accumulator = createHaversineAccumulator();
  });

  it('returns 0 before any fix pushed', () => {
    expect(accumulator.getTotal()).toBe(0);
  });

  it('ignores first fix (no previous fix to diff against)', () => {
    const fix = { latitude: 10.0, longitude: 20.0 };
    expect(accumulator.push(fix)).toBe(0);
    expect(accumulator.getTotal()).toBe(0);
  });

  it('accumulates correctly across 3 collinear fixes', () => {
    const eq1 = { latitude: 0.0, longitude: 0.0 };
    const eq2 = { latitude: 1.0, longitude: 0.0 };
    const eq3 = { latitude: 2.0, longitude: 0.0 };

    accumulator.push(eq1);

    const d1 = accumulator.push(eq2);
    expect(d1).toBeCloseTo(111194.9, 0);

    const d2 = accumulator.push(eq3);
    expect(d2).toBeCloseTo(222389.8, 0);

    expect(accumulator.getTotal()).toBe(d2);
  });

  it('handles invalid fix gracefully (no throw, total unchanged)', () => {
    const fix1 = { latitude: 10.0, longitude: 20.0 };
    const fix2 = { latitude: 11.0, longitude: 20.0 };

    accumulator.push(fix1);
    const d1 = accumulator.push(fix2);

    const d2 = accumulator.push({ latitude: 'bad' });
    expect(d2).toBe(d1);
    expect(accumulator.getTotal()).toBe(d1);

    const fix3 = { latitude: 12.0, longitude: 20.0 };
    const d3 = accumulator.push(fix3);
    expect(d3).toBeGreaterThan(d1);
  });

  it('reset() clears total and lastFix', () => {
    accumulator.push({ latitude: 10.0, longitude: 20.0 });
    accumulator.push({ latitude: 11.0, longitude: 20.0 });
    expect(accumulator.getTotal()).toBeGreaterThan(0);

    accumulator.reset();

    expect(accumulator.getTotal()).toBe(0);

    const d1 = accumulator.push({ latitude: 10.0, longitude: 20.0 });
    expect(d1).toBe(0);
  });
});
