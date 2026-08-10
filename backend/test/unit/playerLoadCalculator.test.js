import {
  createPlayerLoadCalculator,
  PLAYER_LOAD_SAMPLE_RATE_HZ,
} from '../../src/services/metrics/playerLoadCalculator.js';
import { createButterworthFilter } from '../../src/services/metrics/butterworthFilter.js';

describe('PlayerLoadCalculator constants', () => {
  it('exports correct sample rate', () => {
    expect(PLAYER_LOAD_SAMPLE_RATE_HZ).toBe(100);
  });
});

describe('PlayerLoadCalculator - Suite A: Pure formula validation', () => {
  let calculator;

  beforeEach(() => {
    calculator = createPlayerLoadCalculator();
  });

  it('AC-1: PL_inst formula check matches hand-computed filter output', () => {
    const raw1 = { ac_x: 1.0, ac_y: 0.0, ac_z: 0.0 };
    const raw2 = { ac_x: 1.0, ac_y: 0.0, ac_z: 0.0 };

    const fx = createButterworthFilter();
    const f1x = fx.push(raw1.ac_x);
    const f2x = fx.push(raw2.ac_x);

    const expectedPlInst = Math.sqrt(Math.pow(f2x - f1x, 2)) / 100;

    calculator.push(raw1);
    const total = calculator.push(raw2);

    expect(total).toBeCloseTo(expectedPlInst, 10);
  });

  it('AC-2: Session accumulation is the arithmetic sum of PL_inst', () => {
    const samples = Array.from({ length: 50 }, (_, i) => ({
      ac_x: Math.sin(i * 0.1),
      ac_y: Math.cos(i * 0.1),
      ac_z: Math.sin(i * 0.2),
    }));

    const fx = createButterworthFilter();
    const fy = createButterworthFilter();
    const fz = createButterworthFilter();

    let expectedTotal = 0;
    let prev = null;

    for (const sample of samples) {
      const cur = {
        ac_x_f: fx.push(sample.ac_x),
        ac_y_f: fy.push(sample.ac_y),
        ac_z_f: fz.push(sample.ac_z),
      };

      if (prev !== null) {
        const dx = cur.ac_x_f - prev.ac_x_f;
        const dy = cur.ac_y_f - prev.ac_y_f;
        const dz = cur.ac_z_f - prev.ac_z_f;
        expectedTotal += Math.sqrt(dx * dx + dy * dy + dz * dz) / 100;
      }
      prev = cur;
    }

    let actualTotal = 0;
    for (const sample of samples) {
      actualTotal = calculator.push(sample);
    }

    expect(actualTotal).toBeCloseTo(expectedTotal, 10);
  });

  it('AC-3: Zero PL increment for constant-offset DC signal after transient', () => {
    const dcInput = { ac_x: 1.0, ac_y: -0.5, ac_z: 9.81 };

    for (let i = 0; i < 200; i++) {
      calculator.push(dcInput);
    }

    const totalBeforeSteadyState = calculator.getTotal();

    calculator.push(dcInput);
    const totalAfterSteadyState = calculator.getTotal();

    const delta = totalAfterSteadyState - totalBeforeSteadyState;
    expect(delta).toBeLessThan(1e-6);
  });
});

describe('PlayerLoadCalculator - Suite B: Accumulator state machine', () => {
  let calculator;

  beforeEach(() => {
    calculator = createPlayerLoadCalculator();
  });

  it('First sample yields 0', () => {
    const total = calculator.push({ ac_x: 1.0, ac_y: 2.0, ac_z: 3.0 });
    expect(total).toBe(0);
    expect(calculator.getTotal()).toBe(0);
  });

  it('Two identical raw samples accumulate (due to IIR filter transient)', () => {
    calculator.push({ ac_x: 1.0, ac_y: 2.0, ac_z: 3.0 });
    const total = calculator.push({ ac_x: 1.0, ac_y: 2.0, ac_z: 3.0 });
    expect(total).toBeGreaterThan(0);
  });

  it('getTotal() before any push returns 0', () => {
    expect(calculator.getTotal()).toBe(0);
  });

  it('reset() clears total and resets filter + prevFiltered', () => {
    calculator.push({ ac_x: 1.0, ac_y: 2.0, ac_z: 3.0 });
    calculator.push({ ac_x: 2.0, ac_y: 3.0, ac_z: 4.0 });
    const totalBeforeReset = calculator.getTotal();
    expect(totalBeforeReset).toBeGreaterThan(0);

    calculator.reset();
    expect(calculator.getTotal()).toBe(0);

    const totalAfterResetFirstPush = calculator.push({ ac_x: 1.0, ac_y: 2.0, ac_z: 3.0 });
    expect(totalAfterResetFirstPush).toBe(0);
  });
});

describe('PlayerLoadCalculator - Suite C: Edge cases / robustness', () => {
  let calculator;

  beforeEach(() => {
    calculator = createPlayerLoadCalculator();
  });

  it('Invalid record (null) is skipped', () => {
    calculator.push({ ac_x: 1.0, ac_y: 1.0, ac_z: 1.0 });
    calculator.push({ ac_x: 2.0, ac_y: 2.0, ac_z: 2.0 });
    const prevTotal = calculator.getTotal();

    const total = calculator.push(null);
    expect(total).toBe(prevTotal);
  });

  it('Invalid record (missing axes) is skipped', () => {
    calculator.push({ ac_x: 1.0, ac_y: 1.0, ac_z: 1.0 });
    calculator.push({ ac_x: 2.0, ac_y: 2.0, ac_z: 2.0 });
    const prevTotal = calculator.getTotal();

    const total = calculator.push({ ac_x: 1.0 });
    expect(total).toBe(prevTotal);
  });

  it('Non-numeric axis value is skipped', () => {
    calculator.push({ ac_x: 1.0, ac_y: 1.0, ac_z: 1.0 });
    calculator.push({ ac_x: 2.0, ac_y: 2.0, ac_z: 2.0 });
    const prevTotal = calculator.getTotal();

    const total = calculator.push({ ac_x: 'bad', ac_y: 0, ac_z: 0 });
    expect(total).toBe(prevTotal);
  });

  it('NaN axis is skipped', () => {
    calculator.push({ ac_x: 1.0, ac_y: 1.0, ac_z: 1.0 });
    calculator.push({ ac_x: 2.0, ac_y: 2.0, ac_z: 2.0 });
    const prevTotal = calculator.getTotal();

    const total = calculator.push({ ac_x: NaN, ac_y: 0, ac_z: 0 });
    expect(total).toBe(prevTotal);
  });

  it('PL is always non-negative', () => {
    for (let i = 0; i < 50; i++) {
      const prevTotal = calculator.getTotal();
      const newTotal = calculator.push({
        ac_x: (Math.random() - 0.5) * 10,
        ac_y: (Math.random() - 0.5) * 10,
        ac_z: (Math.random() - 0.5) * 10,
      });
      expect(newTotal).toBeGreaterThanOrEqual(prevTotal);
      expect(newTotal).toBeGreaterThanOrEqual(0);
    }
  });
});
