const EARTH_RADIUS_M = 6371000;
const DEG_TO_RAD = Math.PI / 180;

/**
 * Validates a GPS fix for haversine calculation.
 * @param {Object} fix
 * @returns {boolean} True if fix has valid, numeric lat/lon
 */
function isValidFix(fix) {
  if (!fix) return false;
  const lat = fix.latitude;
  const lon = fix.longitude;
  return typeof lat === 'number' && !isNaN(lat) && typeof lon === 'number' && !isNaN(lon);
}

/**
 * Computes the geodesic distance in metres between two GPS fixes.
 * Pure function.
 * @param {Object} fixA - First fix { latitude, longitude } in degrees
 * @param {Object} fixB - Second fix { latitude, longitude } in degrees
 * @returns {number} Distance in metres, or 0 if a fix is invalid
 */
export function haversineDistance(fixA, fixB) {
  if (!isValidFix(fixA) || !isValidFix(fixB)) {
    return 0;
  }

  const lat1 = fixA.latitude * DEG_TO_RAD;
  const lon1 = fixA.longitude * DEG_TO_RAD;
  const lat2 = fixB.latitude * DEG_TO_RAD;
  const lon2 = fixB.longitude * DEG_TO_RAD;

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_M * c;
}

/**
 * Factory for a stateful accumulator over a GPS stream.
 * @returns {Object} { push(fix), getTotal(), reset() }
 */
export function createHaversineAccumulator() {
  let lastFix = null;
  let totalDistanceM = 0;

  return {
    /**
     * Pushes a new fix to the accumulator.
     * Computes distance from the last valid pushed fix.
     * @param {Object} fix
     * @returns {number} The updated total distance in metres
     */
    push(fix) {
      if (!isValidFix(fix)) {
        return totalDistanceM;
      }
      if (lastFix) {
        totalDistanceM += haversineDistance(lastFix, fix);
      }
      lastFix = fix;
      return totalDistanceM;
    },

    /**
     * Gets the current accumulated distance.
     * @returns {number}
     */
    getTotal() {
      return totalDistanceM;
    },

    /**
     * Resets the accumulator state.
     */
    reset() {
      lastFix = null;
      totalDistanceM = 0;
    },
  };
}
