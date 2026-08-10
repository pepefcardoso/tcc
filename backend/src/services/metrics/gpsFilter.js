/**
 * GPS Filter utilities for T-038
 */

let hdopWarnEmitted = false;

/**
 * Checks if a GPS record passes the HDOP filter threshold.
 * If HDOP is missing, logs a one-time warning and passes it through.
 *
 * @param {Object} record - The GPS record.
 * @param {number} threshold - The max allowed HDOP.
 * @returns {boolean} True if the record should be kept, false if it should be rejected.
 */
export function passesHdopFilter(record, threshold = 2.0) {
  if (record.hdop === undefined || record.hdop === null) {
    if (!hdopWarnEmitted) {
      console.warn('[gpsFilter] HDOP field is missing from GPS record. Treating as valid.');
      hdopWarnEmitted = true;
    }
    return true;
  }

  return record.hdop <= threshold;
}

/**
 * Factory for a stateful moving-median speed filter.
 * Maintains a sliding window of the last `windowSize` speeds.
 *
 * @param {number} windowSize - Number of points to consider for median (default 5).
 * @returns {Object} An object with a `filter(record)` method.
 */
export function createMedianSpeedFilter(windowSize = 5) {
  const window = [];

  return {
    filter(record) {
      const newRecord = { ...record };

      window.push(newRecord.speed_ms);
      if (window.length > windowSize) {
        window.shift();
      }

      const sorted = [...window].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);

      let median;
      if (sorted.length % 2 !== 0) {
        median = sorted[mid];
      } else {
        median = (sorted[mid - 1] + sorted[mid]) / 2.0;
      }

      newRecord.speed_ms = median;
      return newRecord;
    },
  };
}

/**
 * Convenience factory that composes HDOP filtering and Median speed filtering.
 *
 * @param {Object} options - Options object.
 * @param {number} [options.hdopThreshold=2.0] - HDOP rejection threshold.
 * @param {number} [options.medianWindowSize=5] - Median window size.
 * @returns {Object} An object with a `processRecord(record)` method.
 */
export function createGpsFilter({ hdopThreshold = 2.0, medianWindowSize = 5 } = {}) {
  const medianFilter = createMedianSpeedFilter(medianWindowSize);

  return {
    processRecord(record) {
      if (!passesHdopFilter(record, hdopThreshold)) {
        return null;
      }
      return medianFilter.filter(record);
    },
  };
}

/**
 * For testing purposes only: resets the module-level warn flag.
 */
export function _resetHdopWarnFlag() {
  hdopWarnEmitted = false;
}
