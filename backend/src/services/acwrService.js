import { getSessionLoadHistory } from '../repositories/sessionRepository.js';

/**
 * Calculates the Acute:Chronic Workload Ratio (ACWR) for an athlete.
 * Acute load = SUM of session_load in the last 7 days.
 * Chronic load = AVG weekly load over the last 28 days (SUM / 4).
 *
 * @param {string} athleteId - UUID of the athlete
 * @param {Date} [referenceDate=new Date()] - Anchor date for rolling windows
 * @param {import('pg').Pool} [pool] - Optional database pool
 * @returns {Promise<{acute_load: number, chronic_load: number, acwr: number|null, sufficient_history: boolean}>}
 */
export async function calculateAcwr(athleteId, referenceDate = new Date(), pool) {
  const [acuteSessions, chronicSessions] = await Promise.all([
    getSessionLoadHistory(athleteId, 7, referenceDate, pool),
    getSessionLoadHistory(athleteId, 28, referenceDate, pool)
  ]);

  const acuteLoad = acuteSessions.reduce((sum, s) => sum + s.session_load, 0);
  const chronicLoadSum = chronicSessions.reduce((sum, s) => sum + s.session_load, 0);
  
  const chronicLoad = chronicLoadSum / 4;

  if (chronicLoad === 0) {
    return {
      acute_load: acuteLoad,
      chronic_load: chronicLoad,
      acwr: null,
      sufficient_history: false
    };
  }

  const acwr = acuteLoad / chronicLoad;

  return {
    acute_load: acuteLoad,
    chronic_load: chronicLoad,
    acwr: Number(acwr.toFixed(4)),
    sufficient_history: true
  };
}

/**
 * Maps an ACWR numeric value to a risk zone label per RF16.
 *
 * Zone thresholds:
 *   blue   -> acwr < 0.80         (under-training risk)
 *   green  -> 0.80 <= acwr <= 1.30  (optimal training load)
 *   yellow -> 1.31 <= acwr <= 1.50  (slightly elevated risk)
 *   red    -> acwr > 1.50          (high injury risk)
 *
 * Returns null when acwr is null (insufficient chronic load history).
 *
 * @param {number|null} acwr - The computed ACWR value
 * @returns {'blue'|'green'|'yellow'|'red'|null}
 */
export function classifyAcwrZone(acwr) {
  if (acwr === null || acwr === undefined || typeof acwr !== 'number' || isNaN(acwr)) {
    return null;
  }
  if (acwr < 0.80) return 'blue';
  if (acwr <= 1.30) return 'green';
  if (acwr <= 1.50) return 'yellow';
  return 'red';
}
