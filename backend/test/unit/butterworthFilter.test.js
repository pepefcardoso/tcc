import {
  BUTTERWORTH_ORDER,
  BUTTERWORTH_CUTOFF_HZ,
  BUTTERWORTH_SAMPLE_RATE_HZ,
  createButterworthFilter,
  createTriAxisButterworthFilter,
} from '../../src/services/metrics/butterworthFilter.js';

describe('Butterworth Filter Constants', () => {
  it('has correct design parameters exported', () => {
    expect(BUTTERWORTH_ORDER).toBe(2);
    expect(BUTTERWORTH_CUTOFF_HZ).toBe(20);
    expect(BUTTERWORTH_SAMPLE_RATE_HZ).toBe(100);
  });
});

describe('createButterworthFilter - Acceptance Criteria', () => {
  let filter;

  beforeEach(() => {
    filter = createButterworthFilter();
  });

  const inputX = [
    0.0, 0.28318854890666687, 0.2520639962254397, -0.09053896578051778, -0.47271457813876097, -0.5,
    -0.1983053678077561, 0.17855079634954497, 0.4072828552199738, 0.35415797204961556,
    0.06283120614488347, -0.16919014167385966, -0.1444641662580796, 0.08639016335198424,
    0.25301382498522363, 0.20710678118654763, -0.05260130630790835, -0.3204918239089904,
    -0.41372551152737604, -0.28186214155100067, 0.0, 0.2818621415510005, 0.413725511527376,
    0.32049182390899066, 0.052601306307908545, -0.20710678118654746, -0.25301382498522346,
    -0.08639016335198402, 0.1444641662580798, 0.1691901416738596, -0.06283120614488358,
    -0.3541579720496154, -0.407282855219974, -0.1785507963495451, 0.19830536780775588, 0.5,
    0.4727145781387609, 0.09053896578051786, -0.25206399622543954, -0.28318854890666687,
    -4.898587196589413e-16, -0.28318854890666675, -0.2520639962254399, 0.09053896578051761,
    0.4727145781387611, 0.5, 0.1983053678077562, -0.17855079634954483, -0.4072828552199738,
    -0.3541579720496157,
  ];

  const expectedOutputY = [
    0, 0.058498848663353184, 0.1906840084091783, 0.20294881223069633, -0.045309962407012815,
    -0.3737509889457053, -0.4744295774778508, -0.25049818448898115, 0.11722190857589623,
    0.3706515804125866, 0.35745487729078823, 0.12371582128966116, -0.11100494921437486,
    -0.14202076923074342, 0.02735939444826642, 0.20306472024475306, 0.1966479934385529,
    -0.012229556516320794, -0.2717450201564805, -0.393381545741769, -0.2940952450416415,
    -0.031686631911630736, 0.24776282392648769, 0.3931144065337858, 0.32551573033492726,
    0.08850375133166585, -0.15796746811298762, -0.2408540397449485, -0.11620090421222833,
    0.08098737791012484, 0.13943201216930967, -0.02849381790276051, -0.28124854944730715,
    -0.3766617443985906, -0.20107915726785364, 0.14774422600732712, 0.4391352759104702,
    0.45064527809232685, 0.16356748279535327, -0.17168896307101322, -0.26452302511382064,
    -0.18114455276107735, -0.1842345403840105, -0.176562282650583, 0.05379826716759877,
    0.3717234811742533, 0.472019092080191, 0.25000425237984664, -0.11693266833725666,
    -0.370448029629642,
  ];

  it('AC-1: Output matches scipy reference fixture within tolerance', () => {
    for (let i = 0; i < inputX.length; i++) {
      const output = filter.push(inputX[i]);
      expect(output).toBeCloseTo(expectedOutputY[i], 10);
    }
  });

  it('AC-2: Confirms no second (reverse) pass is performed (Causal validation)', () => {
    const reverseInput = [...inputX].reverse();
    const reverseExpected = [...expectedOutputY].reverse();

    const reverseOutput = [];
    for (let i = 0; i < reverseInput.length; i++) {
      reverseOutput.push(filter.push(reverseInput[i]));
    }

    let diffSum = 0;
    for (let i = 0; i < reverseOutput.length; i++) {
      diffSum += Math.abs(reverseOutput[i] - reverseExpected[i]);
    }
    const meanDiff = diffSum / reverseOutput.length;

    expect(meanDiff).toBeGreaterThan(0.1);
  });
});

describe('createTriAxisButterworthFilter - Acceptance Criteria', () => {
  let triFilter;

  beforeEach(() => {
    triFilter = createTriAxisButterworthFilter();
  });

  it('AC-3: Per-axis independence', () => {
    const rec1 = { ac_x: 1.0, ac_y: 2.0, ac_z: 3.0 };
    const rec2 = { ac_x: 0.5, ac_y: 1.0, ac_z: 1.5 };

    const fx = createButterworthFilter();
    const fy = createButterworthFilter();
    const fz = createButterworthFilter();

    const expected1 = {
      ac_x_f: fx.push(rec1.ac_x),
      ac_y_f: fy.push(rec1.ac_y),
      ac_z_f: fz.push(rec1.ac_z),
    };
    const expected2 = {
      ac_x_f: fx.push(rec2.ac_x),
      ac_y_f: fy.push(rec2.ac_y),
      ac_z_f: fz.push(rec2.ac_z),
    };

    const out1 = triFilter.push(rec1);
    expect(out1.ac_x_f).toBeCloseTo(expected1.ac_x_f, 10);
    expect(out1.ac_y_f).toBeCloseTo(expected1.ac_y_f, 10);
    expect(out1.ac_z_f).toBeCloseTo(expected1.ac_z_f, 10);

    const out2 = triFilter.push(rec2);
    expect(out2.ac_x_f).toBeCloseTo(expected2.ac_x_f, 10);
    expect(out2.ac_y_f).toBeCloseTo(expected2.ac_y_f, 10);
    expect(out2.ac_z_f).toBeCloseTo(expected2.ac_z_f, 10);
  });
});

describe('createButterworthFilter - Edge cases', () => {
  let filter;

  beforeEach(() => {
    filter = createButterworthFilter();
  });

  it('push(0) converges toward 0 (IIR stability)', () => {
    filter.push(10.0);
    filter.push(-5.0);

    let lastOut;
    for (let i = 0; i < 50; i++) {
      lastOut = filter.push(0);
    }
    expect(lastOut).toBeCloseTo(0, 5);
  });

  it('reset() zeroes delay registers', () => {
    filter.push(1.0);
    expect(filter.getLastOutput()).not.toBe(0);

    filter.reset();
    expect(filter.getLastOutput()).toBe(0);

    const out = filter.push(1.0);
    const freshFilter = createButterworthFilter();
    expect(out).toBe(freshFilter.push(1.0));
  });

  it('push(NaN) propagates NaN downstream but does not corrupt state permanently', () => {
    filter.push(1.0);

    const nanOut = filter.push(Number.NaN);
    expect(nanOut).toBeNaN();

    const validOut = filter.push(1.0);
    expect(validOut).not.toBeNaN();
  });

  it('push() with invalid types does not throw', () => {
    expect(filter.push(null)).toBeNaN();
    expect(filter.push(undefined)).toBeNaN();
    expect(filter.push('string')).toBeNaN();
  });
});

describe('createTriAxisButterworthFilter - Edge cases', () => {
  let triFilter;

  beforeEach(() => {
    triFilter = createTriAxisButterworthFilter();
  });

  it('handles falsy records gracefully', () => {
    const out = triFilter.push(null);
    expect(out.ac_x_f).toBeNaN();
    expect(out.ac_y_f).toBeNaN();
    expect(out.ac_z_f).toBeNaN();
  });

  it('handles partial records gracefully', () => {
    const out = triFilter.push({ ac_x: 1.0 });
    expect(out.ac_x_f).not.toBeNaN();
    expect(out.ac_y_f).toBeNaN();
    expect(out.ac_z_f).toBeNaN();
  });
});
