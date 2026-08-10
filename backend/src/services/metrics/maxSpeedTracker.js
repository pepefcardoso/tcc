/**
 * Converts knots to km/h.
 * 1 knot is exactly 1.852 km/h.
 * @param {number} knots
 * @returns {number} Speed in km/h, or NaN if input is invalid
 */
export function knotsToKmh(knots) {
  if (typeof knots !== 'number') return NaN;
  return knots * 1.852;
}

/**
 * Converts metres per second to km/h.
 * 1 m/s is exactly 3.6 km/h.
 * @param {number} ms
 * @returns {number} Speed in km/h, or NaN if input is invalid
 */
export function msToKmh(ms) {
  if (typeof ms !== 'number') return NaN;
  return ms * 3.6;
}

/**
 * Factory for a stateful accumulator that tracks maximum speed over a GPS stream.
 * @returns {Object} { push(record), getMaxKmh(), reset() }
 */
export function createMaxSpeedTracker() {
  let maxKmh = 0;

  return {
    /**
     * Pushes a new GPS record to the tracker.
     * Updates the maximum speed if the record's speed is valid and exceeds current max.
     * @param {Object} record - The GPS record (expects `speed_ms`)
     * @returns {number} The updated maximum speed in km/h
     */
    push(record) {
      if (
        !record ||
        typeof record.speed_ms !== 'number' ||
        !isFinite(record.speed_ms) ||
        record.speed_ms < 0
      ) {
        return maxKmh;
      }

      const currentSpeedKmh = msToKmh(record.speed_ms);
      if (currentSpeedKmh > maxKmh) {
        maxKmh = currentSpeedKmh;
      }

      return maxKmh;
    },

    /**
     * Gets the current accumulated maximum speed in km/h.
     * @returns {number}
     */
    getMaxKmh() {
      return maxKmh;
    },

    /**
     * Resets the tracker state to 0.
     */
    reset() {
      maxKmh = 0;
    },
  };
}
