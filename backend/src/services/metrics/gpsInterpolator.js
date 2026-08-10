/**
 * GPS gap interpolation and dead-reckoning logic (RF11 rules 2-3).
 * Provides a stateful streaming factory to detect missing GPS records
 * and fill gaps linearly or via velocity projection.
 */

const EARTH_RADIUS_M = 6371000;
const MAX_SYNTHETIC_FRAMES = 1000;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

let timestampWarnEmitted = false;

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
 * Computes bearing from fixA to fixB in radians.
 * Bearing is measured clockwise from north.
 */
export function computeBearingRad(fixA, fixB) {
  const lat1 = fixA.latitude * DEG_TO_RAD;
  const lon1 = fixA.longitude * DEG_TO_RAD;
  const lat2 = fixB.latitude * DEG_TO_RAD;
  const lon2 = fixB.longitude * DEG_TO_RAD;

  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);

  return Math.atan2(y, x);
}

/**
 * Linearly interpolates `count` synthetic fixes between fixA and fixB.
 * Both fixes must have numeric or parsable time.
 * @param {Object} fixA - Last valid fix
 * @param {Object} fixB - Current valid fix
 * @param {number} count - Number of missing frames to fill
 * @returns {Array<Object>} Array of synthetic fixes
 */
export function interpolateLinear(fixA, fixB, count) {
  const synthetics = [];
  const tA = parseTimeMs(fixA.time);
  const tB = parseTimeMs(fixB.time);

  if (isNaN(tA) || isNaN(tB)) return [];

  const dt = tB - tA;
  const dLat = fixB.latitude - fixA.latitude;
  const dLon = fixB.longitude - fixA.longitude;
  const dSpeed = fixB.speed_ms - fixA.speed_ms;

  for (let i = 1; i <= count; i++) {
    const fraction = i / (count + 1);
    synthetics.push({
      ...fixA,
      time: new Date(tA + dt * fraction).toISOString(),
      latitude: fixA.latitude + dLat * fraction,
      longitude: fixA.longitude + dLon * fraction,
      speed_ms: fixA.speed_ms + dSpeed * fraction,
      interpolated: true,
      gapSegment: false,
    });
  }

  return synthetics;
}

/**
 * Generates `count` synthetic fixes using velocity dead-reckoning.
 * If penultimateFix is null, bearing cannot be computed; we just fill gaps without moving position.
 * @param {Object} lastFix - Last valid fix
 * @param {Object} penultimateFix - Previous valid fix (to derive bearing), or null
 * @param {number} count - Number of missing frames
 * @param {number} expectedIntervalMs - Timestep duration
 * @returns {Array<Object>}
 */
export function estimateDeadReckoning(lastFix, penultimateFix, count, expectedIntervalMs) {
  const synthetics = [];
  const tA = parseTimeMs(lastFix.time);
  if (isNaN(tA)) return [];

  let bearingRad = 0;
  const canComputeBearing = penultimateFix !== null;

  if (canComputeBearing) {
    bearingRad = computeBearingRad(penultimateFix, lastFix);
  }

  const latRad = lastFix.latitude * DEG_TO_RAD;
  const cosLat = Math.cos(latRad);

  const dt_s = expectedIntervalMs / 1000.0;
  const dist_m = lastFix.speed_ms * dt_s;

  const dLatRad = (dist_m / EARTH_RADIUS_M) * Math.cos(bearingRad);
  const dLonRad =
    Math.abs(cosLat) > 1e-10 ? ((dist_m / EARTH_RADIUS_M) * Math.sin(bearingRad)) / cosLat : 0;

  const dLatDeg = dLatRad * RAD_TO_DEG;
  const dLonDeg = dLonRad * RAD_TO_DEG;

  for (let i = 1; i <= count; i++) {
    const newTimeMs = tA + i * expectedIntervalMs;
    const newLat = canComputeBearing ? lastFix.latitude + dLatDeg * i : lastFix.latitude;
    const newLon = canComputeBearing ? lastFix.longitude + dLonDeg * i : lastFix.longitude;

    synthetics.push({
      ...lastFix,
      time: new Date(newTimeMs).toISOString(),
      latitude: newLat,
      longitude: newLon,
      speed_ms: lastFix.speed_ms,
      interpolated: false,
      gapSegment: true,
    });
  }

  return synthetics;
}

/**
 * Factory for stateful GPS interpolator processing a stream of records.
 * Maintains track of last fixes to detect dropped frames via timestamps.
 *
 * @param {Object} options
 * @param {number} [options.expectedIntervalMs=100] Nominal sampling interval
 * @returns {Object} { push(record), flush() }
 */
export function createGpsInterpolator({ expectedIntervalMs = 100 } = {}) {
  let lastValidFix = null;
  let penultimateValidFix = null;

  return {
    push(record) {
      if (!lastValidFix) {
        lastValidFix = record;
        return [record];
      }

      const tLast = parseTimeMs(lastValidFix.time);
      const tCurr = parseTimeMs(record.time);

      if (isNaN(tLast) || isNaN(tCurr) || tCurr < tLast) {
        if (!timestampWarnEmitted) {
          console.warn(
            '[gpsInterpolator] Invalid or out-of-order timestamp encountered. Treating as no-gap.'
          );
          timestampWarnEmitted = true;
        }
        penultimateValidFix = lastValidFix;
        lastValidFix = record;
        return [record];
      }

      const dt = tCurr - tLast;
      let droppedCount = Math.max(0, Math.round(dt / expectedIntervalMs) - 1);

      if (droppedCount === 0) {
        penultimateValidFix = lastValidFix;
        lastValidFix = record;
        return [record];
      }

      if (droppedCount > MAX_SYNTHETIC_FRAMES) {
        console.warn(
          `[gpsInterpolator] Gap of ${droppedCount} frames exceeds max cap. Capping at ${MAX_SYNTHETIC_FRAMES}.`
        );
        droppedCount = MAX_SYNTHETIC_FRAMES;
      }

      let syntheticFixes = [];
      if (droppedCount >= 1 && droppedCount <= 3) {
        syntheticFixes = interpolateLinear(lastValidFix, record, droppedCount);
      } else {
        syntheticFixes = estimateDeadReckoning(
          lastValidFix,
          penultimateValidFix,
          droppedCount,
          expectedIntervalMs
        );
      }

      penultimateValidFix = lastValidFix;
      lastValidFix = record;
      return [...syntheticFixes, record];
    },

    flush() {
      return [];
    },
  };
}

export function _resetTimestampWarnFlag() {
  timestampWarnEmitted = false;
}
