/**
 * Butterworth 2nd-order low-pass filter
 * Cutoff: 20 Hz
 * Sample Rate: 100 Hz
 *
 * Designed using bilinear transform.
 * scipy.signal.butter(2, 20, fs=100, btype='low', analog=False)
 */

export const BUTTERWORTH_ORDER = 2;
export const BUTTERWORTH_CUTOFF_HZ = 20;
export const BUTTERWORTH_SAMPLE_RATE_HZ = 100;

const b0 = 0.20657208382614792;
const b1 = 0.41314416765229585;
const b2 = 0.20657208382614792;
const a1 = -0.36952737735124977;
const a2 = 0.1957123141984378;

/**
 * Factory for a stateful single-axis Butterworth filter using Direct Form II Transposed (DFII-T).
 * Causal, single-pass implementation compatible with stream processing.
 *
 * @returns {Object} { push(xn), getLastOutput(), reset() }
 */
export function createButterworthFilter() {
  let z1 = 0.0;
  let z2 = 0.0;
  let lastOutput = 0.0;

  return {
    /**
     * Pushes a new sample through the filter and advances the internal state.
     * @param {number} xn - The input sample
     * @returns {number} The filtered output sample (yn)
     */
    push(xn) {
      if (typeof xn !== 'number' || !isFinite(xn)) {
        return Number.NaN;
      }

      const yn = b0 * xn + z1;
      z1 = b1 * xn - a1 * yn + z2;
      z2 = b2 * xn - a2 * yn;

      lastOutput = yn;
      return yn;
    },

    /**
     * Returns the last computed output without advancing state.
     * @returns {number}
     */
    getLastOutput() {
      return lastOutput;
    },

    /**
     * Resets the filter state (delay registers) to 0.
     */
    reset() {
      z1 = 0.0;
      z2 = 0.0;
      lastOutput = 0.0;
    },
  };
}

/**
 * Convenience factory for filtering 3 axes independently.
 *
 * @returns {Object} { push(imuRecord), reset() }
 */
export function createTriAxisButterworthFilter() {
  const filterX = createButterworthFilter();
  const filterY = createButterworthFilter();
  const filterZ = createButterworthFilter();

  return {
    /**
     * Processes a single IMU record and returns the filtered acceleration values.
     * @param {Object} imuRecord - The IMU record { ac_x, ac_y, ac_z }
     * @returns {Object} { ac_x_f, ac_y_f, ac_z_f }
     */
    push(imuRecord) {
      if (!imuRecord) {
        return { ac_x_f: Number.NaN, ac_y_f: Number.NaN, ac_z_f: Number.NaN };
      }

      return {
        ac_x_f: filterX.push(imuRecord.ac_x),
        ac_y_f: filterY.push(imuRecord.ac_y),
        ac_z_f: filterZ.push(imuRecord.ac_z),
      };
    },

    /**
     * Resets all three internal axis filters.
     */
    reset() {
      filterX.reset();
      filterY.reset();
      filterZ.reset();
    },
  };
}
