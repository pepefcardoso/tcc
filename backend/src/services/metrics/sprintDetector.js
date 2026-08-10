let timestampWarnEmitted = false;

export const SPRINT_THRESHOLD_MS = 7.0;
export const SPRINT_MIN_DURATION_S = 1.0;

/**
 * Parses timestamp to epoch ms.
 * Handles ISO strings, numeric ms, or missing/invalid data.
 * @param {string|number} time
 * @returns {number} Epoch ms, or NaN if invalid
 */
function parseTimeMs(time) {
  if (time === undefined || time === null) return NaN;
  if (typeof time === 'number') return time;
  const t = new Date(time).getTime();
  return t;
}

/**
 * Factory for a stateful accumulator that detects and counts sprint events
 * over a streaming sequence of GPS records.
 * A sprint is defined as contiguous sequence where speed_ms >= 7.0 m/s
 * for at least 1.0 second.
 *
 * @returns {Object} { push(record), flush(), getCount(), reset() }
 */
export function createSprintDetector() {
  let sprintCount = 0;
  let inSprint = false;
  let windowStartTimeMs = null;
  let lastAboveThresholdTimeMs = null;
  let lastTimeMs = null;

  return {
    /**
     * Processes a new GPS record.
     * @param {Object} record - The GPS record (expects `speed_ms` and `time`)
     * @returns {number} The current total sprint count
     */
    push(record) {
      if (
        !record ||
        typeof record.speed_ms !== 'number' ||
        !isFinite(record.speed_ms) ||
        record.speed_ms < 0
      ) {
        this._handleBelowThreshold();
        return sprintCount;
      }

      const currentTimeMs = parseTimeMs(record.time);
      if (isNaN(currentTimeMs)) {
        if (!timestampWarnEmitted) {
          console.warn(
            '[sprintDetector] Missing or invalid timestamp. Cannot determine sprint duration.'
          );
          timestampWarnEmitted = true;
        }
        this._handleBelowThreshold();
        return sprintCount;
      }

      lastTimeMs = currentTimeMs;

      if (record.speed_ms >= SPRINT_THRESHOLD_MS) {
        this._handleAboveThreshold(currentTimeMs);
      } else {
        this._handleBelowThreshold();
      }

      return sprintCount;
    },

    /**
     * Internal handler for when speed is below threshold.
     */
    _handleBelowThreshold() {
      if (inSprint) {
        const durationMs =
          lastAboveThresholdTimeMs !== null && windowStartTimeMs !== null
            ? lastAboveThresholdTimeMs - windowStartTimeMs
            : 0;

        if (durationMs >= SPRINT_MIN_DURATION_S * 1000) {
          sprintCount++;
        }
        inSprint = false;
        windowStartTimeMs = null;
        lastAboveThresholdTimeMs = null;
      }
    },

    /**
     * Internal handler for when speed is at or above threshold.
     * @param {number} currentTimeMs
     */
    _handleAboveThreshold(currentTimeMs) {
      if (!inSprint) {
        inSprint = true;
        windowStartTimeMs = currentTimeMs;
      }
      lastAboveThresholdTimeMs = currentTimeMs;
    },

    /**
     * Called at the end of the stream to close any open sprint windows.
     * @returns {number} The final sprint count
     */
    flush() {
      if (inSprint && lastAboveThresholdTimeMs !== null && windowStartTimeMs !== null) {
        const durationMs = lastAboveThresholdTimeMs - windowStartTimeMs;
        if (durationMs >= SPRINT_MIN_DURATION_S * 1000) {
          sprintCount++;
        }
      }
      inSprint = false;
      windowStartTimeMs = null;
      lastAboveThresholdTimeMs = null;
      return sprintCount;
    },

    /**
     * Gets the current sprint count.
     * @returns {number}
     */
    getCount() {
      return sprintCount;
    },

    /**
     * Resets the tracker state to 0.
     */
    reset() {
      sprintCount = 0;
      inSprint = false;
      windowStartTimeMs = null;
      lastAboveThresholdTimeMs = null;
      lastTimeMs = null;
    },
  };
}

/**
 * For testing purposes only: resets the module-level warn flag.
 */
export function _resetTimestampWarnFlag() {
  timestampWarnEmitted = false;
}
